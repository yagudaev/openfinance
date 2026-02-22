'use client'

import { ChevronRight } from 'lucide-react'

import { getCategoryLabel } from '@/lib/types/expenses'

interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface ExpenseBreadcrumbProps {
  category?: string
  merchant?: string
  onNavigateToOverview: () => void
  onNavigateToCategory: () => void
}

export function ExpenseBreadcrumb({
  category,
  merchant,
  onNavigateToOverview,
  onNavigateToCategory,
}: ExpenseBreadcrumbProps) {
  const items: BreadcrumbItem[] = [
    {
      label: 'All Expenses',
      onClick: category ? onNavigateToOverview : undefined,
    },
  ]

  if (category) {
    items.push({
      label: getCategoryLabel(category),
      onClick: merchant ? onNavigateToCategory : undefined,
    })
  }

  if (merchant) {
    items.push({ label: merchant })
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-gray-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
