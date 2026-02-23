import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { listDriveFiles } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const folderId = request.nextUrl.searchParams.get('folderId')
  if (!folderId) {
    return NextResponse.json(
      { error: 'folderId is required' },
      { status: 400 },
    )
  }

  try {
    const files = await listDriveFiles(session.user.id, folderId)
    return NextResponse.json({ files })
  } catch (error) {
    console.error('Google Drive files error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 },
    )
  }
}
