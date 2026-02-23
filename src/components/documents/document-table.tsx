'use client'

import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Eye,
  Loader2,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  type DocumentItem,
  type DocumentStatus,
  getCategoryColor,
  getStatusColor,
  getFileIcon,
} from './document-types'

interface DocumentTableProps {
  documents: DocumentItem[]
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const type = getFileIcon(mimeType)
  const className = 'h-5 w-5 text-gray-400'

  switch (type) {
    case 'pdf':
      return <FileText className={className} />
    case 'image':
      return <ImageIcon className={className} />
    case 'spreadsheet':
      return <FileSpreadsheet className={className} />
    default:
      return <File className={className} />
  }
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const colorClasses = getStatusColor(status)
  const isProcessing = status === 'processing'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colorClasses}`}>
      {isProcessing && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {status}
    </span>
  )
}

function DocumentRow({
  document,
  selected,
  onToggleSelect,
}: {
  document: DocumentItem
  selected: boolean
  onToggleSelect: () => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [processingAsStatement, setProcessingAsStatement] = useState(false)

  const uploadDate = new Date(document.uploadedAt)
  const formattedDate = uploadDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  function handleView() {
    if (document.source === 'statement' && document.statementId) {
      window.location.href = `/statements/${document.statementId}`
    } else {
      window.open(`/api/documents/${document.id}`, '_blank')
    }
  }

  function handleDownload() {
    if (document.source === 'statement' && document.statementId) {
      const link = window.document.createElement('a')
      link.href = `/api/statements/${document.statementId}/pdf`
      link.download = document.fileName
      link.click()
    } else {
      const link = window.document.createElement('a')
      link.href = `/api/documents/${document.id}`
      link.download = document.fileName
      link.click()
    }
  }

  async function handleProcessAsStatement() {
    setProcessingAsStatement(true)

    const toastId = toast.loading('Extracting text from PDF...', {
      description: document.fileName,
    })

    try {
      toast.loading('Processing statement with AI...', {
        id: toastId,
        description: document.fileName,
      })

      const res = await fetch('/api/documents/process-as-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: document.id }),
      })

      const result = await res.json()
      const jobId = result.jobId as string | undefined

      if (res.status === 409 && result.isDuplicate) {
        toast.warning('Duplicate statement', {
          id: toastId,
          description: document.fileName,
        })
      } else if (!res.ok) {
        toast.error('Processing failed', {
          id: toastId,
          description: result.error || document.fileName,
          action: jobId ? {
            label: 'View details',
            onClick: () => { window.location.href = `/jobs/${jobId}` },
          } : undefined,
        })
      } else {
        const txCount = result.data?.transactionCount ?? 0
        toast.success('Statement processed!', {
          id: toastId,
          description: `${txCount} transactions extracted from ${document.fileName}`,
          action: jobId ? {
            label: 'View details',
            onClick: () => { window.location.href = `/jobs/${jobId}` },
          } : undefined,
        })
        router.refresh()
      }
    } catch (error) {
      toast.error('Processing failed', {
        id: toastId,
        description: error instanceof Error ? error.message : document.fileName,
      })
    } finally {
      setProcessingAsStatement(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${document.fileName}"?`)) return

    setDeleting(true)
    try {
      if (document.source === 'statement' && document.statementId) {
        const res = await fetch(`/api/documents/statements/${document.statementId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Delete failed')
      } else {
        const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Delete failed')
      }

      toast.success('Document deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <tr className={`hover:bg-gray-50 ${selected ? 'bg-violet-50' : ''}`}>
      <td className="whitespace-nowrap px-4 py-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-3">
          <FileIcon mimeType={document.mimeType} />
          <div className="min-w-0">
            <button
              onClick={handleView}
              className="block truncate text-sm font-medium text-gray-900 hover:text-violet-600 text-left max-w-xs"
              title={document.fileName}
            >
              {document.fileName}
            </button>
            {document.description && (
              <p className="truncate text-xs text-gray-500 max-w-xs">{document.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getCategoryColor(document.documentType)}`}>
          {document.documentType}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <StatusBadge status={document.status} />
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formattedDate}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {document.accountName || '\u2014'}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleView}>
              <Eye className="h-4 w-4" />
              View
            </DropdownMenuItem>
            {document.source === 'document' &&
              document.mimeType === 'application/pdf' &&
              document.documentType === 'statement' && (
              <DropdownMenuItem
                onClick={handleProcessAsStatement}
                disabled={processingAsStatement}
                className="text-violet-700 focus:text-violet-700 focus:bg-violet-50"
              >
                {processingAsStatement
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Zap className="h-4 w-4" />
                }
                {processingAsStatement ? 'Processing...' : 'Process as Statement'}
              </DropdownMenuItem>
            )}
            {document.source === 'statement' && document.statementId && (
              <DropdownMenuItem
                onClick={() => {
                  window.location.href = `/statements/${document.statementId}`
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Reprocess
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}

function BulkActionBar({
  selectedCount,
  onDeselectAll,
  onDeleteSelected,
}: {
  selectedCount: number
  onDeselectAll: () => void
  onDeleteSelected: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
      <span className="text-sm font-medium text-violet-700">
        {selectedCount} document{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselectAll}
          className="text-gray-700"
        >
          Deselect All
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSelected}
        >
          <Trash2 className="h-4 w-4" />
          Delete Selected
        </Button>
      </div>
    </div>
  )
}

export function DocumentTable({ documents }: DocumentTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const allSelected = documents.length > 0 && selectedIds.size === documents.length
  const someSelected = selectedIds.size > 0

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)))
    }
  }

  function handleToggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleDeselectAll() {
    setSelectedIds(new Set())
  }

  async function handleDeleteSelected() {
    const count = selectedIds.size
    if (!confirm(`Delete ${count} document${count !== 1 ? 's' : ''}? This cannot be undone.`)) return

    setBulkDeleting(true)
    let deleted = 0
    let failed = 0

    for (const id of selectedIds) {
      const doc = documents.find(d => d.id === id)
      if (!doc) continue

      try {
        if (doc.source === 'statement' && doc.statementId) {
          const res = await fetch(`/api/documents/statements/${doc.statementId}`, {
            method: 'DELETE',
          })
          if (!res.ok) throw new Error()
        } else {
          const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' })
          if (!res.ok) throw new Error()
        }
        deleted++
      } catch {
        failed++
      }
    }

    if (failed > 0) {
      toast.warning(`Deleted ${deleted}, failed to delete ${failed}`)
    } else {
      toast.success(`Deleted ${deleted} document${deleted !== 1 ? 's' : ''}`)
    }

    setSelectedIds(new Set())
    setBulkDeleting(false)
    router.refresh()
  }

  if (documents.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-4 text-sm text-gray-500">
          No documents found. Upload a document to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-3">
      {someSelected && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onDeselectAll={handleDeselectAll}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

      {bulkDeleting && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Deleting selected documents...
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Account
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.map(doc => (
              <DocumentRow
                key={`${doc.source}-${doc.id}`}
                document={doc}
                selected={selectedIds.has(doc.id)}
                onToggleSelect={() => handleToggleOne(doc.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
