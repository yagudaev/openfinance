import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import { createChatTools } from '@/lib/chat/tools'
import { loadMemoriesForPrompt } from '@/lib/chat/memory'

export const maxDuration = 60

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

export async function POST(request: Request) {
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
  const systemPrompt = buildSystemPrompt({
    userContext: settings?.aiContext,
    memories,
    isNewUser,
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

  const result = streamText({
    model: getModel(modelId),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, response }) => {
      if (!threadId) return

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
          },
        })
      } catch (error) {
        console.error('Failed to save assistant message:', error)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
