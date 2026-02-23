'use client'

import type { OwnershipFilter as OwnershipFilterType } from '@/lib/services/dashboard-types'

import { OwnershipFilter } from '@/components/layout/ownership-filter'

interface PageFilterBarProps {
  ownership: OwnershipFilterType
  children?: React.ReactNode
}

export function PageFilterBar({ ownership, children }: PageFilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <OwnershipFilter value={ownership} />
      {/* Slot for future time period selector and other controls */}
      {children}
    </div>
  )
}
