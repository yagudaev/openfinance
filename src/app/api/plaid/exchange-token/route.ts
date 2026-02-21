import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getPlaidClientForUser } from '@/lib/plaid'
import { syncPlaidTransactions } from '@/lib/services/plaid-sync'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { public_token, institution } = body

  if (!public_token) {
    return NextResponse.json({ error: 'Missing public_token' }, { status: 400 })
  }

  const client = await getPlaidClientForUser(session.user.id)
  if (!client) {
    return NextResponse.json(
      { error: 'Plaid is not configured' },
      { status: 400 },
    )
  }

  try {
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token,
    })

    const { access_token, item_id } = exchangeResponse.data

    // Store the connection
    const connection = await prisma.plaidConnection.create({
      data: {
        userId: session.user.id,
        accessToken: access_token,
        itemId: item_id,
        institutionId: institution?.institution_id || 'unknown',
        institutionName: institution?.name || 'Unknown Institution',
      },
    })

    // Trigger initial sync
    try {
      const syncResult = await syncPlaidTransactions(
        client,
        connection.id,
        session.user.id,
      )
      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        sync: syncResult,
      })
    } catch (syncError) {
      // Connection was created but initial sync failed — still return success
      console.error('Initial Plaid sync error:', syncError)
      return NextResponse.json({
        success: true,
        connectionId: connection.id,
        syncError: 'Initial sync failed, will retry automatically',
      })
    }
  } catch (error) {
    console.error('Plaid token exchange error:', error)
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 },
    )
  }
}
