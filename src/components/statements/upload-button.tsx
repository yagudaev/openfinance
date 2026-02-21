'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export function UploadButton() {
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      // Upload PDF
      setStatus('Uploading PDF...')
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
      setStatus('Processing with AI...')
      const processRes = await fetch('/api/process-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, fileName, fileSize: size }),
      })

      const result = await processRes.json()

      if (processRes.status === 409 && result.isDuplicate) {
        setStatus('Duplicate statement detected')
        return
      }

      if (!processRes.ok) {
        throw new Error(result.error || 'Processing failed')
      }

      setStatus('Done!')
      router.refresh()
    } catch (error) {
      console.error('Upload error:', error)
      setStatus(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setTimeout(() => {
        setUploading(false)
        setStatus('')
      }, 2000)
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
            {status || 'Processing...'}
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
