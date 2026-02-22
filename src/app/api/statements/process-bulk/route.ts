import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processJobItems } from '@/lib/services/job-processor'

interface FileEntry {
  filePath: string
  fileName: string
  fileSize: number
  statementId?: string
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { files } = body as { files: FileEntry[] }

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: 'No files provided' },
      { status: 400 },
    )
  }

  if (files.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 files per batch' },
      { status: 400 },
    )
  }

  // Create BankStatement records for files that don't have a statementId yet
  const statementsToProcess: Array<{ statementId: string; fileName: string }> = []

  for (const file of files) {
    if (file.statementId) {
      statementsToProcess.push({
        statementId: file.statementId,
        fileName: file.fileName,
      })
    } else {
      const statement = await prisma.bankStatement.create({
        data: {
          userId: session.user.id,
          fileName: file.fileName,
          fileUrl: file.filePath,
          fileSize: file.fileSize,
          bankName: 'Unknown',
          status: 'pending',
        },
      })
      statementsToProcess.push({
        statementId: statement.id,
        fileName: file.fileName,
      })
    }
  }

  // Create Job with JobItems
  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      type: 'file_processing',
      status: 'pending',
      totalItems: statementsToProcess.length,
      completedItems: 0,
      progress: 0,
      items: {
        create: statementsToProcess.map(s => ({
          fileName: s.fileName,
          status: 'pending',
        })),
      },
    },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
    },
  })

  // Build the mapping of jobItemId -> statementId for processing
  const itemStatementMap = job.items.map((item, i) => ({
    jobItemId: item.id,
    statementId: statementsToProcess[i].statementId,
  }))

  // Fire-and-forget: process items in the background
  processJobItems(job.id, session.user.id, itemStatementMap).catch(error => {
    console.error('Background job processing error:', error)
  })

  return NextResponse.json({
    success: true,
    jobId: job.id,
    totalItems: statementsToProcess.length,
  })
}
