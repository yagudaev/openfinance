import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import {
  formatJobType,
  formatJobStatus,
  formatDuration,
} from '@/lib/jobs/job-types'
import { JobDetailLive } from '@/components/jobs/job-detail-live'

function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const { id } = await params

  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!job) notFound()

  const isActive = job.status === 'pending' || job.status === 'running'

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">
            {formatJobType(job.type)}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Created {formatTimestamp(job.createdAt)}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Status" value={formatJobStatus(job.status)} />
        <SummaryCard label="Progress" value={`${job.progress}%`} />
        <SummaryCard label="Items" value={`${job.completedItems}/${job.totalItems}`} />
        <SummaryCard
          label="Duration"
          value={formatDuration(
            job.startedAt?.toISOString() ?? null,
            job.completedAt?.toISOString() ?? null,
          )}
        />
      </div>

      {job.error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-700">{job.error}</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              job.status === 'failed' ? 'bg-red-500' : 'bg-violet-600'
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>
      </div>

      {/* Items list — live or static */}
      {isActive ? (
        <JobDetailLive
          jobId={job.id}
          initialItems={job.items.map(item => ({
            id: item.id,
            fileName: item.fileName,
            status: item.status,
            error: item.error,
            startedAt: item.startedAt?.toISOString() ?? null,
            completedAt: item.completedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
          }))}
        />
      ) : (
        <ItemsList
          items={job.items.map(item => ({
            id: item.id,
            fileName: item.fileName,
            status: item.status,
            error: item.error,
            startedAt: item.startedAt?.toISOString() ?? null,
            completedAt: item.completedAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${styles[status] ?? styles.pending}`}
    >
      {formatJobStatus(status)}
    </span>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

interface ItemData {
  id: string
  fileName: string
  status: string
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

function ItemsList({ items }: { items: ItemData[] }) {
  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">No items in this job.</p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Items</h2>
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
                  {item.fileName}
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
