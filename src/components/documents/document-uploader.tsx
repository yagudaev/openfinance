'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, FileUp } from 'lucide-react'
import { toast } from 'sonner'
import Uppy, { type Meta, type Body, type UppyFile } from '@uppy/core'
import DashboardModal from '@uppy/react/dashboard-modal'
import XHRUpload from '@uppy/xhr-upload'

import { Button } from '@/components/ui/button'
import { showJobProgressToast } from '@/lib/jobs/job-toast'

import '@uppy/core/css/style.min.css'
import '@uppy/dashboard/css/style.min.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileStatus = 'uploading' | 'classifying' | 'processing' | 'done' | 'error'

interface TrackedFile {
  id: string
  name: string
  status: FileStatus
  error?: string
}

interface UploadedDoc {
  name: string
  response?: { body: Record<string, unknown> }
}

// ---------------------------------------------------------------------------
// Main component: wraps the entire Documents page content
// ---------------------------------------------------------------------------

interface DocumentUploadZoneProps {
  children: React.ReactNode
}

export function DocumentUploadZone({ children }: DocumentUploadZoneProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [trackedFiles, setTrackedFiles] = useState<TrackedFile[]>([])
  const [indicatorExpanded, setIndicatorExpanded] = useState(false)
  const dragCounter = useRef(0)
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Uppy instance (stable across renders) ----
  const [uppy] = useState(() => {
    const instance = new Uppy<Meta, Body>({
      restrictions: {
        maxFileSize: 50 * 1024 * 1024,
        maxNumberOfFiles: 20,
        allowedFileTypes: ['.pdf', '.md', '.csv', '.txt', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'],
      },
      autoProceed: false,
    })

    instance.use(XHRUpload, {
      endpoint: '/api/documents/upload',
      fieldName: 'file',
      formData: true,
      allowedMetaFields: ['documentType', 'description', 'tags'],
    })

    instance.setMeta({ documentType: 'other' })

    return instance
  })

  // ---- Track files through upload lifecycle ----
  useEffect(() => {
    function handleFileAdded(file: UppyFile<Meta, Body>) {
      setTrackedFiles(prev => [
        ...prev,
        { id: file.id, name: file.name, status: 'uploading' },
      ])
    }

    function handleUploadSuccess(
      file: UppyFile<Meta, Body> | undefined,
      response: NonNullable<UppyFile<Meta, Body>['response']>,
    ) {
      if (!file) return
      const body = response.body as Record<string, unknown> | undefined
      const hasStatement = !!body?.statementId
      setTrackedFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: hasStatement ? 'classifying' as FileStatus : 'done' as FileStatus }
            : f,
        ),
      )
    }

    function handleUploadError(
      file: UppyFile<Meta, Body> | undefined,
      error: { message?: string },
    ) {
      if (!file) return
      setTrackedFiles(prev =>
        prev.map(f =>
          f.id === file.id
            ? { ...f, status: 'error' as FileStatus, error: error?.message ?? 'Upload failed' }
            : f,
        ),
      )
    }

    uppy.on('file-added', handleFileAdded)
    uppy.on('upload-success', handleUploadSuccess)
    uppy.on('upload-error', handleUploadError)

    return () => {
      uppy.off('file-added', handleFileAdded)
      uppy.off('upload-success', handleUploadSuccess)
      uppy.off('upload-error', handleUploadError)
    }
  }, [uppy])

  // ---- Handle batch completion (statement processing) ----
  useEffect(() => {
    async function handleComplete(result: { successful?: UppyFile<Meta, Body>[]; failed?: UppyFile<Meta, Body>[] }) {
      const successful = (result.successful ?? []) as unknown as UploadedDoc[]
      const failed = (result.failed ?? []) as Array<{ name: string }>

      for (const file of failed) {
        toast.error(`Upload failed: ${file.name}`)
      }

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

      // Update tracked files for statement processing
      if (statementsToProcess.length > 0) {
        setTrackedFiles(prev =>
          prev.map(f => {
            const isStatement = statementsToProcess.some(s => s.fileName === f.name)
            if (isStatement && f.status === 'classifying') {
              return { ...f, status: 'processing' }
            }
            return f
          }),
        )
      }

      if (statementsToProcess.length === 1) {
        await processSingleStatement(statementsToProcess[0], setTrackedFiles)
      } else if (statementsToProcess.length > 1) {
        await processBulkStatements(statementsToProcess, setTrackedFiles)
      }

      if (successful.length > 0) {
        router.refresh()
      }
    }

    uppy.on('complete', handleComplete)
    return () => {
      uppy.off('complete', handleComplete)
    }
  }, [uppy, router])

  // Destroy Uppy on unmount
  useEffect(() => {
    return () => {
      uppy.destroy()
    }
  }, [uppy])

  // ---- Auto-dismiss indicator when all files are done ----
  useEffect(() => {
    if (trackedFiles.length === 0) return

    const allSettled = trackedFiles.every(f => f.status === 'done' || f.status === 'error')
    const hasErrors = trackedFiles.some(f => f.status === 'error')

    if (allSettled && !hasErrors) {
      autoDismissTimer.current = setTimeout(() => {
        setTrackedFiles([])
        setIndicatorExpanded(false)
      }, 4000)
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current)
      }
    }
  }, [trackedFiles])

  // ---- Drag-and-drop handlers for the entire page zone ----
  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setDragOver(true)
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOver(false)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    for (const file of files) {
      try {
        uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          source: 'drop',
        })
      } catch {
        // Uppy throws when file doesn't match restrictions -- ignore
      }
    }

    uppy.upload()
  }, [uppy])

  function handleUploadButtonClick() {
    setModalOpen(true)
  }

  // ---- Computed state ----
  const showIndicator = trackedFiles.length > 0
  const inProgressCount = trackedFiles.filter(f =>
    f.status === 'uploading' || f.status === 'classifying' || f.status === 'processing',
  ).length
  const doneCount = trackedFiles.filter(f => f.status === 'done').length
  const errorCount = trackedFiles.filter(f => f.status === 'error').length
  const allSettled = trackedFiles.every(f => f.status === 'done' || f.status === 'error')

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-violet-400 bg-violet-50/60">
          <div className="flex flex-col items-center gap-2">
            <FileUp className="h-10 w-10 text-violet-500" />
            <p className="text-sm font-medium text-violet-700">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* Page header with upload button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage your financial documents.
          </p>
        </div>
        <Button onClick={handleUploadButtonClick}>
          <Upload className="h-4 w-4" />
          Upload File(s)
        </Button>
      </div>

      {/* Page content (filters + table from server) */}
      {children}

      {/* Uppy DashboardModal */}
      <DashboardModal
        uppy={uppy}
        open={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        proudlyDisplayPoweredByUppy={false}
        note="PDF, Markdown, CSV, Text, Images, Excel up to 50 MB"
        showRemoveButtonAfterComplete
        fileManagerSelectionType="both"
        doneButtonHandler={() => {
          uppy.clear()
          setModalOpen(false)
        }}
      />

      {/* Floating upload indicator */}
      {showIndicator && (
        <div className="fixed right-6 bottom-6 z-50 w-80">
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {/* Header pill */}
            <button
              onClick={() => setIndicatorExpanded(prev => !prev)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                {!allSettled && (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                )}
                {allSettled && errorCount === 0 && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                {allSettled && errorCount > 0 && (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {!allSettled
                    ? `Uploading ${inProgressCount} file${inProgressCount !== 1 ? 's' : ''}...`
                    : errorCount > 0
                      ? `${doneCount} done, ${errorCount} failed`
                      : `${doneCount} file${doneCount !== 1 ? 's' : ''} uploaded`
                  }
                </span>
              </div>
              {indicatorExpanded
                ? <ChevronDown className="h-4 w-4 text-gray-400" />
                : <ChevronUp className="h-4 w-4 text-gray-400" />
              }
            </button>

            {/* Expanded file list */}
            {indicatorExpanded && (
              <div className="max-h-60 overflow-y-auto border-t border-gray-100">
                {trackedFiles.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-4 py-2 text-sm"
                  >
                    <FileStatusIcon status={file.status} />
                    <span className="min-w-0 flex-1 truncate text-gray-700" title={file.name}>
                      {file.name}
                    </span>
                    <span className={`shrink-0 text-xs ${statusColor(file.status)}`}>
                      {statusLabel(file.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function FileStatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case 'uploading':
    case 'classifying':
    case 'processing':
      return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-500" />
    case 'done':
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
    case 'error':
      return <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
  }
}

function statusLabel(status: FileStatus): string {
  switch (status) {
    case 'uploading': return 'Uploading'
    case 'classifying': return 'Classifying'
    case 'processing': return 'Processing'
    case 'done': return 'Done'
    case 'error': return 'Error'
  }
}

function statusColor(status: FileStatus): string {
  switch (status) {
    case 'uploading':
    case 'classifying':
    case 'processing':
      return 'text-violet-600'
    case 'done':
      return 'text-green-600'
    case 'error':
      return 'text-red-600'
  }
}

// ---------------------------------------------------------------------------
// Statement processing helpers (preserved from original)
// ---------------------------------------------------------------------------

type SetTrackedFiles = React.Dispatch<React.SetStateAction<TrackedFile[]>>

async function processSingleStatement(
  file: { filePath: string; fileName: string; fileSize: number; statementId: string },
  setTrackedFiles: SetTrackedFiles,
) {
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
      markFileStatus(setTrackedFiles, file.fileName, 'done')
    } else if (!res.ok) {
      toast.error('Processing failed', {
        id: toastId,
        description: result.error || file.fileName,
      })
      markFileStatus(setTrackedFiles, file.fileName, 'error', result.error)
    } else {
      const txCount = result.data?.transactionCount ?? 0
      toast.success('Statement processed!', {
        id: toastId,
        description: `${txCount} transactions extracted from ${file.fileName}`,
      })
      markFileStatus(setTrackedFiles, file.fileName, 'done')
    }
  } catch (error) {
    toast.error('Processing failed', {
      id: toastId,
      description: error instanceof Error ? error.message : file.fileName,
    })
    markFileStatus(setTrackedFiles, file.fileName, 'error', error instanceof Error ? error.message : 'Unknown error')
  }
}

async function processBulkStatements(
  files: Array<{ filePath: string; fileName: string; fileSize: number; statementId: string }>,
  setTrackedFiles: SetTrackedFiles,
) {
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
      for (const file of files) {
        markFileStatus(setTrackedFiles, file.fileName, 'error', result.error || 'Batch failed')
      }
      return
    }

    // Bulk processing is tracked via job toast -- mark files as done
    for (const file of files) {
      markFileStatus(setTrackedFiles, file.fileName, 'done')
    }
    showJobProgressToast(result.jobId, files.length)
  } catch (error) {
    toast.error('Failed to start batch processing', {
      description: error instanceof Error ? error.message : 'Unknown error',
    })
    for (const file of files) {
      markFileStatus(setTrackedFiles, file.fileName, 'error', 'Batch failed')
    }
  }
}

function markFileStatus(
  setTrackedFiles: SetTrackedFiles,
  fileName: string,
  status: FileStatus,
  error?: string,
) {
  setTrackedFiles(prev =>
    prev.map(f =>
      f.name === fileName
        ? { ...f, status, ...(error ? { error } : {}) }
        : f,
    ),
  )
}
