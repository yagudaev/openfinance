'use client'

import { useState } from 'react'
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

import type { CategoricalChartFunc } from 'recharts/types/chart/types'

import { formatCurrency, type DailyNetWorthData } from '@/lib/services/net-worth-types'

interface NetWorthChartProps {
  snapshots: DailyNetWorthData[]
  onDayClick?: (date: string) => void
}

type ChartView = 'netWorth' | 'breakdown'

export function NetWorthChart({ snapshots, onDayClick }: NetWorthChartProps) {
  const [view, setView] = useState<ChartView>('netWorth')

  const chartData = snapshots.map((s) => ({
    date: s.date,
    dateLabel: format(parseISO(s.date), 'MMM d, yyyy'),
    netWorth: s.netWorth,
    assets: s.totalAssets,
    liabilities: s.totalLiabilities,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        <p>Upload and process bank statements to see your net worth over time.</p>
      </div>
    )
  }

  const handleChartClick: CategoricalChartFunc = (nextState) => {
    const idx = nextState.activeTooltipIndex
    if (typeof idx === 'number' && onDayClick) {
      const item = chartData[idx]
      if (item?.date) {
        onDayClick(item.date)
      }
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView('netWorth')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            view === 'netWorth'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Net Worth
        </button>
        <button
          type="button"
          onClick={() => setView('breakdown')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            view === 'breakdown'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Assets vs Liabilities
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {view === 'netWorth' ? (
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
            onClick={handleChartClick}
            style={{ cursor: onDayClick ? 'pointer' : undefined }}
          >
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              fontSize={12}
              width={80}
            />
            <Tooltip
              formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Net Worth']}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: '#111827',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#93c5fd' }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        ) : (
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
            onClick={handleChartClick}
            style={{ cursor: onDayClick ? 'pointer' : undefined }}
          >
            <defs>
              <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="liabilitiesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              fontSize={12}
              width={80}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => [
                formatCurrency(value ?? 0),
                name === 'assets' ? 'Assets' : 'Liabilities',
              ]}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: '#111827',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
            />
            <Legend
              formatter={(value) => (value === 'assets' ? 'Assets' : 'Liabilities')}
            />
            <Area
              type="monotone"
              dataKey="assets"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#assetsGradient)"
            />
            <Area
              type="monotone"
              dataKey="liabilities"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#liabilitiesGradient)"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
      {onDayClick && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Click any point on the chart to see account breakdown and transactions for that day.
        </p>
      )}
    </div>
  )
}
