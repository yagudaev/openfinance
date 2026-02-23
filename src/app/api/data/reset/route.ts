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
    // Delete uploaded files from disk
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads', userId)
    await rm(uploadsDir, { recursive: true, force: true })

    // Delete all financial data but preserve user account, sessions, settings, and chat
    await prisma.$transaction(async (tx) => {
      // Delete records that reference other user records first
      await tx.processingLog.deleteMany({ where: { job: { userId } } })
      await tx.jobItem.deleteMany({ where: { job: { userId } } })
      await tx.balanceVerification.deleteMany({ where: { statement: { userId } } })

      // Delete financial data
      await tx.netWorthSnapshot.deleteMany({ where: { userId } })
      await tx.netWorthAccount.deleteMany({ where: { userId } })
      await tx.expenseCategory.deleteMany({ where: { userId } })
      await tx.document.deleteMany({ where: { userId } })
      await tx.processingJob.deleteMany({ where: { userId } })
      await tx.transaction.deleteMany({ where: { userId } })
      await tx.bankStatement.deleteMany({ where: { userId } })
      await tx.bankAccount.deleteMany({ where: { userId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Data reset failed:', error)
    return NextResponse.json(
      { error: 'Failed to reset data' },
      { status: 500 },
    )
  }
}
