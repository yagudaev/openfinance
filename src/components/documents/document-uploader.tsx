'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { UppyUploader } from '@/components/upload/uppy-uploader'

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

  const handleUploadComplete = useCallback((result: { successful: unknown[]; failed: unknown[] }) => {
    const failed = result.failed as Array<{ name: string }>

    for (const file of failed) {
      toast.error(`Upload failed: ${file.name}`)
    }

    if (result.successful.length > 0) {
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
