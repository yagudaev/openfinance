export interface JobSummary {
  id: string
  type: string
  status: string
  progress: number
  totalItems: number
  completedItems: number
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  itemCount: number
}

export interface JobItemSummary {
  id: string
  fileName: string
  status: string
  error: string | null
}

export interface JobDetail {
  id: string
  type: string
  status: string
  progress: number
  totalItems: number
  completedItems: number
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  items: JobItemDetail[]
}

export interface JobItemDetail {
  id: string
  fileName: string
  status: string
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface ActiveJob {
  id: string
  type: string
  status: string
  progress: number
  totalItems: number
  completedItems: number
  error: string | null
  startedAt: string | null
  createdAt: string
  items: JobItemSummary[]
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  file_processing: 'File Processing',
  reprocessing: 'Reprocessing',
  plaid_sync: 'Plaid Sync',
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
}

export function formatJobType(type: string): string {
  return JOB_TYPE_LABELS[type] ?? type
}

export function formatJobStatus(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status
}

export function formatDuration(start: string | null, end: string | null): string {
  if (!start) return '--'

  const startTime = new Date(start).getTime()
  const endTime = end ? new Date(end).getTime() : Date.now()
  const diffMs = endTime - startTime

  if (diffMs < 1000) return '<1s'
  if (diffMs < 60000) return `${Math.round(diffMs / 1000)}s`
  if (diffMs < 3600000) {
    const mins = Math.floor(diffMs / 60000)
    const secs = Math.round((diffMs % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const hours = Math.floor(diffMs / 3600000)
  const mins = Math.round((diffMs % 3600000) / 60000)
  return `${hours}h ${mins}m`
}
