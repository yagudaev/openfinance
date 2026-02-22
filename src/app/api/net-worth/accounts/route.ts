import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { getAccounts, createAccount } from '@/lib/services/net-worth'
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  type AccountType,
  type AccountCategory,
} from '@/lib/services/net-worth-types'

const VALID_ACCOUNT_TYPES: AccountType[] = ['asset', 'liability']
const ALL_CATEGORIES = [...ASSET_CATEGORIES, ...LIABILITY_CATEGORIES]

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accounts = await getAccounts(session.user.id)

  return NextResponse.json({ accounts })
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  if (!VALID_ACCOUNT_TYPES.includes(body.accountType)) {
    return NextResponse.json(
      { error: `Account type must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}` },
      { status: 400 },
    )
  }

  const uniqueCategories = [...new Set(ALL_CATEGORIES)]
  if (!uniqueCategories.includes(body.category)) {
    return NextResponse.json(
      { error: `Category must be one of: ${uniqueCategories.join(', ')}` },
      { status: 400 },
    )
  }

  const balance = Number(body.currentBalance ?? 0)
  if (isNaN(balance)) {
    return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 })
  }

  const account = await createAccount(session.user.id, {
    name: body.name.trim(),
    accountType: body.accountType as AccountType,
    category: body.category as AccountCategory,
    currentBalance: balance,
    currency: body.currency,
  })

  return NextResponse.json({ account }, { status: 201 })
}
