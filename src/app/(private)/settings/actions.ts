'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { encrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

export async function updateSettings(data: {
  fiscalYearEndMonth?: number
  fiscalYearEndDay?: number
  bankTimezone?: string
  userTimezone?: string
  aiContext?: string | null
  aiModel?: string
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updatePlaidSettings(data: {
  plaidClientId?: string | null
  plaidSecret?: string | null
  plaidEnvironment?: string
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  // Encrypt sensitive credentials before storing
  const encryptedData = {
    ...data,
    plaidClientId: data.plaidClientId ? encrypt(data.plaidClientId) : data.plaidClientId,
    plaidSecret: data.plaidSecret ? encrypt(data.plaidSecret) : data.plaidSecret,
  }

  await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: encryptedData,
    create: { userId: session.user.id, ...encryptedData },
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updateAccount(
  accountId: string,
  data: {
    nickname?: string
    currency?: string
    accountType?: string
    ownershipType?: string
  },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  await prisma.bankAccount.updateMany({
    where: { id: accountId, userId: session.user.id },
    data,
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function getAccountStats(accountId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false as const, error: 'Unauthorized' }

  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })
  if (!account) return { success: false as const, error: 'Account not found' }

  const statementCount = await prisma.bankStatement.count({
    where: { bankAccountId: accountId },
  })

  const transactionCount = await prisma.transaction.count({
    where: { statement: { bankAccountId: accountId } },
  })

  return {
    success: true as const,
    statementCount,
    transactionCount,
  }
}

export async function deleteAccount(accountId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })
  if (!account) return { success: false, error: 'Account not found' }

  await prisma.$transaction(async (tx) => {
    // Unlink statements (set bankAccountId to null)
    await tx.bankStatement.updateMany({
      where: { bankAccountId: accountId },
      data: { bankAccountId: null },
    })

    // Unlink net worth accounts (set bankAccountId to null)
    await tx.netWorthAccount.updateMany({
      where: { bankAccountId: accountId },
      data: { bankAccountId: null },
    })

    // Delete the bank account
    await tx.bankAccount.delete({
      where: { id: accountId },
    })
  })

  revalidatePath('/settings')
  return { success: true }
}
