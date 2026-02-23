'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  FolderOpen,
  FileText,
  ChevronRight,
  ArrowLeft,
  Check,
  AlertCircle,
  HardDrive,
  Unplug,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatFileSize } from './document-types'
import { showJobProgressToast } from '@/lib/jobs/job-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 'connect' | 'browse' | 'files' | 'importing'

interface DriveFolder {
  id: string
  name: string
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number
  modifiedTime: string
}

interface ConnectionStatus {
  connected: boolean
  email?: string | null
}

interface ImportResult {
  fileId: string
  fileName: string
  success: boolean
  error?: string
  statementId?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GoogleDriveImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GoogleDriveImportWizard({ open, onOpenChange }: GoogleDriveImportWizardProps) {
  const router = useRouter()

  // Connection state
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)

  // Explicit step tracking
  const [currentStep, setCurrentStep] = useState<WizardStep>('connect')

  // Folder navigation state
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [folderStack, setFolderStack] = useState<Array<{ id: string; name: string }>>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  // File selection state
  const [files, setFiles] = useState<DriveFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [loadingFiles, setLoadingFiles] = useState(false)

  // Import state
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])

  // ---------------------------------------------------------------------------
  // Check connection status when modal opens
  // ---------------------------------------------------------------------------

  const checkStatus = useCallback(async () => {
    setCheckingStatus(true)
    try {
      const res = await fetch('/api/google-drive/status')
      const data = await res.json()
      setStatus(data)
      // Set initial step based on connection status
      if (data.connected) {
        setCurrentStep('browse')
      } else {
        setCurrentStep('connect')
      }
    } catch {
      setStatus({ connected: false })
      setCurrentStep('connect')
    } finally {
      setCheckingStatus(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      // Reset all state when opening
      setFolders([])
      setFolderStack([])
      setFiles([])
      setSelectedFileIds(new Set())
      setImportResults([])
      setImporting(false)
      checkStatus()
    }
  }, [open, checkStatus])

  // Load root folders when entering browse step
  useEffect(() => {
    if (currentStep === 'browse' && status?.connected && folders.length === 0 && !loadingFolders && open) {
      loadFolders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, status?.connected, open])

  // ---------------------------------------------------------------------------
  // OAuth connect flow
  // ---------------------------------------------------------------------------

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/google-drive/connect', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to start connection')
        setConnecting(false)
        return
      }

      // Open OAuth in a popup window
      const popup = window.open(
        data.url,
        'google-drive-connect',
        'width=600,height=700,popup=yes',
      )

      // Poll for popup close (OAuth completed or cancelled)
      const pollInterval = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(pollInterval)
          setConnecting(false)
          // Recheck status after OAuth flow completes
          await checkStatus()
        }
      }, 500)
    } catch {
      toast.error('Failed to connect Google Drive')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    try {
      await fetch('/api/google-drive/disconnect', { method: 'POST' })
      setStatus({ connected: false })
      setCurrentStep('connect')
      setFolders([])
      setFolderStack([])
      setFiles([])
      setSelectedFileIds(new Set())
      toast.success('Google Drive disconnected')
    } catch {
      toast.error('Failed to disconnect')
    }
  }

  // ---------------------------------------------------------------------------
  // Folder navigation
  // ---------------------------------------------------------------------------

  async function loadFolders(parentId?: string) {
    setLoadingFolders(true)
    try {
      const params = parentId ? `?parentId=${parentId}` : ''
      const res = await fetch(`/api/google-drive/folders${params}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to load folders')
        return
      }

      setFolders(data.folders)
    } catch {
      toast.error('Failed to load folders')
    } finally {
      setLoadingFolders(false)
    }
  }

  function handleFolderClick(folder: DriveFolder) {
    setFolderStack(prev => [...prev, folder])
    setFolders([])
    loadFolders(folder.id)
    // Also pre-load files for this folder
    loadFiles(folder.id)
  }

  function handleFolderBack() {
    const newStack = [...folderStack]
    newStack.pop()
    setFolderStack(newStack)
    setFiles([])
    setSelectedFileIds(new Set())

    const parentId = newStack.length > 0
      ? newStack[newStack.length - 1].id
      : undefined
    loadFolders(parentId)
  }

  function handleSelectFilesFromFolder() {
    setCurrentStep('files')
  }

  // ---------------------------------------------------------------------------
  // File listing & selection
  // ---------------------------------------------------------------------------

  async function loadFiles(folderId: string) {
    setLoadingFiles(true)
    try {
      const res = await fetch(`/api/google-drive/files?folderId=${folderId}`)
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to load files')
        return
      }

      setFiles(data.files)
    } catch {
      toast.error('Failed to load files')
    } finally {
      setLoadingFiles(false)
    }
  }

  function handleToggleFile(fileId: string) {
    setSelectedFileIds(prev => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  function handleToggleAllFiles() {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set())
    } else {
      setSelectedFileIds(new Set(files.map(f => f.id)))
    }
  }

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  async function handleImport() {
    const selectedFiles = files.filter(f => selectedFileIds.has(f.id))
    if (selectedFiles.length === 0) return

    setCurrentStep('importing')
    setImporting(true)
    setImportResults([])

    try {
      const res = await fetch('/api/google-drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: selectedFiles.map(f => ({
            fileId: f.id,
            fileName: f.name,
            mimeType: f.mimeType,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        setImporting(false)
        return
      }

      setImportResults(data.results)

      const successCount = data.successCount as number
      const totalCount = data.totalCount as number

      if (successCount === totalCount) {
        toast.success(`Imported ${successCount} file${successCount !== 1 ? 's' : ''}`)
      } else if (successCount > 0) {
        toast.warning(`Imported ${successCount} of ${totalCount} files`)
      } else {
        toast.error('No files were imported')
      }

      // If any statements were created, trigger processing
      const statementIds = data.statementIds as string[]
      if (statementIds.length === 1) {
        const stmtResult = data.results.find(
          (r: ImportResult) => r.statementId === statementIds[0],
        )
        if (stmtResult) {
          toast.info('Processing imported statement...', {
            description: stmtResult.fileName,
          })
          fetch('/api/process-statement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statementId: statementIds[0] }),
          }).then(() => router.refresh())
        }
      } else if (statementIds.length > 1) {
        try {
          const bulkRes = await fetch('/api/statements/process-bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: data.results
                .filter((r: ImportResult) => r.statementId)
                .map((r: ImportResult) => ({ statementId: r.statementId })),
            }),
          })
          const bulkData = await bulkRes.json()
          if (bulkRes.ok && bulkData.jobId) {
            showJobProgressToast(bulkData.jobId, statementIds.length)
          }
        } catch {
          // Bulk processing is optional -- files were still imported
        }
      }

      router.refresh()
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Breadcrumb for current folder path
  // ---------------------------------------------------------------------------

  function renderBreadcrumbs() {
    return (
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <button
          onClick={() => {
            setFolderStack([])
            setFiles([])
            setSelectedFileIds(new Set())
            setCurrentStep('browse')
            loadFolders()
          }}
          className="hover:text-gray-900"
        >
          My Drive
        </button>
        {folderStack.map((folder, i) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <button
              onClick={() => {
                const newStack = folderStack.slice(0, i + 1)
                setFolderStack(newStack)
                setFiles([])
                setSelectedFileIds(new Set())
                setCurrentStep('browse')
                loadFolders(folder.id)
                loadFiles(folder.id)
              }}
              className="hover:text-gray-900"
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Step indicator
  // ---------------------------------------------------------------------------

  function renderStepIndicator() {
    const steps: Array<{ key: WizardStep; label: string }> = [
      { key: 'connect', label: 'Connect' },
      { key: 'browse', label: 'Browse' },
      { key: 'files', label: 'Select' },
      { key: 'importing', label: 'Import' },
    ]

    const currentIdx = steps.findIndex(s => s.key === currentStep)

    return (
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i < currentIdx
                  ? 'bg-violet-600 text-white'
                  : i === currentIdx
                    ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < currentIdx ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span
              className={`text-xs ${
                i === currentIdx ? 'font-medium text-gray-900' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 ${i < currentIdx ? 'bg-violet-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Step descriptions
  // ---------------------------------------------------------------------------

  const stepDescriptions: Record<WizardStep, string> = {
    connect: 'Connect your Google Drive to import documents.',
    browse: 'Browse your Google Drive folders to find files.',
    files: 'Select files to import into OpenFinance.',
    importing: 'Importing your selected files...',
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-violet-600" />
            Import from Google Drive
          </DialogTitle>
          <DialogDescription>
            {stepDescriptions[currentStep]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="border-b border-gray-100 pb-3">
          {renderStepIndicator()}
        </div>

        {/* Loading initial status */}
        {checkingStatus && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
          </div>
        )}

        {/* Step 1: Connect */}
        {!checkingStatus && currentStep === 'connect' && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-50">
              <HardDrive className="h-8 w-8 text-violet-600" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Connect your Google Drive</h3>
              <p className="mt-1 text-sm text-gray-500">
                OpenFinance needs read-only access to browse and import your files.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              size="lg"
              className="gap-2"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <HardDrive className="h-4 w-4" />
                  Connect Google Drive
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Browse folders */}
        {!checkingStatus && currentStep === 'browse' && (
          <div className="space-y-3">
            {/* Connected account info */}
            {status?.email && (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                <span className="text-green-700">
                  Connected as <span className="font-medium">{status.email}</span>
                </span>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600"
                >
                  <Unplug className="h-3 w-3" />
                  Disconnect
                </button>
              </div>
            )}

            {/* Breadcrumbs */}
            {renderBreadcrumbs()}

            {/* Back button when inside a subfolder */}
            {folderStack.length > 0 && (
              <button
                onClick={handleFolderBack}
                className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800"
              >
                <ArrowLeft className="h-3 w-3" />
                Back
              </button>
            )}

            {/* Folder list */}
            {loadingFolders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              </div>
            ) : folders.length === 0 && folderStack.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No folders found in your Google Drive root.
              </div>
            ) : (
              <>
                {folders.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-gray-50"
                      >
                        <FolderOpen className="h-5 w-5 shrink-0 text-violet-500" />
                        <span className="truncate text-sm font-medium text-gray-900">
                          {folder.name}
                        </span>
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                )}
                {folders.length === 0 && folderStack.length > 0 && (
                  <div className="py-4 text-center text-sm text-gray-500">
                    No subfolders in this folder.
                  </div>
                )}
              </>
            )}

            {/* File preview for current folder */}
            {folderStack.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">
                    Files in {folderStack[folderStack.length - 1].name}
                  </h4>
                  {!loadingFiles && files.length > 0 && (
                    <Button
                      size="sm"
                      onClick={handleSelectFilesFromFolder}
                    >
                      Select files ({files.length})
                    </Button>
                  )}
                </div>
                {loadingFiles ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  </div>
                ) : files.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No importable files in this folder.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    {files.length} importable file{files.length !== 1 ? 's' : ''} found.
                    Click &quot;Select files&quot; to choose which to import.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Select files */}
        {!checkingStatus && currentStep === 'files' && (
          <div className="space-y-3">
            {/* Breadcrumbs */}
            {renderBreadcrumbs()}

            {/* Back to folder browser */}
            <button
              onClick={() => {
                setSelectedFileIds(new Set())
                setCurrentStep('browse')
              }}
              className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-800"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to folders
            </button>

            {/* Loading files */}
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              </div>
            ) : files.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No importable files found in this folder.
                <br />
                Supported formats: PDF, CSV, TXT, Markdown, Images, Excel
              </div>
            ) : (
              <>
                {/* Select all / count */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedFileIds.size === files.length && files.length > 0}
                      ref={el => {
                        if (el) el.indeterminate = selectedFileIds.size > 0 && selectedFileIds.size < files.length
                      }}
                      onChange={handleToggleAllFiles}
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    Select all ({files.length} file{files.length !== 1 ? 's' : ''})
                  </label>
                  {selectedFileIds.size > 0 && (
                    <span className="text-sm font-medium text-violet-600">
                      {selectedFileIds.size} selected
                    </span>
                  )}
                </div>

                {/* File list */}
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                  {files.map(file => (
                    <label
                      key={file.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFileIds.has(file.id)}
                        onChange={() => handleToggleFile(file.id)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <FileText className="h-5 w-5 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                          {' -- '}
                          {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Import button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleImport}
                    disabled={selectedFileIds.size === 0}
                    className="gap-2"
                  >
                    Import {selectedFileIds.size} file{selectedFileIds.size !== 1 ? 's' : ''}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Import progress / results */}
        {!checkingStatus && currentStep === 'importing' && (
          <div className="space-y-4 py-4">
            {importing && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <p className="text-sm font-medium text-gray-700">
                  Importing files from Google Drive...
                </p>
              </div>
            )}

            {!importing && importResults.length > 0 && (
              <>
                <div className="rounded-lg border border-gray-200">
                  {importResults.map(result => (
                    <div
                      key={result.fileId}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0"
                    >
                      {result.success ? (
                        <Check className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <span className="truncate text-sm text-gray-900">{result.fileName}</span>
                      {result.error && (
                        <span className="ml-auto shrink-0 text-xs text-red-500">{result.error}</span>
                      )}
                      {result.success && (
                        <span className="ml-auto shrink-0 text-xs text-green-600">Imported</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportResults([])
                      setSelectedFileIds(new Set())
                      setCurrentStep('browse')
                    }}
                  >
                    Import More
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
