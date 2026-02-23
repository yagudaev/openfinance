'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileText,
  MoreHorizontal,
  Trash2,
  Pencil,
  Tag,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { formatDate } from '@/lib/utils/date'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  statementId?: string | null
}

interface TransactionTableProps {
  transactions: TransactionRow[]
  sortColumn: string
  sortOrder: string
  categories: string[]
}

type SortableColumn = 'transactionDate' | 'description' | 'category' | 'amount'

type EditingCell = {
  id: string
  field: 'description' | 'amount'
}

function formatCategoryLabel(cat: string): string {
  return cat
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function TransactionTable({
  transactions: initialTransactions,
  sortColumn,
  sortOrder,
  categories,
}: TransactionTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [transactions, setTransactions] = useState(initialTransactions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  const allSelected = transactions.length > 0 && selectedIds.size === transactions.length
  const someSelected = selectedIds.size > 0

  // --- Sorting ---

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

  // --- Selection ---

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)))
    }
  }

  function handleToggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // --- Inline editing ---

  function startEditing(id: string, field: 'description' | 'amount', currentValue: string) {
    setEditingCell({ id, field })
    setEditValue(currentValue)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const saveEdit = useCallback(async () => {
    if (!editingCell) return

    const { id, field } = editingCell
    const tx = transactions.find(t => t.id === id)
    if (!tx) {
      setEditingCell(null)
      return
    }

    const trimmed = editValue.trim()
    const currentValue = field === 'amount' ? String(tx.amount) : tx.description
    if (trimmed === currentValue || (field === 'description' && trimmed === '')) {
      setEditingCell(null)
      return
    }

    const update: Record<string, unknown> = {}
    if (field === 'description') {
      update.description = trimmed
    } else if (field === 'amount') {
      const num = Number(trimmed)
      if (isNaN(num)) {
        toast.error('Amount must be a number')
        setEditingCell(null)
        return
      }
      update.amount = num
    }

    setSaving(prev => new Set(prev).add(id))
    setEditingCell(null)

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to save')
        return
      }

      const result = await res.json()
      setTransactions(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, ...result.transaction, date: t.date, bankName: t.bankName, accountNumber: t.accountNumber, source: t.source, isProvisional: t.isProvisional, statementId: t.statementId }
            : t,
        ),
      )
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [editingCell, editValue, transactions])

  function cancelEdit() {
    setEditingCell(null)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // --- Category change (single) ---

  async function handleChangeCategory(id: string, category: string | null) {
    setSaving(prev => new Set(prev).add(id))

    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })

      if (!res.ok) {
        toast.error('Failed to update category')
        return
      }

      const result = await res.json()
      setTransactions(prev =>
        prev.map(t =>
          t.id === id
            ? { ...t, category: result.transaction.category }
            : t,
        ),
      )
    } catch {
      toast.error('Failed to update category')
    } finally {
      setSaving(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // --- Single delete ---

  async function handleDelete(id: string) {
    const tx = transactions.find(t => t.id === id)
    if (!confirm(`Delete transaction "${tx?.description}"?`)) return

    setSaving(prev => new Set(prev).add(id))

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        toast.error('Failed to delete')
        return
      }

      setTransactions(prev => prev.filter(t => t.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success('Transaction deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setSaving(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // --- Go to statement ---

  function handleGoToStatement(tx: TransactionRow) {
    if (tx.statementId) {
      router.push(`/statements/${tx.statementId}?highlight=${tx.id}`)
    }
  }

  // --- Bulk actions ---

  async function handleBulkDelete() {
    const count = selectedIds.size
    if (!confirm(`Delete ${count} transaction${count !== 1 ? 's' : ''}? This cannot be undone.`)) return

    setBulkActionLoading('delete')

    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        toast.error('Failed to delete transactions')
        return
      }

      const result = await res.json()
      setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      toast.success(`Deleted ${result.deleted} transaction${result.deleted !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to delete transactions')
    } finally {
      setBulkActionLoading(null)
    }
  }

  async function handleBulkChangeCategory(category: string) {
    const catValue = category === '__none__' ? null : category
    setBulkActionLoading('category')

    try {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-category',
          ids: Array.from(selectedIds),
          category: catValue,
        }),
      })

      if (!res.ok) {
        toast.error('Failed to change category')
        return
      }

      const result = await res.json()
      setTransactions(prev =>
        prev.map(t =>
          selectedIds.has(t.id)
            ? { ...t, category: catValue }
            : t,
        ),
      )
      toast.success(`Updated ${result.updated} transaction${result.updated !== 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to change category')
    } finally {
      setBulkActionLoading(null)
    }
  }

  async function handleBulkAutoCategorize() {
    setBulkActionLoading('auto-categorize')

    const toastId = toast.loading('Auto-categorizing transactions...')

    try {
      const res = await fetch('/api/transactions/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        toast.error('Failed to auto-categorize', { id: toastId })
        return
      }

      const result = await res.json()
      toast.success(
        `Categorized ${result.categorized} of ${result.total} transaction${result.total !== 1 ? 's' : ''}`,
        { id: toastId },
      )

      // Refresh to get updated categories from server
      router.refresh()
    } catch {
      toast.error('Failed to auto-categorize', { id: toastId })
    } finally {
      setBulkActionLoading(null)
    }
  }

  // --- Render ---

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
    <div className="mt-4 space-y-3">
      {/* Bulk actions bar */}
      {someSelected && (
        <div className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
          <span className="text-sm font-medium text-violet-700">
            {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-700"
            >
              Deselect All
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkAutoCategorize}
              disabled={bulkActionLoading !== null}
              className="text-violet-700 border-violet-300 hover:bg-violet-100"
            >
              {bulkActionLoading === 'auto-categorize'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />
              }
              Auto-categorize
            </Button>

            <Select
              onValueChange={handleBulkChangeCategory}
              disabled={bulkActionLoading !== null}
            >
              <SelectTrigger className="h-8 w-44 text-sm">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Change Category" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Category</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {formatCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading !== null}
            >
              {bulkActionLoading === 'delete'
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />
              }
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => {
                    if (el) el.indeterminate = someSelected && !allSelected
                  }}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
              </th>
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
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map(tx => (
              <tr
                key={tx.id}
                className={`hover:bg-gray-50 ${tx.isProvisional ? 'bg-amber-50/50' : ''} ${selectedIds.has(tx.id) ? 'bg-violet-50' : ''}`}
              >
                {/* Checkbox */}
                <td className="whitespace-nowrap px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(tx.id)}
                    onChange={() => handleToggleOne(tx.id)}
                    className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                </td>

                {/* Date */}
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

                {/* Description (editable) */}
                <td className="px-6 py-3 text-sm text-gray-900">
                  {editingCell?.id === tx.id && editingCell.field === 'description' ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleEditKeyDown}
                        className="w-full rounded border border-violet-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer rounded px-1 py-0.5 hover:bg-gray-100"
                      onClick={() => startEditing(tx.id, 'description', tx.description)}
                      title="Click to edit"
                    >
                      {tx.description}
                      {saving.has(tx.id) && (
                        <Loader2 className="ml-1 inline-block h-3 w-3 animate-spin text-gray-400" />
                      )}
                    </span>
                  )}
                </td>

                {/* Category (inline select) */}
                <td className="whitespace-nowrap px-6 py-3 text-sm">
                  <Select
                    value={tx.category ?? '__none__'}
                    onValueChange={val => handleChangeCategory(tx.id, val === '__none__' ? null : val)}
                    disabled={saving.has(tx.id)}
                  >
                    <SelectTrigger className="h-7 w-36 border-transparent bg-transparent text-xs hover:border-gray-300 focus:border-violet-300">
                      <SelectValue>
                        {tx.category ? (
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {formatCategoryLabel(tx.category)}
                          </span>
                        ) : (
                          <span className="text-gray-400">&mdash;</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Category</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {formatCategoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* Amount (editable) */}
                <td className={`whitespace-nowrap px-6 py-3 text-right text-sm font-medium ${
                  tx.amount >= 0 ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {editingCell?.id === tx.id && editingCell.field === 'amount' ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={handleEditKeyDown}
                        className="w-28 rounded border border-violet-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer rounded px-1 py-0.5 hover:bg-gray-100"
                      onClick={() => startEditing(tx.id, 'amount', String(tx.amount))}
                      title="Click to edit"
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      ${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </td>

                {/* Balance */}
                <td className="whitespace-nowrap px-6 py-3 text-right text-sm text-gray-500">
                  {tx.balance != null
                    ? `$${tx.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : '\u2014'}
                </td>

                {/* Actions dropdown */}
                <td className="whitespace-nowrap px-2 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => startEditing(tx.id, 'description', tx.description)}>
                        <Pencil className="h-4 w-4" />
                        Edit Description
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tx.statementId && (
                        <DropdownMenuItem onClick={() => handleGoToStatement(tx)}>
                          <ExternalLink className="h-4 w-4" />
                          Go to Statement
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(tx.id)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
