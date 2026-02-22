import { google, type drive_v3 } from 'googleapis'

export interface DriveFile {
  fileId: string
  fileName: string
  filePath: string // folder hierarchy, e.g. "Finance/Statements/2024"
  mimeType: string
  size: number
  modifiedTime: string
}

/**
 * Create an OAuth2 client for Google Drive API.
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const betterAuthUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${betterAuthUrl}/api/drive/callback`,
  )
}

/**
 * Generate the Google OAuth URL for Drive-only consent.
 */
export function getDriveAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  })
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

/**
 * Get the email associated with an access token.
 */
export async function getGoogleEmail(accessToken: string): Promise<string | null> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  return data.email ?? null
}

/**
 * Build a map of folder IDs to their names.
 */
async function buildFolderMap(
  drive: drive_v3.Drive,
): Promise<Map<string, { name: string; parentId: string | null }>> {
  const folderMap = new Map<string, { name: string; parentId: string | null }>()
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken, files(id, name, parents)',
      pageSize: 1000,
      pageToken,
    })

    for (const file of res.data.files ?? []) {
      if (file.id) {
        folderMap.set(file.id, {
          name: file.name ?? 'Untitled',
          parentId: file.parents?.[0] ?? null,
        })
      }
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return folderMap
}

/**
 * Resolve a folder ID to its full path string.
 */
function resolveFolderPath(
  folderId: string | null,
  folderMap: Map<string, { name: string; parentId: string | null }>,
): string {
  if (!folderId) return ''

  const parts: string[] = []
  let currentId: string | null = folderId
  const visited = new Set<string>()

  while (currentId && folderMap.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId)
    const folder: { name: string; parentId: string | null } = folderMap.get(currentId)!
    parts.unshift(folder.name)
    currentId = folder.parentId
  }

  return parts.join('/')
}

/**
 * Scan Google Drive for PDF files recursively.
 * Returns a flat list of all PDFs with their folder paths.
 */
export async function scanDriveForPDFs(accessToken: string): Promise<DriveFile[]> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  // Build folder hierarchy first
  const folderMap = await buildFolderMap(drive)

  // Now scan for PDF files
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const res = await drive.files.list({
      q: "mimeType = 'application/pdf' and trashed = false",
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents)',
      pageSize: 1000,
      pageToken,
    })

    for (const file of res.data.files ?? []) {
      if (!file.id || !file.name) continue

      const parentId = file.parents?.[0] ?? null
      const filePath = resolveFolderPath(parentId, folderMap)

      files.push({
        fileId: file.id,
        fileName: file.name,
        filePath,
        mimeType: file.mimeType ?? 'application/pdf',
        size: parseInt(file.size ?? '0', 10),
        modifiedTime: file.modifiedTime ?? new Date().toISOString(),
      })
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  return files
}

/**
 * Download a file from Google Drive by ID.
 * Returns the file content as a Buffer.
 */
export async function downloadDriveFile(
  accessToken: string,
  fileId: string,
): Promise<Buffer> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  )

  return Buffer.from(res.data as ArrayBuffer)
}
