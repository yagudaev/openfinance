import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const search = request.nextUrl.searchParams.get('search')?.trim() ?? ''

  const threads = await prisma.chatThread.findMany({
    where: {
      userId: session.user.id,
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { messages: { some: { content: { contains: search } } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        where: { role: 'user' },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
  })

  const threadList = threads.map(thread => ({
    id: thread.id,
    title: thread.title ?? thread.messages[0]?.content?.slice(0, 80) ?? 'New conversation',
    updatedAt: thread.updatedAt.toISOString(),
    isArchived: thread.isArchived,
    messageCount: thread._count.messages,
  }))

  return Response.json({ threads: threadList })
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
