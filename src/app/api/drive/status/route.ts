import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId: session.user.id },
    select: {
      email: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  return NextResponse.json({
    connected: !!connection,
    email: connection?.email ?? null,
    connectedAt: connection?.createdAt?.toISOString() ?? null,
  })
}
