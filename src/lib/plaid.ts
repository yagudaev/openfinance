import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'

import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'

type PlaidEnvironmentName = 'sandbox' | 'development' | 'production'

export function createPlaidClient(
  clientId: string,
  secret: string,
  environment: PlaidEnvironmentName = 'sandbox',
) {
  const config = new Configuration({
    basePath: PlaidEnvironments[environment],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  })
  return new PlaidApi(config)
}

interface PlaidCredentials {
  clientId: string
  secret: string
  environment: PlaidEnvironmentName
}

/**
 * Resolve Plaid credentials: user settings (self-hosted) take priority,
 * then fall back to platform env vars (managed mode).
 * Returns null if no credentials are configured.
 */
export async function getPlaidCredentials(
  userId: string,
): Promise<PlaidCredentials | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { plaidClientId: true, plaidSecret: true, plaidEnvironment: true },
  })

  // Self-hosted: user provides their own keys
  if (settings?.plaidClientId && settings?.plaidSecret) {
    return {
      clientId: decrypt(settings.plaidClientId),
      secret: decrypt(settings.plaidSecret),
      environment: (settings.plaidEnvironment || 'sandbox') as PlaidEnvironmentName,
    }
  }

  // Managed: keys from platform env vars
  const envClientId = process.env.PLAID_CLIENT_ID
  const envSecret = process.env.PLAID_SECRET
  if (envClientId && envSecret) {
    return {
      clientId: envClientId,
      secret: envSecret,
      environment: (process.env.PLAID_ENVIRONMENT || 'sandbox') as PlaidEnvironmentName,
    }
  }

  return null
}

/**
 * Create a PlaidApi client for the given user, resolving credentials
 * from settings or env vars. Returns null if no credentials configured.
 */
export async function getPlaidClientForUser(
  userId: string,
): Promise<PlaidApi | null> {
  const creds = await getPlaidCredentials(userId)
  if (!creds) return null
  return createPlaidClient(creds.clientId, creds.secret, creds.environment)
}
