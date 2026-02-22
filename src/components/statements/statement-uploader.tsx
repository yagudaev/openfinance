'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { UppyUploader } from '@/components/upload/uppy-uploader'

interface UploadedFile {
  name: string
  response?: { body: { filePath: string; fileName: string; size: number } }
}

export function StatementUploader() {
  const router = useRouter()
  const [processing, setProcessing] = useState(false)

  const handleUploadComplete = useCallback(async (result: { successful: unknown[]; failed: unknown[] }) => {
    const successful = result.successful as UploadedFile[]
    const failed = result.failed as Array<{ name: string }>

    if (failed.length > 0) {
      for (const file of failed) {
        toast.error(`Upload failed: ${file.name}`)
      }
    }

    if (successful.length === 0) return

    setProcessing(true)

    if (successful.length === 1) {
      await processSingleFile(successful[0])
    } else {
      await processBulkFiles(successful)
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

async function processSingleFile(file: UploadedFile) {
  const body = file.response?.body
  if (!body) {
    toast.error(`No upload response for ${file.name}`)
    return
  }

  const toastId = toast.loading('Processing statement...', {
    description: file.name,
  })

  try {
    const res = await fetch('/api/process-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: body.filePath,
        fileName: body.fileName,
        fileSize: body.size,
      }),
    })

    const result = await res.json()

    if (res.status === 409 && result.isDuplicate) {
      toast.warning('Duplicate statement', {
        id: toastId,
        description: file.name,
      })
    } else if (!res.ok) {
      toast.error('Processing failed', {
        id: toastId,
        description: result.error || file.name,
      })
    } else {
      const txCount = result.data?.transactionCount ?? 0
      toast.success('Statement processed!', {
        id: toastId,
        description: `${txCount} transactions extracted from ${file.name}`,
      })
    }
  } catch (error) {
    toast.error('Processing failed', {
      id: toastId,
      description: error instanceof Error ? error.message : file.name,
    })
  }
}

async function processBulkFiles(files: UploadedFile[]) {
  const validFiles = files.filter(f => f.response?.body)

  if (validFiles.length === 0) {
    toast.error('No valid files to process')
    return
  }

  const toastId = toast.loading(
    `Starting batch processing for ${validFiles.length} statements...`,
  )

  try {
    const res = await fetch('/api/statements/process-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: validFiles.map(f => ({
          filePath: f.response!.body.filePath,
          fileName: f.response!.body.fileName,
          fileSize: f.response!.body.size,
        })),
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error('Failed to start batch processing', {
        id: toastId,
        description: result.error || 'Unknown error',
      })
      return
    }

    toast.success(`Processing ${result.totalItems} statements`, {
      id: toastId,
      description: 'Track progress via the floating indicator or the Jobs page',
    })
  } catch (error) {
    toast.error('Failed to start batch processing', {
      id: toastId,
      description: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
