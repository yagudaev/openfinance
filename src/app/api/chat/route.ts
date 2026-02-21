import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import { createChatTools } from '@/lib/chat/tools'

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

  const systemPrompt = buildSystemPrompt(settings?.aiContext)
  const tools = createChatTools(session.user.id)

  // Save user message to DB if we have a thread
  if (threadId) {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    if (lastUserMessage) {
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
    }
  }

  const result = streamText({
    model: getModel(modelId),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    onFinish: async ({ text }) => {
      if (threadId && text) {
        await prisma.chatMessage.create({
          data: {
            threadId,
            role: 'assistant',
            content: text,
            model: modelId,
          },
        })
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
