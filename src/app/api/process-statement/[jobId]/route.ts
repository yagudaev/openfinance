import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { jobId } = await params

  const job = await prisma.processingJob.findUnique({
    where: { id: jobId, userId: session.user.id },
    include: {
      logs: {
        orderBy: { sequenceNumber: 'asc' },
      },
    },
  })

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  return Response.json({
    id: job.id,
    status: job.status,
    fileName: job.fileName,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    logs: job.logs.map(l => ({
      title: l.title,
      content: l.content,
      logType: l.logType,
      createdAt: l.createdAt,
    })),
  })
}
