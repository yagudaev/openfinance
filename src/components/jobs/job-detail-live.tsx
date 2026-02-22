'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

import { formatJobStatus, formatDuration } from '@/lib/jobs/job-types'
import type { JobItemDetail } from '@/lib/jobs/job-types'

interface JobDetailLiveProps {
  jobId: string
  initialItems: JobItemDetail[]
}

export function JobDetailLive({ jobId, initialItems }: JobDetailLiveProps) {
  const [items, setItems] = useState<JobItemDetail[]>(initialItems)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/stream`)

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'progress' && data.job?.items) {
          setItems(data.job.items.map((item: { id: string; fileName: string; status: string; error: string | null }) => ({
            id: item.id,
            fileName: item.fileName,
            status: item.status,
            error: item.error,
            startedAt: null,
            completedAt: null,
            createdAt: '',
          })))
        }
        if (data.type === 'done') {
          eventSource.close()
          // Reload the page to get the final server-rendered state
          window.location.reload()
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      setConnected(false)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [jobId])

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No items in this job.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Items</h2>
        {connected && (
          <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                File
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Duration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Error
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-900">
                  <div className="flex items-center gap-2">
                    <ItemStatusIcon status={item.status} />
                    {item.fileName}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm">
                  <ItemStatusBadge status={item.status} />
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-right text-xs text-gray-500 font-mono">
                  {formatDuration(item.startedAt, item.completedAt)}
                </td>
                <td className="max-w-xs truncate px-6 py-3 text-right text-xs text-red-500">
                  {item.error ?? '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ItemStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
  }
}

function ItemStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}
    >
      {formatJobStatus(status)}
    </span>
  )
}
