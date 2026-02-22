import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const statement = await prisma.bankStatement.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!statement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.bankStatement.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
