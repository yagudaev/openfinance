'use client'

import { useState } from 'react'
import { X, Calendar, DollarSign, Building2, FileText, Tag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/date'
import { type TransactionDetail, getCategoryLabel } from '@/lib/types/expenses'
import { CATEGORIES } from '@/lib/constants/categories'

interface TransactionDetailPanelProps {
  transaction: TransactionDetail
  onClose: () => void
  onCategoryChange?: (transactionId: string, category: string) => void
}

export function TransactionDetailPanel({
  transaction,
  onClose,
  onCategoryChange,
}: TransactionDetailPanelProps) {
  const [editingCategory, setEditingCategory] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleCategoryChange(newCategory: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      })
      if (res.ok) {
        onCategoryChange?.(transaction.id, newCategory)
        setEditingCategory(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const details = [
    {
      icon: Calendar,
      label: 'Date',
      value: formatDate(transaction.date, 'MMMM dd, yyyy'),
    },
    {
      icon: DollarSign,
      label: 'Amount',
      value: `$${Math.abs(transaction.amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })}`,
      className: 'font-semibold',
    },
    {
      icon: FileText,
      label: 'Description',
      value: transaction.description,
    },
    {
      icon: Building2,
      label: 'Account',
      value: `${transaction.bankName}${
        transaction.accountNumber
          ? ` (...${transaction.accountNumber.slice(-4)})`
          : ''
      }`,
    },
    {
      icon: Tag,
      label: 'Source',
      value: transaction.source === 'plaid' ? 'Plaid sync' : 'Bank statement',
    },
  ]

  if (transaction.statementFileName) {
    details.push({
      icon: FileText,
      label: 'Statement',
      value: transaction.statementFileName,
      className: '',
    })
  }

  if (transaction.balance != null) {
    details.push({
      icon: DollarSign,
      label: 'Balance After',
      value: `$${transaction.balance.toLocaleString('en-US', {
        minimumFractionDigits: 2,
      })}`,
      className: '',
    })
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-gray-200 bg-white shadow-xl sm:w-96">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Transaction Details
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {details.map((detail) => {
              const Icon = detail.icon
              return (
                <div key={detail.label} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{detail.label}</p>
                    <p
                      className={`text-sm text-gray-900 ${'className' in detail ? detail.className : ''}`}
                    >
                      {detail.value}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Category (editable) */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Tag className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Category</p>
                {editingCategory ? (
                  <div className="mt-1 space-y-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => handleCategoryChange(cat.value)}
                        disabled={saving}
                        className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                          transaction.category === cat.value
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        } ${saving ? 'opacity-50' : ''}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setEditingCategory(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {transaction.category
                        ? getCategoryLabel(transaction.category)
                        : 'Uncategorized'}
                    </span>
                    <button
                      onClick={() => setEditingCategory(true)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
