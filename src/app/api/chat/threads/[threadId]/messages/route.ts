import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { threadId } = await params

  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), { status: 404 })
  }

  const messages = thread.messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    traceId: m.traceId,
  }))

  return Response.json({ threadId: thread.id, messages })
}
