export const DOCUMENT_TYPES = [
  { value: 'statement', label: 'Statement' },
  { value: 'tax', label: 'Tax' },
  { value: 'investment', label: 'Investment' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'other', label: 'Other' },
] as const

export type DocumentType = typeof DOCUMENT_TYPES[number]['value']

export interface DocumentItem {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  documentType: string
  tags: string | null
  description: string | null
  uploadedAt: string
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function getDocumentTypeColor(type: string): string {
  switch (type) {
    case 'statement':
      return 'bg-blue-100 text-blue-700'
    case 'tax':
      return 'bg-purple-100 text-purple-700'
    case 'investment':
      return 'bg-green-100 text-green-700'
    case 'receipt':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export function getFileIcon(mimeType: string): 'pdf' | 'image' | 'spreadsheet' | 'text' {
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet'
  return 'text'
}
