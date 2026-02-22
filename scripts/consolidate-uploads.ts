/**
 * Migration script: Consolidate upload directories
 *
 * Moves all files from:
 *   data/uploads/attachments/{userId}/
 *   data/uploads/documents/{userId}/
 *   data/uploads/statements/{userId}/
 *
 * Into a single flat directory:
 *   data/uploads/{userId}/
 *
 * Also:
 * - Creates Document records for orphan files (files without a DB entry)
 * - Updates BankStatement.fileUrl and Document.fileUrl to the new paths
 * - Deduplicates by content hash (SHA-256)
 *
 * Usage:
 *   npx tsx scripts/consolidate-uploads.ts [--dry-run]
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { readdir, readFile, rename, mkdir, unlink, stat } from 'fs/promises'
import { join, extname } from 'path'
import { createHash } from 'crypto'

const DRY_RUN = process.argv.includes('--dry-run')

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./data/openfinance.db',
})
const prisma = new PrismaClient({ adapter })

const UPLOADS_BASE = join(process.cwd(), 'data', 'uploads')
const LEGACY_DIRS = ['attachments', 'documents', 'statements'] as const

interface FileInfo {
  legacyRelPath: string // e.g. "attachments/userId/file.pdf"
  newRelPath: string    // e.g. "userId/file.pdf"
  fullPath: string
  userId: string
  fileName: string
  hash: string
  size: number
}

function log(msg: string) {
  const prefix = DRY_RUN ? '[DRY RUN] ' : ''
  console.log(`${prefix}${msg}`)
}

async function computeHash(filePath: string): Promise<string> {
  const buffer = await readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isFile()
  } catch {
    return false
  }
}

/**
 * Scan legacy directories and collect file info.
 */
async function scanLegacyFiles(): Promise<FileInfo[]> {
  const files: FileInfo[] = []

  for (const legacyDir of LEGACY_DIRS) {
    const legacyPath = join(UPLOADS_BASE, legacyDir)
    if (!(await dirExists(legacyPath))) {
      log(`Skipping ${legacyDir}/ — directory does not exist`)
      continue
    }

    const userDirs = await readdir(legacyPath)
    for (const userId of userDirs) {
      const userPath = join(legacyPath, userId)
      if (!(await dirExists(userPath))) continue

      const fileNames = await readdir(userPath)
      for (const fileName of fileNames) {
        const fullPath = join(userPath, fileName)
        if (!(await fileExists(fullPath))) continue

        const legacyRelPath = `${legacyDir}/${userId}/${fileName}`
        const newRelPath = `${userId}/${fileName}`
        const hash = await computeHash(fullPath)
        const fileStat = await stat(fullPath)

        files.push({
          legacyRelPath,
          newRelPath,
          fullPath,
          userId,
          fileName,
          hash,
          size: fileStat.size,
        })
      }
    }
  }

  return files
}

/**
 * Detect MIME type from file extension.
 */
function getMimeType(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
  }
  return mimeMap[ext] || 'application/octet-stream'
}

/**
 * Detect document type from legacy directory.
 */
function getDocumentType(legacyDir: string): string {
  if (legacyDir === 'statements') return 'statement'
  return 'other'
}

