import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Creates a completed Job record for bulk uploads that don't require
 * background processing (e.g. document uploads). This provides a
 * historical record on the Jobs page.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, fileNames } = body as { type: string; fileNames: string[] }

  if (!type || !Array.isArray(fileNames) || fileNames.length === 0) {
    return NextResponse.json(
      { error: 'Missing type or fileNames' },
      { status: 400 },
    )
  }

  const now = new Date()

  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      type,
      status: 'completed',
      totalItems: fileNames.length,
      completedItems: fileNames.length,
      progress: 100,
      startedAt: now,
      completedAt: now,
      items: {
        create: fileNames.map(fileName => ({
          fileName,
          status: 'completed',
          startedAt: now,
          completedAt: now,
        })),
      },
    },
  })

  return NextResponse.json({ success: true, jobId: job.id })
}
