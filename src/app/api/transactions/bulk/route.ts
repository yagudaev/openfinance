import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { recalculateNetWorth } from '@/lib/services/daily-net-worth'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CATEGORIES = [
  'expense',
  'income',
  'owner-pay',
  'internal-transfer',
  'shareholder-loan',
]

/**
 * POST /api/transactions/bulk
 *
 * Bulk operations on transactions.
 * Body: { action: 'delete' | 'change-category', ids: string[], category?: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, ids, category } = body as {
    action: string
    ids: string[]
    category?: string | null
  }

  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'action and ids[] are required' },
      { status: 400 },
    )
  }

  // Verify all transactions belong to the user
  const owned = await prisma.transaction.findMany({
    where: { id: { in: ids }, userId: session.user.id },
    select: { id: true },
  })
  const ownedIds = owned.map(t => t.id)

  if (ownedIds.length === 0) {
    return NextResponse.json({ error: 'No matching transactions found' }, { status: 404 })
  }

  if (action === 'delete') {
    const result = await prisma.transaction.deleteMany({
      where: { id: { in: ownedIds } },
    })

    await recalculateNetWorth(session.user.id)

    return NextResponse.json({
      success: true,
      deleted: result.count,
    })
  }

  if (action === 'change-category') {
    if (category !== null && category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    const result = await prisma.transaction.updateMany({
      where: { id: { in: ownedIds } },
      data: { category: category ?? null },
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
