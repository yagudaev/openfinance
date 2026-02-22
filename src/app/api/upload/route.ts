import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { prepareUpload } from '@/lib/upload-path'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

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

  // Some systems report .md files with a generic or empty MIME type — fall back to extension check
  const extension = file.name.split('.').pop()?.toLowerCase()
  const ALLOWED_EXTENSIONS = new Set(['pdf', 'md', 'csv', 'txt', 'jpg', 'jpeg', 'png', 'xlsx', 'xls'])

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

  return NextResponse.json({
    success: true,
    filePath: relPath,
    fileName: sanitizedFileName,
    size: file.size,
  })
}
