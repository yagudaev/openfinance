/**
 * Migration script: encrypt existing plaintext tokens and credentials.
 *
 * Reads all PlaidConnections, GoogleDriveConnections, Accounts, and UserSettings,
 * checks for unencrypted values using the `enc:` prefix, and encrypts them in place.
 *
 * Usage:
 *   ENCRYPTION_KEY=<64-char-hex> npx tsx scripts/encrypt-existing-data.ts
 *
 * Safe to run multiple times — already-encrypted values are skipped.
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

import { encrypt, isEncrypted } from '../src/lib/encryption'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./data/openfinance.db',
})
const prisma = new PrismaClient({ adapter })

function encryptIfNeeded(value: string | null): { updated: boolean; value: string | null } {
  if (!value) return { updated: false, value }
  if (isEncrypted(value)) return { updated: false, value }
  return { updated: true, value: encrypt(value) }
}

async function encryptPlaidConnections() {
  const connections = await prisma.plaidConnection.findMany()
  let count = 0

  for (const conn of connections) {
    const accessToken = encryptIfNeeded(conn.accessToken)

    if (accessToken.updated) {
      await prisma.plaidConnection.update({
        where: { id: conn.id },
        data: { accessToken: accessToken.value! },
      })
      count++
    }
  }

  console.log(`PlaidConnections: encrypted ${count} of ${connections.length} records`)
}

async function encryptGoogleDriveConnections() {
  const connections = await prisma.googleDriveConnection.findMany()
  let count = 0

  for (const conn of connections) {
    const accessToken = encryptIfNeeded(conn.accessToken)
    const refreshToken = encryptIfNeeded(conn.refreshToken)

    if (accessToken.updated || refreshToken.updated) {
      await prisma.googleDriveConnection.update({
        where: { id: conn.id },
        data: {
          ...(accessToken.updated && { accessToken: accessToken.value! }),
          ...(refreshToken.updated && { refreshToken: refreshToken.value! }),
        },
      })
      count++
    }
  }

  console.log(`GoogleDriveConnections: encrypted ${count} of ${connections.length} records`)
}

async function encryptAccounts() {
  const accounts = await prisma.account.findMany()
  let count = 0

  for (const acct of accounts) {
    const accessToken = encryptIfNeeded(acct.accessToken)
    const refreshToken = encryptIfNeeded(acct.refreshToken)
    const idToken = encryptIfNeeded(acct.idToken)

    if (accessToken.updated || refreshToken.updated || idToken.updated) {
      await prisma.account.update({
        where: { id: acct.id },
        data: {
          ...(accessToken.updated && { accessToken: accessToken.value }),
          ...(refreshToken.updated && { refreshToken: refreshToken.value }),
          ...(idToken.updated && { idToken: idToken.value }),
        },
      })
      count++
    }
  }

  console.log(`Accounts (BetterAuth): encrypted ${count} of ${accounts.length} records`)
}

async function encryptUserSettings() {
  const allSettings = await prisma.userSettings.findMany()
  let count = 0

  for (const settings of allSettings) {
    const plaidClientId = encryptIfNeeded(settings.plaidClientId)
    const plaidSecret = encryptIfNeeded(settings.plaidSecret)

    if (plaidClientId.updated || plaidSecret.updated) {
      await prisma.userSettings.update({
        where: { id: settings.id },
        data: {
          ...(plaidClientId.updated && { plaidClientId: plaidClientId.value }),
          ...(plaidSecret.updated && { plaidSecret: plaidSecret.value }),
        },
      })
      count++
    }
  }

  console.log(`UserSettings: encrypted ${count} of ${allSettings.length} records`)
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ERROR: ENCRYPTION_KEY environment variable is not set.')
    console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
    process.exit(1)
  }

  console.log('Encrypting existing data...\n')

  await encryptPlaidConnections()
  await encryptGoogleDriveConnections()
  await encryptAccounts()
  await encryptUserSettings()

  console.log('\nDone. All sensitive data has been encrypted.')
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
