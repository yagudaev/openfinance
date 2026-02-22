import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { processStatementById } from '@/lib/services/statement-processor'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await processStatementById(id, session.user.id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Processing failed'

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (message.includes('Duplicate statement')) {
      return NextResponse.json(
        { success: false, isDuplicate: true, message },
        { status: 409 },
      )
    }

    console.error('Reprocess statement error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
