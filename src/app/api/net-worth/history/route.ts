import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { subMonths, subYears, startOfDay } from 'date-fns'

import { auth } from '@/lib/auth'
import { getDailyNetWorth } from '@/lib/services/daily-net-worth'

type HistoryPeriod = 'monthly' | 'quarterly' | 'yearly'
const VALID_PERIODS: HistoryPeriod[] = ['monthly', 'quarterly', 'yearly']

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const periodParam = request.nextUrl.searchParams.get('period') ?? 'monthly'
  const period = VALID_PERIODS.includes(periodParam as HistoryPeriod)
    ? (periodParam as HistoryPeriod)
    : 'monthly'

  const now = new Date()
  let since: Date

  switch (period) {
    case 'monthly':
      since = startOfDay(subMonths(now, 12))
      break
    case 'quarterly':
      since = startOfDay(subYears(now, 3))
      break
    case 'yearly':
      since = startOfDay(subYears(now, 10))
      break
  }

  const dailyData = await getDailyNetWorth(session.user.id, since)

  // For quarterly/yearly views, sample data to reduce density
  let snapshots = dailyData
  if (period === 'quarterly') {
    snapshots = sampleMonthly(dailyData)
  } else if (period === 'yearly') {
    snapshots = sampleQuarterly(dailyData)
  }

  return NextResponse.json({ snapshots })
}

function sampleMonthly(data: typeof getDailyNetWorth extends (...args: never[]) => Promise<infer R> ? R : never) {
  const byMonth = new Map<string, (typeof data)[number]>()
  for (const row of data) {
    const key = row.date.slice(0, 7) // YYYY-MM
    byMonth.set(key, row) // keep last day of each month
  }
  return Array.from(byMonth.values())
}

function sampleQuarterly(data: typeof getDailyNetWorth extends (...args: never[]) => Promise<infer R> ? R : never) {
  const byQuarter = new Map<string, (typeof data)[number]>()
  for (const row of data) {
    const month = parseInt(row.date.slice(5, 7), 10)
    const quarter = Math.floor((month - 1) / 3)
    const key = `${row.date.slice(0, 4)}-Q${quarter}`
    byQuarter.set(key, row) // keep last day of each quarter
  }
  return Array.from(byQuarter.values())
}
