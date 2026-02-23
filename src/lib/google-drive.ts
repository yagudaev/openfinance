import { google } from 'googleapis'

import { encrypt, decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

// ---------------------------------------------------------------------------
// OAuth2 client factory
// ---------------------------------------------------------------------------

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const betterAuthUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  const redirectUri = `${betterAuthUrl}/api/google-drive/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

// Scopes needed for read-only Drive access
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Generate the Google OAuth URL for connecting Google Drive.
 * The `state` parameter carries the userId so the callback can associate the tokens.
 */
export function getGoogleDriveAuthUrl(userId: string): string {
  const oauth2 = getOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPES,
    state: userId,
  })
}

/**
 * Exchange an authorization code for tokens and persist the connection.
 */
export async function handleGoogleDriveCallback(code: string, userId: string) {
  const oauth2 = getOAuth2Client()
  const { tokens } = await oauth2.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error('Incomplete token response from Google')
  }

  // Fetch the user's email for display purposes
  oauth2.setCredentials(tokens)
  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 })
  const { data: userInfo } = await oauth2Api.userinfo.get()

  await prisma.googleDriveConnection.upsert({
    where: { userId },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: new Date(tokens.expiry_date),
      email: userInfo.email ?? null,
    },
    create: {
      userId,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: new Date(tokens.expiry_date),
      email: userInfo.email ?? null,
    },
  })

  return { email: userInfo.email }
}

/**
 * Get an authenticated Drive client for a user, refreshing tokens if needed.
 */
async function getAuthedDriveClient(userId: string) {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId },
  })

  if (!connection) {
    throw new Error('Google Drive not connected')
  }

  const oauth2 = getOAuth2Client()
  oauth2.setCredentials({
    access_token: decrypt(connection.accessToken),
    refresh_token: decrypt(connection.refreshToken),
    expiry_date: connection.expiresAt.getTime(),
  })

  // If token is expired or about to expire (within 5 min), refresh it
  if (connection.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const { credentials } = await oauth2.refreshAccessToken()
    if (credentials.access_token && credentials.expiry_date) {
      await prisma.googleDriveConnection.update({
        where: { userId },
        data: {
          accessToken: encrypt(credentials.access_token),
          expiresAt: new Date(credentials.expiry_date),
        },
      })
      oauth2.setCredentials(credentials)
    }
  }

  return google.drive({ version: 'v3', auth: oauth2 })
}

/**
 * Check connection status for a user.
 */
export async function getGoogleDriveStatus(userId: string) {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId },
    select: { email: true, createdAt: true },
  })

  return connection
    ? { connected: true as const, email: connection.email, connectedAt: connection.createdAt.toISOString() }
    : { connected: false as const }
}

/**
 * Disconnect Google Drive for a user.
 */
export async function disconnectGoogleDrive(userId: string) {
  await prisma.googleDriveConnection.deleteMany({
    where: { userId },
  })
}

// ---------------------------------------------------------------------------
// Drive file/folder listing
// ---------------------------------------------------------------------------

export interface DriveFolder {
  id: string
  name: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
}

/**
 * List folders inside a parent folder (or root if no parent given).
 */
export async function listDriveFolders(userId: string, parentId?: string): Promise<DriveFolder[]> {
  const drive = await getAuthedDriveClient(userId)

  const query = parentId
    ? `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    orderBy: 'name',
    pageSize: 100,
  })

  return (res.data.files ?? []).map(f => ({
    id: f.id!,
    name: f.name!,
  }))
}

// MIME types we support importing
const IMPORTABLE_MIMES = new Set([
  'application/pdf',
  'text/csv',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

/**
 * List importable files inside a folder.
 */
export async function listDriveFiles(userId: string, folderId: string): Promise<DriveFile[]> {
  const drive = await getAuthedDriveClient(userId)

  const mimeFilter = Array.from(IMPORTABLE_MIMES)
    .map(m => `mimeType = '${m}'`)
    .join(' or ')

  const query = `'${folderId}' in parents and (${mimeFilter}) and trashed = false`

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 200,
  })

  return (res.data.files ?? []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    size: Number(f.size ?? 0),
    modifiedTime: f.modifiedTime!,
  }))
}

/**
 * Download a file from Google Drive and return its contents as a Buffer.
 */
export async function downloadDriveFile(userId: string, fileId: string): Promise<Buffer> {
  const drive = await getAuthedDriveClient(userId)

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )

  return Buffer.from(res.data as ArrayBuffer)
}
