import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { getGoogleDriveStatus } from '@/lib/google-drive'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const status = await getGoogleDriveStatus(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Google Drive status error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 },
    )
  }
}
