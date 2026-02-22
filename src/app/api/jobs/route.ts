import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const cursor = searchParams.get('cursor') ?? undefined

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      _count: { select: { items: true } },
    },
  })

  const hasMore = jobs.length > limit
  const items = hasMore ? jobs.slice(0, limit) : jobs
  const nextCursor = hasMore ? items[items.length - 1]?.id : undefined

  return Response.json({
    jobs: items.map(j => ({
      id: j.id,
      type: j.type,
      status: j.status,
      progress: j.progress,
      totalItems: j.totalItems,
      completedItems: j.completedItems,
      error: j.error,
      startedAt: j.startedAt?.toISOString() ?? null,
      completedAt: j.completedAt?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
      itemCount: j._count.items,
    })),
    nextCursor,
  })
}
