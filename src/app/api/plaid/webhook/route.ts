import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getPlaidClientForUser } from '@/lib/plaid'
import { syncPlaidTransactions } from '@/lib/services/plaid-sync'

export async function POST(request: NextRequest) {
  // Plaid webhooks are unauthenticated — verify by item_id lookup
  // TODO: Add Plaid webhook verification for production
  const body = await request.json()
  const { webhook_type, webhook_code, item_id, error: plaidError } = body

  if (!item_id) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 })
  }

  const connection = await prisma.plaidConnection.findUnique({
    where: { itemId: item_id },
  })

  if (!connection) {
    // Unknown item — ignore silently
    return NextResponse.json({ received: true })
  }

  // Handle transaction sync updates
  if (webhook_type === 'TRANSACTIONS') {
    if (webhook_code === 'SYNC_UPDATES_AVAILABLE') {
      try {
        const client = await getPlaidClientForUser(connection.userId)
        if (client) {
          await syncPlaidTransactions(client, connection.id, connection.userId)
        }
      } catch (error) {
        console.error('Webhook sync error:', error)
      }
    }
  }

  // Handle item errors
  if (webhook_type === 'ITEM') {
    if (webhook_code === 'ERROR') {
      await prisma.plaidConnection.update({
        where: { id: connection.id },
        data: {
          status: 'error',
          errorMessage: plaidError?.error_message || 'Unknown item error',
        },
      })
    }
  }

  return NextResponse.json({ received: true })
}
