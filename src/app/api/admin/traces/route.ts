import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const cursor = searchParams.get('cursor') ?? undefined

  const traces = await prisma.chatTrace.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      latencyMs: true,
      finishReason: true,
      userMessage: true,
      assistantText: true,
      error: true,
      threadId: true,
      createdAt: true,
    },
  })

  const hasMore = traces.length > limit
  const items = hasMore ? traces.slice(0, limit) : traces
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined

  return Response.json({
    traces: items.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    nextCursor,
  })
}
