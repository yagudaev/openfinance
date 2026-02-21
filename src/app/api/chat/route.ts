import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import { createChatTools } from '@/lib/chat/tools'

export const maxDuration = 60

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { messages }: { messages: UIMessage[] } = await request.json()

  const systemPrompt = buildSystemPrompt()
  const tools = createChatTools(session.user.id)

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
