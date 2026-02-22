import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { categorizeTransactions } from '@/lib/services/transaction-categorizer'

/**
 * POST /api/transactions/categorize
 *
 * Re-categorizes uncategorized transactions (those with null category).
 * Optionally accepts { transactionIds: string[] } to target specific ones.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { transactionIds } = body as { transactionIds?: string[] }

    let ids: string[]

    if (transactionIds && transactionIds.length > 0) {
      ids = transactionIds
    } else {
      // Find all uncategorized transactions
      const uncategorized = await prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          category: null,
        },
        select: { id: true },
      })
      ids = uncategorized.map(t => t.id)
    }

    if (ids.length === 0) {
      return Response.json({ success: true, categorized: 0, message: 'No uncategorized transactions found' })
    }

    // Process in batches of 50 to avoid overwhelming the LLM
    const batchSize = 50
    let totalCategorized = 0

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize)
      const result = await categorizeTransactions(batch, session.user.id)
      totalCategorized += result.categorized
    }

    return Response.json({
      success: true,
      categorized: totalCategorized,
      total: ids.length,
    })
  } catch (error) {
    console.error('Error in categorize endpoint:', error)
    return Response.json(
      { error: 'Failed to categorize transactions' },
      { status: 500 },
    )
  }
}
