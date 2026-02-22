import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { orderedIds } = body

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: 'orderedIds must be a non-empty array of category IDs' },
      { status: 400 },
    )
  }

  // Verify all IDs belong to the user
  const userCategories = await prisma.expenseCategory.findMany({
    where: { userId: session.user.id },
    select: { id: true },
  })

  const userCategoryIds = new Set(userCategories.map(c => c.id))
  const allValid = orderedIds.every((id: string) => userCategoryIds.has(id))

  if (!allValid) {
    return NextResponse.json(
      { error: 'One or more category IDs are invalid' },
      { status: 400 },
    )
  }

  // Update sortOrder for each category
  for (let i = 0; i < orderedIds.length; i++) {
    await prisma.expenseCategory.update({
      where: { id: orderedIds[i] },
      data: { sortOrder: i },
    })
  }

  const categories = await prisma.expenseCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(categories)
}
