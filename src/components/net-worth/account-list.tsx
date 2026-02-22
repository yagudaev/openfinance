'use client'

import { useState } from 'react'
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  Bitcoin,
  Home,
  Car,
  CreditCard,
  Landmark,
  Building,
  CircleDot,
  Pencil,
  Trash2,
} from 'lucide-react'

import {
  formatCurrency,
  CATEGORY_LABELS,
  type NetWorthAccountData,
  type AccountCategory,
} from '@/lib/services/net-worth-types'
import { Button } from '@/components/ui/button'
import { EditAccountDialog } from '@/components/net-worth/edit-account-dialog'

interface AccountListProps {
  assets: NetWorthAccountData[]
  liabilities: NetWorthAccountData[]
  totalAssets: number
  totalLiabilities: number
  onAccountUpdated: () => void
}

const CATEGORY_ICONS: Record<AccountCategory, typeof Wallet> = {
  'checking': Wallet,
  'savings': PiggyBank,
  'investment': TrendingUp,
  'crypto': Bitcoin,
  'real-estate': Home,
  'vehicle': Car,
  'credit-card': CreditCard,
  'loan': Landmark,
  'mortgage': Building,
  'other': CircleDot,
}

export function AccountList({
  assets,
  liabilities,
  totalAssets,
  totalLiabilities,
  onAccountUpdated,
}: AccountListProps) {
  const [editingAccount, setEditingAccount] = useState<NetWorthAccountData | null>(null)

  async function handleDelete(accountId: string) {
    if (!confirm('Are you sure you want to remove this account?')) return

    const res = await fetch(`/api/net-worth/accounts/${accountId}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      onAccountUpdated()
    }
  }

  return (
    <div className="space-y-6">
      <AccountGroup
        title="Assets"
        accounts={assets}
        total={totalAssets}
        totalColor="text-green-600"
        onEdit={setEditingAccount}
        onDelete={handleDelete}
      />
      <AccountGroup
        title="Liabilities"
        accounts={liabilities}
        total={totalLiabilities}
        totalColor="text-red-600"
        onEdit={setEditingAccount}
        onDelete={handleDelete}
      />

      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={(open) => {
            if (!open) setEditingAccount(null)
          }}
          onSaved={() => {
            setEditingAccount(null)
            onAccountUpdated()
          }}
        />
      )}
    </div>
  )
}

interface AccountGroupProps {
  title: string
  accounts: NetWorthAccountData[]
  total: number
  totalColor: string
  onEdit: (account: NetWorthAccountData) => void
  onDelete: (id: string) => void
}

function AccountGroup({ title, accounts, total, totalColor, onEdit, onDelete }: AccountGroupProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
        <span className={`text-sm font-semibold ${totalColor}`}>
          {formatCurrency(total)}
        </span>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-gray-400 py-3">No {title.toLowerCase()} added yet.</p>
      ) : (
        <div className="space-y-1">
          {accounts.map((account) => {
            const Icon = CATEGORY_ICONS[account.category] ?? CircleDot
            return (
              <div
                key={account.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 p-1.5 rounded-md bg-gray-100">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {account.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {CATEGORY_LABELS[account.category]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(Math.abs(account.currentBalance), account.currency)}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onEdit(account)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onDelete(account.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
