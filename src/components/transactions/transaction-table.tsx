'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUp, ArrowDown, ArrowUpDown, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'

interface TransactionRow {
  id: string
  date: string
  description: string
  amount: number
  balance: number | null
  category: string | null
  transactionType: string
  bankName: string
  accountNumber: string | null
  source?: string
  isProvisional?: boolean
}

interface TransactionTableProps {
  transactions: TransactionRow[]
  sortColumn: string
  sortOrder: string
}

type SortableColumn = 'transactionDate' | 'description' | 'category' | 'amount'

export function TransactionTable({ transactions, sortColumn, sortOrder }: TransactionTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleSort(column: SortableColumn) {
    const params = new URLSearchParams(searchParams.toString())
    if (sortColumn === column) {
      params.set('order', sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', column)
      params.set('order', 'desc')
    }
    router.push(`/transactions?${params.toString()}`)
  }

  function getSortIcon(column: SortableColumn) {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 inline-block h-3 w-3" />
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-1 inline-block h-3 w-3" />
      : <ArrowDown className="ml-1 inline-block h-3 w-3" />
  }

  if (transactions.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16">
        <FileText className="h-12 w-12 text-gray-300" />
        <p className="mt-3 font-medium text-gray-900">No transactions found</p>
        <p className="mt-1 text-sm text-gray-500">
          Upload a bank statement to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              onClick={() => handleSort('transactionDate')}
            >
              Date {getSortIcon('transactionDate')}
            </th>
            <th
              className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              onClick={() => handleSort('description')}
            >
              Description {getSortIcon('description')}
            </th>
            <th
              className="cursor-pointer select-none px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              onClick={() => handleSort('category')}
            >
              Category {getSortIcon('category')}
            </th>
            <th
              className="cursor-pointer select-none px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
              onClick={() => handleSort('amount')}
            >
              Amount {getSortIcon('amount')}
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Balance
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map(tx => (
            <tr key={tx.id} className={`hover:bg-gray-50 ${tx.isProvisional ? 'bg-amber-50/50' : ''}`}>
              <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  {formatDate(tx.date, 'MMM dd, yyyy')}
                  {tx.isProvisional && (
                    <span className="inline-flex rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Provisional: synced via Plaid, pending statement reconciliation">
                      provisional
                    </span>
                  )}
                  {tx.source === 'plaid' && !tx.isProvisional && (
                    <span className="inline-flex rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700" title="Synced via Plaid">
                      synced
                    </span>
                  )}
                </span>
              </td>
              <td className="px-6 py-3 text-sm text-gray-900">
                {tx.description}
              </td>
              <td className="whitespace-nowrap px-6 py-3 text-sm">
                {tx.category ? (
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {tx.category.replace('-', ' ')}
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className={`whitespace-nowrap px-6 py-3 text-right text-sm font-medium ${
                tx.amount >= 0 ? 'text-green-600' : 'text-gray-900'
              }`}>
                {tx.amount >= 0 ? '+' : ''}
                ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-gray-500">
                {tx.balance != null
                  ? `$${tx.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
