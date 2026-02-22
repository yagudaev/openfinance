'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Camera,
} from 'lucide-react'

import {
  formatCurrency,
  formatPercent,
  type NetWorthSummary,
  type NetWorthSnapshotData,
  type NetWorthAccountData,
  type HistoryPeriod,
} from '@/lib/services/net-worth-types'
import { Button } from '@/components/ui/button'
import { NetWorthChart } from '@/components/net-worth/net-worth-chart'
import { AccountList } from '@/components/net-worth/account-list'
import { AddAccountDialog } from '@/components/net-worth/add-account-dialog'

interface NetWorthData {
  summary: NetWorthSummary
  breakdown: {
    assets: NetWorthAccountData[]
    liabilities: NetWorthAccountData[]
    totalAssets: number
    totalLiabilities: number
  }
}

export function NetWorthDashboard() {
  const [data, setData] = useState<NetWorthData | null>(null)
  const [snapshots, setSnapshots] = useState<NetWorthSnapshotData[]>([])
  const [period, setPeriod] = useState<HistoryPeriod>('monthly')
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [snapshotting, setSnapshotting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        fetch('/api/net-worth'),
        fetch(`/api/net-worth/history?period=${period}`),
      ])

      if (summaryRes.ok && historyRes.ok) {
        const summaryData = await summaryRes.json()
        const historyData = await historyRes.json()
        setData(summaryData)
        setSnapshots(historyData.snapshots)
      }
    } catch {
      // silently fail, data stays null
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleTakeSnapshot() {
    setSnapshotting(true)
    try {
      const res = await fetch('/api/net-worth/snapshot', { method: 'POST' })
      if (res.ok) {
        await fetchData()
      }
    } catch {
      // ignore
    } finally {
      setSnapshotting(false)
    }
  }

  function handleAccountUpdated() {
    fetchData()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  const summary = data?.summary ?? {
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    monthOverMonthChange: null,
    monthOverMonthPercent: null,
    yearOverYearChange: null,
    yearOverYearPercent: null,
  }

  const breakdown = data?.breakdown ?? {
    assets: [],
    liabilities: [],
    totalAssets: 0,
    totalLiabilities: 0,
  }

  const hasAccounts = breakdown.assets.length > 0 || breakdown.liabilities.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Net Worth</h1>
          <p className="mt-1 text-gray-600">
            Track your assets, liabilities, and net worth over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTakeSnapshot}
            disabled={snapshotting || !hasAccounts}
            title="Take a snapshot of your current net worth"
          >
            <Camera className="h-4 w-4 mr-1" />
            {snapshotting ? 'Saving...' : 'Snapshot'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Net Worth"
          value={formatCurrency(summary.netWorth)}
          change={summary.monthOverMonthChange}
          changePercent={summary.monthOverMonthPercent}
          changeLabel="vs last month"
          icon={DollarSign}
          iconColor="text-blue-600 bg-blue-50"
        />
        <SummaryCard
          title="Total Assets"
          value={formatCurrency(summary.totalAssets)}
          change={null}
          changePercent={null}
          changeLabel=""
          icon={TrendingUp}
          iconColor="text-green-600 bg-green-50"
        />
        <SummaryCard
          title="Total Liabilities"
          value={formatCurrency(summary.totalLiabilities)}
          change={null}
          changePercent={null}
          changeLabel=""
          icon={TrendingDown}
          iconColor="text-red-600 bg-red-50"
        />
      </div>

      {/* Year-over-year change card */}
      {(summary.monthOverMonthChange !== null || summary.yearOverYearChange !== null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.monthOverMonthChange !== null && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg ${summary.monthOverMonthChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                {summary.monthOverMonthChange >= 0
                  ? <ArrowUpRight className="h-5 w-5 text-green-600" />
                  : <ArrowDownRight className="h-5 w-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500">Month-over-Month</p>
                <p className={`text-lg font-semibold ${summary.monthOverMonthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.monthOverMonthChange >= 0 ? '+' : ''}{formatCurrency(summary.monthOverMonthChange)}
                  {summary.monthOverMonthPercent !== null && (
                    <span className="text-sm font-normal ml-2">
                      ({formatPercent(summary.monthOverMonthPercent)})
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          {summary.yearOverYearChange !== null && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
              <div className={`p-2 rounded-lg ${summary.yearOverYearChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                {summary.yearOverYearChange >= 0
                  ? <ArrowUpRight className="h-5 w-5 text-green-600" />
                  : <ArrowDownRight className="h-5 w-5 text-red-600" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500">Year-over-Year</p>
                <p className={`text-lg font-semibold ${summary.yearOverYearChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.yearOverYearChange >= 0 ? '+' : ''}{formatCurrency(summary.yearOverYearChange)}
                  {summary.yearOverYearPercent !== null && (
                    <span className="text-sm font-normal ml-2">
                      ({formatPercent(summary.yearOverYearPercent)})
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Net Worth chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Net Worth Over Time</h2>
          <div className="flex gap-1">
            {(['monthly', 'quarterly', 'yearly'] as HistoryPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-md transition-colors capitalize ${
                  period === p
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <NetWorthChart snapshots={snapshots} />
      </div>

      {/* Account list */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Accounts</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <AccountList
          assets={breakdown.assets}
          liabilities={breakdown.liabilities}
          totalAssets={breakdown.totalAssets}
          totalLiabilities={breakdown.totalLiabilities}
          onAccountUpdated={handleAccountUpdated}
        />
      </div>

      <AddAccountDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSaved={handleAccountUpdated}
      />
    </div>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  change: number | null
  changePercent: number | null
  changeLabel: string
  icon: typeof DollarSign
  iconColor: string
}

function SummaryCard({ title, value, change, changePercent, changeLabel, icon: Icon, iconColor }: SummaryCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change !== null && changePercent !== null && (
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(changePercent)}
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
      {change !== null && (
        <p className="text-xs text-gray-400 mt-0.5">{changeLabel}</p>
      )}
    </div>
  )
}
