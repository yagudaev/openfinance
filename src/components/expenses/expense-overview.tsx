'use client'

import { useState, useRef } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { ArrowUpRight, ArrowDownRight, TrendingDown } from 'lucide-react'

import { ChartConfig, ChartContainer } from '@/components/ui/chart'
import { formatCurrency } from '@/lib/services/dashboard-types'
import {
  type CategorySummary,
  getCategoryLabel,
} from '@/lib/types/expenses'

interface ExpenseOverviewProps {
  categories: CategorySummary[]
  totalSpending: number
  prevTotalSpending: number
  onCategoryClick: (category: string) => void
}

const CHART_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#f97316', // orange
  '#ec4899', // pink
]

const chartConfig = {
  spending: { label: 'Spending' },
} satisfies ChartConfig

export function ExpenseOverview({
  categories,
  totalSpending,
  prevTotalSpending,
  onCategoryClick,
}: ExpenseOverviewProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const chartData = categories.map((cat, i) => ({
    name: getCategoryLabel(cat.category),
    value: cat.total,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))

  const totalChangePercent =
    prevTotalSpending > 0
      ? ((totalSpending - prevTotalSpending) / prevTotalSpending) * 100
      : 0

  function handlePieMouseEnter(_data: unknown, index: number, e: React.MouseEvent) {
    setHoveredIndex(index)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-16">
        <TrendingDown className="h-12 w-12 text-gray-300" />
        <p className="mt-3 font-medium text-gray-900">No expense data</p>
        <p className="mt-1 text-sm text-gray-500">
          No transactions found for this time period.
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      {/* Summary card */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Spending</p>
            <p className="text-3xl font-semibold text-gray-900">
              {formatCurrency(totalSpending)}
            </p>
          </div>
          {prevTotalSpending > 0 && (
            <div
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                totalChangePercent > 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-green-50 text-green-700'
              }`}
            >
              {totalChangePercent > 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {Math.abs(totalChangePercent).toFixed(0)}% vs previous period
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Donut chart */}
        <div className="relative rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-500">
            Spending by Category
          </h3>
          <ChartContainer config={chartConfig} className="mx-auto h-[280px] w-[280px]">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={handlePieMouseEnter}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={(_data, index) =>
                  onCategoryClick(categories[index].category)
                }
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    opacity={
                      hoveredIndex === null || hoveredIndex === index ? 1 : 0.4
                    }
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>

          {/* Center label */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalSpending)}
              </p>
            </div>
          </div>

          {/* Tooltip */}
          {hoveredIndex !== null && categories[hoveredIndex] && (
            <div
              className="pointer-events-none absolute z-10 min-w-[180px] rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg"
              style={{
                left: Math.min(tooltipPos.x + 10, 260),
                top: Math.max(tooltipPos.y - 60, 10),
              }}
            >
              <p className="mb-1 font-medium">
                {getCategoryLabel(categories[hoveredIndex].category)}
              </p>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Amount:</span>
                <span>{formatCurrency(categories[hoveredIndex].total)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Share:</span>
                <span>
                  {categories[hoveredIndex].percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Category list */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-medium text-gray-500">
            Categories
          </h3>
          <div className="space-y-3">
            {categories.map((cat, index) => (
              <button
                key={cat.category}
                onClick={() => onCategoryClick(cat.category)}
                className="flex w-full items-center gap-4 rounded-lg p-3 text-left transition-colors hover:bg-gray-50"
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      CHART_COLORS[index % CHART_COLORS.length],
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {getCategoryLabel(cat.category)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{cat.count} transactions</span>
                    <div className="flex items-center gap-2">
                      <span>{cat.percentage.toFixed(1)}%</span>
                      {cat.prevTotal > 0 && (
                        <span
                          className={
                            cat.changePercent > 0
                              ? 'text-red-600'
                              : 'text-green-600'
                          }
                        >
                          {cat.changePercent > 0 ? '+' : ''}
                          {cat.changePercent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
