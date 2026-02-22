import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { processStatementById } from '@/lib/services/statement-processor'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { ids } = body as { ids?: string[] }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty ids array' },
      { status: 400 },
    )
  }

  if (ids.length > 50) {
    return NextResponse.json(
      { error: 'Maximum 50 statements per batch' },
      { status: 400 },
    )
  }

  const results: Array<{
    id: string
    success: boolean
    transactionCount?: number
    isBalanced?: boolean
    error?: string
  }> = []

  for (const id of ids) {
    try {
      const result = await processStatementById(id, session.user.id)
      results.push({
        id,
        success: true,
        transactionCount: result.transactionCount,
        isBalanced: result.isBalanced,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Processing failed'
      results.push({ id, success: false, error: message })
    }
  }

  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  return NextResponse.json({
    success: failed.length === 0,
    processed: succeeded.length,
    failed: failed.length,
    results,
  })
}
