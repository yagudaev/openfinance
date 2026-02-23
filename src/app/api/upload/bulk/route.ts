import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { prepareUpload } from '@/lib/upload-path'
import JSZip from 'jszip'

interface UploadedFile {
  filePath: string
  fileName: string
  size: number
}

async function savePdf(
  buffer: Buffer,
  fileName: string,
  userId: string,
): Promise<UploadedFile> {
  const { relPath, fullPath, sanitizedFileName } = await prepareUpload(userId, fileName)

  await writeFile(fullPath, buffer)

  return {
    filePath: relPath,
    fileName: sanitizedFileName,
    size: buffer.length,
  }
}

async function extractPdfsFromZip(zipBuffer: Buffer): Promise<{ name: string, buffer: Buffer }[]> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const pdfs: { name: string, buffer: Buffer }[] = []

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue

    // Extract only PDF files, skip macOS resource forks and hidden files
    const fileName = path.split('/').pop() || ''
    if (
      !fileName.toLowerCase().endsWith('.pdf') ||
      fileName.startsWith('.') ||
      path.includes('__MACOSX')
    ) {
      continue
    }

    const content = await entry.async('nodebuffer')
    pdfs.push({ name: fileName, buffer: content })
  }

  return pdfs
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const files = formData.getAll('files') as File[]

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }

  const maxSize = 50 * 1024 * 1024 // 50MB per file
  const maxTotalSize = 500 * 1024 * 1024 // 500MB total
  const uploaded: UploadedFile[] = []
  const errors: { fileName: string, error: string }[] = []

  let totalSize = 0
  for (const file of files) {
    totalSize += file.size
  }

  if (totalSize > maxTotalSize) {
    return NextResponse.json(
      { error: 'Total upload size exceeds 500MB limit' },
      { status: 400 },
    )
  }

  for (const file of files) {
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        // Handle zip file — extract PDFs
        if (file.size > maxTotalSize) {
          errors.push({ fileName: file.name, error: 'Zip file exceeds 500MB limit' })
          continue
        }

        const zipBuffer = Buffer.from(await file.arrayBuffer())
        const pdfs = await extractPdfsFromZip(zipBuffer)

        if (pdfs.length === 0) {
          errors.push({ fileName: file.name, error: 'No PDF files found in zip' })
          continue
        }

        for (const pdf of pdfs) {
          if (pdf.buffer.length > maxSize) {
            errors.push({ fileName: pdf.name, error: 'File exceeds 50MB limit' })
            continue
          }

          const result = await savePdf(pdf.buffer, pdf.name, session.user.id)
          uploaded.push(result)
        }
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Handle individual PDF
        if (file.size > maxSize) {
          errors.push({ fileName: file.name, error: 'File exceeds 50MB limit' })
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await savePdf(buffer, file.name, session.user.id)
        uploaded.push(result)
      } else {
        errors.push({ fileName: file.name, error: 'Unsupported file type — only PDF and ZIP files are accepted' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ fileName: file.name, error: message })
    }
  }

  return NextResponse.json({
    success: true,
    uploaded,
    errors,
    totalUploaded: uploaded.length,
    totalErrors: errors.length,
  })
}
