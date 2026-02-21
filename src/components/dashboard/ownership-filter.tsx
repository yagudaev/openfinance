'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import type { OwnershipFilter as OwnershipFilterType } from '@/lib/services/dashboard'

const OPTIONS: { value: OwnershipFilterType; label: string }[] = [
  { value: 'combined', label: 'Combined' },
  { value: 'business', label: 'Business' },
  { value: 'personal', label: 'Personal' },
]

interface OwnershipFilterProps {
  value: OwnershipFilterType
}

export function OwnershipFilter({ value }: OwnershipFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(newValue: OwnershipFilterType) {
    const params = new URLSearchParams(searchParams.toString())
    if (newValue === 'combined') {
      params.delete('ownership')
    } else {
      params.set('ownership', newValue)
    }
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => handleChange(option.value)}
          className={cn(
            'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
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
