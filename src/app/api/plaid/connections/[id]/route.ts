import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { getPlaidClientForUser } from '@/lib/plaid'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const connection = await prisma.plaidConnection.findUnique({
    where: { id },
  })

  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Try to remove the item from Plaid
  try {
    const client = await getPlaidClientForUser(session.user.id)
    if (client) {
      await client.itemRemove({ access_token: decrypt(connection.accessToken) })
    }
  } catch (error) {
    // If removal from Plaid fails, still disconnect locally
    console.error('Plaid itemRemove error:', error)
  }

  // Delete the connection and its provisional transactions
  await prisma.transaction.deleteMany({
    where: {
      userId: session.user.id,
      source: 'plaid',
      isProvisional: true,
    },
  })

  await prisma.plaidConnection.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
