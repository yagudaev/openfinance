import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
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

  // Build where clause
  const where: any = { userId: session.user.id }

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

  const [transactions, totalCount, stats] = await Promise.all([
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
      where: { userId: session.user.id },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const totalDeposits = stats.find(s => s.transactionType === 'credit')?._sum.amount || 0
  const totalWithdrawals = Math.abs(stats.find(s => s.transactionType === 'debit')?._sum.amount || 0)

  const categories = CATEGORIES.map(c => c.value)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            {transactions.length} of {totalCount} transactions
          </p>
        </div>
      </div>

      <TransactionFilters
        search={search}
        category={category}
        type={type}
        categories={categories}
        totalDeposits={totalDeposits}
        totalWithdrawals={totalWithdrawals}
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
        }))}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
      />
    </div>
  )
}
