'use client'

import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
  Tag,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  type DocumentItem,
  formatFileSize,
  getDocumentTypeColor,
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
      return <Image className={className} />
    case 'spreadsheet':
      return <FileSpreadsheet className={className} />
    default:
      return <File className={className} />
  }
}

function DocumentRow({ document }: { document: DocumentItem }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const uploadDate = new Date(document.uploadedAt)
  const formattedDate = uploadDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  function handleView() {
    window.open(`/api/documents/${document.id}`, '_blank')
  }

  function handleDownload() {
    const link = window.document.createElement('a')
    link.href = `/api/documents/${document.id}`
    link.download = document.fileName
    link.click()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${document.fileName}"?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')

      toast.success('Document deleted')
      router.refresh()
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeleting(false)
      setMenuOpen(false)
    }
  }

  const tags = document.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? []

  return (
    <tr className="hover:bg-gray-50">
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
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formattedDate}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatFileSize(document.fileSize)}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getDocumentTypeColor(document.documentType)}`}>
          {document.documentType}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right">
        <div className="relative inline-block">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false)
                    handleView()
                  }}
                >
                  <FileText className="h-4 w-4" />
                  View
                </button>
                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setMenuOpen(false)
                    handleDownload()
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

export function DocumentTable({ documents }: DocumentTableProps) {
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
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              File
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Uploaded
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Tags
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {documents.map(doc => (
            <DocumentRow key={doc.id} document={doc} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
