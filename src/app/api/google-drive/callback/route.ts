import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { handleGoogleDriveCallback } from '@/lib/google-drive'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(
      new URL('/documents?error=google_drive_no_code', request.url),
    )
  }

  // Verify the state parameter matches the authenticated user
  if (state !== session.user.id) {
    return NextResponse.redirect(
      new URL('/documents?error=google_drive_state_mismatch', request.url),
    )
  }

  try {
    await handleGoogleDriveCallback(code, session.user.id)
    return NextResponse.redirect(
      new URL('/documents?google_drive=connected', request.url),
    )
  } catch (error) {
    console.error('Google Drive callback error:', error)
    return NextResponse.redirect(
      new URL('/documents?error=google_drive_connect_failed', request.url),
    )
  }
}
