'use client'

import { Button } from '@/components/ui/button'
import { ChevronDown, FolderOpen, Loader2, Upload } from 'lucide-react'
import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface ImportedStatement {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  status: string
}

export function UploadButton() {
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    // For a single PDF (not zip), use the simple flow
    if (fileArray.length === 1 && !fileArray[0].name.toLowerCase().endsWith('.zip')) {
      await handleSingleFile(fileArray[0])
      return
    }

    await handleBulkUpload(fileArray)
  }

  async function handleSingleFile(file: File) {
    setUploading(true)
    const toastId = toast.loading('Importing statement...', {
      description: file.name,
    })

    try {
      // Phase 1: Import (store file + create DB record)
      const formData = new FormData()
      formData.append('file', file)

      const importRes = await fetch('/api/statements/import', {
        method: 'POST',
        body: formData,
      })

      if (!importRes.ok) {
        const err = await importRes.json()
        throw new Error(err.error || 'Import failed')
      }

      const { statement } = await importRes.json() as { statement: ImportedStatement }

      // Phase 2: Process (extract text + AI processing)
      toast.loading('Processing with AI...', {
        id: toastId,
        description: `${statement.fileName} — Extracting text and analyzing transactions`,
      })

      const processRes = await fetch(`/api/statements/${statement.id}/reprocess`, {
        method: 'POST',
      })

      const result = await processRes.json()

      if (processRes.status === 409 && result.isDuplicate) {
        toast.warning('Duplicate statement', {
          id: toastId,
          description: `${statement.fileName} has already been uploaded`,
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
      router.refresh()
    } finally {
      setUploading(false)
      resetInputs()
    }
  }

  async function handleBulkUpload(files: File[]) {
    setUploading(true)
    const batchToastId = toast.loading(`Importing ${files.length} file${files.length > 1 ? 's' : ''}...`, {
      description: 'Preparing upload...',
    })

    try {
      // Phase 1: Bulk import (store files + create DB records)
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }

      const importRes = await fetch('/api/statements/import/bulk', {
        method: 'POST',
        body: formData,
      })

      if (!importRes.ok) {
        const err = await importRes.json()
        throw new Error(err.error || 'Import failed')
      }

      const { imported, errors: importErrors } = await importRes.json() as {
        imported: ImportedStatement[]
        errors: { fileName: string; error: string }[]
      }

      // Show import errors
      for (const err of importErrors) {
        toast.error(`Import failed: ${err.fileName}`, {
          description: err.error,
        })
      }

      if (imported.length === 0) {
        toast.error('No files imported', {
          id: batchToastId,
          description: 'No valid PDF files were found',
        })
        return
      }

      // Phase 2: Create a Job and process via bulk endpoint
      toast.loading(`Starting batch processing for ${imported.length} statements...`, {
        id: batchToastId,
      })

      const processRes = await fetch('/api/statements/process-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: imported.map(stmt => ({
            filePath: stmt.fileUrl,
            fileName: stmt.fileName,
            fileSize: stmt.fileSize,
            statementId: stmt.id,
          })),
        }),
      })

      const processResult = await processRes.json()

      if (!processRes.ok) {
        toast.error('Failed to start batch processing', {
          id: batchToastId,
          description: processResult.error || 'Unknown error',
        })
        return
      }

      toast.success(`Processing ${processResult.totalItems} statements`, {
        id: batchToastId,
        description: 'Track progress via the floating indicator or the Jobs page',
      })

      router.refresh()
    } catch (error) {
      console.error('Bulk upload error:', error)
      toast.error('Bulk upload failed', {
        id: batchToastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      router.refresh()
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
