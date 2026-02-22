import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  subYears,
} from 'date-fns'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type PeriodKey =
  | 'this-month'
  | 'last-month'
  | 'ytd'
  | 'last-12-months'
  | 'custom'

function getDateRange(
  period: PeriodKey,
  customStart?: string,
  customEnd?: string,
): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date()

  switch (period) {
    case 'this-month': {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      const prevStart = startOfMonth(subMonths(now, 1))
      const prevEnd = endOfMonth(subMonths(now, 1))
      return { start, end, prevStart, prevEnd }
    }
    case 'last-month': {
      const lastMonth = subMonths(now, 1)
      const start = startOfMonth(lastMonth)
      const end = endOfMonth(lastMonth)
      const twoMonthsAgo = subMonths(now, 2)
      const prevStart = startOfMonth(twoMonthsAgo)
      const prevEnd = endOfMonth(twoMonthsAgo)
      return { start, end, prevStart, prevEnd }
    }
    case 'ytd': {
      const start = startOfYear(now)
      const end = now
      const prevYearStart = startOfYear(subYears(now, 1))
      const prevYearEnd = subYears(now, 1)
      return { start, end, prevStart: prevYearStart, prevEnd: prevYearEnd }
    }
    case 'last-12-months': {
      const start = startOfMonth(subMonths(now, 11))
      const end = endOfMonth(now)
      const prevStart = startOfMonth(subMonths(now, 23))
      const prevEnd = endOfMonth(subMonths(now, 12))
      return { start, end, prevStart, prevEnd }
    }
    case 'custom': {
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires startDate and endDate')
      }
      const start = new Date(customStart)
      const end = new Date(customEnd)
      const durationMs = end.getTime() - start.getTime()
      const prevEnd = new Date(start.getTime() - 1)
      const prevStart = new Date(prevEnd.getTime() - durationMs)
      return { start, end, prevStart, prevEnd }
    }
    default: {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      const prevStart = startOfMonth(subMonths(now, 1))
      const prevEnd = endOfMonth(subMonths(now, 1))
      return { start, end, prevStart, prevEnd }
    }
  }
}

const EXPENSE_CATEGORIES = ['expense', 'owner-pay']

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const period = (searchParams.get('period') || 'this-month') as PeriodKey
  const customStart = searchParams.get('startDate') || undefined
  const customEnd = searchParams.get('endDate') || undefined
  const categoryFilter = searchParams.get('category') || undefined

  let dateRange
  try {
    dateRange = getDateRange(period, customStart, customEnd)
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    )
  }

  const { start, end, prevStart, prevEnd } = dateRange
  const userId = session.user.id

  // If a specific category is selected, return transactions for that category
  if (categoryFilter) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        category: categoryFilter,
        transactionDate: { gte: start, lte: end },
      },
      orderBy: { transactionDate: 'desc' },
      include: {
        statement: {
          select: { bankName: true, accountNumber: true, fileName: true },
        },
      },
    })

    // Group by description (merchant proxy)
    const merchantMap = new Map<
      string,
      { total: number; count: number; transactions: typeof transactions }
    >()

    for (const tx of transactions) {
      const merchant = tx.description
      const existing = merchantMap.get(merchant)
      if (existing) {
        existing.total += Math.abs(tx.amount)
        existing.count += 1
        existing.transactions.push(tx)
      } else {
        merchantMap.set(merchant, {
          total: Math.abs(tx.amount),
          count: 1,
          transactions: [tx],
        })
      }
    }

    const merchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({
        merchant: name,
        total: data.total,
        count: data.count,
        transactions: data.transactions.map((tx) => ({
          id: tx.id,
          date: tx.transactionDate.toISOString().split('T')[0],
          description: tx.description,
          amount: tx.amount,
          balance: tx.balance,
          category: tx.category,
          transactionType: tx.transactionType,
          bankName: tx.statement?.bankName ?? 'Plaid',
          accountNumber: tx.statement?.accountNumber ?? null,
          statementFileName: tx.statement?.fileName ?? null,
          source: tx.source,
        })),
      }))
      .sort((a, b) => b.total - a.total)

    const categoryTotal = transactions.reduce(
      (sum, tx) => sum + Math.abs(tx.amount),
      0,
    )

    // Previous period total for comparison
    const prevResult = await prisma.transaction.aggregate({
      where: {
        userId,
        category: categoryFilter,
        transactionDate: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true },
    })
    const prevTotal = Math.abs(prevResult._sum.amount ?? 0)

    return NextResponse.json({
      type: 'category-detail',
      category: categoryFilter,
      total: categoryTotal,
      prevTotal,
      transactionCount: transactions.length,
      merchants,
    })
  }

  // Otherwise, return overview: spending by category
  const [currentTransactions, prevTransactions] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId,
        category: { in: EXPENSE_CATEGORIES },
        transactionDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId,
        category: { in: EXPENSE_CATEGORIES },
        transactionDate: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const totalSpending = currentTransactions.reduce(
    (sum, cat) => sum + Math.abs(cat._sum.amount ?? 0),
    0,
  )

  // Also get sub-category breakdown (by description) for each expense category
  const categoryDescriptions = await prisma.transaction.groupBy({
    by: ['category', 'description'],
    where: {
      userId,
      category: { in: EXPENSE_CATEGORIES },
      transactionDate: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
  })

  // Build per-category top merchants
  const categoryDetails = new Map<
    string,
    { merchant: string; total: number; count: number }[]
  >()

  for (const row of categoryDescriptions) {
    const cat = row.category ?? 'uncategorized'
    if (!categoryDetails.has(cat)) {
      categoryDetails.set(cat, [])
    }
    categoryDetails.get(cat)!.push({
      merchant: row.description,
      total: Math.abs(row._sum.amount ?? 0),
      count: row._count,
    })
  }

  // Sort merchants within each category by total desc, keep top 5
  for (const [, merchants] of categoryDetails) {
    merchants.sort((a, b) => b.total - a.total)
  }

  const prevMap = new Map(
    prevTransactions.map((p) => [p.category, Math.abs(p._sum.amount ?? 0)]),
  )

  const categories = currentTransactions
    .map((cat) => {
      const total = Math.abs(cat._sum.amount ?? 0)
      const prevTotal = prevMap.get(cat.category) ?? 0
      const topMerchants = (
        categoryDetails.get(cat.category ?? 'uncategorized') ?? []
      ).slice(0, 5)

      return {
        category: cat.category ?? 'uncategorized',
        total,
        count: cat._count,
        percentage: totalSpending > 0 ? (total / totalSpending) * 100 : 0,
        prevTotal,
        changePercent:
          prevTotal > 0
            ? ((total - prevTotal) / prevTotal) * 100
            : total > 0
              ? 100
              : 0,
        topMerchants,
      }
    })
    .sort((a, b) => b.total - a.total)

  const prevTotalSpending = prevTransactions.reduce(
    (sum, cat) => sum + Math.abs(cat._sum.amount ?? 0),
    0,
  )

  return NextResponse.json({
    type: 'overview',
    totalSpending,
    prevTotalSpending,
    categories,
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  })
}
