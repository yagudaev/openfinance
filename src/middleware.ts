import { NextRequest, NextResponse } from 'next/server'

const publicPrefixes = ['/auth/login', '/auth/sign-up', '/api/auth', '/test-statement']
const publicExact = ['/']

function isPublicPath(pathname: string) {
  if (publicExact.includes(pathname)) return true
  return publicPrefixes.some((path) => pathname.startsWith(path))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie =
    request.cookies.get('better-auth.session_token') ||
    request.cookies.get('__Secure-better-auth.session_token')

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
