'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { useActiveJobs } from '@/hooks/use-active-jobs'
import { formatJobType } from '@/lib/jobs/job-types'
import type { ActiveJob, JobItemSummary } from '@/lib/jobs/job-types'

function JobItemStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
    case 'completed':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />
    case 'failed':
      return <XCircle className="h-3 w-3 text-red-500" />
    default:
      return <div className="h-3 w-3 rounded-full border border-gray-300" />
  }
}

function JobItemRow({ item }: { item: JobItemSummary }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <JobItemStatusIcon status={item.status} />
      <span className="truncate text-xs text-gray-700">{item.fileName}</span>
      {item.error && (
        <span className="ml-auto shrink-0 text-xs text-red-500" title={item.error}>
          Error
        </span>
      )}
    </div>
  )
}

function JobCard({ job }: { job: ActiveJob }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900">
            {formatJobType(job.type)}
          </div>
          <div className="text-xs text-gray-500">
            {job.completedItems}/{job.totalItems} items
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 tabular-nums">
            {job.progress}%
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          )}
        </div>
      </button>
      {expanded && job.items.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 max-h-48 overflow-y-auto">
          {job.items.map(item => (
            <JobItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FloatingJobIndicator() {
  const { jobs, loading } = useActiveJobs()
  const [expanded, setExpanded] = useState(false)

  // Don't render anything when there are no active jobs
  if (loading || jobs.length === 0) return null

  const totalCompleted = jobs.reduce((sum, j) => sum + j.completedItems, 0)
  const totalItems = jobs.reduce((sum, j) => sum + j.totalItems, 0)

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded panel */}
      <div
        className={cn(
          'mb-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-200',
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 border-0 shadow-none',
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
          <span className="text-sm font-medium text-gray-900">Active Jobs</span>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
          >
            View all
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>

      {/* Floating badge */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-white shadow-lg hover:bg-violet-700 transition-colors"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">
          Processing {totalCompleted}/{totalItems} files
        </span>
      </button>
    </div>
  )
}
