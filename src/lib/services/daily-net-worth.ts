import {
  startOfDay,
  addDays,
  isBefore,
  isAfter,
  format,
} from 'date-fns'

import { prisma } from '@/lib/prisma'

/**
 * Recompute daily net worth snapshots for a user.
 *
 * Approach:
 * 1. Load all transactions grouped by their linked NetWorthAccount (via bankAccountId).
 * 2. For each account, walk calendar days from the statement's opening balance date
 *    through today, accumulating transaction amounts to derive end-of-day balance.
 * 3. For days with no transactions, carry forward the previous day's balance.
 * 4. Upsert DailyAccountBalance rows (dense — every calendar day).
 * 5. Aggregate all accounts per day into DailyNetWorth (totalAssets, totalLiabilities, netWorth).
 */
export async function recomputeDailyNetWorth(userId: string): Promise<void> {
  const today = startOfDay(new Date())

  // Get all active net worth accounts linked to bank accounts
  const netWorthAccounts = await prisma.netWorthAccount.findMany({
    where: { userId, isActive: true },
  })

  // For accounts linked to bank accounts, compute daily balances from transactions
  const linkedAccounts = netWorthAccounts.filter((a) => a.bankAccountId)
  const manualAccounts = netWorthAccounts.filter((a) => !a.bankAccountId)

  // Map bankAccountId → netWorthAccount for quick lookup
  const bankToNwAccount = new Map(
    linkedAccounts.map((a) => [a.bankAccountId!, a]),
  )

  // Load all statements for linked bank accounts to get opening balances & periods
  const bankAccountIds = linkedAccounts
    .map((a) => a.bankAccountId!)
    .filter(Boolean)

  const statements = bankAccountIds.length > 0
    ? await prisma.bankStatement.findMany({
        where: {
          userId,
          bankAccountId: { in: bankAccountIds },
          isProcessed: true,
        },
        orderBy: { periodStart: 'asc' },
        select: {
          id: true,
          bankAccountId: true,
          openingBalance: true,
          periodStart: true,
          periodEnd: true,
        },
      })
    : []

  // Load all transactions for these statements
  const statementIds = statements.map((s) => s.id)
  const transactions = statementIds.length > 0
    ? await prisma.transaction.findMany({
        where: {
          userId,
          statementId: { in: statementIds },
        },
        orderBy: { transactionDate: 'asc' },
        select: {
          statementId: true,
          transactionDate: true,
          amount: true,
        },
      })
    : []

  // Group statements by bankAccountId
  const statementsByBank = new Map<string, typeof statements>()
  for (const s of statements) {
    if (!s.bankAccountId) continue
    const arr = statementsByBank.get(s.bankAccountId) || []
    arr.push(s)
    statementsByBank.set(s.bankAccountId, arr)
  }

  // Group transactions by statementId
  const txByStatement = new Map<string, typeof transactions>()
  for (const tx of transactions) {
    if (!tx.statementId) continue
    const arr = txByStatement.get(tx.statementId) || []
    arr.push(tx)
    txByStatement.set(tx.statementId, arr)
  }

  // For each linked account, compute daily balances
  // accountDailyBalances: Map<accountId, Map<dateString, balance>>
  const accountDailyBalances = new Map<string, Map<string, number>>()

  for (const [bankAccountId, nwAccount] of bankToNwAccount) {
    const stmts = statementsByBank.get(bankAccountId) || []
    if (stmts.length === 0) continue

    // Sort by periodStart to process chronologically
    stmts.sort((a, b) => (a.periodStart?.getTime() ?? 0) - (b.periodStart?.getTime() ?? 0))

    const dailyMap = new Map<string, number>()

    for (const stmt of stmts) {
      if (!stmt.periodStart || !stmt.periodEnd || stmt.openingBalance === null) continue

      const stmtTxs = txByStatement.get(stmt.id) || []

      // Build a map of date → total transaction amount for this statement
      const txByDate = new Map<string, number>()
      for (const tx of stmtTxs) {
        const dateKey = format(startOfDay(tx.transactionDate), 'yyyy-MM-dd')
        txByDate.set(dateKey, (txByDate.get(dateKey) || 0) + tx.amount)
      }

      // Walk each calendar day from periodStart to periodEnd
      let runningBalance = stmt.openingBalance
      let day = startOfDay(stmt.periodStart)
      const endDay = startOfDay(stmt.periodEnd)

      while (!isAfter(day, endDay)) {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayAmount = txByDate.get(dateKey) || 0
        runningBalance += dayAmount
        dailyMap.set(dateKey, runningBalance)
        day = addDays(day, 1)
      }
    }

    // Extend to today by carrying forward the last known balance
    if (dailyMap.size > 0) {
      const sortedDates = Array.from(dailyMap.keys()).sort()
      const lastDate = sortedDates[sortedDates.length - 1]
      const lastBalance = dailyMap.get(lastDate)!
      let day = addDays(startOfDay(new Date(lastDate + 'T00:00:00')), 1)

      while (!isAfter(day, today)) {
        const dateKey = format(day, 'yyyy-MM-dd')
        dailyMap.set(dateKey, lastBalance)
        day = addDays(day, 1)
      }
    }

    accountDailyBalances.set(nwAccount.id, dailyMap)
  }

  // For manual accounts, use their currentBalance for every day that any linked account has data
  // (manual accounts don't have transaction history, so we assume constant balance)
  const allDates = new Set<string>()
  for (const dailyMap of accountDailyBalances.values()) {
    for (const dateKey of dailyMap.keys()) {
      allDates.add(dateKey)
    }
  }

  for (const manual of manualAccounts) {
    const dailyMap = new Map<string, number>()
    for (const dateKey of allDates) {
      dailyMap.set(dateKey, manual.currentBalance)
    }
    accountDailyBalances.set(manual.id, dailyMap)
  }

  // Build type lookup
  const accountTypeMap = new Map(
    netWorthAccounts.map((a) => [a.id, a.accountType]),
  )

  // Upsert DailyAccountBalance rows in batch
  // Delete existing and recreate for simplicity (within a transaction)
  await prisma.$transaction(async (tx) => {
    // Clear existing daily data for this user
    await tx.dailyAccountBalance.deleteMany({ where: { userId } })
    await tx.dailyNetWorth.deleteMany({ where: { userId } })

    // Batch create DailyAccountBalance
    const balanceRows: {
      date: Date
      accountId: string
      userId: string
      balance: number
    }[] = []

    for (const [accountId, dailyMap] of accountDailyBalances) {
      for (const [dateKey, balance] of dailyMap) {
        balanceRows.push({
          date: new Date(dateKey + 'T00:00:00.000Z'),
          accountId,
          userId,
          balance,
        })
      }
    }

    if (balanceRows.length > 0) {
      await tx.dailyAccountBalance.createMany({ data: balanceRows })
    }

    // Aggregate into DailyNetWorth
    const sortedDates = Array.from(allDates).sort()
    const netWorthRows: {
      date: Date
      userId: string
      totalAssets: number
      totalLiabilities: number
      netWorth: number
    }[] = []

    for (const dateKey of sortedDates) {
      let totalAssets = 0
      let totalLiabilities = 0

      for (const [accountId, dailyMap] of accountDailyBalances) {
        const balance = dailyMap.get(dateKey)
        if (balance === undefined) continue

        const accountType = accountTypeMap.get(accountId)
        if (accountType === 'asset') {
          totalAssets += balance
        } else {
          totalLiabilities += Math.abs(balance)
        }
      }

      netWorthRows.push({
        date: new Date(dateKey + 'T00:00:00.000Z'),
        userId,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      })
    }

    if (netWorthRows.length > 0) {
      await tx.dailyNetWorth.createMany({ data: netWorthRows })
    }
  })
}

