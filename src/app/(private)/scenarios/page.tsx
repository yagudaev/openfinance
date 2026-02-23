'use client'

import { useSearchParams } from 'next/navigation'

import type { OwnershipFilter as OwnershipFilterType } from '@/lib/services/dashboard-types'
import { PageFilterBar } from '@/components/layout/page-filter-bar'
import { ScenariosDashboard } from '@/components/scenarios/scenarios-dashboard'

export default function ScenariosPage() {
  const searchParams = useSearchParams()
  const ownershipFilter: OwnershipFilterType = (searchParams.get('ownership') as OwnershipFilterType) || 'combined'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Scenarios</h1>
          <p className="mt-1 text-gray-600">
            AI-driven what-if scenarios for your financial future.
          </p>
        </div>
        <PageFilterBar ownership={ownershipFilter} />
      </div>
      <ScenariosDashboard />
    </div>
  )
}
