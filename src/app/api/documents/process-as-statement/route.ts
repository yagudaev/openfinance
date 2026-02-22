import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { getUploadFullPath } from '@/lib/upload-path'
import { processStatement } from '@/lib/services/statement-processor'
import { prisma } from '@/lib/prisma'

// pdf-parse v1 has no proper ESM/TS types — use require
const pdfParse = require('pdf-parse')

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { documentId } = body

  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
  }

  // Look up the Document record
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  })

  if (!document || document.userId !== session.user.id) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  if (document.mimeType !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF documents can be processed as statements' }, { status: 400 })
  }

  try {
    // Read the PDF file
    const fullPath = getUploadFullPath(document.fileUrl)
    const pdfBuffer = await readFile(fullPath)

    // Extract text
    const pdfData = await pdfParse(pdfBuffer)
    const pdfText: string = pdfData.text

    if (!pdfText || pdfText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF. The file may be scanned/image-based.' },
        { status: 422 },
      )
    }

    // Process with AI (creates BankStatement + Transactions)
    const result = await processStatement(
      pdfText,
      document.fileName,
      document.fileUrl,
      document.fileSize,
      session.user.id,
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process statement'

    if (error instanceof Error && error.message.includes('Duplicate statement detected')) {
      return NextResponse.json(
        { success: false, isDuplicate: true, message: error.message },
        { status: 409 },
      )
    }

    console.error('Process document as statement error:', error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
