import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { recalculateNetWorth } from '@/lib/services/daily-net-worth'
import { NextRequest, NextResponse } from 'next/server'

const VALID_CATEGORIES = [
  'expense',
  'income',
  'owner-pay',
  'internal-transfer',
  'shareholder-loan',
]

const VALID_TRANSACTION_TYPES = ['credit', 'debit']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  // Validate the user owns this transaction
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  // Build update data from allowed fields
  const updateData: Record<string, unknown> = {}

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length === 0) {
      return NextResponse.json({ error: 'Description must be a non-empty string' }, { status: 400 })
    }
    updateData.description = body.description.trim()
  }

  if (body.amount !== undefined) {
    const amount = Number(body.amount)
    if (isNaN(amount)) {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 })
    }
    updateData.amount = amount
  }

  if (body.category !== undefined) {
    if (body.category !== null && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }
    updateData.category = body.category
  }

  if (body.transactionType !== undefined) {
    if (!VALID_TRANSACTION_TYPES.includes(body.transactionType)) {
      return NextResponse.json(
        { error: `Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}` },
        { status: 400 },
      )
    }
    updateData.transactionType = body.transactionType
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({
    success: true,
    transaction: {
      id: updated.id,
      description: updated.description,
      amount: updated.amount,
      balance: updated.balance,
      category: updated.category,
      transactionType: updated.transactionType,
    },
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!transaction) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  }

  await prisma.transaction.delete({ where: { id } })

  // Recalculate net worth after deletion
  await recalculateNetWorth(session.user.id)

  return NextResponse.json({ success: true })
}
