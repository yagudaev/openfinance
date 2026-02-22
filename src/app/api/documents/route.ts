import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search') || ''
  const documentType = searchParams.get('type') || ''

  const where: Record<string, unknown> = { userId: session.user.id }

  if (search) {
    where.fileName = { contains: search }
  }

  if (documentType) {
    where.documentType = documentType
  }

  const documents = await prisma.document.findMany({
    where,
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ documents })
}
