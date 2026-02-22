import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { resetToDefaults } from '@/lib/services/expense-categories'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await resetToDefaults(session.user.id)

  const categories = await prisma.expenseCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(categories)
}
