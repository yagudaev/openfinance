'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { processStatementById } from '@/lib/services/statement-processor'
import { recalculateNetWorth } from '@/lib/services/daily-net-worth'

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

  try {
    await processStatementById(statementId, session.user.id)

    revalidatePath(`/statements/${statementId}`)
    revalidatePath('/statements')

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reprocessing failed'
    return { success: false, error: message }
  }
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

  await recalculateNetWorth(session.user.id)

  revalidatePath('/statements')
  revalidatePath('/net-worth')
  revalidatePath('/dashboard')

  return { success: true }
}
