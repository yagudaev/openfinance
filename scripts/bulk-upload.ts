/**
 * Bulk upload script for uploading all statement PDFs to OpenFinance.
 *
 * Usage:
 *   npx tsx scripts/bulk-upload.ts [--base-url URL] [--batch-size N] [--dry-run]
 *
 * Reads OPENFINANCE_USERNAME and OPENFINANCE_PASSWORD from .env.
 * Uploads all PDFs from the configured directories, then triggers
 * batch processing to extract transactions.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, basename, relative } from 'path'
import { config } from 'dotenv'

config()

const DIRS = [
  '/Users/michaelyagudaev/Library/CloudStorage/GoogleDrive-michael@nano3labs.com/My Drive/Tax/Corporate/',
  '/Users/michaelyagudaev/Library/CloudStorage/GoogleDrive-michael@nano3labs.com/My Drive/Tax/Personal/',
]

const SUPPORTED_EXTENSIONS = new Set(['.pdf'])

// Also upload these as non-statement documents for reference
const REFERENCE_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls', '.jpg', '.jpeg', '.png'])

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const baseUrl = getArg('--base-url') || 'https://openfinance.to'
const batchSize = parseInt(getArg('--batch-size') || '20', 10)

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

interface FileInfo {
  path: string
  name: string
  size: number
  relativePath: string
  documentType: string
}

function collectFiles(dir: string, rootDir: string): FileInfo[] {
  const files: FileInfo[] = []

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry.startsWith('~$')) continue

      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        files.push(...collectFiles(fullPath, rootDir))
      } else {
        const ext = extname(entry).toLowerCase()
        const relPath = relative(rootDir, fullPath)

        if (SUPPORTED_EXTENSIONS.has(ext)) {
          files.push({
            path: fullPath,
            name: basename(entry),
            size: stat.size,
            relativePath: relPath,
            documentType: classifyByPath(relPath, entry),
          })
        } else if (REFERENCE_EXTENSIONS.has(ext)) {
          files.push({
            path: fullPath,
            name: basename(entry),
            size: stat.size,
            relativePath: relPath,
            documentType: 'other',
          })
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err)
  }

  return files
}

/**
 * Classify a PDF by its directory path and filename.
 * Uses the directory structure to determine document type.
 */
function classifyByPath(relPath: string, filename: string): string {
  const lowerPath = relPath.toLowerCase()
  const lowerName = filename.toLowerCase()

  // Tax-related files
  if (lowerPath.includes('tax filing') || lowerPath.includes('tax docs') ||
      lowerPath.includes('tax package') || lowerPath.includes('t-slips') ||
      lowerPath.includes('t4') || lowerPath.includes('t5') ||
      lowerPath.includes('cra communication') || lowerPath.includes('return') ||
      lowerName.includes('tax') || lowerName.includes('t4') ||
      lowerName.includes('t5') || lowerName.includes('notice of assessment') ||
      lowerName.includes('filing')) {
    return 'tax'
  }

  // Receipts and invoices
  if (lowerPath.includes('receipt') || lowerPath.includes('reciept') ||
      lowerPath.includes('recipet') || lowerPath.includes('invoice') ||
      lowerName.includes('receipt') || lowerName.includes('invoice') ||
      lowerName.includes('inv-')) {
    return 'receipt'
  }

  // Bills
  if (lowerPath.includes('bills') || lowerPath.includes('bill')) {
    return 'receipt'
  }

  // Agreements and other non-statement docs
  if (lowerPath.includes('agreement') || lowerPath.includes('payroll') ||
      lowerPath.includes('e-transfer') || lowerName.includes('agreement')) {
    return 'other'
  }

  // Investment statements
  if (lowerPath.includes('investment') || lowerPath.includes('direct investing') ||
      lowerName.includes('investment')) {
    return 'investment'
  }

  // Bank statements (most common case — directories with statement-like names)
  if (lowerPath.includes('bank statement') || lowerPath.includes('credit card') ||
      lowerPath.includes('primary') || lowerPath.includes('savings') ||
      lowerPath.includes('chequing') || lowerPath.includes('chequ') ||
      lowerPath.includes('us incoming') || lowerPath.includes('visa') ||
      lowerPath.includes('mastercard') || lowerPath.includes('candain tire') ||
      lowerName.includes('statement')) {
    return 'statement'
  }

  // Default: classify as statement since most files in these dirs are statements
  return 'statement'
}

