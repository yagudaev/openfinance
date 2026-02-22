'use client'

import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  XCircle,
  UserCheck,
} from 'lucide-react'

interface StatementStatusBadgeProps {
  status: string
  verificationStatus: string | null
}

export function StatementStatusBadge({
  status,
  verificationStatus,
}: StatementStatusBadgeProps) {
  // Show processing status for non-done statements
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    )
  }

  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        <AlertCircle className="h-3 w-3" />
        Error
      </span>
    )
  }

  // For done statements, show verification status
  if (verificationStatus === 'human_verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
        <UserCheck className="h-3 w-3" />
        Verified
      </span>
    )
  }

  if (verificationStatus === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" />
        Balanced
      </span>
    )
  }

  if (verificationStatus === 'unbalanced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        <XCircle className="h-3 w-3" />
        Unbalanced
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" />
      Done
    </span>
  )
}
