import { PlaidApi, Transaction as PlaidTransaction, RemovedTransaction } from 'plaid'

import { prisma } from '@/lib/prisma'

interface SyncResult {
  added: number
  modified: number
  removed: number
}

/**
 * Sync transactions from Plaid for a specific connection using the
 * /transactions/sync endpoint with cursor-based pagination.
 */
export async function syncPlaidTransactions(
  client: PlaidApi,
  connectionId: string,
  userId: string,
): Promise<SyncResult> {
  const connection = await prisma.plaidConnection.findUnique({
    where: { id: connectionId },
  })

  if (!connection) {
    throw new Error('Plaid connection not found')
  }

  if (connection.userId !== userId) {
    throw new Error('Unauthorized')
  }

  let cursor = connection.cursor
  const allAdded: PlaidTransaction[] = []
  const allModified: PlaidTransaction[] = []
  const allRemoved: RemovedTransaction[] = []
  let hasMore = true

  try {
    while (hasMore) {
      const response = await client.transactionsSync({
        access_token: connection.accessToken,
        cursor: cursor ?? undefined,
      })

      const data = response.data
      allAdded.push(...data.added)
      allModified.push(...data.modified)
      allRemoved.push(...data.removed)
      hasMore = data.has_more
      cursor = data.next_cursor
    }

    // Apply added transactions
    for (const tx of allAdded) {
      await upsertPlaidTransaction(tx, userId)
    }

    // Apply modified transactions
    for (const tx of allModified) {
      await upsertPlaidTransaction(tx, userId)
    }

    // Remove deleted transactions
    for (const removed of allRemoved) {
      if (removed.transaction_id) {
        await prisma.transaction.deleteMany({
          where: {
            plaidId: removed.transaction_id,
            userId,
            source: 'plaid',
          },
        })
      }
    }

    // Update connection with new cursor and sync time
    await prisma.plaidConnection.update({
      where: { id: connectionId },
      data: {
        cursor,
        lastSyncedAt: new Date(),
        status: 'active',
        errorMessage: null,
      },
    })

    return {
      added: allAdded.length,
      modified: allModified.length,
      removed: allRemoved.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'
    await prisma.plaidConnection.update({
      where: { id: connectionId },
      data: {
        status: 'error',
        errorMessage: message,
      },
    })
    throw error
  }
}

async function upsertPlaidTransaction(
  tx: PlaidTransaction,
  userId: string,
) {
  const transactionDate = new Date(tx.date)
  // Plaid amounts: positive = money leaving account (debit), negative = money entering (credit)
  // Our convention: positive = credit, negative = debit — so we invert
  const amount = -tx.amount
  const transactionType = amount >= 0 ? 'credit' : 'debit'
  const description = tx.merchant_name || tx.name || 'Unknown'

  const existing = await prisma.transaction.findFirst({
    where: { plaidId: tx.transaction_id, userId },
  })

  if (existing) {
    await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        transactionDate,
        description,
        amount,
        transactionType,
        category: tx.personal_finance_category?.primary?.toLowerCase() ?? null,
        isProvisional: tx.pending,
      },
    })
  } else {
    await prisma.transaction.create({
      data: {
        userId,
        transactionDate,
        description,
        amount,
        transactionType,
        category: tx.personal_finance_category?.primary?.toLowerCase() ?? null,
        source: 'plaid',
        plaidId: tx.transaction_id,
        isProvisional: tx.pending,
      },
    })
  }
}

/**
 * When a bank statement is uploaded and processed, reconcile provisional
 * Plaid transactions that fall within the statement period.
 * Matches by date + amount + fuzzy description.
 */
export async function reconcileProvisionalTransactions(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  accountNumber?: string,
) {
  // Find provisional Plaid transactions in the statement period
  const provisionalTxns = await prisma.transaction.findMany({
    where: {
      userId,
      source: 'plaid',
      isProvisional: true,
      transactionDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  if (provisionalTxns.length === 0) return { reconciled: 0 }

  // Find statement transactions in the same period
  const statementTxns = await prisma.transaction.findMany({
    where: {
      userId,
      source: 'statement',
      transactionDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  })

  const matchedPlaidIds: string[] = []

  for (const provisional of provisionalTxns) {
    const match = statementTxns.find(st =>
      st.transactionDate.getTime() === provisional.transactionDate.getTime() &&
      Math.abs(st.amount - provisional.amount) < 0.01 &&
      fuzzyDescriptionMatch(st.description, provisional.description),
    )

    if (match) {
      matchedPlaidIds.push(provisional.id)
    }
  }

  // Delete matched provisional transactions (statement ones replace them)
  if (matchedPlaidIds.length > 0) {
    await prisma.transaction.deleteMany({
      where: {
        id: { in: matchedPlaidIds },
      },
    })
  }

  // Mark remaining Plaid transactions in this period as non-provisional
  // since the statement has been processed for this period
  await prisma.transaction.updateMany({
    where: {
      userId,
      source: 'plaid',
      isProvisional: true,
      transactionDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    data: { isProvisional: false },
  })

  return { reconciled: matchedPlaidIds.length }
}

function fuzzyDescriptionMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const na = normalize(a)
  const nb = normalize(b)

  // Exact match after normalization
  if (na === nb) return true

  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return true

  return false
}
