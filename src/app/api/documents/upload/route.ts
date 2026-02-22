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

  const { relPath, fullPath, sanitizedFileName } = await prepareUpload(session.user.id, file.name)

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  const document = await prisma.document.create({
    data: {
      userId: session.user.id,
      fileName: sanitizedFileName,
      fileUrl: relPath,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      documentType,
      description,
      tags,
    },
  })

  // When the file is a statement PDF, also create a BankStatement record
  // so it can be queued for AI processing by the frontend
  let statementId: string | null = null
  const isPdf = file.type === 'application/pdf' || extension === 'pdf'
  if (documentType === 'statement' && isPdf) {
    const statement = await prisma.bankStatement.create({
      data: {
        userId: session.user.id,
        fileName: sanitizedFileName,
        fileUrl: relPath,
        fileSize: file.size,
        bankName: 'Unknown',
        status: 'pending',
      },
    })
    statementId = statement.id
  }

  return NextResponse.json({ success: true, document, statementId })
}
