import { join } from 'path'
import { mkdir } from 'fs/promises'

/**
 * Base directory for all file uploads.
 * All files are stored flat under data/uploads/{userId}/.
 */
const UPLOADS_BASE = join(process.cwd(), 'data', 'uploads')

/**
 * Returns the absolute directory path for a user's uploads.
 * e.g. /app/data/uploads/{userId}
 */
export function getUserUploadDir(userId: string): string {
  return join(UPLOADS_BASE, userId)
}

/**
 * Returns the relative path for a new upload (relative to data/uploads/).
 * e.g. {userId}/{timestamp}_{sanitizedFileName}
 */
export function getUploadRelPath(userId: string, fileName: string): string {
  const timestamp = Date.now()
  const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${userId}/${timestamp}_${sanitized}`
}

/**
 * Returns the absolute path for a file given its relative path.
 * e.g. /app/data/uploads/{userId}/{timestamp}_{file.pdf}
 */
export function getUploadFullPath(relPath: string): string {
  return join(UPLOADS_BASE, relPath)
}

/**
 * Ensures the user's upload directory exists, then returns paths for a new file.
 */
export async function prepareUpload(userId: string, fileName: string): Promise<{
  relPath: string
  fullPath: string
  sanitizedFileName: string
}> {
  const dir = getUserUploadDir(userId)
  await mkdir(dir, { recursive: true })

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const relPath = getUploadRelPath(userId, fileName)
  const fullPath = getUploadFullPath(relPath)

  return { relPath, fullPath, sanitizedFileName }
}
