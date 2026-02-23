import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { recomputeDailyNetWorth } from '@/lib/services/daily-net-worth'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await recomputeDailyNetWorth(session.user.id)

  return NextResponse.json({ success: true })
}
