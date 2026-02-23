import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getDayDrillDown } from '@/lib/services/daily-net-worth'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateParam = request.nextUrl.searchParams.get('date')
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Missing or invalid date parameter (expected YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  const data = await getDayDrillDown(session.user.id, dateParam)

  return NextResponse.json(data)
}
