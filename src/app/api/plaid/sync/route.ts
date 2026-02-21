import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { getPlaidClientForUser } from '@/lib/plaid'
import { syncPlaidTransactions } from '@/lib/services/plaid-sync'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { connectionId } = body

  if (!connectionId) {
    return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 })
  }

  const client = await getPlaidClientForUser(session.user.id)
  if (!client) {
    return NextResponse.json(
      { error: 'Plaid is not configured' },
      { status: 400 },
    )
  }

  try {
    const result = await syncPlaidTransactions(
      client,
      connectionId,
      session.user.id,
    )
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Plaid sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 },
    )
  }
}
