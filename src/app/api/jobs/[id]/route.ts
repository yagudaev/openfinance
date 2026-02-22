import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!job) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({
    job: {
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      totalItems: job.totalItems,
      completedItems: job.completedItems,
      error: job.error,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      items: job.items.map(item => ({
        id: item.id,
        fileName: item.fileName,
        status: item.status,
        error: item.error,
        startedAt: item.startedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    },
  })
}
