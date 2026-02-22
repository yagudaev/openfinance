import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getSnapshots, type HistoryPeriod } from '@/lib/services/net-worth'

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

  const snapshots = await getSnapshots(session.user.id, period)

  return NextResponse.json({ snapshots })
}
