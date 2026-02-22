/**
 * Re-process all pending bank statements.
 *
 * Usage:
 *   npx tsx scripts/reprocess-pending.ts [--base-url URL] [--batch-size N]
 *
 * Reads OPENFINANCE_USERNAME and OPENFINANCE_PASSWORD from .env.
 * Finds all BankStatement records with status 'pending' and submits
 * them for processing in batches.
 */

const args = process.argv.slice(2)
const baseUrl = getArg('--base-url') || 'https://openfinance.to'
const batchSize = parseInt(getArg('--batch-size') || '10', 10)

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : undefined
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function login(): Promise<string> {
  const email = process.env.OPENFINANCE_USERNAME || 'michael@nano3labs.com'
  const password = process.env.OPENFINANCE_PASSWORD || ''

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

  const cookies = res.headers.getSetCookie()
  if (!cookies || cookies.length === 0) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status}): ${body}`)
  }

  const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ')
  console.log('Login successful!')
  return cookieHeader
}

async function getPendingStatements(cookie: string): Promise<Array<{ id: string; fileName: string; fileSize: number }>> {
  const res = await fetch(`${baseUrl}/api/statements/pending`, {
    headers: { Cookie: cookie },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch pending statements: ${res.status}`)
  }

  const data = await res.json()
  return data.statements || []
}

async function processBatch(
  cookie: string,
  statements: Array<{ id: string; fileName: string; fileSize: number }>,
): Promise<string | null> {
  const files = statements.map(s => ({
    filePath: '',
    fileName: s.fileName,
    fileSize: s.fileSize,
    statementId: s.id,
  }))

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

async function waitForJob(cookie: string, jobId: string): Promise<void> {
  console.log(`  Waiting for job ${jobId}...`)
  const maxWait = 30 * 60 * 1000 // 30 minutes
  const pollInterval = 10000 // 10 seconds — slower poll for processing
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
        // Log individual item errors
        if (job.items) {
          const failedItems = job.items.filter((i: { status: string }) => i.status === 'failed')
          if (failedItems.length > 0) {
            console.error(`  Failed items: ${failedItems.length}`)
            console.error(`  First error: ${failedItems[0]?.error || 'unknown'}`)
          }
        }
        return
      }

      const elapsed = Math.round((Date.now() - start) / 1000)
      console.log(`  [${elapsed}s] Progress: ${job.completedItems || 0}/${job.totalItems || 0} (${job.progress || 0}%)`)
    }

    await sleep(pollInterval)
  }

  console.error('  Job timed out after 30 minutes')
}

async function main() {
  console.log('=== OpenFinance Statement Reprocessing ===')
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Batch size: ${batchSize}`)
  console.log()

  const cookie = await login()

  console.log('Fetching pending statements...')
  const pending = await getPendingStatements(cookie)
  console.log(`Found ${pending.length} pending statements`)

  if (pending.length === 0) {
    console.log('Nothing to process!')
    return
  }

  // Process in batches
  const batches = []
  for (let i = 0; i < pending.length; i += batchSize) {
    batches.push(pending.slice(i, i + batchSize))
  }

  console.log(`Processing ${pending.length} statements in ${batches.length} batch(es)...`)

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    console.log(`\nBatch ${i + 1}/${batches.length} (${batch.length} files)`)
    console.log(`  Files: ${batch.map(s => s.fileName).join(', ')}`)

    const jobId = await processBatch(cookie, batch)
    if (jobId) {
      await waitForJob(cookie, jobId)
      successCount += batch.length
    } else {
      failCount += batch.length
    }
  }

  console.log(`\n=== Done! Processed: ${successCount}, Failed: ${failCount} ===`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
