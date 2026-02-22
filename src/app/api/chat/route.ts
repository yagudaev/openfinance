import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  observe,
  updateActiveObservation,
  updateActiveTrace,
  getActiveTraceId,
} from '@langfuse/tracing'
import { trace } from '@opentelemetry/api'
import { after } from 'next/server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import { createChatTools } from '@/lib/chat/tools'
import { loadMemoriesForPrompt } from '@/lib/chat/memory'
import { getCategoriesForClassifier } from '@/lib/services/expense-categories'
import { langfuseSpanProcessor } from '@/instrumentation'

export const maxDuration = 120

function generateTitle(text: string): string {
  const cleaned = text.replace(/\[Attached file:.*?\]/g, '').trim()
  if (cleaned.length <= 50) return cleaned
  const truncated = cleaned.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

function getModel(modelId: string) {
  if (modelId.startsWith('openrouter/')) {
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
    return openrouter(modelId.replace('openrouter/', ''))
  }

  const openaiModelId = modelId.replace('openai/', '')
  return openai(openaiModelId)
}

function extractTextContent(message: UIMessage): string {
  return message.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('\n') ?? ''
}

const handler = async (request: Request) => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { messages, threadId }: { messages: UIMessage[]; threadId?: string } = await request.json()

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  })

  const modelId = settings?.aiModel ?? 'openrouter/cerebras/auto'

  const isNewUser = !settings?.aiContext
  const memories = await loadMemoriesForPrompt(session.user.id)
  const expenseCategories = await getCategoriesForClassifier(session.user.id)
  const systemPrompt = buildSystemPrompt({
    userContext: settings?.aiContext,
    memories,
    isNewUser,
    expenseCategories: expenseCategories || null,
  })
  const tools = createChatTools(session.user.id)

  // Save user message to DB if we have a thread
  if (threadId) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (lastUserMessage) {
      try {
        const content = extractTextContent(lastUserMessage)

        // Upsert to handle potential retries with the same message ID
        await prisma.chatMessage.upsert({
          where: { id: lastUserMessage.id },
          create: {
            id: lastUserMessage.id,
            threadId,
            role: 'user',
            content,
          },
          update: {},
        })

        await prisma.chatThread.update({
          where: { id: threadId },
          data: { updatedAt: new Date() },
        })
      } catch (error) {
        console.error('Failed to save user message:', error)
      }
    }
  }

  // Extract the user's latest message for the trace
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  const userMessageText = lastUserMessage ? extractTextContent(lastUserMessage) : undefined

  // Set Langfuse trace context
  updateActiveObservation({
    input: userMessageText,
  })

  updateActiveTrace({
    name: 'chat-message',
    sessionId: threadId,
    userId: session.user.id,
    input: userMessageText,
  })

  const startTime = Date.now()

  const result = streamText({
    model: getModel(modelId),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    experimental_telemetry: { isEnabled: true },
    onFinish: async ({ text, response, steps, totalUsage, finishReason }) => {
      const latencyMs = Date.now() - startTime

      // Get the Langfuse trace ID from the active span
      const traceId = getActiveTraceId()

      // Save assistant message to thread
      if (threadId) {
        try {
          // Extract tool call info from response for debugging/tracing
          const toolCalls = response.messages
            .filter(m => m.role === 'assistant')
            .flatMap(m => Array.isArray(m.content) ? m.content : [])
            .filter(c => typeof c === 'object' && c.type === 'tool-call')

          await prisma.chatMessage.create({
            data: {
              threadId,
              role: 'assistant',
              content: text || '',
              toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
              model: modelId,
              traceId: traceId ?? null,
            },
          })

          // Auto-generate thread title from first user message if not set
          const thread = await prisma.chatThread.findUnique({
            where: { id: threadId },
            select: { title: true },
          })
          if (!thread?.title && userMessageText) {
            await prisma.chatThread.update({
              where: { id: threadId },
              data: { title: generateTitle(userMessageText) },
            })
          }
        } catch (error) {
          console.error('Failed to save assistant message:', error)
        }
      }

      // Save trace data for debugging
      try {
        const stepsData = steps.map((step, index) => ({
          stepNumber: index,
          text: step.text || undefined,
          toolCalls: step.toolCalls.map(tc => ({
            toolName: tc.toolName,
            args: tc.input,
          })),
          toolResults: step.toolResults.map(tr => ({
            toolName: tr.toolName,
            args: tr.input,
            result: tr.output,
          })),
          finishReason: step.finishReason,
          usage: {
            inputTokens: step.usage.inputTokens,
            outputTokens: step.usage.outputTokens,
          },
        }))

        await prisma.chatTrace.create({
          data: {
            userId: session.user.id,
            threadId: threadId ?? null,
            model: modelId,
            inputTokens: totalUsage.inputTokens ?? null,
            outputTokens: totalUsage.outputTokens ?? null,
            totalTokens: (totalUsage.inputTokens ?? 0) + (totalUsage.outputTokens ?? 0) || null,
            latencyMs,
            finishReason,
            steps: JSON.stringify(stepsData),
            userMessage: userMessageText ?? null,
            assistantText: text || null,
          },
        })
      } catch (error) {
        console.error('Failed to save chat trace:', error)
      }

      // Update Langfuse trace with output after stream completes
      updateActiveObservation({
        output: text,
      })
      updateActiveTrace({
        output: text,
      })

      // End the span manually since streaming keeps it open
      trace.getActiveSpan()?.end()
    },
  })

  // Flush Langfuse traces after the response is sent (critical for serverless)
  after(async () => await langfuseSpanProcessor.forceFlush())

  return result.toUIMessageStreamResponse()
}

// Wrap handler with observe() to create a Langfuse trace
export const POST = observe(handler, {
  name: 'handle-chat-message',
  endOnExit: false, // Don't end observation until stream finishes
})
