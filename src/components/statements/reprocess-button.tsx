'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ReprocessButtonProps {
  statementId: string
  fileName: string
  status: string
}

export function ReprocessButton({
  statementId,
  fileName,
  status,
}: ReprocessButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  // Don't show while already processing
  if (status === 'processing') return null

  async function handleReprocess() {
    // For already-done statements, confirm before reprocessing
    if (status === 'done') {
      if (!confirm('This will delete existing transactions and re-process the PDF. Continue?')) {
        return
      }
    }

    setIsProcessing(true)
    const toastId = toast.loading('Reprocessing statement...', {
      description: fileName,
    })

    try {
      toast.loading('Processing statement with AI...', {
        id: toastId,
        description: fileName,
      })

      const res = await fetch(`/api/statements/${statementId}/reprocess`, {
        method: 'POST',
      })

      const result = await res.json()
      const jobId = result.jobId as string | undefined

      if (!res.ok) {
        throw new Error(result.error || 'Processing failed')
      }

      const transactionCount = result.data?.transactionCount ?? 0
      const balanceStatus = result.data?.isBalanced ? 'Balanced' : 'Unbalanced'

      toast.success('Statement processed!', {
        id: toastId,
        description: `${transactionCount} transactions — ${balanceStatus}`,
        action: jobId ? {
          label: 'View details',
          onClick: () => { window.location.href = `/jobs/${jobId}` },
        } : undefined,
      })

      router.refresh()
    } catch (error) {
      toast.error('Processing failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      router.refresh()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <button
      onClick={handleReprocess}
      disabled={isProcessing}
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
      title={status === 'pending' || status === 'error' ? 'Process statement' : 'Reprocess statement'}
    >
      {isProcessing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      {status === 'pending' || status === 'error' ? 'Process' : 'Reprocess'}
    </button>
  )
}
