'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function UploadButton() {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Uploading PDF...', {
      description: file.name,
    })

    try {
      // Upload PDF
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const { filePath, fileName, size } = await uploadRes.json()

      // Process statement with AI
      toast.loading('Processing with AI...', {
        id: toastId,
        description: `${fileName} — Extracting text and analyzing transactions`,
      })

      const processRes = await fetch('/api/process-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, fileName, fileSize: size }),
      })

      const result = await processRes.json()

      if (processRes.status === 409 && result.isDuplicate) {
        toast.warning('Duplicate statement', {
          id: toastId,
          description: `${fileName} has already been uploaded`,
        })
        return
      }

      if (!processRes.ok) {
        throw new Error(result.error || 'Processing failed')
      }

      const transactionCount = result.data?.transactionCount ?? 0
      const balanceStatus = result.data?.isBalanced ? 'Balanced' : 'Unbalanced'

      toast.success('Statement processed!', {
        id: toastId,
        description: `${transactionCount} transactions extracted — ${balanceStatus}`,
      })

      router.refresh()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Processing failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Statement
          </>
        )}
      </Button>
    </>
  )
}
