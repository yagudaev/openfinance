import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { processStatement } from '@/lib/services/statement-processor'

// pdf-parse v1 has no proper ESM/TS types — use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

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

  try {
    // Read PDF from disk
    const fullPath = join(process.cwd(), 'data', 'uploads', filePath)
    const pdfBuffer = await readFile(fullPath)

    // Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer)
    const pdfText: string = pdfData.text

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be scanned/image-based.' },
        { status: 422 },
      )
    }

    // Process with AI
    const result = await processStatement(
      pdfText,
      fileName,
      filePath,
      fileSize,
      session.user.id,
      statementId,
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate statement detected')) {
      return NextResponse.json(
        { success: false, isDuplicate: true, message: error.message },
        { status: 409 },
      )
    }

    console.error('Process statement error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process statement' },
      { status: 500 },
    )
  }
}
