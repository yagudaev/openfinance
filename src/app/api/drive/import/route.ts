import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { prepareUpload } from '@/lib/upload-path'
import { downloadDriveFile, refreshAccessToken } from '@/lib/services/google-drive'
import { classifyByFilename } from '@/lib/services/document-classifier'

interface ImportRequest {
  fileIds: string[]
  fileNames: Record<string, string> // fileId -> fileName
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as ImportRequest
  const { fileIds, fileNames } = body

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return NextResponse.json(
      { error: 'No file IDs provided' },
      { status: 400 },
    )
  }

  if (fileIds.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 files per import' },
      { status: 400 },
    )
  }

  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId: session.user.id },
  })

  if (!connection) {
    return NextResponse.json(
      { error: 'Google Drive not connected' },
      { status: 400 },
    )
  }

  try {
    // Refresh access token if expired
    let accessToken = connection.accessToken
    if (new Date() >= connection.expiresAt) {
      const credentials = await refreshAccessToken(connection.refreshToken)
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token')
      }
      accessToken = credentials.access_token

      await prisma.googleDriveConnection.update({
        where: { userId: session.user.id },
        data: {
          accessToken: credentials.access_token,
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      })
    }

    // Skip already-imported files
    const existingDocs = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        googleDriveFileId: { in: fileIds },
      },
      select: { googleDriveFileId: true },
    })
    const alreadyImported = new Set(
      existingDocs.map(d => d.googleDriveFileId).filter(Boolean),
    )

    const results: { fileId: string; success: boolean; error?: string; documentId?: string }[] = []

    for (const fileId of fileIds) {
      if (alreadyImported.has(fileId)) {
        results.push({ fileId, success: false, error: 'Already imported' })
        continue
      }

      try {
        const buffer = await downloadDriveFile(accessToken, fileId)
        const fileName = fileNames[fileId] || `drive_${fileId}.pdf`
        const { relPath, fullPath, sanitizedFileName } = await prepareUpload(session.user.id, fileName)

        await writeFile(fullPath, buffer)

        const documentType = classifyByFilename(fileName) ?? 'other'

        const document = await prisma.document.create({
          data: {
            userId: session.user.id,
            fileName: sanitizedFileName,
            fileUrl: relPath,
            fileSize: buffer.length,
            mimeType: 'application/pdf',
            documentType,
            googleDriveFileId: fileId,
            description: 'Imported from Google Drive',
          },
        })

        results.push({ fileId, success: true, documentId: document.id })
      } catch (error) {
        results.push({
          fileId,
          success: false,
          error: error instanceof Error ? error.message : 'Download failed',
        })
      }
    }

    const imported = results.filter(r => r.success).length
    const skipped = results.filter(r => !r.success).length

    return NextResponse.json({ results, imported, skipped })
  } catch (error) {
    console.error('Drive import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    )
  }
}
