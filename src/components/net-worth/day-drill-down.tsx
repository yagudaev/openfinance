'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react'

import { formatCurrency, type DayDrillDownData } from '@/lib/services/net-worth-types'

interface DayDrillDownProps {
  date: string
  onClose: () => void
}

export function DayDrillDown({ date, onClose }: DayDrillDownProps) {
  const [data, setData] = useState<DayDrillDownData | null>(null)
  const [fetchedDate, setFetchedDate] = useState<string | null>(null)

  const loading = fetchedDate !== date

  useEffect(() => {
    let cancelled = false
    fetch(`/api/net-worth/day?date=${date}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setFetchedDate(date)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null)
          setFetchedDate(date)
        }
      })
    return () => { cancelled = true }
  }, [date])

  const formattedDate = format(parseISO(date), 'MMMM d, yyyy')

  const assets = data?.accounts.filter((a) => a.accountType === 'asset') ?? []
  const liabilities = data?.accounts.filter((a) => a.accountType === 'liability') ?? []
  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0)
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {formattedDate}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Net worth summary for the day */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Assets</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(totalAssets)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Liabilities</p>
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(totalLiabilities)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Net Worth</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(totalAssets - totalLiabilities)}
              </p>
            </div>
          </div>

          {/* Account balances */}
          {(assets.length > 0 || liabilities.length > 0) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Account Balances</h4>
              <div className="space-y-1">
                {assets.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{a.name}</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(a.balance)}
                    </span>
                  </div>
                ))}
                {liabilities.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm py-1">
                    <span className="text-gray-600">{a.name}</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(Math.abs(a.balance))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions for this day */}
          {data.transactions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Transactions ({data.transactions.length})
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`p-1 rounded ${tx.amount >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        {tx.amount >= 0
                          ? <ArrowUpRight className="h-3 w-3 text-green-600" />
                          : <ArrowDownRight className="h-3 w-3 text-red-600" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-700 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">{tx.accountName}</p>
                      </div>
                    </div>
                    <span className={`font-medium ml-2 whitespace-nowrap ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.transactions.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No transactions on this day. Balances carried forward from the previous day.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
