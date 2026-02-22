import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { updateAccount, deactivateAccount } from '@/lib/services/net-worth'
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  type AccountCategory,
} from '@/lib/services/net-worth-types'

const ALL_CATEGORIES = [...new Set([...ASSET_CATEGORIES, ...LIABILITY_CATEGORIES])]

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

  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 })
    }
    updateData.name = body.name.trim()
  }

  if (body.currentBalance !== undefined) {
    const balance = Number(body.currentBalance)
    if (isNaN(balance)) {
      return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 })
    }
    updateData.currentBalance = balance
  }

  if (body.category !== undefined) {
    if (!ALL_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${ALL_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }
    updateData.category = body.category as AccountCategory
  }

  if (body.currency !== undefined) {
    updateData.currency = body.currency
  }

  if (body.sortOrder !== undefined) {
    updateData.sortOrder = Number(body.sortOrder)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const account = await updateAccount(session.user.id, id, updateData as Parameters<typeof updateAccount>[2])

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  return NextResponse.json({ account })
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
  const success = await deactivateAccount(session.user.id, id)

  if (!success) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
