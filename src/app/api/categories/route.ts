import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seedDefaultCategories } from '@/lib/services/expense-categories'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Seed defaults on first access
  await seedDefaultCategories(session.user.id)

  const categories = await prisma.expenseCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, icon, color } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Get the max sortOrder for the user
  const maxOrder = await prisma.expenseCategory.findFirst({
    where: { userId: session.user.id },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  try {
    const category = await prisma.expenseCategory.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        color: color?.trim() || null,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
        isDefault: false,
        isActive: true,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    // Unique constraint violation — duplicate name
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}
