'use client'

import { cn } from '@/lib/utils'
import { PERIOD_OPTIONS, type PeriodKey } from '@/lib/types/expenses'

interface PeriodSelectorProps {
  value: PeriodKey
  onChange: (period: PeriodKey) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
