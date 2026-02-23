import { prisma } from '@/lib/prisma'
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  differenceInMonths,
  max as dateMax,
  min as dateMin,
} from 'date-fns'

export type {
  OwnershipFilter,
  DashboardStats,
  CashflowDataPoint,
  DashboardData,
} from './dashboard-types'
export { formatCurrency } from './dashboard-types'

import type { OwnershipFilter, DashboardStats, CashflowDataPoint, DashboardData } from './dashboard-types'

interface DateFilter {
  from?: Date
  to?: Date
}

function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export async function getDashboard(
  userId: string,
  ownershipFilter: OwnershipFilter = 'combined',
  dateFilter?: DateFilter,
): Promise<DashboardData> {
  const ownershipWhere = ownershipFilter === 'combined'
    ? {}
    : {
        statement: {
          bankAccount: {
            ownershipType: ownershipFilter,
          },
        },
      }

  // When a date filter is set, compute income/expenses within that range
  // and compare against the preceding period of equal length.
  // When no date filter (all-time), query all transactions with no date bounds.
  const hasDateFilter = dateFilter?.from || dateFilter?.to

  const dateWhere = hasDateFilter
    ? {
        transactionDate: {
          ...(dateFilter?.from ? { gte: dateFilter.from } : {}),
          ...(dateFilter?.to ? { lte: dateFilter.to } : {}),
        },
      }
    : {}

  // Previous period comparison: only meaningful when we have a bounded range
  const hasBothBounds = dateFilter?.from && dateFilter?.to
  let prevDateWhere: Record<string, unknown> = {}
  if (hasBothBounds) {
    const durationMs = dateFilter.to!.getTime() - dateFilter.from!.getTime()
    const prevTo = new Date(dateFilter.from!.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - durationMs)
    prevDateWhere = {
      transactionDate: { gte: prevFrom, lte: prevTo },
    }
  } else if (dateFilter?.from) {
    // Open-ended: no meaningful "previous" period
    prevDateWhere = { transactionDate: { lt: dateFilter.from } }
  }

  const [monthlyIncomeResult, monthlyExpensesResult, prevIncomeResult, prevExpensesResult] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          transactionType: 'credit',
          ...dateWhere,
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          transactionType: 'debit',
          ...dateWhere,
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          transactionType: 'credit',
          ...prevDateWhere,
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          transactionType: 'debit',
          ...prevDateWhere,
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
    ])

  const monthlyIncome = Math.abs(monthlyIncomeResult._sum.amount ?? 0)
  const monthlyExpenses = Math.abs(monthlyExpensesResult._sum.amount ?? 0)
  const prevMonthIncome = Math.abs(prevIncomeResult._sum.amount ?? 0)
  const prevMonthExpenses = Math.abs(prevExpensesResult._sum.amount ?? 0)

  // No percent-change for all-time since there's no meaningful prior period
  const stats: DashboardStats = {
    monthlyIncome,
    monthlyExpenses,
    prevMonthIncome,
    prevMonthExpenses,
    changeIncomePercent: hasDateFilter
      ? calculatePercentChange(monthlyIncome, prevMonthIncome)
      : null,
    changeExpensesPercent: hasDateFilter
      ? calculatePercentChange(monthlyExpenses, prevMonthExpenses)
      : null,
  }

  const [cashflowData, totalTransactions] = await Promise.all([
    getCashflowData(userId, ownershipFilter, dateFilter),
    prisma.transaction.count({ where: { userId } }),
  ])

  return { stats, cashflowData, totalTransactions }
}

async function getCashflowData(
  userId: string,
  ownershipFilter: OwnershipFilter,
  dateFilter?: DateFilter,
): Promise<CashflowDataPoint[]> {
  const months: CashflowDataPoint[] = []
  const now = new Date()

  // Determine how many months to show based on the date filter
  let monthCount = 12
  let endDate = now

  if (dateFilter?.from && dateFilter?.to) {
    monthCount = Math.max(1, differenceInMonths(dateFilter.to, dateFilter.from) + 1)
    endDate = dateFilter.to
  } else if (dateFilter?.from) {
    monthCount = Math.max(1, differenceInMonths(now, dateFilter.from) + 1)
  } else if (dateFilter?.to) {
    endDate = dateFilter.to
  }

  // Cap at 24 months to avoid excessive queries
  monthCount = Math.min(monthCount, 24)

  for (let i = monthCount - 1; i >= 0; i--) {
    const monthDate = subMonths(endDate, i)
    let monthStart = startOfMonth(monthDate)
    let monthEnd = endOfMonth(monthDate)

    // Clip to the date filter bounds
    if (dateFilter?.from) {
      monthStart = dateMax([monthStart, dateFilter.from])
    }
    if (dateFilter?.to) {
      monthEnd = dateMin([monthEnd, dateFilter.to])
    }

    // Skip months that end up with start > end after clipping
    if (monthStart > monthEnd) continue

    const ownershipWhere = ownershipFilter === 'combined'
      ? {}
      : {
          statement: {
            bankAccount: {
              ownershipType: ownershipFilter,
            },
          },
        }

    const [incomeResult, expenseResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          transactionType: 'credit',
          transactionDate: { gte: monthStart, lte: monthEnd },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          transactionType: 'debit',
          transactionDate: { gte: monthStart, lte: monthEnd },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
    ])

    const income = Math.abs(incomeResult._sum.amount ?? 0)
    const expenses = Math.abs(expenseResult._sum.amount ?? 0)

    months.push({
      monthLabel: format(monthDate, 'MMM yyyy'),
      income,
      expenses,
      cashflow: income - expenses,
    })
  }

  return months
}
