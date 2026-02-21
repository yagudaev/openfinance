'use client'

import { useState, useRef } from 'react'
import { Bar, BarChart, XAxis, YAxis, Cell, ReferenceLine } from 'recharts'

import { ChartConfig, ChartContainer } from '@/components/ui/chart'
import { formatCurrency, type CashflowDataPoint } from '@/lib/services/dashboard'

interface CashflowChartProps {
  data: CashflowDataPoint[]
}

const chartConfig = {
  cashflow: { label: 'Cashflow' },
} satisfies ChartConfig

export function CashflowChart({ data }: CashflowChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItem = selectedIndex !== null ? data[selectedIndex] : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleBarMouseEnter(data: any, index: number, e: React.MouseEvent) {
    setSelectedIndex(index)
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          onMouseLeave={() => setSelectedIndex(null)}
        >
          <XAxis
            dataKey="monthLabel"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.split(' ')[0]}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value)}
            fontSize={12}
            width={80}
          />
          <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
          <Bar
            dataKey="cashflow"
            radius={[4, 4, 0, 0]}
            onMouseEnter={handleBarMouseEnter}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.cashflow >= 0 ? '#22c55e' : '#ef4444'}
                opacity={
                  selectedIndex === null || selectedIndex === index ? 1 : 0.4
                }
                className="cursor-pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      {selectedItem && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-[200px] z-10 pointer-events-none"
          style={{
            left: Math.min(
              tooltipPos.x + 10,
              (containerRef.current?.offsetWidth || 300) - 220,
            ),
            top: Math.max(tooltipPos.y - 100, 10),
          }}
        >
          <p className="font-medium mb-2">{selectedItem.monthLabel}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Income:</span>
              <span className="text-green-400">
                {formatCurrency(selectedItem.income)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Expenses:</span>
              <span className="text-red-400">
                {formatCurrency(selectedItem.expenses)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-gray-700 pt-1 mt-1">
              <span className="text-gray-400">Cashflow:</span>
              <span
                className={`font-medium ${selectedItem.cashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {formatCurrency(selectedItem.cashflow)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
