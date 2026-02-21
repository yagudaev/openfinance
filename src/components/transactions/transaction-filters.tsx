'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { useCallback, useState } from 'react'

interface TransactionFiltersProps {
  search: string
  category: string
  type: string
  categories: string[]
  totalDeposits: number
  totalWithdrawals: number
}

export function TransactionFilters({
  search,
  category,
  type,
  categories,
  totalDeposits,
  totalWithdrawals,
}: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(search)

  const updateParam = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/transactions?${params.toString()}`)
  }, [router, searchParams])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            className="pl-10"
          />
        </form>

        {/* Category filter */}
        <div className="flex gap-1">
          <Button
            variant={!category ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('category', '')}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateParam('category', cat === category ? '' : cat)}
            >
              {cat.replace('-', ' ')}
            </Button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          <Button
            variant={type === 'credit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('type', type === 'credit' ? '' : 'credit')}
          >
            Credits
          </Button>
          <Button
            variant={type === 'debit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('type', type === 'debit' ? '' : 'debit')}
          >
            Debits
          </Button>
        </div>

        {/* Summary stats */}
        <div className="ml-auto flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Deposits:</span>{' '}
            <span className="font-medium text-green-600">
              ${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Withdrawals:</span>{' '}
            <span className="font-medium text-red-600">
              ${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
