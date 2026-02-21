import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { CountryCode, Products } from 'plaid'

import { getPlaidClientForUser } from '@/lib/plaid'

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await getPlaidClientForUser(session.user.id)
  if (!client) {
    return NextResponse.json(
      { error: 'Plaid is not configured. Add your Plaid API keys in Settings or contact your administrator.' },
      { status: 400 },
    )
  }

  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: 'OpenFinance',
      products: [Products.Transactions],
      language: 'en',
      country_codes: [CountryCode.Us, CountryCode.Ca],
    })

    return NextResponse.json({ link_token: response.data.link_token })
  } catch (error) {
    console.error('Plaid linkTokenCreate error:', error)
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 },
    )
  }
}
