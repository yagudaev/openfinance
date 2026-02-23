import path from 'path'
import { rm } from 'fs/promises'

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // Step 1: Delete uploaded files from disk before removing DB records
    // (we need the userId to locate the directory)
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads', userId)
    await rm(uploadsDir, { recursive: true, force: true })

    // Step 2: Delete all database records in a transaction
    // Most relations cascade from User, so deleting the User record
    // handles the bulk of cleanup. We delete explicitly where cascade
    // might not reach or to be explicit about ordering.
    await prisma.$transaction(async (tx) => {
      // Delete records that may not cascade directly from User
      await tx.processingLog.deleteMany({
        where: { job: { userId } },
      })
      await tx.jobItem.deleteMany({
        where: { job: { userId } },
      })
      await tx.balanceVerification.deleteMany({
        where: { statement: { userId } },
      })
      await tx.chatMessage.deleteMany({
        where: { thread: { userId } },
      })

      // Delete all direct user-owned records
      await tx.chatTrace.deleteMany({ where: { userId } })
      await tx.chatThread.deleteMany({ where: { userId } })
      await tx.scenario.deleteMany({ where: { userId } })
      await tx.dailyAccountBalance.deleteMany({ where: { userId } })
      await tx.dailyNetWorth.deleteMany({ where: { userId } })
      await tx.netWorthSnapshot.deleteMany({ where: { userId } })
      await tx.netWorthAccount.deleteMany({ where: { userId } })
      await tx.expenseCategory.deleteMany({ where: { userId } })
      await tx.document.deleteMany({ where: { userId } })
      await tx.job.deleteMany({ where: { userId } })
      await tx.processingJob.deleteMany({ where: { userId } })
      await tx.userMemory.deleteMany({ where: { userId } })
      await tx.transaction.deleteMany({ where: { userId } })
      await tx.bankStatement.deleteMany({ where: { userId } })
      await tx.bankAccount.deleteMany({ where: { userId } })
      await tx.plaidConnection.deleteMany({ where: { userId } })
      await tx.googleDriveConnection.deleteMany({ where: { userId } })
      await tx.userSettings.deleteMany({ where: { userId } })

      // Delete BetterAuth records
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion failed:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 },
    )
  }
}
