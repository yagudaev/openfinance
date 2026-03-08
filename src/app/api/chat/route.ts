
import { UIMessage } from 'ai'
import { setWaitUntil } from '@voltagent/core'
import { after } from 'next/server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createChatTools } from '@/lib/chat/tools'
import { loadMemoriesForPrompt } from '@/lib/chat/memory'
import { getCategoriesForClassifier } from '@/lib/services/expense-categories'
import { agent } from '@/voltagent'
import { fetchPricing, calculateCost } from '@/lib/pricing'

export const maxDuration = 120

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { messages, threadId }: { messages: UIMessage[]; threadId?: string } = await request.json()

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  })

  const modelId = settings?.aiModel ?? 'openrouter/z-ai/glm-4.7'

  const isNewUser = !settings?.aiContext
  const memories = await loadMemoriesForPrompt(session.user.id)
  const expenseCategories = await getCategoriesForClassifier(session.user.id)

  const chatTools = createChatTools(session.user.id)

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

  const startTime = Date.now()

  // Create in-progress trace immediately so it shows up in the traces list
  const inProgressTrace = await prisma.chatTrace.create({
    data: {
      userId: session.user.id,
      threadId: threadId ?? null,
      model: modelId,
      finishReason: 'in-progress',
      steps: '[]',
      userMessage: userMessageText ?? null,
    },
  })

  const result = await agent.streamText(messages, {
    tools: chatTools,
    context: {
      userContext: settings?.aiContext,
      memories,
      isNewUser,
      expenseCategories: expenseCategories || null,
      modelId,
    },
    onFinish: async (finishResult: {
      text?: string
      response?: { messages: Array<{ role: string; content: unknown }> }
      steps?: Array<{
        text?: string
        toolCalls: Array<{ toolName: string; input: unknown }>
        toolResults: Array<{ toolName: string; input: unknown; output: unknown }>
        finishReason: string
        usage: { inputTokens: number; outputTokens: number }
      }>
      totalUsage?: { inputTokens?: number; outputTokens?: number }
      finishReason?: string
    }) => {
      const latencyMs = Date.now() - startTime
      const { text, response, steps, totalUsage, finishReason } = finishResult

      // Save assistant message to thread
      if (threadId) {
        try {
          // Extract tool call info from response for debugging/tracing
          const toolCalls = response?.messages
            ?.filter(m => m.role === 'assistant')
            .flatMap(m => Array.isArray(m.content) ? m.content : [])
            .filter(c => typeof c === 'object' && c !== null && 'type' in c && c.type === 'tool-call') ?? []

          await prisma.chatMessage.create({
            data: {
              threadId,
              role: 'assistant',
              content: text || '',
              toolCalls: toolCalls.length > 0 ? JSON.stringify(toolCalls) : null,
              model: modelId,
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

      // Update the in-progress trace with final data
      try {
        const stepsData = steps?.map((step, index) => ({
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
        })) ?? []

        const inputTok = totalUsage?.inputTokens ?? 0
        const outputTok = totalUsage?.outputTokens ?? 0

        let cost: number | null = null
        try {
          const pricing = await fetchPricing()
          const estimated = calculateCost(modelId, inputTok, outputTok, pricing)
          if (estimated > 0) cost = estimated
        } catch {
          // pricing fetch failed — cost stays null
        }

        await prisma.chatTrace.update({
          where: { id: inProgressTrace.id },
          data: {
            inputTokens: totalUsage?.inputTokens ?? null,
            outputTokens: totalUsage?.outputTokens ?? null,
            totalTokens: inputTok + outputTok || null,
            cost,
            latencyMs,
            finishReason: finishReason ?? null,
            steps: JSON.stringify(stepsData),
            assistantText: text || null,
          },
        })

        // Link the trace to the most recent assistant message in this thread
        if (threadId) {
          const latestAssistantMessage = await prisma.chatMessage.findFirst({
            where: { threadId, role: 'assistant' },
            orderBy: { createdAt: 'desc' },
          })
          if (latestAssistantMessage) {
            await prisma.chatMessage.update({
              where: { id: latestAssistantMessage.id },
              data: { traceId: inProgressTrace.id },
            })
          }
        }
      } catch (error) {
        console.error('Failed to update chat trace:', error)
      }
    },
  })

  // Enable non-blocking OTel export for VoltOps
  setWaitUntil(after)

  return result.toUIMessageStreamResponse()
}

function generateTitle(text: string): string {
  const cleaned = text.replace(/\[Attached file:.*?\]/g, '').trim()
  if (cleaned.length <= 50) return cleaned
  const truncated = cleaned.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

function extractTextContent(message: UIMessage): string {
  return message.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('\n') ?? ''
}
