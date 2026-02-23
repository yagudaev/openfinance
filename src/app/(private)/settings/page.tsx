import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { getPlaidCredentials } from '@/lib/plaid'
import { SettingsForm } from '@/components/settings/settings-form'
import { ConnectedBanks } from '@/components/settings/connected-banks'
import { PlaidKeysForm } from '@/components/settings/plaid-keys-form'
import { ExpenseCategories } from '@/components/settings/expense-categories'
import { DeleteAccount } from '@/components/settings/delete-account'

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/auth/login')

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  })

  const accounts = await prisma.bankAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  const plaidCredentials = await getPlaidCredentials(session.user.id)
  const plaidConfigured = plaidCredentials !== null

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account preferences and configuration.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        <SettingsForm
          settings={{
            fiscalYearEndMonth: settings.fiscalYearEndMonth,
            fiscalYearEndDay: settings.fiscalYearEndDay,
            bankTimezone: settings.bankTimezone,
            userTimezone: settings.userTimezone,
            aiContext: settings.aiContext,
            aiModel: settings.aiModel,
            processingModel: settings.processingModel,
          }}
          accounts={accounts.map(a => ({
            id: a.id,
            accountNumber: a.accountNumber,
            nickname: a.nickname,
            bankName: a.bankName,
            currency: a.currency,
            accountType: a.accountType,
            ownershipType: a.ownershipType,
          }))}
        />

        <ExpenseCategories />

        <ConnectedBanks plaidConfigured={plaidConfigured} />

        <PlaidKeysForm
          plaidClientId={settings.plaidClientId ? decrypt(settings.plaidClientId) : null}
          plaidSecret={settings.plaidSecret ? decrypt(settings.plaidSecret) : null}
          plaidEnvironment={settings.plaidEnvironment}
        />

        <DeleteAccount />
      </div>
    </div>
  )
}
