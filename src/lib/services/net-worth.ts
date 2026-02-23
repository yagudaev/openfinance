import { subMonths, subYears, startOfDay } from 'date-fns'

import { prisma } from '@/lib/prisma'

import type {
  NetWorthAccountData,
  NetWorthSummary,
  AccountBreakdown,
  AccountType,
  AccountCategory,
} from './net-worth-types'

export type {
  NetWorthAccountData,
  NetWorthSummary,
  AccountBreakdown,
  AccountType,
  AccountCategory,
} from './net-worth-types'

export { formatCurrency, formatPercent } from './net-worth-types'

function toAccountData(account: {
  id: string
  name: string
  accountType: string
  category: string
  currentBalance: number
  currency: string
  isManual: boolean
  bankAccountId: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}): NetWorthAccountData {
  return {
    id: account.id,
    name: account.name,
    accountType: account.accountType as AccountType,
    category: account.category as AccountCategory,
    currentBalance: account.currentBalance,
    currency: account.currency,
    isManual: account.isManual,
    bankAccountId: account.bankAccountId,
    isActive: account.isActive,
    sortOrder: account.sortOrder,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  }
}

export async function computeNetWorth(userId: string): Promise<{
  totalAssets: number
  totalLiabilities: number
  netWorth: number
}> {
  const accounts = await prisma.netWorthAccount.findMany({
    where: { userId, isActive: true },
  })

  let totalAssets = 0
  let totalLiabilities = 0

  for (const account of accounts) {
    if (account.accountType === 'asset') {
      totalAssets += account.currentBalance
    } else {
      totalLiabilities += Math.abs(account.currentBalance)
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  }
}

export async function getAccountBreakdown(userId: string): Promise<AccountBreakdown> {
  const accounts = await prisma.netWorthAccount.findMany({
    where: { userId, isActive: true },
    orderBy: [{ accountType: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })

  const assets: NetWorthAccountData[] = []
  const liabilities: NetWorthAccountData[] = []
  let totalAssets = 0
  let totalLiabilities = 0

  for (const account of accounts) {
    const data = toAccountData(account)
    if (account.accountType === 'asset') {
      assets.push(data)
      totalAssets += account.currentBalance
    } else {
      liabilities.push(data)
      totalLiabilities += Math.abs(account.currentBalance)
    }
  }

  return { assets, liabilities, totalAssets, totalLiabilities }
}

export async function getSummary(userId: string): Promise<NetWorthSummary> {
  const { totalAssets, totalLiabilities, netWorth } = await computeNetWorth(userId)

  const now = new Date()
  const oneMonthAgo = startOfDay(subMonths(now, 1))
  const oneYearAgo = startOfDay(subYears(now, 1))

  // Use DailyNetWorth for historical comparisons (auto-computed from transactions)
  const [monthAgoRow, yearAgoRow] = await Promise.all([
    prisma.dailyNetWorth.findFirst({
      where: { userId, date: { lte: oneMonthAgo } },
      orderBy: { date: 'desc' },
    }),
    prisma.dailyNetWorth.findFirst({
      where: { userId, date: { lte: oneYearAgo } },
      orderBy: { date: 'desc' },
    }),
  ])

  let monthOverMonthChange: number | null = null
  let monthOverMonthPercent: number | null = null
  let yearOverYearChange: number | null = null
  let yearOverYearPercent: number | null = null

  if (monthAgoRow) {
    monthOverMonthChange = netWorth - monthAgoRow.netWorth
    if (monthAgoRow.netWorth !== 0) {
      monthOverMonthPercent =
        (monthOverMonthChange / Math.abs(monthAgoRow.netWorth)) * 100
    }
  }

  if (yearAgoRow) {
    yearOverYearChange = netWorth - yearAgoRow.netWorth
    if (yearAgoRow.netWorth !== 0) {
      yearOverYearPercent =
        (yearOverYearChange / Math.abs(yearAgoRow.netWorth)) * 100
    }
  }

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    monthOverMonthChange,
    monthOverMonthPercent,
    yearOverYearChange,
    yearOverYearPercent,
  }
}

export async function getAccounts(userId: string): Promise<NetWorthAccountData[]> {
  const accounts = await prisma.netWorthAccount.findMany({
    where: { userId, isActive: true },
    orderBy: [{ accountType: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })

  return accounts.map(toAccountData)
}

export async function createAccount(
  userId: string,
  data: {
    name: string
    accountType: AccountType
    category: AccountCategory
    currentBalance: number
    currency?: string
  },
): Promise<NetWorthAccountData> {
  const account = await prisma.netWorthAccount.create({
    data: {
      userId,
      name: data.name,
      accountType: data.accountType,
      category: data.category,
      currentBalance: data.currentBalance,
      currency: data.currency ?? 'CAD',
      isManual: true,
    },
  })

  return toAccountData(account)
}

export async function updateAccount(
  userId: string,
  accountId: string,
  data: {
    name?: string
    currentBalance?: number
    category?: AccountCategory
    currency?: string
    isActive?: boolean
    sortOrder?: number
  },
): Promise<NetWorthAccountData | null> {
  const existing = await prisma.netWorthAccount.findFirst({
    where: { id: accountId, userId },
  })

  if (!existing) return null

  const updateData: Record<string, unknown> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.currentBalance !== undefined) updateData.currentBalance = data.currentBalance
  if (data.category !== undefined) updateData.category = data.category
  if (data.currency !== undefined) updateData.currency = data.currency
  if (data.isActive !== undefined) updateData.isActive = data.isActive
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  const updated = await prisma.netWorthAccount.update({
    where: { id: accountId },
    data: updateData,
  })

  return toAccountData(updated)
}

export async function deactivateAccount(
  userId: string,
  accountId: string,
): Promise<boolean> {
  const existing = await prisma.netWorthAccount.findFirst({
    where: { id: accountId, userId },
  })

  if (!existing) return false

  await prisma.netWorthAccount.update({
    where: { id: accountId },
    data: { isActive: false },
  })

  return true
}
