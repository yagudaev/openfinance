'use client'

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

import { formatCurrency } from '@/lib/services/net-worth-types'
import type { ProjectionPoint } from '@/lib/services/scenario-types'
import { useMounted } from '@/hooks/use-mounted'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b']

interface ScenarioChartProps {
  scenarios: {
    title: string
    projections: ProjectionPoint[]
  }[]
}

export function ScenarioChart({ scenarios }: ScenarioChartProps) {
  const mounted = useMounted()

  if (scenarios.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        <p>No scenario data to display.</p>
      </div>
    )
  }

  // Build unified chart data keyed by month
  const monthMap = new Map<number, Record<string, number | string>>()

  for (let si = 0; si < scenarios.length; si++) {
    const s = scenarios[si]
    for (const p of s.projections) {
      if (!monthMap.has(p.month)) {
        monthMap.set(p.month, { month: p.month, date: p.date })
      }
      const row = monthMap.get(p.month)!
      row[`nw_${si}`] = p.netWorth
    }
  }

  const chartData = Array.from(monthMap.values()).sort(
    (a, b) => (a.month as number) - (b.month as number),
  )

  // For single scenarios with many months, sample to keep chart readable
  const sampledData = chartData.length > 120
    ? chartData.filter((_, i) => i % 12 === 0 || i === chartData.length - 1)
    : chartData.length > 60
      ? chartData.filter((_, i) => i % 3 === 0 || i === chartData.length - 1)
      : chartData

  if (!mounted) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={sampledData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatCurrency(value)}
          fontSize={12}
          width={90}
        />
        <Tooltip
          formatter={(value: number | undefined, name: string | undefined) => {
            const idx = parseInt(name?.replace('nw_', '') ?? '0', 10)
            const label = scenarios[idx]?.title ?? 'Scenario'
            return [formatCurrency(value ?? 0), label]
          }}
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
        {scenarios.length > 1 && (
          <Legend
            formatter={(value) => {
              const idx = parseInt(value.replace('nw_', ''), 10)
              return scenarios[idx]?.title ?? 'Scenario'
            }}
          />
        )}
        {scenarios.map((_, i) => (
          <Line
            key={i}
            type="monotone"
            dataKey={`nw_${i}`}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
