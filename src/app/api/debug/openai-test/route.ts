import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { openai } from '@/lib/openai'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const diagnostics: Record<string, unknown> = {
    OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
    OPENAI_API_KEY_PREFIX: process.env.OPENAI_API_KEY?.slice(0, 8) || 'NOT SET',
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'NOT SET',
    OPENAI_API_BASE: process.env.OPENAI_API_BASE || 'NOT SET',
    clientBaseURL: (openai as any).baseURL || 'unknown',
  }

  // Try a minimal API call
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
      max_tokens: 10,
    })
    diagnostics.testCallSuccess = true
    diagnostics.testResponse = completion.choices[0]?.message?.content
    diagnostics.modelUsed = completion.model
  } catch (error: any) {
    diagnostics.testCallSuccess = false
    diagnostics.errorMessage = error?.message || String(error)
    diagnostics.errorStatus = error?.status
    diagnostics.errorType = error?.type
    diagnostics.errorCode = error?.code
  }

  return Response.json(diagnostics)
}
