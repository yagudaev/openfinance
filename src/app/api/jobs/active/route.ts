import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.job.findMany({
    where: {
      userId: session.user.id,
      status: { in: ['pending', 'running'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fileName: true,
          status: true,
          error: true,
        },
      },
    },
  })

  return Response.json({
    jobs: jobs.map(j => ({
      id: j.id,
      type: j.type,
      status: j.status,
      progress: j.progress,
      totalItems: j.totalItems,
      completedItems: j.completedItems,
      error: j.error,
      startedAt: j.startedAt?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
      items: j.items,
    })),
  })
}
