import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getScenarios, compareScenarios } from '@/lib/services/scenario-planner'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const compareIds = searchParams.get('compare')

  if (compareIds) {
    const ids = compareIds.split(',').filter(Boolean)
    if (ids.length < 2 || ids.length > 3) {
      return NextResponse.json(
        { error: 'Compare requires 2-3 scenario IDs' },
        { status: 400 },
      )
    }
    const comparison = await compareScenarios(session.user.id, ids)
    return NextResponse.json(comparison)
  }

  const scenarios = await getScenarios(session.user.id)
  return NextResponse.json({ scenarios })
}
