import { toast } from 'sonner'

interface JobProgressData {
  id: string
  status: string
  progress: number
  totalItems: number
  completedItems: number
  error: string | null
  items: Array<{
    id: string
    fileName: string
    status: string
    error: string | null
  }>
}

/**
 * Shows a sonner toast that tracks job progress via SSE.
 * The toast updates in real-time and links to the job detail page on completion.
 */
export function showJobProgressToast(jobId: string, fileCount: number) {
  const toastId = toast.loading(`Processing ${fileCount} file${fileCount !== 1 ? 's' : ''}...`, {
    description: 'Starting...',
    action: {
      label: 'View details',
      onClick: () => {
        window.location.href = `/jobs/${jobId}`
      },
    },
  })

  const eventSource = new EventSource(`/api/jobs/${jobId}/stream`)
  let lastJob: JobProgressData | null = null

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      if (data.type === 'progress' && data.job) {
        lastJob = data.job as JobProgressData
        const job = lastJob

        toast.loading(
          `Processing ${fileCount} file${fileCount !== 1 ? 's' : ''}... (${job.completedItems}/${job.totalItems})`,
          {
            id: toastId,
            description: buildProgressDescription(job),
            action: {
              label: 'View details',
              onClick: () => {
                window.location.href = `/jobs/${jobId}`
              },
            },
          },
        )
      }

      if (data.type === 'done') {
        eventSource.close()

        if (data.status === 'completed' && lastJob) {
          const summary = buildCompletionSummary(lastJob)
          toast.success(summary, {
            id: toastId,
            description: 'All files have been processed.',
            action: {
              label: 'View details',
              onClick: () => {
                window.location.href = `/jobs/${jobId}`
              },
            },
          })
        } else if (data.status === 'failed') {
          const failedCount = lastJob?.items.filter(i => i.status === 'failed').length ?? 0
          toast.error('Processing failed', {
            id: toastId,
            description: failedCount > 0
              ? `${failedCount} file${failedCount !== 1 ? 's' : ''} failed to process.`
              : lastJob?.error ?? 'An unknown error occurred.',
            action: {
              label: 'View details',
              onClick: () => {
                window.location.href = `/jobs/${jobId}`
              },
            },
          })
        }
      }

      if (data.type === 'error') {
        eventSource.close()
        toast.error('Lost connection to job', {
          id: toastId,
          description: data.message ?? 'The job may still be processing.',
          action: {
            label: 'View details',
            onClick: () => {
              window.location.href = `/jobs/${jobId}`
            },
          },
        })
      }
    } catch {
      // Ignore parse errors
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    // Only show error if we never got a completion event
    if (!lastJob || (lastJob.status !== 'completed' && lastJob.status !== 'failed')) {
      toast.error('Lost connection to job', {
        id: toastId,
        action: {
          label: 'View details',
          onClick: () => {
            window.location.href = `/jobs/${jobId}`
          },
        },
      })
    }
  }

  return toastId
}

function buildProgressDescription(job: JobProgressData): string {
  const running = job.items.filter(i => i.status === 'running')
  if (running.length > 0) {
    return `Currently processing: ${running[0].fileName}`
  }
  return `${job.completedItems} of ${job.totalItems} complete`
}

function buildCompletionSummary(job: JobProgressData): string {
  const completed = job.items.filter(i => i.status === 'completed').length
  const failed = job.items.filter(i => i.status === 'failed').length

  if (failed === 0) {
    return `Processed ${completed} file${completed !== 1 ? 's' : ''}`
  }

  return `Processed ${completed} file${completed !== 1 ? 's' : ''}, ${failed} failed`
}
