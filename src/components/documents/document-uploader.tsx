'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { UppyUploader } from '@/components/upload/uppy-uploader'
import { showJobProgressToast } from '@/lib/jobs/job-toast'

interface UploadedDoc {
  name: string
  response?: { body: Record<string, unknown> }
}

export function DocumentUploader() {
  const router = useRouter()

  const handleUploadSuccess = useCallback((
    file: { name: string },
    response: { body: Record<string, unknown> },
  ) => {
    const doc = response.body.document as { id: string } | undefined
    if (doc) {
      toast.success('Document uploaded', { description: file.name })
    }
  }, [])

  const handleUploadComplete = useCallback(async (result: { successful: unknown[]; failed: unknown[] }) => {
    const successful = result.successful as UploadedDoc[]
    const failed = result.failed as Array<{ name: string }>

    for (const file of failed) {
      toast.error(`Upload failed: ${file.name}`)
    }

    // Collect statement IDs from uploads classified as statements
    const statementsToProcess = successful
      .filter(f => f.response?.body?.statementId)
      .map(f => {
        const doc = f.response!.body.document as { fileUrl: string; fileSize: number }
        return {
          filePath: doc.fileUrl,
          fileName: f.name,
          fileSize: doc.fileSize,
          statementId: f.response!.body.statementId as string,
        }
      })

    // Trigger AI processing for any statement PDFs
    if (statementsToProcess.length === 1) {
      await processSingleStatement(statementsToProcess[0])
    } else if (statementsToProcess.length > 1) {
      await processBulkStatements(statementsToProcess)
    }

    if (successful.length > 0) {
      router.refresh()
    }
  }, [router])

  return (
    <div className="mt-6">
      <UppyUploader
        endpoint="/api/documents/upload"
        allowedFileTypes={['.pdf', '.md', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.xlsx', '.xls']}
        maxFileSize={10 * 1024 * 1024}
        maxNumberOfFiles={20}
        note="PDF, Markdown, CSV, Text, Images, Excel up to 10 MB"
        meta={{ documentType: 'other' }}
        allowedMetaFields={['documentType', 'description', 'tags']}
        onUploadSuccess={handleUploadSuccess}
        onUploadComplete={handleUploadComplete}
        height={300}
      />
    </div>
  )
}

async function processSingleStatement(file: {
  filePath: string
  fileName: string
  fileSize: number
  statementId: string
}) {
  const toastId = toast.loading('Processing statement...', {
    description: file.fileName,
  })

  try {
    const res = await fetch('/api/process-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: file.filePath,
        fileName: file.fileName,
        fileSize: file.fileSize,
        statementId: file.statementId,
      }),
    })

    const result = await res.json()

    if (res.status === 409 && result.isDuplicate) {
      toast.warning('Duplicate statement', {
        id: toastId,
        description: file.fileName,
      })
    } else if (!res.ok) {
      toast.error('Processing failed', {
        id: toastId,
        description: result.error || file.fileName,
      })
    } else {
      const txCount = result.data?.transactionCount ?? 0
      toast.success('Statement processed!', {
        id: toastId,
        description: `${txCount} transactions extracted from ${file.fileName}`,
      })
    }
  } catch (error) {
    toast.error('Processing failed', {
      id: toastId,
      description: error instanceof Error ? error.message : file.fileName,
    })
  }
}

async function processBulkStatements(files: Array<{
  filePath: string
  fileName: string
  fileSize: number
  statementId: string
}>) {
  try {
    const res = await fetch('/api/statements/process-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error('Failed to start batch processing', {
        description: result.error || 'Unknown error',
      })
      return
    }

    showJobProgressToast(result.jobId, files.length)
  } catch (error) {
    toast.error('Failed to start batch processing', {
      description: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
