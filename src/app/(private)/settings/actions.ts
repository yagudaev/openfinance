'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
