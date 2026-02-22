'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  HardDrive,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { formatFileSize } from './document-types'

interface DriveFile {
  fileId: string
  fileName: string
  filePath: string
  mimeType: string
  size: number
  modifiedTime: string
  alreadyImported: boolean
  duplicateByNameSize: boolean
}

type ImportPhase = 'idle' | 'checking' | 'scanning' | 'selecting' | 'importing' | 'done'

export function DriveImportSheet() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [importResults, setImportResults] = useState<{
    imported: number
    skipped: number
  } | null>(null)
  const router = useRouter()

  const checkConnection = useCallback(async () => {
    setPhase('checking')
    try {
      const res = await fetch('/api/drive/status')
      if (res.ok) {
        const data = await res.json()
        setDriveConnected(data.connected)
        if (!data.connected) {
          setPhase('idle')
        }
      }
    } catch {
      setDriveConnected(false)
      setPhase('idle')
    }
  }, [])

  useEffect(() => {
    if (open) {
      checkConnection()
    } else {
      // Reset on close
      setPhase('idle')
      setFiles([])
      setSelectedIds(new Set())
      setSearchQuery('')
      setImportResults(null)
    }
  }, [open, checkConnection])

  // Auto-start scan when connection confirmed
  useEffect(() => {
    if (driveConnected && phase === 'checking') {
      handleScan()
    }
  }, [driveConnected, phase])

  async function handleScan() {
    setPhase('scanning')
    try {
      const res = await fetch('/api/drive/scan', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Scan failed')
      }

      const data = await res.json()
      setFiles(data.files)
      setPhase('selecting')

      // Pre-select all non-imported, non-duplicate files
      const autoSelect = new Set<string>()
      for (const file of data.files) {
        if (!file.alreadyImported && !file.duplicateByNameSize) {
          autoSelect.add(file.fileId)
        }
      }
      setSelectedIds(autoSelect)
    } catch (error) {
      toast.error('Scan failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setPhase('idle')
    }
  }

  async function handleImport() {
    if (selectedIds.size === 0) return

    setPhase('importing')
    const toastId = toast.loading(`Importing ${selectedIds.size} file(s)...`)

    try {
      const fileNames: Record<string, string> = {}
      for (const file of files) {
        if (selectedIds.has(file.fileId)) {
          fileNames[file.fileId] = file.fileName
        }
      }

      const res = await fetch('/api/drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: Array.from(selectedIds),
          fileNames,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setImportResults({ imported: data.imported, skipped: data.skipped })
      setPhase('done')

      toast.success('Import complete', {
        id: toastId,
        description: `${data.imported} file(s) imported, ${data.skipped} skipped`,
      })

      router.refresh()
    } catch (error) {
      toast.error('Import failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setPhase('selecting')
    }
  }

  function handleClose() {
    if (phase !== 'importing') {
      setOpen(false)
    }
  }

  function toggleFile(fileId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  function toggleAll(filteredFiles: DriveFile[]) {
    const selectableFiles = filteredFiles.filter(
      f => !f.alreadyImported,
    )
    const allSelected = selectableFiles.every(f => selectedIds.has(f.fileId))

    setSelectedIds(prev => {
      const next = new Set(prev)
      for (const file of selectableFiles) {
        if (allSelected) {
          next.delete(file.fileId)
        } else {
          next.add(file.fileId)
        }
      }
      return next
    })
  }

  const filteredFiles = files.filter(f => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      f.fileName.toLowerCase().includes(q) ||
      f.filePath.toLowerCase().includes(q)
    )
  })

  const selectableCount = filteredFiles.filter(f => !f.alreadyImported).length
  const selectedCount = filteredFiles.filter(
    f => selectedIds.has(f.fileId) && !f.alreadyImported,
  ).length

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <HardDrive className="h-4 w-4" />
        Import from Google Drive
      </Button>

      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Import from Google Drive</SheetTitle>
            <SheetDescription>
              Scan your Google Drive for PDF files and import them.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Not connected state */}
            {driveConnected === false && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <HardDrive className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  Google Drive not connected
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Go to Settings to connect your Google Drive account first.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setOpen(false)
                    router.push('/settings')
                  }}
                >
                  Go to Settings
                </Button>
              </div>
            )}

            {/* Checking / Scanning state */}
            {(phase === 'checking' || phase === 'scanning') && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-4 text-sm text-gray-600">
                  {phase === 'checking'
                    ? 'Checking connection...'
                    : 'Scanning Google Drive for PDFs...'}
                </p>
                {phase === 'scanning' && (
                  <p className="mt-1 text-xs text-gray-400">
                    This may take a moment for large drives.
                  </p>
                )}
              </div>
            )}

            {/* File selection state */}
            {phase === 'selecting' && (
              <>
                {files.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <FileText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      No PDF files found
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Your Google Drive doesn&apos;t contain any PDF files.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Select all / count */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={selectableCount > 0 && selectedCount === selectableCount}
                          onChange={() => toggleAll(filteredFiles)}
                          className="rounded border-gray-300"
                        />
                        Select all ({selectableCount})
                      </label>
                      <p className="text-sm text-gray-500">
                        {selectedIds.size} selected
                      </p>
                    </div>

                    {/* File list */}
                    <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-gray-200">
                      {filteredFiles.map(file => (
                        <label
                          key={file.fileId}
                          className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-gray-50 ${
                            file.alreadyImported ? 'opacity-60' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(file.fileId)}
                            onChange={() => toggleFile(file.fileId)}
                            disabled={file.alreadyImported}
                            className="mt-0.5 rounded border-gray-300"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {file.fileName}
                              </p>
                              {file.alreadyImported && (
                                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  imported
                                </span>
                              )}
                              {!file.alreadyImported && file.duplicateByNameSize && (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  possible duplicate
                                </span>
                              )}
                            </div>
                            {file.filePath && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-400">
                                <FolderOpen className="h-3 w-3 shrink-0" />
                                {file.filePath}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-gray-400">
                              {formatFileSize(file.size)}
                              {' · '}
                              {new Date(file.modifiedTime).toLocaleDateString()}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Import button */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleScan}
                        variant="outline"
                        className="flex-1"
                      >
                        Rescan
                      </Button>
                      <Button
                        onClick={handleImport}
                        disabled={selectedIds.size === 0}
                        className="flex-1"
                      >
                        <HardDrive className="h-4 w-4" />
                        Import {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Importing state */}
            {phase === 'importing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <p className="mt-4 text-sm text-gray-600">
                  Importing {selectedIds.size} file(s)...
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Downloading from Google Drive. Please wait.
                </p>
              </div>
            )}

            {/* Done state */}
            {phase === 'done' && importResults && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  {importResults.imported > 0 ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-amber-500" />
                  )}
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    Import complete
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {importResults.imported} imported, {importResults.skipped} skipped
                  </p>
                </div>
                <Button onClick={handleClose} className="w-full">
                  Close
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
