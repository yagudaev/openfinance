'use client'

import { Button } from '@/components/ui/button'
import { ChevronDown, FolderOpen, Loader2, Upload } from 'lucide-react'
import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UploadedFile {
  filePath: string
  fileName: string
  size: number
}

interface ProcessResult {
  fileName: string
  success: boolean
  transactionCount?: number
  isBalanced?: boolean
  isDuplicate?: boolean
  error?: string
}

export function UploadButton() {
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  async function processFile(
    file: UploadedFile,
    index: number,
    total: number,
    batchToastId: string | number,
  ): Promise<ProcessResult> {
    toast.loading(`Processing ${index + 1} of ${total} statements...`, {
      id: batchToastId,
      description: file.fileName,
    })

    const processRes = await fetch('/api/process-statement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath: file.filePath,
        fileName: file.fileName,
        fileSize: file.size,
      }),
    })

    const result = await processRes.json()

    if (processRes.status === 409 && result.isDuplicate) {
      return { fileName: file.fileName, success: false, isDuplicate: true }
    }

    if (!processRes.ok) {
      return {
        fileName: file.fileName,
        success: false,
        error: result.error || 'Processing failed',
      }
    }

    return {
      fileName: file.fileName,
      success: true,
      transactionCount: result.data?.transactionCount ?? 0,
      isBalanced: result.data?.isBalanced,
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // For a single PDF (not zip), use the original simple flow
    if (fileArray.length === 1 && !fileArray[0].name.toLowerCase().endsWith('.zip')) {
      await handleSingleFile(fileArray[0])
      return
    }

    await handleBulkUpload(fileArray)
  }

  async function handleSingleFile(file: File) {
    setUploading(true)
    const toastId = toast.loading('Uploading PDF...', {
      description: file.name,
    })

    try {
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
      resetInputs()
    }
  }

  async function handleBulkUpload(files: File[]) {
    setUploading(true)
    const batchToastId = toast.loading(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`, {
      description: 'Preparing upload...',
    })

    try {
      // Upload all files via bulk endpoint
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const uploadRes = await fetch('/api/upload/bulk', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const { uploaded, errors: uploadErrors } = await uploadRes.json() as {
        uploaded: UploadedFile[]
        errors: { fileName: string, error: string }[]
      }

      // Show upload errors
      for (const err of uploadErrors) {
        toast.error(`Upload failed: ${err.fileName}`, {
          description: err.error,
        })
      }

      if (uploaded.length === 0) {
        toast.error('No files uploaded', {
          id: batchToastId,
          description: 'No valid PDF files were found',
        })
        return
      }

      // Process each uploaded file sequentially
      const results: ProcessResult[] = []

      for (let i = 0; i < uploaded.length; i++) {
        const result = await processFile(uploaded[i], i, uploaded.length, batchToastId)
        results.push(result)
      }

      // Summarize results
      const succeeded = results.filter(r => r.success)
      const duplicates = results.filter(r => r.isDuplicate)
      const failed = results.filter(r => !r.success && !r.isDuplicate)
      const totalTransactions = succeeded.reduce((sum, r) => sum + (r.transactionCount ?? 0), 0)

      const parts: string[] = []
      if (succeeded.length > 0) {
        parts.push(`${succeeded.length} processed (${totalTransactions} transactions)`)
      }
      if (duplicates.length > 0) {
        parts.push(`${duplicates.length} duplicate${duplicates.length > 1 ? 's' : ''}`)
      }
      if (failed.length > 0) {
        parts.push(`${failed.length} failed`)
      }

      if (failed.length > 0 && succeeded.length === 0) {
        toast.error('Batch processing failed', {
          id: batchToastId,
          description: parts.join(' · '),
        })
      } else if (failed.length > 0 || duplicates.length > 0) {
        toast.warning('Batch complete with issues', {
          id: batchToastId,
          description: parts.join(' · '),
        })
      } else {
        toast.success('All statements processed!', {
          id: batchToastId,
          description: parts.join(' · '),
        })
      }

      router.refresh()
    } catch (error) {
      console.error('Bulk upload error:', error)
      toast.error('Bulk upload failed', {
        id: batchToastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setUploading(false)
      resetInputs()
    }
  }

  function resetInputs() {
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) handleFiles(files)
  }

  function handleFolderInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Filter to only PDF files from the directory
    const pdfFiles = Array.from(files).filter(
      f => f.name.toLowerCase().endsWith('.pdf'),
    )

    if (pdfFiles.length === 0) {
      toast.error('No PDF files found', {
        description: 'The selected folder does not contain any PDF files',
      })
      return
    }

    handleFiles(pdfFiles)
  }

  return (
    <div className="relative">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.zip"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        disabled={uploading}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error — webkitdirectory is not in React's type defs
        webkitdirectory=""
        onChange={handleFolderInputChange}
        className="hidden"
        disabled={uploading}
      />

      <div className="flex">
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="rounded-r-none"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Statements
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="-ml-px rounded-l-none border-l-0"
          disabled={uploading}
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="More upload options"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {menuOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
          />
          <div
            ref={menuRef}
            className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          >
            <button
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => {
                closeMenu()
                folderInputRef.current?.click()
              }}
            >
              <FolderOpen className="h-4 w-4" />
              Upload Folder
            </button>
          </div>
        </>
      )}
    </div>
  )
}
