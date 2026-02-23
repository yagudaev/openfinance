import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { threadId } = await params
  const body = await request.json()
  const { title } = body as { title?: string }

  if (typeof title !== 'string' || title.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400 })
  }

  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId: session.user.id },
  })

  if (!thread) {
    return new Response(JSON.stringify({ error: 'Thread not found' }), { status: 404 })
  }

  const updated = await prisma.chatThread.update({
    where: { id: threadId },
    data: { title: title.trim() },
  })

  return Response.json({ id: updated.id, title: updated.title })
}
