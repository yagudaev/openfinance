import { createHash } from 'crypto'
import { writeFile } from 'fs/promises'

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { downloadDriveFile } from '@/lib/google-drive'
import { classifyByFilename } from '@/lib/services/document-classifier'
import { prepareUpload } from '@/lib/upload-path'
import { prisma } from '@/lib/prisma'

interface ImportFileRequest {
  fileId: string
  fileName: string
  mimeType: string
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { files: ImportFileRequest[] }
  const { files } = body

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json(
      { error: 'No files specified' },
      { status: 400 },
    )
  }

  if (files.length > 20) {
    return NextResponse.json(
      { error: 'Maximum 20 files per import' },
      { status: 400 },
    )
  }

  const results: Array<{
    fileId: string
    fileName: string
    success: boolean
    error?: string
    statementId?: string
    documentId?: string
  }> = []

  for (const file of files) {
    try {
      // Check if this file was already imported
      const existing = await prisma.document.findFirst({
        where: {
          userId: session.user.id,
          googleDriveFileId: file.fileId,
        },
      })
      if (existing) {
        results.push({
          fileId: file.fileId,
          fileName: file.fileName,
          success: false,
          error: 'Already imported',
        })
        continue
      }

      // Download from Google Drive
      const buffer = await downloadDriveFile(session.user.id, file.fileId)
      const contentHash = createHash('sha256').update(buffer).digest('hex')

      // Classify by filename
      const documentType = classifyByFilename(file.fileName) ?? 'other'
      const isPdf = file.mimeType === 'application/pdf' ||
        file.fileName.toLowerCase().endsWith('.pdf')
      const isStatement = documentType === 'statement' && isPdf

      // Prepare upload path
      const { relPath, fullPath, sanitizedFileName } = await prepareUpload(
        session.user.id,
        file.fileName,
      )
      await writeFile(fullPath, buffer)

      if (isStatement) {
        // Check for duplicate statement by content hash
        const existingStatement = await prisma.bankStatement.findFirst({
          where: { userId: session.user.id, contentHash },
        })
        if (existingStatement) {
          results.push({
            fileId: file.fileId,
            fileName: file.fileName,
            success: false,
            error: 'Duplicate statement',
          })
          continue
        }

        const statement = await prisma.bankStatement.create({
          data: {
            userId: session.user.id,
            fileName: sanitizedFileName,
            fileUrl: relPath,
            fileSize: buffer.length,
            contentHash,
            bankName: 'Unknown',
            status: 'pending',
          },
        })

        // Also create a Document record to track the Google Drive file ID
        await prisma.document.create({
          data: {
            userId: session.user.id,
            fileName: sanitizedFileName,
            fileUrl: relPath,
            fileSize: buffer.length,
            mimeType: file.mimeType || 'application/pdf',
            documentType: 'statement',
            contentHash,
            googleDriveFileId: file.fileId,
          },
        })

        results.push({
          fileId: file.fileId,
          fileName: file.fileName,
          success: true,
          statementId: statement.id,
        })
      } else {
        // Check for duplicate document by content hash
        const existingDoc = await prisma.document.findFirst({
          where: { userId: session.user.id, contentHash },
        })
        if (existingDoc) {
          results.push({
            fileId: file.fileId,
            fileName: file.fileName,
            success: false,
            error: 'Duplicate file',
          })
          continue
        }

        const document = await prisma.document.create({
          data: {
            userId: session.user.id,
            fileName: sanitizedFileName,
            fileUrl: relPath,
            fileSize: buffer.length,
            mimeType: file.mimeType || 'application/octet-stream',
            documentType,
            contentHash,
            googleDriveFileId: file.fileId,
          },
        })

        results.push({
          fileId: file.fileId,
          fileName: file.fileName,
          success: true,
          documentId: document.id,
        })
      }
    } catch (error) {
      console.error(`Failed to import ${file.fileName}:`, error)
      results.push({
        fileId: file.fileId,
        fileName: file.fileName,
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      })
    }
  }

  const successCount = results.filter(r => r.success).length
  const statementIds = results
    .filter(r => r.success && r.statementId)
    .map(r => r.statementId!)

  return NextResponse.json({
    results,
    successCount,
    totalCount: files.length,
    statementIds,
  })
}
