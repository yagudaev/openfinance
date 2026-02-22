import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { decrypt, encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { scanDriveForPDFs, refreshAccessToken } from '@/lib/services/google-drive'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    let accessToken = decrypt(connection.accessToken)
    if (new Date() >= connection.expiresAt) {
      const credentials = await refreshAccessToken(decrypt(connection.refreshToken))
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token')
      }
      accessToken = credentials.access_token

      // Update stored tokens (encrypted)
      await prisma.googleDriveConnection.update({
        where: { userId: session.user.id },
        data: {
          accessToken: encrypt(credentials.access_token),
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3600 * 1000),
        },
      })
    }

    const files = await scanDriveForPDFs(accessToken)

    // Check which files are already imported
    const existingDocs = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        googleDriveFileId: { not: null },
      },
      select: { googleDriveFileId: true, fileName: true, fileSize: true },
    })

    const importedFileIds = new Set(
      existingDocs
        .filter(d => d.googleDriveFileId)
        .map(d => d.googleDriveFileId!),
    )

    // Also build a set of filename+size for duplicate detection
    const existingFileSigs = new Set(
      existingDocs.map(d => `${d.fileName}:${d.fileSize}`),
    )

    const filesWithStatus = files.map(file => ({
      ...file,
      alreadyImported: importedFileIds.has(file.fileId),
      duplicateByNameSize: existingFileSigs.has(`${file.fileName}:${file.size}`),
    }))

    return NextResponse.json({
      files: filesWithStatus,
      total: files.length,
    })
  } catch (error) {
    console.error('Drive scan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to scan Drive' },
      { status: 500 },
    )
  }
}
