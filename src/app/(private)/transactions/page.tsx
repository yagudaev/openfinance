import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TimePeriodSelector } from '@/components/shared/time-period-selector'
import {
  getDateRangeBounds,
  type DateRangePreset,
} from '@/lib/types/time-period'

import type { OwnershipFilter as OwnershipFilterType } from '@/lib/services/dashboard-types'
import { PageFilterBar } from '@/components/layout/page-filter-bar'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { CATEGORIES } from '@/lib/constants/categories'

interface TransactionsPageProps {
  searchParams: Promise<{
    search?: string
    category?: string
    type?: string
    sort?: string
    order?: string
    ownership?: OwnershipFilterType
    accounts?: string
    period?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const params = await searchParams
  const search = params.search || ''
  const category = params.category || ''
  const type = params.type || ''
  const sortColumn = params.sort || 'transactionDate'
  const sortOrder = params.order === 'asc' ? 'asc' as const : 'desc' as const
  const ownershipFilter: OwnershipFilterType = params.ownership ?? 'combined'
  const ownershipType = ownershipFilter === 'combined' ? '' : ownershipFilter
  const selectedAccountIds = params.accounts ? params.accounts.split(',').filter(Boolean) : []
  const period = (params.period as DateRangePreset) || 'all-time'
  const dateFrom = params.dateFrom || ''
  const dateTo = params.dateTo || ''

  // Fetch all bank accounts for the user (for the filter dropdown)
  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    select: { id: true, nickname: true, ownershipType: true },
    orderBy: { nickname: 'asc' },
  })

  // Build where clause
  const where: Record<string, unknown> = { userId: session.user.id }

  if (search) {
    where.description = { contains: search }
  }

  if (category) {
    where.category = category
  }

  if (type === 'credit') {
    where.amount = { gt: 0 }
  } else if (type === 'debit') {
    where.amount = { lt: 0 }
  }

  // Account type filter: filter by ownershipType on linked BankAccount
  if (ownershipType) {
    where.statement = {
      ...((where.statement as Record<string, unknown>) || {}),
      bankAccount: { ownershipType },
    }
  }

  // Account name filter: filter by specific bank account IDs
  if (selectedAccountIds.length > 0) {
    where.statement = {
      ...((where.statement as Record<string, unknown>) || {}),
      bankAccountId: { in: selectedAccountIds },
    }
  }

  // Date range filter using the shared time period logic
  const dateRange = getDateRangeBounds(period, dateFrom, dateTo)
  if (dateRange.from || dateRange.to) {
    const dateFilter: Record<string, Date> = {}
    if (dateRange.from) dateFilter.gte = dateRange.from
    if (dateRange.to) dateFilter.lte = dateRange.to
    where.transactionDate = dateFilter
  }

  const [transactions, totalCount, filteredStats] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [sortColumn]: sortOrder },
      include: {
        statement: {
          select: { bankName: true, accountNumber: true },
        },
      },
      take: 500,
    }),
    prisma.transaction.count({ where: { userId: session.user.id } }),
    prisma.transaction.groupBy({
      by: ['transactionType'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const totalDeposits = filteredStats.find(s => s.transactionType === 'credit')?._sum.amount || 0
  const totalWithdrawals = Math.abs(filteredStats.find(s => s.transactionType === 'debit')?._sum.amount || 0)

  const categories = CATEGORIES.map(c => c.value)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            {transactions.length} of {totalCount} transactions
          </p>
        </div>
        <PageFilterBar ownership={ownershipFilter}>
          <TimePeriodSelector
            value={period}
            customFrom={dateFrom}
            customTo={dateTo}
          />
        </PageFilterBar>
      </div>

      <TransactionFilters
        search={search}
        category={category}
        type={type}
        categories={categories}
        totalDeposits={totalDeposits}
        totalWithdrawals={totalWithdrawals}
        accounts={accounts}
        selectedAccountIds={selectedAccountIds}
      />

      <TransactionTable
        transactions={transactions.map(t => ({
          id: t.id,
          date: t.transactionDate.toISOString().split('T')[0],
          description: t.description,
          amount: t.amount,
          balance: t.balance,
          category: t.category,
          transactionType: t.transactionType,
          bankName: t.statement?.bankName ?? 'Plaid',
          accountNumber: t.statement?.accountNumber ?? null,
          source: t.source,
          isProvisional: t.isProvisional,
          statementId: t.statementId,
        }))}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        categories={categories}
      />
    </div>
  )
}
