import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { disconnectGoogleDrive } from '@/lib/google-drive'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await disconnectGoogleDrive(session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google Drive disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 },
    )
  }
}
