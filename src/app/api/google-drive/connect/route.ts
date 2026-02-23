import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { getGoogleDriveAuthUrl } from '@/lib/google-drive'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = getGoogleDriveAuthUrl(session.user.id)
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Google Drive connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate auth URL' },
      { status: 500 },
    )
  }
}
