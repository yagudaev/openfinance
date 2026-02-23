import { headers } from 'next/headers'
import { format } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { auth } from '@/lib/auth'
import {
  getDashboard,
  formatCurrency,
  type OwnershipFilter as OwnershipFilterType,
} from '@/lib/services/dashboard'
import { CashflowChart } from '@/components/dashboard/cashflow-chart'
import { PageFilterBar } from '@/components/layout/page-filter-bar'
import { NetWorthDashboard } from '@/components/net-worth/net-worth-dashboard'
import { TimePeriodSelector } from '@/components/shared/time-period-selector'
import {
  getDateRangeBounds,
  type DateRangePreset,
} from '@/lib/types/time-period'

interface DashboardPageProps {
  searchParams: Promise<{
    ownership?: OwnershipFilterType
    period?: DateRangePreset
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) return null

  const params = await searchParams
  const ownershipFilter: OwnershipFilterType = params.ownership ?? 'combined'
  const period: DateRangePreset = params.period as DateRangePreset ?? 'all-time'
  const dateFrom = params.dateFrom ?? ''
  const dateTo = params.dateTo ?? ''

  // Compute date filter from the period
  const dateRange = getDateRangeBounds(period, dateFrom, dateTo)
  const dateFilter = (dateRange.from || dateRange.to)
    ? { from: dateRange.from, to: dateRange.to }
    : undefined

  const { stats, cashflowData, totalTransactions } = await getDashboard(
    session.user.id,
    ownershipFilter,
    dateFilter,
  )

  const periodLabel = getPeriodLabel(period, dateFrom, dateTo)

  const avgIncome =
    cashflowData.length > 0
      ? cashflowData.reduce((acc, d) => acc + d.income, 0) / cashflowData.length
      : 0
  const avgExpenses =
    cashflowData.length > 0
      ? cashflowData.reduce((acc, d) => acc + d.expenses, 0) / cashflowData.length
      : 0

  const statsCards = [
    {
      title: `Income (${periodLabel})`,
      value: formatCurrency(stats.monthlyIncome),
      changePercent: stats.changeIncomePercent,
      isPositiveGood: true,
      icon: ArrowUpRight,
      iconColor: 'text-green-600 bg-green-50',
    },
    {
      title: `Expenses (${periodLabel})`,
      value: formatCurrency(stats.monthlyExpenses),
      changePercent: stats.changeExpensesPercent,
      isPositiveGood: false,
      icon: ArrowDownRight,
      iconColor: 'text-red-600 bg-red-50',
    },
    {
      title: `Avg Monthly Income (${cashflowData.length} mo)`,
      value: formatCurrency(avgIncome),
      changePercent: null,
      isPositiveGood: true,
      icon: ArrowUpRight,
      iconColor: 'text-green-600 bg-green-50',
    },
    {
      title: `Avg Monthly Expenses (${cashflowData.length} mo)`,
      value: formatCurrency(avgExpenses),
      changePercent: null,
      isPositiveGood: false,
      icon: ArrowDownRight,
      iconColor: 'text-red-600 bg-red-50',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Welcome back{session.user.name ? `, ${session.user.name}` : ''}
          </h1>
          <p className="mt-2 text-gray-600">
            Here&apos;s what&apos;s happening with your finances today
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

      {totalTransactions === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No transactions yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Upload a bank statement to automatically extract and categorize your transactions.
          </p>
          <Link
            href="/statements"
            className="mt-6 inline-block rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
          >
            Go to Statements
          </Link>
        </div>
      )}

      {/* Net Worth section */}
      <NetWorthDashboard embedded />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          const changePercent = stat.changePercent
          const hasChange = changePercent !== null
          const isPositive = hasChange && changePercent > 0
          const isNegative = hasChange && changePercent < 0
          const isGood = stat.isPositiveGood ? isPositive : isNegative
          const changeColor = !hasChange
            ? 'text-gray-400'
            : isGood
              ? 'text-green-600'
              : 'text-red-600'
          const changeDisplay = hasChange
            ? `${isPositive ? '+' : ''}${changePercent.toFixed(0)}%`
            : ''

          return (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {hasChange && (
                  <span className={`text-sm font-medium ${changeColor}`}>
                    {changeDisplay}
                  </span>
                )}
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Cashflow ({cashflowData.length > 0 ? `${cashflowData.length} Months` : 'No data'})
          </h2>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <CashflowChart data={cashflowData} />
      </div>
    </div>
  )
}

function getPeriodLabel(
  period: DateRangePreset,
  dateFrom: string,
  dateTo: string,
): string {
  if (period === 'custom' && dateFrom && dateTo) {
    const from = new Date(dateFrom + 'T00:00:00')
    const to = new Date(dateTo + 'T00:00:00')
    return `${format(from, 'MMM d')} - ${format(to, 'MMM d, yyyy')}`
  }

  const labels: Record<string, string> = {
    'today': 'Today',
    'last-7-days': 'Last 7 days',
    'last-30-days': 'Last 30 days',
    'this-month': 'This month',
    'last-month': 'Last month',
    'this-quarter': 'This quarter',
    'this-year': 'This year',
    'last-year': 'Last year',
    'last-3-months': 'Last 3 months',
    'all-time': 'All time',
  }
  return labels[period] ?? 'Last month'
}
