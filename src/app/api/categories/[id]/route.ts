import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, description, icon, color, isActive } = body

  const existing = await prisma.expenseCategory.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name.trim()
  if (description !== undefined) data.description = description?.trim() || null
  if (icon !== undefined) data.icon = icon?.trim() || null
  if (color !== undefined) data.color = color?.trim() || null
  if (isActive !== undefined) data.isActive = isActive

  try {
    const updated = await prisma.expenseCategory.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 409 },
      )
    }
    throw error
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.expenseCategory.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  // Soft-delete: set isActive = false
  const updated = await prisma.expenseCategory.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json(updated)
}
