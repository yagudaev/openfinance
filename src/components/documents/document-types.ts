export const DOCUMENT_CATEGORIES = [
  { value: 'statement', label: 'Statements' },
  { value: 'tax', label: 'Tax Documents' },
  { value: 'receipt', label: 'Receipts' },
  { value: 'spreadsheet', label: 'Spreadsheets' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
] as const

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]['value']

// Keep for backwards compat with upload dialog
export const DOCUMENT_TYPES = DOCUMENT_CATEGORIES

export type DocumentStatus = 'pending' | 'processing' | 'done' | 'error'

export type DocumentSource = 'document' | 'statement'

export interface DocumentItem {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  documentType: string
  tags: string | null
  description: string | null
  uploadedAt: string
  status: DocumentStatus
  accountName: string | null
  source: DocumentSource
  statementId: string | null
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function getCategoryColor(type: string): string {
  switch (type) {
    case 'statement':
      return 'bg-blue-100 text-blue-700'
    case 'tax':
      return 'bg-purple-100 text-purple-700'
    case 'investment':
      return 'bg-green-100 text-green-700'
    case 'receipt':
      return 'bg-amber-100 text-amber-700'
    case 'spreadsheet':
      return 'bg-teal-100 text-teal-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

// Keep old name for backwards compat
export const getDocumentTypeColor = getCategoryColor

export function getStatusColor(status: DocumentStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700'
    case 'processing':
      return 'bg-blue-100 text-blue-700'
    case 'done':
      return 'bg-green-100 text-green-700'
    case 'error':
      return 'bg-red-100 text-red-700'
  }
}

export function getFileIcon(mimeType: string): 'pdf' | 'image' | 'spreadsheet' | 'text' {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
  return 'text'
}
