import { prisma } from '@/lib/prisma'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export type OwnershipFilter = 'combined' | 'business' | 'personal'

export interface DashboardStats {
  monthlyIncome: number
  monthlyExpenses: number
  prevMonthIncome: number
  prevMonthExpenses: number
  changeIncomePercent: number | null
  changeExpensesPercent: number | null
}

export interface CashflowDataPoint {
  monthLabel: string
  income: number
  expenses: number
  cashflow: number
}

export interface DashboardData {
  stats: DashboardStats
  cashflowData: CashflowDataPoint[]
}

export function formatCurrency(amount: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function calculatePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export async function getDashboard(
  userId: string,
  ownershipFilter: OwnershipFilter = 'combined',
): Promise<DashboardData> {
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  const prevMonth = subMonths(now, 2)

  const ownershipWhere = ownershipFilter === 'combined'
    ? {}
    : {
        statement: {
          bankAccount: {
            ownershipType: ownershipFilter,
          },
        },
      }

  const [monthlyIncomeResult, monthlyExpensesResult, prevIncomeResult, prevExpensesResult] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          category: 'income',
          transactionDate: {
            gte: startOfMonth(lastMonth),
            lte: endOfMonth(lastMonth),
          },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          category: { in: ['expense', 'owner-pay'] },
          transactionDate: {
            gte: startOfMonth(lastMonth),
            lte: endOfMonth(lastMonth),
          },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          category: 'income',
          transactionDate: {
            gte: startOfMonth(prevMonth),
            lte: endOfMonth(prevMonth),
          },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          category: { in: ['expense', 'owner-pay'] },
          transactionDate: {
            gte: startOfMonth(prevMonth),
            lte: endOfMonth(prevMonth),
          },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
    ])

  const monthlyIncome = Math.abs(monthlyIncomeResult._sum.amount ?? 0)
  const monthlyExpenses = Math.abs(monthlyExpensesResult._sum.amount ?? 0)
  const prevMonthIncome = Math.abs(prevIncomeResult._sum.amount ?? 0)
  const prevMonthExpenses = Math.abs(prevExpensesResult._sum.amount ?? 0)

  const stats: DashboardStats = {
    monthlyIncome,
    monthlyExpenses,
    prevMonthIncome,
    prevMonthExpenses,
    changeIncomePercent: calculatePercentChange(monthlyIncome, prevMonthIncome),
    changeExpensesPercent: calculatePercentChange(monthlyExpenses, prevMonthExpenses),
  }

  const cashflowData = await getCashflowData(userId, ownershipFilter)

  return { stats, cashflowData }
}

async function getCashflowData(
  userId: string,
  ownershipFilter: OwnershipFilter,
): Promise<CashflowDataPoint[]> {
  const months: CashflowDataPoint[] = []
  const now = new Date()

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i)
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)

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
          category: 'income',
          transactionDate: { gte: monthStart, lte: monthEnd },
          ...ownershipWhere,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          category: { in: ['expense', 'owner-pay'] },
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
