import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { listDriveFolders } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parentId = request.nextUrl.searchParams.get('parentId') ?? undefined

  try {
    const folders = await listDriveFolders(session.user.id, parentId)
    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Google Drive folders error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list folders' },
      { status: 500 },
    )
  }
}
