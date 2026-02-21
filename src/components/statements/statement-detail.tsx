'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  UserCheck,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Building2,
  Hash,
  Calendar,
  Loader2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { toggleHumanVerified, reprocessStatement, deleteStatement } from '@/app/(private)/statements/actions'
import { TransactionGrid } from '@/components/transactions/transaction-grid'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  balance: number | null
  category: string | null
  transactionType: string
}

interface BalanceVerification {
  calculatedOpeningBalance: number
  calculatedClosingBalance: number
  statementOpeningBalance: number
  statementClosingBalance: number
  isBalanced: boolean
  discrepancyAmount: number | null
  notes: string | null
}

interface StatementData {
  id: string
  bankName: string
  accountNumber: string | null
  fileName: string
  periodStart: string
  periodEnd: string
  openingBalance: number
  closingBalance: number
  totalDeposits: number | null
  totalWithdrawals: number | null
  verificationStatus: string | null
  discrepancyAmount: number | null
  isProcessed: boolean
  fileUrl?: string
  transactions: Transaction[]
  balanceVerification: BalanceVerification | null
}

interface StatementDetailProps {
  statement: StatementData
}

export function StatementDetail({ statement: initial }: StatementDetailProps) {
  const router = useRouter()
  const [statement, setStatement] = useState(initial)
  const [isToggling, setIsToggling] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const netChange = statement.closingBalance - statement.openingBalance
  const isPositive = netChange >= 0
  const depositCount = statement.transactions.filter(t => t.amount > 0).length
  const withdrawalCount = statement.transactions.filter(t => t.amount < 0).length
  const totalDeposits = statement.transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = statement.transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  function formatCurrency(amount: number) {
    return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  async function handleToggleVerified() {
    setIsToggling(true)
    const result = await toggleHumanVerified(statement.id)
    if (result.success) {
      setStatement(prev => ({ ...prev, verificationStatus: result.verificationStatus ?? null }))
    }
    setIsToggling(false)
  }

  async function handleReprocess() {
    if (!confirm('This will delete all transactions and re-process the PDF. Continue?')) return
    setIsReprocessing(true)
    const result = await reprocessStatement(statement.id)
    if (result.success) {
      router.refresh()
    }
    setIsReprocessing(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this statement and all its transactions? This cannot be undone.')) return
    setIsDeleting(true)
    const result = await deleteStatement(statement.id)
    if (result.success) {
      router.push('/statements')
    }
    setIsDeleting(false)
  }

  function getStatusBadge() {
    const status = statement.verificationStatus
    if (status === 'human_verified') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
          <UserCheck className="h-3 w-3" />
          Human Verified
        </span>
      )
    }
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
          <CheckCircle className="h-3 w-3" />
          Balanced
        </span>
      )
    }
    if (status === 'unbalanced') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
          <XCircle className="h-3 w-3" />
          Unbalanced
        </span>
      )
    }
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
        Pending
      </span>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/statements"
            className="mt-1 rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-gray-900">
                {statement.bankName}
              </h1>
              {getStatusBadge()}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {statement.fileName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleVerified}
            disabled={isToggling}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              statement.verificationStatus === 'human_verified'
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'border border-purple-300 text-purple-700 hover:bg-purple-50'
            }`}
          >
            {isToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            {statement.verificationStatus === 'human_verified' ? 'Verified' : 'Mark Verified'}
          </button>
          <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {isReprocessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reprocess
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            Period
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {formatDate(statement.periodStart, 'MMM dd, yyyy')}
          </p>
          <p className="text-sm font-medium text-gray-900">
            to {formatDate(statement.periodEnd, 'MMM dd, yyyy')}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="h-4 w-4" />
            Opening Balance
          </div>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {formatCurrency(statement.openingBalance)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Hash className="h-4 w-4" />
            Closing Balance
          </div>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {formatCurrency(statement.closingBalance)}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            Net Change
          </div>
          <p className={`mt-2 text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : '-'}{formatCurrency(netChange)}
          </p>
        </div>
      </div>

      {/* Balance Equation */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">Balance Equation</h3>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-lg">
          <div className="text-center">
            <p className="text-xs text-gray-500">Opening</p>
            <p className="font-mono font-semibold">{formatCurrency(statement.openingBalance)}</p>
          </div>
          <span className="text-gray-400">+</span>
          <div className="text-center">
            <p className="text-xs text-green-600">Deposits</p>
            <p className="font-mono font-semibold text-green-600">+{formatCurrency(totalDeposits)}</p>
          </div>
          <span className="text-gray-400">&minus;</span>
          <div className="text-center">
            <p className="text-xs text-red-600">Withdrawals</p>
            <p className="font-mono font-semibold text-red-600">&minus;{formatCurrency(totalWithdrawals)}</p>
          </div>
          <span className="text-gray-400">=</span>
          <div className="text-center">
            <p className="text-xs text-gray-500">Calculated</p>
            <p className="font-mono font-semibold">{formatCurrency(statement.openingBalance + totalDeposits - totalWithdrawals)}</p>
          </div>
          <div className="ml-2">
            {Math.abs((statement.openingBalance + totalDeposits - totalWithdrawals) - statement.closingBalance) < 0.01 ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-yellow-500" />
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Expected</p>
            <p className="font-mono font-semibold">{formatCurrency(statement.closingBalance)}</p>
          </div>
        </div>
        {statement.balanceVerification && !statement.balanceVerification.isBalanced && statement.balanceVerification.discrepancyAmount && (
          <div className="mt-3 rounded-lg bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              Discrepancy: <span className="font-semibold">{formatCurrency(statement.balanceVerification.discrepancyAmount)}</span>
            </p>
            {statement.balanceVerification.notes && (
              <p className="mt-1 text-xs text-yellow-600">{statement.balanceVerification.notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Transaction Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-700">Deposits</p>
          <p className="mt-1 text-lg font-bold text-green-700">{depositCount}</p>
          <p className="text-sm text-green-600">+{formatCurrency(totalDeposits)}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">Withdrawals</p>
          <p className="mt-1 text-lg font-bold text-red-700">{withdrawalCount}</p>
          <p className="text-sm text-red-600">-{formatCurrency(totalWithdrawals)}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-700">Total Transactions</p>
          <p className="mt-1 text-lg font-bold text-blue-700">{statement.transactions.length}</p>
          <p className="text-sm text-blue-600">
            {statement.accountNumber ? `Account: ${statement.accountNumber}` : 'No account number'}
          </p>
        </div>
      </div>

      {/* PDF Viewer + Transactions side-by-side */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PDF Viewer */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Statement PDF</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <iframe
              src={`/api/statements/${statement.id}/pdf`}
              className="h-[600px] w-full"
              title="Statement PDF"
            />
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Transactions ({statement.transactions.length})
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Click a cell to edit. Changes save automatically.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <TransactionGrid transactions={statement.transactions} />
          </div>
        </div>
      </div>
    </div>
  )
}
