import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connections = await prisma.plaidConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      institutionId: true,
      institutionName: true,
      status: true,
      errorMessage: true,
      lastSyncedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ connections })
}
