'use client'

import { useState } from 'react'
import {
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronRight,
  Store,
} from 'lucide-react'

import { formatCurrency } from '@/lib/services/dashboard-types'
import { formatDate } from '@/lib/utils/date'
import {
  type MerchantDetail,
  type TransactionDetail,
  getCategoryLabel,
} from '@/lib/types/expenses'

interface CategoryDrilldownProps {
  category: string
  total: number
  prevTotal: number
  transactionCount: number
  merchants: MerchantDetail[]
  onTransactionClick?: (transaction: TransactionDetail) => void
}

export function CategoryDrilldown({
  category,
  total,
  prevTotal,
  transactionCount,
  merchants,
  onTransactionClick,
}: CategoryDrilldownProps) {
  const [expandedMerchants, setExpandedMerchants] = useState<Set<string>>(
    new Set(),
  )
  const [sortBy, setSortBy] = useState<'total' | 'count' | 'name'>('total')

  const changePercent =
    prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0

  function toggleMerchant(merchant: string) {
    setExpandedMerchants((prev) => {
      const next = new Set(prev)
      if (next.has(merchant)) {
        next.delete(merchant)
      } else {
        next.add(merchant)
      }
      return next
    })
  }

  const sortedMerchants = [...merchants].sort((a, b) => {
    switch (sortBy) {
      case 'total':
        return b.total - a.total
      case 'count':
        return b.count - a.count
      case 'name':
        return a.merchant.localeCompare(b.merchant)
      default:
        return 0
    }
  })

  return (
    <div>
      {/* Summary header */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {getCategoryLabel(category)} Total
            </p>
            <p className="text-3xl font-semibold text-gray-900">
              {formatCurrency(total)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {transactionCount} transactions across {merchants.length}{' '}
              {merchants.length === 1 ? 'merchant' : 'merchants'}
            </p>
          </div>
          {prevTotal > 0 && (
            <div
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                changePercent > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {changePercent > 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {Math.abs(changePercent).toFixed(0)}% vs previous period
            </div>
          )}
        </div>
      </div>

      {/* Sort controls */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-gray-500">Sort by:</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
          {(
            [
              { value: 'total', label: 'Amount' },
              { value: 'count', label: 'Count' },
              { value: 'name', label: 'Name' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Merchant list */}
      <div className="space-y-2">
        {sortedMerchants.map((merchant) => {
          const isExpanded = expandedMerchants.has(merchant.merchant)
          const percentage = total > 0 ? (merchant.total / total) * 100 : 0

          return (
            <div
              key={merchant.merchant}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              {/* Merchant header */}
              <button
                onClick={() => toggleMerchant(merchant.merchant)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                  <Store className="h-4 w-4 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 truncate">
                      {merchant.merchant}
                    </span>
                    <span className="ml-2 shrink-0 font-semibold text-gray-900">
                      {formatCurrency(merchant.total)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {merchant.count}{' '}
                      {merchant.count === 1 ? 'transaction' : 'transactions'}
                    </span>
                    <span>{percentage.toFixed(1)}% of category</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-2 h-1 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-gray-400">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded transaction list */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                        <th className="px-4 py-2 text-left font-medium">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Description
                        </th>
                        <th className="px-4 py-2 text-left font-medium">
                          Account
                        </th>
                        <th className="px-4 py-2 text-right font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {merchant.transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="cursor-pointer transition-colors hover:bg-gray-50"
                          onClick={() => onTransactionClick?.(tx)}
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-500">
                            {formatDate(tx.date, 'MMM dd, yyyy')}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-gray-900">
                            {tx.description}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-500">
                            {tx.bankName}
                            {tx.accountNumber && (
                              <span className="ml-1 text-gray-400">
                                ...{tx.accountNumber.slice(-4)}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium text-gray-900">
                            ${Math.abs(tx.amount).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
