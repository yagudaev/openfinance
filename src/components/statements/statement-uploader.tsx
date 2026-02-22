'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { UppyUploader } from '@/components/upload/uppy-uploader'

interface ProcessResult {
  fileName: string
  success: boolean
  transactionCount?: number
  isBalanced?: boolean
  isDuplicate?: boolean
  error?: string
}

export function StatementUploader() {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)

  const handleUploadComplete = useCallback(async (result: { successful: unknown[]; failed: unknown[] }) => {
    const successful = result.successful as Array<{
      name: string
      response?: { body: { filePath: string; fileName: string; size: number } }
    }>
    const failed = result.failed as Array<{ name: string }>

    if (failed.length > 0) {
      for (const file of failed) {
        toast.error(`Upload failed: ${file.name}`)
      }
    }

    if (successful.length === 0) return

    setProcessing(true)
    const batchToastId = toast.loading(
      `Processing ${successful.length} statement${successful.length > 1 ? 's' : ''}...`,
      { description: 'Extracting text and analyzing transactions' },
    )

    const results: ProcessResult[] = []

    for (let i = 0; i < successful.length; i++) {
      const file = successful[i]
      const body = file.response?.body
      if (!body) {
        results.push({ fileName: file.name, success: false, error: 'No upload response' })
        continue
      }

      toast.loading(`Processing ${i + 1} of ${successful.length}...`, {
        id: batchToastId,
        description: file.name,
      })

      try {
        const processRes = await fetch('/api/process-statement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: body.filePath,
            fileName: body.fileName,
            fileSize: body.size,
          }),
        })

        const processResult = await processRes.json()

        if (processRes.status === 409 && processResult.isDuplicate) {
          results.push({ fileName: file.name, success: false, isDuplicate: true })
        } else if (!processRes.ok) {
          results.push({
            fileName: file.name,
            success: false,
            error: processResult.error || 'Processing failed',
          })
        } else {
          results.push({
            fileName: file.name,
            success: true,
            transactionCount: processResult.data?.transactionCount ?? 0,
            isBalanced: processResult.data?.isBalanced,
          })
        }
      } catch (error) {
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Summarize results
    const succeeded = results.filter(r => r.success)
    const duplicates = results.filter(r => r.isDuplicate)
    const failures = results.filter(r => !r.success && !r.isDuplicate)
    const totalTransactions = succeeded.reduce((sum, r) => sum + (r.transactionCount ?? 0), 0)

    const parts: string[] = []
    if (succeeded.length > 0) {
      parts.push(`${succeeded.length} processed (${totalTransactions} transactions)`)
    }
    if (duplicates.length > 0) {
      parts.push(`${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}`)
    }
    if (failures.length > 0) {
      parts.push(`${failures.length} failed`)
    }

    if (failures.length > 0 && succeeded.length === 0) {
      toast.error('Processing failed', {
        id: batchToastId,
        description: parts.join(' \u00b7 '),
      })
    } else if (failures.length > 0 || duplicates.length > 0) {
      toast.warning('Processing complete with issues', {
        id: batchToastId,
        description: parts.join(' \u00b7 '),
      })
    } else {
      toast.success('All statements processed!', {
        id: batchToastId,
        description: parts.join(' \u00b7 '),
      })
    }

    setProcessing(false)
    router.refresh()
  }, [router])

  return (
    <div className="mt-6">
      {processing && (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          Processing statements with AI... This may take a moment.
        </div>
      )}
      <UppyUploader
        endpoint="/api/upload"
        allowedFileTypes={['.pdf']}
        maxFileSize={10 * 1024 * 1024}
        maxNumberOfFiles={50}
        note="PDF bank statements up to 10 MB each"
        onUploadComplete={handleUploadComplete}
        height={300}
      />
    </div>
  )
}
