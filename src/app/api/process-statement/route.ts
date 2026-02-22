import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getUploadFullPath } from '@/lib/upload-path'
import { processStatement } from '@/lib/services/statement-processor'
import { prisma } from '@/lib/prisma'

// pdf-parse v1 has no proper ESM/TS types — use require
const pdfParse = require('pdf-parse')

async function addLog(
  jobId: string,
  seq: number,
  logType: string,
  title: string,
  content?: string,
) {
  await prisma.processingLog.create({
    data: { jobId, sequenceNumber: seq, logType, title, content },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { filePath, fileName, fileSize, statementId } = body

  if (!filePath || !fileName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Create processing job
  const job = await prisma.processingJob.create({
    data: {
      userId: session.user.id,
      fileName,
      status: 'processing',
      startedAt: new Date(),
    },
  })

  let logSeq = 0

  try {
    // Read PDF from disk
    await addLog(job.id, ++logSeq, 'info', 'Extracting text from PDF')
    const fullPath = getUploadFullPath(filePath)
    const pdfBuffer = await readFile(fullPath)

    // Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer)
    const pdfText: string = pdfData.text

    if (!pdfText || pdfText.trim().length === 0) {
      await addLog(job.id, ++logSeq, 'error', 'PDF text extraction failed', 'Could not extract text from PDF. The file may be scanned/image-based.')
      await prisma.processingJob.update({
        where: { id: job.id },
        data: { status: 'failed', errorMessage: 'Could not extract text from PDF', completedAt: new Date() },
      })
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be scanned/image-based.', jobId: job.id },
        { status: 422 },
      )
    }

    await addLog(job.id, ++logSeq, 'info', 'Text extracted successfully', `${pdfText.length} characters extracted`)

    // Process with AI
    await addLog(job.id, ++logSeq, 'info', 'Processing with AI')
    const result = await processStatement(
      pdfText,
      fileName,
      filePath,
      fileSize,
      session.user.id,
      statementId,
    )

    await addLog(job.id, ++logSeq, 'info', 'Transactions saved', `${result.transactionCount} transactions extracted`)
    await addLog(job.id, ++logSeq, 'info', 'Balance verification complete', result.isBalanced ? 'Statement balanced' : 'Statement unbalanced')

    // Update job as completed
    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        statementId: result.statement?.id,
        completedAt: new Date(),
      },
    })

    await addLog(job.id, ++logSeq, 'success', 'Processing complete')

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
      jobId: job.id,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process statement'

    await addLog(job.id, ++logSeq, 'error', 'Processing failed', errorMessage)
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage, completedAt: new Date() },
    })

    if (error instanceof Error && error.message.includes('Duplicate statement detected')) {
      return NextResponse.json(
        { success: false, isDuplicate: true, message: error.message, jobId: job.id },
        { status: 409 },
      )
    }

    console.error('Process statement error:', error)
    return NextResponse.json(
      { error: errorMessage, jobId: job.id },
      { status: 500 },
    )
  }
}
