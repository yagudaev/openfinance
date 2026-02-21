import { NextResponse } from 'next/server'

export function GET() {
  const google = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )

  return NextResponse.json({ google })
}
