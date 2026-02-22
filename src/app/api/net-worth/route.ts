import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getSummary, getAccountBreakdown } from '@/lib/services/net-worth'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [summary, breakdown] = await Promise.all([
    getSummary(session.user.id),
    getAccountBreakdown(session.user.id),
  ])

  return NextResponse.json({ summary, breakdown })
}
