'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Brain,
  Database,
  HelpCircle,
} from 'lucide-react'

import { useMounted } from '@/hooks/use-mounted'

const CHART_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#a855f7', // purple
]

interface ChartDataPoint {
  label: string
  value: number
  secondaryValue?: number
  link?: string
  source?: string
}

interface ChartSpec {
  title: string
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'stacked_bar'
  data: ChartDataPoint[]
  xAxisLabel?: string
  yAxisLabel?: string
  valuePrefix: string
  valueSuffix: string
  secondaryLabel?: string
  primaryLabel?: string
}

interface ChatChartProps {
  chart: ChartSpec
}

function formatValue(value: number, prefix: string, suffix: string): string {
  const absValue = Math.abs(value)
  let formatted: string
  if (absValue >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(1)}M`
  } else if (absValue >= 10_000) {
    formatted = `${(value / 1_000).toFixed(1)}K`
  } else {
    formatted = value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  return `${prefix}${formatted}${suffix}`
}

function formatFullValue(value: number, prefix: string, suffix: string): string {
  return `${prefix}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`
}

function getSourceIcon(source: string | undefined) {
  if (!source) return null
  if (source.startsWith('memory:')) {
    return { icon: Brain, label: source.replace('memory:', ''), type: 'memory' as const }
  }
  if (source.startsWith('assumption:')) {
    return { icon: HelpCircle, label: source.replace('assumption:', ''), type: 'assumption' as const }
  }
  return { icon: Database, label: source, type: 'data' as const }
}

function SourceBadge({ source }: { source: string | undefined }) {
  const info = getSourceIcon(source)
  if (!info) return null
  const Icon = info.icon

  const colorClasses = {
    memory: 'bg-purple-50 text-purple-700 border-purple-200',
    assumption: 'bg-amber-50 text-amber-700 border-amber-200',
    data: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorClasses[info.type]}`}>
      <Icon className="h-2.5 w-2.5" />
      {info.label}
    </span>
  )
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: readonly Record<string, unknown>[]
  label?: string | number
  prefix: string
  suffix: string
  primaryLabel?: string
  secondaryLabel?: string
}

function ChartTooltipContent({
  active,
  payload,
  label,
  prefix,
  suffix,
  primaryLabel,
  secondaryLabel,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
      <p className="mb-1 font-medium text-gray-300">{String(label ?? '')}</p>
      {payload.map((entry, i) => {
        const dataKey = entry.dataKey as string
        const seriesLabel = dataKey === 'secondaryValue'
          ? (secondaryLabel ?? 'Secondary')
          : dataKey === 'value'
            ? (primaryLabel ?? 'Value')
            : dataKey
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color as string }}
            />
            <span className="text-gray-400">{seriesLabel}:</span>
            <span className="font-medium">{formatFullValue(entry.value as number, prefix, suffix)}</span>
          </div>
        )
      })}
    </div>
  )
}

