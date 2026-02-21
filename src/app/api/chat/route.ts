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

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { messages }: { messages: UIMessage[] } = await request.json()

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
  })

  const modelId = settings?.aiModel ?? 'openrouter/cerebras/auto'

  const systemPrompt = buildSystemPrompt(settings?.aiContext)
  const tools = createChatTools(session.user.id)

  const result = streamText({
    model: getModel(modelId),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
