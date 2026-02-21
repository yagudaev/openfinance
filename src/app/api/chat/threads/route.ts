import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let thread = await prisma.chatThread.findFirst({
    where: { userId: session.user.id, isArchived: false },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!thread) {
    thread = await prisma.chatThread.create({
      data: { userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  }

  return Response.json({
    threadId: thread.id,
    messages: thread.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  })
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  await prisma.chatThread.updateMany({
    where: { userId: session.user.id, isArchived: false },
    data: { isArchived: true },
  })

  const thread = await prisma.chatThread.create({
    data: { userId: session.user.id },
    include: { messages: true },
  })

  return Response.json({
    threadId: thread.id,
    messages: [],
  })
}
