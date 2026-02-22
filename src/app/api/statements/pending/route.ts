import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const statements = await prisma.bankStatement.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'processing'] },
      },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return Response.json({ statements, count: statements.length })
  } catch (error) {
    console.error('Error fetching pending statements:', error)
    return Response.json({ statements: [], count: 0 })
  }
}

/**
 * POST /api/statements/pending
 * Reset stuck 'processing' statements back to 'pending' and
 * mark stuck 'running' jobs as 'failed'.
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reset stuck processing statements
    const statementsReset = await prisma.bankStatement.updateMany({
      where: {
        userId: session.user.id,
        status: 'processing',
      },
      data: { status: 'pending', errorMessage: null },
    })

    // Mark stuck running jobs as failed
    const jobsReset = await prisma.job.updateMany({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'running'] },
      },
      data: {
        status: 'failed',
        error: 'Reset: container restarted during processing',
        completedAt: new Date(),
      },
    })

    // Mark stuck running job items as failed
    const jobItemsReset = await prisma.jobItem.updateMany({
      where: {
        status: { in: ['pending', 'running'] },
        job: { userId: session.user.id },
      },
      data: {
        status: 'failed',
        error: 'Reset: container restarted during processing',
        completedAt: new Date(),
      },
    })

    return Response.json({
      statementsReset: statementsReset.count,
      jobsReset: jobsReset.count,
      jobItemsReset: jobItemsReset.count,
    })
  } catch (error) {
    console.error('Error resetting stuck items:', error)
    return Response.json({ error: 'Failed to reset' }, { status: 500 })
  }
}
