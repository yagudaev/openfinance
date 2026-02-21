import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

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

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
  }

  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const relPath = `statements/${session.user.id}/${timestamp}_${sanitizedFileName}`

  const uploadDir = join(process.cwd(), 'data', 'uploads', 'statements', session.user.id)
  await mkdir(uploadDir, { recursive: true })

  const fullPath = join(process.cwd(), 'data', 'uploads', relPath)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  return NextResponse.json({
    success: true,
    filePath: relPath,
    fileName: sanitizedFileName,
    size: file.size,
  })
}