async function main() {
  log('=== Consolidate Upload Directories ===')
  log(`Uploads base: ${UPLOADS_BASE}`)
  log('')

  // 1. Scan legacy files
  log('Scanning legacy directories...')
  const files = await scanLegacyFiles()
  log(`Found ${files.length} files across legacy directories`)

  if (files.length === 0) {
    log('No files to migrate. Done.')
    await prisma.$disconnect()
    return
  }

  // 2. Deduplicate by content hash — keep the first occurrence
  const seenHashes = new Map<string, FileInfo>() // hash -> first file
  const duplicates: FileInfo[] = []
  const unique: FileInfo[] = []

  for (const file of files) {
    const key = `${file.userId}:${file.hash}`
    if (seenHashes.has(key)) {
      duplicates.push(file)
      log(`  Duplicate: ${file.legacyRelPath} (same as ${seenHashes.get(key)!.legacyRelPath})`)
    } else {
      seenHashes.set(key, file)
      unique.push(file)
    }
  }

  log(`${unique.length} unique files, ${duplicates.length} duplicates`)
  log('')

  // 3. Move unique files to new location
  log('Moving files...')
  for (const file of unique) {
    const newFullPath = join(UPLOADS_BASE, file.newRelPath)
    const newDir = join(UPLOADS_BASE, file.userId)

    // Check if file already exists at new location
    if (await fileExists(newFullPath)) {
      log(`  Already exists: ${file.newRelPath}`)
      continue
    }

    if (DRY_RUN) {
      log(`  Would move: ${file.legacyRelPath} -> ${file.newRelPath}`)
    } else {
      await mkdir(newDir, { recursive: true })
      await rename(file.fullPath, newFullPath)
      log(`  Moved: ${file.legacyRelPath} -> ${file.newRelPath}`)
    }
  }
  log('')

  // 4. Update BankStatement.fileUrl records
  log('Updating BankStatement records...')
  const statements = await prisma.bankStatement.findMany({
    select: { id: true, fileUrl: true, userId: true },
  })

  let statementsUpdated = 0
  for (const stmt of statements) {
    // Check if fileUrl starts with a legacy prefix
    const legacyMatch = stmt.fileUrl.match(/^(attachments|documents|statements)\/(.+)$/)
    if (legacyMatch) {
      const newFileUrl = legacyMatch[2] // strip the legacy prefix
      if (DRY_RUN) {
        log(`  Would update statement ${stmt.id}: ${stmt.fileUrl} -> ${newFileUrl}`)
      } else {
        await prisma.bankStatement.update({
          where: { id: stmt.id },
          data: { fileUrl: newFileUrl },
        })
        log(`  Updated statement ${stmt.id}: ${stmt.fileUrl} -> ${newFileUrl}`)
      }
      statementsUpdated++
    }
  }
  log(`Updated ${statementsUpdated} BankStatement records`)
  log('')

  // 5. Update Document.fileUrl records
  log('Updating Document records...')
  const documents = await prisma.document.findMany({
    select: { id: true, fileUrl: true, userId: true },
  })

  let documentsUpdated = 0
  for (const doc of documents) {
    const legacyMatch = doc.fileUrl.match(/^(attachments|documents|statements)\/(.+)$/)
    if (legacyMatch) {
      const newFileUrl = legacyMatch[2]
      if (DRY_RUN) {
        log(`  Would update document ${doc.id}: ${doc.fileUrl} -> ${newFileUrl}`)
      } else {
        await prisma.document.update({
          where: { id: doc.id },
          data: { fileUrl: newFileUrl },
        })
        log(`  Updated document ${doc.id}: ${doc.fileUrl} -> ${newFileUrl}`)
      }
      documentsUpdated++
    }
  }
  log(`Updated ${documentsUpdated} Document records`)
  log('')

  // 6. Create Document records for orphan files (files without a DB entry)
  log('Checking for orphan files...')

  // Reload documents with new paths
  const allDocFileUrls = new Set(
    (await prisma.document.findMany({ select: { fileUrl: true } }))
      .map(d => d.fileUrl),
  )
  const allStmtFileUrls = new Set(
    (await prisma.bankStatement.findMany({ select: { fileUrl: true } }))
      .map(s => s.fileUrl),
  )

  let orphansCreated = 0
  for (const file of unique) {
    const relPath = file.newRelPath
    if (allDocFileUrls.has(relPath) || allStmtFileUrls.has(relPath)) continue
    // Also check legacy paths in case migration hasn't run on DB yet
    if (allDocFileUrls.has(file.legacyRelPath) || allStmtFileUrls.has(file.legacyRelPath)) continue

    const legacyDir = file.legacyRelPath.split('/')[0]
    const documentType = getDocumentType(legacyDir)
    const mimeType = getMimeType(file.fileName)

    if (DRY_RUN) {
      log(`  Would create Document for orphan: ${relPath} (type: ${documentType})`)
    } else {
      await prisma.document.create({
        data: {
          userId: file.userId,
          fileName: file.fileName,
          fileUrl: relPath,
          fileSize: file.size,
          mimeType,
          documentType,
          description: `Migrated from ${legacyDir}/`,
        },
      })
      log(`  Created Document for orphan: ${relPath} (type: ${documentType})`)
    }
    orphansCreated++
  }
  log(`Created ${orphansCreated} Document records for orphan files`)
  log('')

  // 7. Clean up duplicates
  if (duplicates.length > 0) {
    log('Cleaning up duplicate files...')
    for (const dup of duplicates) {
      if (DRY_RUN) {
        log(`  Would delete duplicate: ${dup.legacyRelPath}`)
      } else {
        try {
          await unlink(dup.fullPath)
          log(`  Deleted duplicate: ${dup.legacyRelPath}`)
        } catch {
          log(`  Could not delete: ${dup.legacyRelPath} (may already be moved)`)
        }
      }
    }
    log('')
  }

  // 8. Summary
  log('=== Migration Summary ===')
  log(`Files scanned: ${files.length}`)
  log(`Unique files moved: ${unique.length}`)
  log(`Duplicates removed: ${duplicates.length}`)
  log(`BankStatement records updated: ${statementsUpdated}`)
  log(`Document records updated: ${documentsUpdated}`)
  log(`Orphan Document records created: ${orphansCreated}`)

  if (DRY_RUN) {
    log('')
    log('This was a DRY RUN. No changes were made.')
    log('Run without --dry-run to apply changes.')
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
