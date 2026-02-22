import { prisma } from '@/lib/prisma'
import { processStatementById } from '@/lib/services/statement-processor'

interface ItemMapping {
  jobItemId: string
  statementId: string
}

/**
 * Process all items in a Job sequentially.
 * Updates JobItem status (pending -> running -> completed/failed)
 * and Job progress (completedItems/totalItems) after each file.
 *
 * This function is designed to be called fire-and-forget from an API route.
 */
export async function processJobItems(
  jobId: string,
  userId: string,
  itemMappings: ItemMapping[],
) {
  // Mark job as running
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  })

  let completedCount = 0
  let failedCount = 0
  const totalItems = itemMappings.length

  for (const { jobItemId, statementId } of itemMappings) {
    // Mark item as running
    await prisma.jobItem.update({
      where: { id: jobItemId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    })

    try {
      await processStatementById(statementId, userId)

      await prisma.jobItem.update({
        where: { id: jobItemId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed'

      await prisma.jobItem.update({
        where: { id: jobItemId },
        data: {
          status: 'failed',
          error: errorMessage,
          completedAt: new Date(),
        },
      })
      failedCount++
    }

    completedCount++

    // Update job progress
    const progress = Math.round((completedCount / totalItems) * 100)
    await prisma.job.update({
      where: { id: jobId },
      data: {
        completedItems: completedCount,
        progress,
      },
    })
  }

  // Finalize job
  const finalStatus = failedCount === totalItems ? 'failed' : 'completed'

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      progress: 100,
      completedItems: completedCount,
      completedAt: new Date(),
      error: failedCount > 0
        ? `${failedCount} of ${totalItems} files failed`
        : null,
    },
  })
}