/**
 * Recalculate net worth after deletions (statements, transactions, accounts).
 *
 * 1. For each linked (non-manual) NetWorthAccount, find the most recent
 *    processed statement for its bankAccountId and set currentBalance
 *    to that statement's closing balance. If no statements remain, set to 0.
 * 2. Recompute all daily net worth snapshots from remaining transactions.
 */
export async function recalculateNetWorth(userId: string): Promise<void> {
  // Update currentBalance on linked NetWorthAccounts from remaining statements
  const linkedAccounts = await prisma.netWorthAccount.findMany({
    where: { userId, isManual: false, bankAccountId: { not: null } },
  })

  for (const account of linkedAccounts) {
    const latestStatement = await prisma.bankStatement.findFirst({
      where: {
        userId,
        bankAccountId: account.bankAccountId!,
        isProcessed: true,
        closingBalance: { not: null },
      },
      orderBy: { periodEnd: 'desc' },
      select: { closingBalance: true },
    })

    const newBalance = latestStatement?.closingBalance ?? 0

    if (account.currentBalance !== newBalance) {
      await prisma.netWorthAccount.update({
        where: { id: account.id },
        data: { currentBalance: newBalance },
      })
    }
  }

  // Recompute daily snapshots from remaining transactions
  await recomputeDailyNetWorth(userId)
}

/**
 * Get daily net worth data for chart display.
 */
export async function getDailyNetWorth(
  userId: string,
  since?: Date,
): Promise<{ date: string; totalAssets: number; totalLiabilities: number; netWorth: number }[]> {
  const rows = await prisma.dailyNetWorth.findMany({
    where: {
      userId,
      ...(since ? { date: { gte: since } } : {}),
    },
    orderBy: { date: 'asc' },
  })

  return rows.map((r) => ({
    date: format(r.date, 'yyyy-MM-dd'),
    totalAssets: r.totalAssets,
    totalLiabilities: r.totalLiabilities,
    netWorth: r.netWorth,
  }))
}

/**
 * Get drill-down data for a specific date: per-account balances and transactions.
 */
export async function getDayDrillDown(
  userId: string,
  dateStr: string,
): Promise<{
  date: string
  accounts: {
    id: string
    name: string
    accountType: string
    category: string
    balance: number
  }[]
  transactions: {
    id: string
    description: string
    amount: number
    transactionDate: string
    accountName: string
  }[]
}> {
  const dayStart = new Date(dateStr + 'T00:00:00.000Z')
  const dayEnd = new Date(dateStr + 'T23:59:59.999Z')

  // Get per-account balances for this day
  const balances = await prisma.dailyAccountBalance.findMany({
    where: { userId, date: dayStart },
    include: {
      account: {
        select: { id: true, name: true, accountType: true, category: true },
      },
    },
  })

  // Get transactions for this day
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { transactionDate: 'asc' },
    include: {
      statement: {
        select: {
          bankAccount: {
            select: { nickname: true },
          },
        },
      },
    },
  })

  return {
    date: dateStr,
    accounts: balances.map((b) => ({
      id: b.account.id,
      name: b.account.name,
      accountType: b.account.accountType,
      category: b.account.category,
      balance: b.balance,
    })),
    transactions: transactions.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      transactionDate: format(tx.transactionDate, 'yyyy-MM-dd'),
      accountName: tx.statement?.bankAccount?.nickname ?? 'Unknown',
    })),
  }
}