async function login(baseUrl: string): Promise<string> {
  const email = process.env.OPENFINANCE_USERNAME
  const password = process.env.OPENFINANCE_PASSWORD

  if (!email || !password) {
    throw new Error('OPENFINANCE_USERNAME and OPENFINANCE_PASSWORD must be set in .env')
  }

  console.log(`Logging in as ${email} to ${baseUrl}...`)

  const res = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': baseUrl,
    },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  })

  // BetterAuth returns set-cookie headers
  const cookies = res.headers.getSetCookie()
  if (!cookies || cookies.length === 0) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status}): ${body}`)
  }

  // Extract cookie values
  const cookieHeader = cookies
    .map(c => c.split(';')[0])
    .join('; ')

  console.log('Login successful!')
  return cookieHeader
}

async function uploadFile(
  baseUrl: string,
  cookie: string,
  file: FileInfo,
): Promise<{ documentId: string; statementId: string | null } | null> {
  const formData = new FormData()

  const buffer = readFileSync(file.path)
  const blob = new Blob([buffer], { type: getMimeType(file.name) })
  formData.append('file', blob, file.name)
  formData.append('documentType', file.documentType)
  formData.append('description', file.relativePath)

  const res = await fetch(`${baseUrl}/api/documents/upload`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`  FAIL: ${file.name} — ${res.status}: ${err}`)
    return null
  }

  const data = await res.json()
  return {
    documentId: data.document?.id,
    statementId: data.statementId || null,
  }
}

async function processBatch(
  baseUrl: string,
  cookie: string,
  files: Array<{ filePath: string; fileName: string; fileSize: number; statementId: string }>,
): Promise<string | null> {
  const res = await fetch(`${baseUrl}/api/statements/process-bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ files }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`  Batch processing failed: ${res.status}: ${err}`)
    return null
  }

  const data = await res.json()
  return data.jobId
}

async function waitForJob(baseUrl: string, cookie: string, jobId: string): Promise<void> {
  console.log(`  Waiting for job ${jobId}...`)
  const maxWait = 30 * 60 * 1000 // 30 minutes
  const pollInterval = 5000
  const start = Date.now()

  while (Date.now() - start < maxWait) {
    const res = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
      headers: { Cookie: cookie },
    })

    if (res.ok) {
      const data = await res.json()
      const job = data.job || data

      if (job.status === 'completed') {
        console.log(`  Job completed: ${job.completedItems}/${job.totalItems} items`)
        return
      }
      if (job.status === 'failed') {
        console.error(`  Job failed: ${job.error || 'Unknown error'}`)
        return
      }

      console.log(`  Progress: ${job.completedItems || 0}/${job.totalItems || 0} (${job.progress || 0}%)`)
    }

    await sleep(pollInterval)
  }

  console.error('  Job timed out after 30 minutes')
}

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase()
  const types: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.csv': 'text/csv',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  }
  return types[ext] || 'application/octet-stream'
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('=== OpenFinance Bulk Upload ===')
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Batch size: ${batchSize}`)
  console.log(`Dry run: ${dryRun}`)
  console.log()

  // Collect all files
  const allFiles: FileInfo[] = []
  for (const dir of DIRS) {
    console.log(`Scanning: ${dir}`)
    const files = collectFiles(dir, dir)
    console.log(`  Found ${files.length} uploadable files`)
    allFiles.push(...files)
  }

  const statementFiles = allFiles.filter(f => f.documentType === 'statement')
  const referenceFiles = allFiles.filter(f => f.documentType !== 'statement')

  console.log(`\nTotal: ${allFiles.length} files`)
  console.log(`  Statements (PDFs): ${statementFiles.length}`)
  console.log(`  Reference files: ${referenceFiles.length}`)

  if (dryRun) {
    console.log('\n[DRY RUN] Would upload:')
    for (const f of allFiles.slice(0, 20)) {
      console.log(`  ${f.documentType.padEnd(12)} ${f.relativePath}`)
    }
    if (allFiles.length > 20) {
      console.log(`  ... and ${allFiles.length - 20} more`)
    }
    return
  }

  // Login
  const cookie = await login(baseUrl)

  // Upload all files and collect statement IDs
  const statementIds: Array<{ filePath: string; fileName: string; fileSize: number; statementId: string }> = []
  let uploadedCount = 0
  let failedCount = 0

  for (const file of allFiles) {
    uploadedCount++
    const progress = `[${uploadedCount}/${allFiles.length}]`
    process.stdout.write(`${progress} Uploading: ${file.relativePath}...`)

    try {
      const result = await uploadFile(baseUrl, cookie, file)
      if (result) {
        console.log(` OK${result.statementId ? ' (statement)' : ''}`)
        if (result.statementId) {
          statementIds.push({
            filePath: '',
            fileName: file.name,
            fileSize: file.size,
            statementId: result.statementId,
          })
        }
      } else {
        failedCount++
      }
    } catch (err) {
      console.log(` ERROR: ${err}`)
      failedCount++
    }

    // Small delay to avoid overwhelming the server
    if (uploadedCount % 10 === 0) {
      await sleep(500)
    }
  }

  console.log(`\nUpload complete: ${uploadedCount - failedCount} succeeded, ${failedCount} failed`)
  console.log(`Statements to process: ${statementIds.length}`)

  if (statementIds.length === 0) {
    console.log('No statements to process. Done!')
    return
  }

  // Process statements in batches
  const batches = []
  for (let i = 0; i < statementIds.length; i += batchSize) {
    batches.push(statementIds.slice(i, i + batchSize))
  }

  console.log(`\nProcessing ${statementIds.length} statements in ${batches.length} batch(es)...`)

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    console.log(`\nBatch ${i + 1}/${batches.length} (${batch.length} files)`)

    const jobId = await processBatch(baseUrl, cookie, batch)
    if (jobId) {
      await waitForJob(baseUrl, cookie, jobId)
    }
  }

  console.log('\n=== All done! ===')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
