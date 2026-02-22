import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exchangeCodeForTokens, getGoogleEmail } from '@/lib/services/google-drive'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error) {
    const settingsUrl = new URL('/settings', request.url)
    settingsUrl.searchParams.set('drive_error', error)
    return NextResponse.redirect(settingsUrl)
  }

  if (!code) {
    const settingsUrl = new URL('/settings', request.url)
    settingsUrl.searchParams.set('drive_error', 'no_code')
    return NextResponse.redirect(settingsUrl)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing tokens from Google')
    }

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000)

    // Get the email associated with this Google account
    const email = await getGoogleEmail(tokens.access_token)

    // Upsert the connection
    await prisma.googleDriveConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        email,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        email,
      },
    })

    const settingsUrl = new URL('/settings', request.url)
    settingsUrl.searchParams.set('drive_connected', 'true')
    return NextResponse.redirect(settingsUrl)
  } catch (error) {
    console.error('Google Drive callback error:', error)
    const settingsUrl = new URL('/settings', request.url)
    settingsUrl.searchParams.set('drive_error', 'token_exchange_failed')
    return NextResponse.redirect(settingsUrl)
  }
}
