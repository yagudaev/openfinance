import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { prepareUpload } from '@/lib/upload-path'
import JSZip from 'jszip'

interface ImportedStatement {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  status: string
}

async function savePdfAndCreateRecord(
  buffer: Buffer,
  fileName: string,
  userId: string,
): Promise<ImportedStatement> {
  const { relPath, fullPath, sanitizedFileName } = await prepareUpload(userId, fileName)

  await writeFile(fullPath, buffer)

  const statement = await prisma.bankStatement.create({
    data: {
      userId,
      fileName: sanitizedFileName,
      fileUrl: relPath,
      fileSize: buffer.length,
      bankName: 'Unknown',
      status: 'pending',
    },
  })

  return {
    id: statement.id,
    fileName: statement.fileName,
    fileUrl: statement.fileUrl,
    fileSize: statement.fileSize,
    status: statement.status,
  }
}

async function extractPdfsFromZip(
  zipBuffer: Buffer,
): Promise<{ name: string; buffer: Buffer }[]> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const pdfs: { name: string; buffer: Buffer }[] = []

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue

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

  const maxSize = 10 * 1024 * 1024
  const maxTotalSize = 100 * 1024 * 1024
  const imported: ImportedStatement[] = []
  const errors: { fileName: string; error: string }[] = []

  let totalSize = 0
  for (const file of files) {
    totalSize += file.size
  }

  if (totalSize > maxTotalSize) {
    return NextResponse.json(
      { error: 'Total upload size exceeds 100MB limit' },
      { status: 400 },
    )
  }

  for (const file of files) {
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        if (file.size > maxTotalSize) {
          errors.push({
            fileName: file.name,
            error: 'Zip file exceeds 100MB limit',
          })
          continue
        }

        const zipBuffer = Buffer.from(await file.arrayBuffer())
        const pdfs = await extractPdfsFromZip(zipBuffer)

        if (pdfs.length === 0) {
          errors.push({
            fileName: file.name,
            error: 'No PDF files found in zip',
          })
          continue
        }

        for (const pdf of pdfs) {
          if (pdf.buffer.length > maxSize) {
            errors.push({
              fileName: pdf.name,
              error: 'File exceeds 10MB limit',
            })
            continue
          }

          const result = await savePdfAndCreateRecord(
            pdf.buffer,
            pdf.name,
            session.user.id,
          )
          imported.push(result)
        }
      } else if (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      ) {
        if (file.size > maxSize) {
          errors.push({
            fileName: file.name,
            error: 'File exceeds 10MB limit',
          })
          continue
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await savePdfAndCreateRecord(
          buffer,
          file.name,
          session.user.id,
        )
        imported.push(result)
      } else {
        errors.push({
          fileName: file.name,
          error:
            'Unsupported file type — only PDF and ZIP files are accepted',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push({ fileName: file.name, error: message })
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    errors,
    totalImported: imported.length,
    totalErrors: errors.length,
  })
}
