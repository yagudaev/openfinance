'use client'

import { useState } from 'react'
import { Save, Loader2, Building2, Calendar, Globe, Bot } from 'lucide-react'
import { updateSettings, updateAccount } from '@/app/(private)/settings/actions'

const TIMEZONES = [
  { value: 'America/Vancouver', label: 'Pacific (Vancouver)' },
  { value: 'America/Edmonton', label: 'Mountain (Edmonton)' },
  { value: 'America/Regina', label: 'Central (Regina)' },
  { value: 'America/Winnipeg', label: 'Central (Winnipeg)' },
  { value: 'America/Toronto', label: 'Eastern (Toronto)' },
  { value: 'America/Halifax', label: 'Atlantic (Halifax)' },
  { value: 'America/St_Johns', label: 'Newfoundland (St. John\'s)' },
  { value: 'UTC', label: 'UTC' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ACCOUNT_TYPES = [
  { value: 'chequing', label: 'Chequing' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'line_of_credit', label: 'Line of Credit' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'investment', label: 'Investment' },
]

const OWNERSHIP_TYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'business', label: 'Business' },
]

interface UserSettings {
  fiscalYearEndMonth: number
  fiscalYearEndDay: number
  bankTimezone: string
  userTimezone: string
  aiContext: string | null
  aiModel: string
}

interface Account {
  id: string
  accountNumber: string
  nickname: string
  bankName: string | null
  currency: string
  accountType: string
  ownershipType: string
}

interface SettingsFormProps {
  settings: UserSettings
  accounts: Account[]
}

export function SettingsForm({ settings: initial, accounts: initialAccounts }: SettingsFormProps) {
  const [settings, setSettings] = useState(initial)
  const [accounts, setAccounts] = useState(initialAccounts)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function saveSettings(section: string, data: Partial<UserSettings>) {
    setSaving(section)
    setMessage(null)
    const result = await updateSettings(data)
    if (result.success) {
      setSettings(prev => ({ ...prev, ...data }))
      setMessage({ type: 'success', text: 'Settings saved' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save' })
    }
    setSaving(null)
    setTimeout(() => setMessage(null), 3000)
  }

  async function saveAccount(accountId: string, data: Partial<Account>) {
    setSaving(accountId)
    setMessage(null)
    const result = await updateAccount(accountId, data)
    if (result.success) {
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, ...data } : a))
      setMessage({ type: 'success', text: 'Account updated' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save' })
    }
    setSaving(null)
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Fiscal Year */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Fiscal Year</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Set your fiscal year end date for financial reporting.
        </p>
        <div className="mt-4 flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">End Month</label>
            <select
              value={settings.fiscalYearEndMonth}
              onChange={e => setSettings(prev => ({ ...prev, fiscalYearEndMonth: parseInt(e.target.value) }))}
              className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {MONTHS.map((month, i) => (
                <option key={i} value={i + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Day</label>
            <input
              type="number"
              min={1}
              max={31}
              value={settings.fiscalYearEndDay}
              onChange={e => setSettings(prev => ({ ...prev, fiscalYearEndDay: parseInt(e.target.value) }))}
              className="mt-1 w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => saveSettings('fiscal', {
              fiscalYearEndMonth: settings.fiscalYearEndMonth,
              fiscalYearEndDay: settings.fiscalYearEndDay,
            })}
            disabled={saving === 'fiscal'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving === 'fiscal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Timezone */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Timezone</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Set timezones for statement processing and display.
        </p>
        <div className="mt-4 flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Timezone</label>
            <select
              value={settings.bankTimezone}
              onChange={e => setSettings(prev => ({ ...prev, bankTimezone: e.target.value }))}
              className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Timezone</label>
            <select
              value={settings.userTimezone}
              onChange={e => setSettings(prev => ({ ...prev, userTimezone: e.target.value }))}
              className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => saveSettings('timezone', {
              bankTimezone: settings.bankTimezone,
              userTimezone: settings.userTimezone,
            })}
            disabled={saving === 'timezone'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving === 'timezone' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {/* AI Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Configure your AI financial advisor.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">AI Model</label>
            <select
              value={settings.aiModel}
              onChange={e => setSettings(prev => ({ ...prev, aiModel: e.target.value }))}
              className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <optgroup label="OpenRouter">
                <option value="openrouter/cerebras/auto">Cerebras Auto (fastest)</option>
                <option value="openrouter/google/gemini-2.5-flash-preview">Gemini 2.5 Flash</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                <option value="openai/gpt-4o">GPT-4o</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Personal Context</label>
            <p className="mt-0.5 text-xs text-gray-500">
              Provide context about your financial situation for better AI responses.
            </p>
            <textarea
              value={settings.aiContext || ''}
              onChange={e => setSettings(prev => ({ ...prev, aiContext: e.target.value }))}
              placeholder="e.g., I run a small web development business as a sole proprietor. My fiscal year ends Dec 31..."
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => saveSettings('ai', {
              aiModel: settings.aiModel,
              aiContext: settings.aiContext,
            })}
            disabled={saving === 'ai'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Bank Accounts */}
      {accounts.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage your bank account settings.
          </p>
          <div className="mt-4 space-y-4">
            {accounts.map(account => (
              <div key={account.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {account.bankName || 'Unknown Bank'}
                    </p>
                    <p className="text-xs text-gray-500">{account.accountNumber}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Nickname</label>
                    <input
                      value={account.nickname}
                      onChange={e => setAccounts(prev =>
                        prev.map(a => a.id === account.id ? { ...a, nickname: e.target.value } : a),
                      )}
                      className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Type</label>
                    <select
                      value={account.accountType}
                      onChange={e => setAccounts(prev =>
                        prev.map(a => a.id === account.id ? { ...a, accountType: e.target.value } : a),
                      )}
                      className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      {ACCOUNT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500">Ownership</label>
                    <select
                      value={account.ownershipType}
                      onChange={e => setAccounts(prev =>
                        prev.map(a => a.id === account.id ? { ...a, ownershipType: e.target.value } : a),
                      )}
                      className="mt-1 w-full rounded border border-gray-200 px-2 py-1.5 text-sm"
                    >
                      {OWNERSHIP_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => saveAccount(account.id, {
                        nickname: account.nickname,
                        accountType: account.accountType,
                        ownershipType: account.ownershipType,
                      })}
                      disabled={saving === account.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {saving === account.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
