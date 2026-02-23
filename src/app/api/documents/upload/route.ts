import { createHash } from 'crypto'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { classifyByFilename } from '@/lib/services/document-classifier'
import { prepareUpload } from '@/lib/upload-path'

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'md', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'xlsx', 'xls',
])

const DOCUMENT_TYPES = new Set([
  'statement', 'tax', 'investment', 'receipt', 'spreadsheet', 'other',
])

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const requestedType = (formData.get('documentType') as string) || 'other'
  const description = (formData.get('description') as string) || null
  const tags = (formData.get('tags') as string) || null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Use filename-based classification when the type is the default 'other'
  const documentType = requestedType === 'other'
    ? classifyByFilename(file.name) ?? 'other'
    : requestedType

  if (!DOCUMENT_TYPES.has(documentType)) {
    return NextResponse.json(
      { error: 'Invalid document type. Allowed: statement, tax, investment, receipt, other' },
      { status: 400 },
    )
  }

  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!ALLOWED_TYPES.has(file.type) && (!extension || !ALLOWED_EXTENSIONS.has(extension))) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: PDF, Markdown, CSV, Text, Images (JPG/PNG), Excel (XLSX/XLS)' },
      { status: 400 },
    )
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const contentHash = createHash('sha256').update(buffer).digest('hex')
  const isPdf = file.type === 'application/pdf' || extension === 'pdf'
  const isStatement = documentType === 'statement' && isPdf

  // Content hash dedup: check if this exact file was already uploaded by this user
  if (isStatement) {
    const existingStatement = await prisma.bankStatement.findFirst({
      where: { userId: session.user.id, contentHash },
    })
    if (existingStatement) {
      return NextResponse.json(
        { error: 'This file has already been uploaded', isDuplicate: true },
        { status: 409 },
      )
    }
  } else {
    const existingDocument = await prisma.document.findFirst({
      where: { userId: session.user.id, contentHash },
    })
    if (existingDocument) {
      return NextResponse.json(
        { error: 'This file has already been uploaded', isDuplicate: true },
        { status: 409 },
      )
    }
  }

  const { relPath, fullPath, sanitizedFileName } = await prepareUpload(session.user.id, file.name)
  await writeFile(fullPath, buffer)

  // Statement PDFs only create a BankStatement record (not a Document),
  // because the Documents page queries both tables and would show duplicates.
  if (isStatement) {
    const statement = await prisma.bankStatement.create({
      data: {
        userId: session.user.id,
        fileName: sanitizedFileName,
        fileUrl: relPath,
        fileSize: file.size,
        contentHash,
        bankName: 'Unknown',
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      document: {
        id: statement.id,
        fileName: sanitizedFileName,
        fileUrl: relPath,
        fileSize: file.size,
      },
      statementId: statement.id,
    })
  }

  // Non-statement files create a Document record only
  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      fileName: sanitizedFileName,
      fileUrl: relPath,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      documentType,
      contentHash,
      description,
      tags,
    },
  })

  return NextResponse.json({ success: true, document, statementId: null })
}