function DataSourceTable({ data, prefix, suffix }: {
  data: ChartDataPoint[]
  prefix: string
  suffix: string
}) {
  const router = useRouter()
  const hasSecondary = data.some(d => d.secondaryValue !== undefined)
  const hasSources = data.some(d => d.source)
  const hasLinks = data.some(d => d.link)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">Label</th>
            <th className="pb-2 pr-4 text-right font-medium">Value</th>
            {hasSecondary && (
              <th className="pb-2 pr-4 text-right font-medium">Secondary</th>
            )}
            {hasSources && (
              <th className="pb-2 pr-4 font-medium">Source</th>
            )}
            {hasLinks && (
              <th className="pb-2 font-medium">Link</th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((point, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0">
              <td className="py-1.5 pr-4 font-medium text-gray-900">{point.label}</td>
              <td className="py-1.5 pr-4 text-right tabular-nums text-gray-700">
                {formatFullValue(point.value, prefix, suffix)}
              </td>
              {hasSecondary && (
                <td className="py-1.5 pr-4 text-right tabular-nums text-gray-700">
                  {point.secondaryValue !== undefined
                    ? formatFullValue(point.secondaryValue, prefix, suffix)
                    : '-'}
                </td>
              )}
              {hasSources && (
                <td className="py-1.5 pr-4">
                  <SourceBadge source={point.source} />
                </td>
              )}
              {hasLinks && (
                <td className="py-1.5">
                  {point.link && (
                    <button
                      type="button"
                      onClick={() => router.push(point.link!)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      View
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChatChart({ chart }: ChatChartProps) {
  const router = useRouter()
  const mounted = useMounted()
  const [showData, setShowData] = useState(false)
  const { title, chartType, data, xAxisLabel, yAxisLabel, valuePrefix, valueSuffix, primaryLabel, secondaryLabel } = chart

  const hasSources = data.some(d => d.source)

  function handleDataPointClick(point: ChartDataPoint) {
    if (point.link) {
      router.push(point.link)
    }
  }

  function renderChart() {
    if (!mounted) {
      return (
        <div className="flex h-[240px] w-full items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
        </div>
      )
    }

    const hasLinks = data.some(d => d.link)
    const cursorStyle = hasLinks ? 'pointer' : 'default'

    switch (chartType) {
      case 'pie': {
        const chartData = data.map((d, i) => ({
          ...d,
          name: d.label,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        }))
        const total = data.reduce((sum, d) => sum + d.value, 0)

        return (
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(_data, index) => handleDataPointClick(data[index])}
                  style={{ cursor: cursorStyle }}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.fill}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const item = payload[0]
                    const percentage = ((item.value as number) / total * 100).toFixed(1)
                    return (
                      <div className="rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
                        <p className="mb-1 font-medium">{item.name}</p>
                        <p>{formatFullValue(item.value as number, valuePrefix, valueSuffix)} ({percentage}%)</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center total */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[10px] text-gray-500">Total</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatValue(total, valuePrefix, valueSuffix)}
                </p>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {chartData.map((entry, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDataPointClick(data[i])}
                  className="flex items-center gap-1.5 text-[11px] text-gray-600 transition-colors hover:text-gray-900"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        )
      }

      case 'bar': {
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(v, valuePrefix, valueSuffix)}
                fontSize={11}
                width={70}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    prefix={valuePrefix}
                    suffix={valueSuffix}
                    primaryLabel={primaryLabel}
                  />
                )}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 0, 0]}
                onClick={(_data, index) => handleDataPointClick(data[index])}
                style={{ cursor: cursorStyle }}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }

      case 'stacked_bar': {
        return (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(v, valuePrefix, valueSuffix)}
                fontSize={11}
                width={70}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    prefix={valuePrefix}
                    suffix={valueSuffix}
                    primaryLabel={primaryLabel}
                    secondaryLabel={secondaryLabel}
                  />
                )}
              />
              <Legend formatter={(value) => value === 'value' ? (primaryLabel ?? 'Primary') : (secondaryLabel ?? 'Secondary')} />
              <Bar dataKey="value" stackId="a" fill={CHART_COLORS[0]} radius={[0, 0, 0, 0]} />
              <Bar dataKey="secondaryValue" stackId="a" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      }

      case 'line': {
        return (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(v, valuePrefix, valueSuffix)}
                fontSize={11}
                width={70}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    prefix={valuePrefix}
                    suffix={valueSuffix}
                    primaryLabel={primaryLabel}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS[0], cursor: cursorStyle }}
                activeDot={{
                  r: 5,
                  onClick: (_e: unknown, payload: { index?: number }) => {
                    if (typeof payload?.index === 'number') {
                      handleDataPointClick(data[payload.index])
                    }
                  },
                }}
              />
              {data.some(d => d.secondaryValue !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="secondaryValue"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )
      }

      case 'area': {
        return (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <defs>
                <linearGradient id="chatAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
                {data.some(d => d.secondaryValue !== undefined) && (
                  <linearGradient id="chatAreaGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatValue(v, valuePrefix, valueSuffix)}
                fontSize={11}
                width={70}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' } : undefined}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    prefix={valuePrefix}
                    suffix={valueSuffix}
                    primaryLabel={primaryLabel}
                    secondaryLabel={secondaryLabel}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill="url(#chatAreaGradient)"
              />
              {data.some(d => d.secondaryValue !== undefined) && (
                <Area
                  type="monotone"
                  dataKey="secondaryValue"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  fill="url(#chatAreaGradient2)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )
      }

      default:
        return <p className="text-sm text-gray-500">Unsupported chart type: {chartType}</p>
    }
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Chart header */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        {hasSources && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            Auditable
          </span>
        )}
      </div>

      {/* Chart body */}
      <div className="px-4 py-3">
        {renderChart()}
      </div>

      {/* Data & sources expandable panel */}
      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowData(prev => !prev)}
          className="flex w-full items-center gap-2 px-4 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          {showData ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span>Show data & sources</span>
          <span className="text-gray-400">({data.length} points)</span>
        </button>
        {showData && (
          <div className="border-t border-gray-100 px-4 py-3">
            <DataSourceTable
              data={data}
              prefix={valuePrefix}
              suffix={valueSuffix}
            />
          </div>
        )}
      </div>
    </div>
  )
}
