'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function toggleHumanVerified(statementId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  const statement = await prisma.bankStatement.findFirst({
    where: { id: statementId, userId: session.user.id },
  })

  if (!statement) return { success: false, error: 'Statement not found' }

  const isCurrentlyVerified = statement.verificationStatus === 'human_verified'

  const updated = await prisma.bankStatement.update({
    where: { id: statementId },
    data: {
      verificationStatus: isCurrentlyVerified
        ? (statement.discrepancyAmount && statement.discrepancyAmount !== 0 ? 'unbalanced' : 'verified')
        : 'human_verified',
    },
  })

  revalidatePath(`/statements/${statementId}`)
  revalidatePath('/statements')

  return { success: true, verificationStatus: updated.verificationStatus }
}

export async function reprocessStatement(statementId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  const statement = await prisma.bankStatement.findFirst({
    where: { id: statementId, userId: session.user.id },
  })

  if (!statement) return { success: false, error: 'Statement not found' }

  // Delete existing transactions for this statement
  await prisma.transaction.deleteMany({
    where: { statementId },
  })

  // Delete existing balance verification
  await prisma.balanceVerification.deleteMany({
    where: { statementId },
  })

  // Reset statement processing status
  await prisma.bankStatement.update({
    where: { id: statementId },
    data: {
      isProcessed: false,
      verificationStatus: null,
      discrepancyAmount: null,
    },
  })

  // Trigger reprocessing via API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/process-statement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: (await headers()).get('cookie') || '',
    },
    body: JSON.stringify({
      filePath: statement.fileUrl,
      fileName: statement.fileName,
      fileSize: statement.fileSize,
      statementId: statement.id,
    }),
  })

  if (!res.ok) {
    const data = await res.json()
    return { success: false, error: data.error || 'Reprocessing failed' }
  }

  revalidatePath(`/statements/${statementId}`)
  revalidatePath('/statements')

  return { success: true }
}

export async function deleteStatement(statementId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { success: false, error: 'Unauthorized' }

  const statement = await prisma.bankStatement.findFirst({
    where: { id: statementId, userId: session.user.id },
  })

  if (!statement) return { success: false, error: 'Statement not found' }

  await prisma.bankStatement.delete({
    where: { id: statementId },
  })

  revalidatePath('/statements')

  return { success: true }
}
