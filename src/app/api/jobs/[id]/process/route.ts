import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processJobItems } from '@/lib/services/job-processor'

export async function POST(
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
      items: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status === 'running') {
    return Response.json({ error: 'Job is already running' }, { status: 409 })
  }

  if (job.status === 'completed') {
    return Response.json({ error: 'Job is already completed' }, { status: 409 })
  }

  // Find matching pending statements for each job item
  const statements = await prisma.bankStatement.findMany({
    where: {
      userId: session.user.id,
      status: 'pending',
    },
    orderBy: { createdAt: 'asc' },
  })

  const statementByFileName = new Map(
    statements.map(s => [s.fileName, s]),
  )

  const itemMappings = job.items.map(item => {
    const statement = statementByFileName.get(item.fileName)
    return {
      jobItemId: item.id,
      statementId: statement?.id ?? '',
    }
  })

  // Check for unmapped items
  const unmapped = itemMappings.filter(m => !m.statementId)
  if (unmapped.length === itemMappings.length) {
    return Response.json(
      { error: 'No matching pending statements found' },
      { status: 400 },
    )
  }

  // Fire-and-forget
  processJobItems(id, session.user.id, itemMappings).catch(error => {
    console.error('Job processing error:', error)
  })

  return Response.json({
    success: true,
    jobId: id,
    totalItems: job.totalItems,
  })
}
