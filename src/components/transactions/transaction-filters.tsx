'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Search, ChevronDown, X, Calendar } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AccountInfo {
  id: string
  nickname: string
  ownershipType: string
}

interface TransactionFiltersProps {
  search: string
  category: string
  type: string
  categories: string[]
  totalDeposits: number
  totalWithdrawals: number
  accounts: AccountInfo[]
  ownershipType: string
  selectedAccountIds: string[]
  dateRange: string
  dateFrom: string
  dateTo: string
}

const DATE_RANGE_PRESETS = [
  { value: '', label: 'All time' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-year', label: 'Last year' },
  { value: 'custom', label: 'Custom range' },
]

export function TransactionFilters({
  search,
  category,
  type,
  categories,
  totalDeposits,
  totalWithdrawals,
  accounts,
  ownershipType,
  selectedAccountIds,
  dateRange,
  dateFrom,
  dateTo,
}: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(search)

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    }
    router.push(`/transactions?${params.toString()}`)
  }, [router, searchParams])

  const updateParam = useCallback((key: string, value: string) => {
    updateParams({ [key]: value })
  }, [updateParams])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParam('search', searchValue)
  }

  function handleAccountToggle(accountId: string) {
    const current = new Set(selectedAccountIds)
    if (current.has(accountId)) {
      current.delete(accountId)
    } else {
      current.add(accountId)
    }
    updateParam('accounts', Array.from(current).join(','))
  }

  function handleDateRangeChange(value: string) {
    const normalizedValue = value === '__all__' ? '' : value
    if (normalizedValue === 'custom') {
      updateParams({ dateRange: 'custom', dateFrom, dateTo })
    } else {
      updateParams({ dateRange: normalizedValue, dateFrom: '', dateTo: '' })
    }
  }

  function handleClearFilters() {
    const params = new URLSearchParams()
    if (searchValue) {
      params.set('search', searchValue)
    }
    router.push(`/transactions?${params.toString()}`)
  }

  const hasActiveFilters = ownershipType || selectedAccountIds.length > 0 || dateRange || category || type

  const accountLabel = selectedAccountIds.length === 0
    ? 'All accounts'
    : selectedAccountIds.length === 1
      ? accounts.find(a => a.id === selectedAccountIds[0])?.nickname ?? '1 account'
      : `${selectedAccountIds.length} accounts`

  return (
    <div className="mt-6 space-y-3">
      {/* Row 1: Search + Summary stats */}
      <div className="flex items-center gap-4">
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

      {/* Row 2: Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Account type filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-500 mr-1">Type:</span>
          <Button
            variant={!ownershipType ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('ownershipType', '')}
          >
            Both
          </Button>
          <Button
            variant={ownershipType === 'business' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('ownershipType', ownershipType === 'business' ? '' : 'business')}
          >
            Business
          </Button>
          <Button
            variant={ownershipType === 'personal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateParam('ownershipType', ownershipType === 'personal' ? '' : 'personal')}
          >
            Personal
          </Button>
        </div>

        {/* Account name multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[140px] justify-between">
              {accountLabel}
              <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {accounts.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-gray-500">No accounts found</div>
            ) : (
              accounts.map(account => (
                <DropdownMenuCheckboxItem
                  key={account.id}
                  checked={selectedAccountIds.includes(account.id)}
                  onCheckedChange={() => handleAccountToggle(account.id)}
                  onSelect={e => e.preventDefault()}
                >
                  <span className="flex items-center gap-2">
                    {account.nickname}
                    <span className="text-xs text-gray-400 capitalize">
                      {account.ownershipType}
                    </span>
                  </span>
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date range filter */}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <Select
            value={dateRange || '__all__'}
            onValueChange={handleDateRangeChange}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_PRESETS.map(preset => (
                <SelectItem key={preset.value || '__all__'} value={preset.value || '__all__'}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom date inputs */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => updateParam('dateFrom', e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
            <span className="text-xs text-gray-400">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => updateParam('dateTo', e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
          </div>
        )}

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

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
