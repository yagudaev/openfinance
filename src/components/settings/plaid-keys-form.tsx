'use client'

import { useState } from 'react'
import { Save, Loader2, Key } from 'lucide-react'

import { updatePlaidSettings } from '@/app/(private)/settings/actions'

interface PlaidKeysFormProps {
  plaidClientId: string | null
  plaidSecret: string | null
  plaidEnvironment: string
}

export function PlaidKeysForm({
  plaidClientId: initialClientId,
  plaidSecret: initialSecret,
  plaidEnvironment: initialEnv,
}: PlaidKeysFormProps) {
  const [clientId, setClientId] = useState(initialClientId || '')
  const [secret, setSecret] = useState(initialSecret || '')
  const [environment, setEnvironment] = useState(initialEnv)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const result = await updatePlaidSettings({
      plaidClientId: clientId || null,
      plaidSecret: secret || null,
      plaidEnvironment: environment,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Plaid settings saved' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save' })
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">Plaid API Keys</h2>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Self-hosted mode: provide your own Plaid credentials for live bank sync.
        Leave blank to use platform-provided credentials (if available).
      </p>

      {message && (
        <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Client ID</label>
          <input
            type="text"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="Enter your Plaid client ID"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Secret</label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Enter your Plaid secret"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Environment</label>
          <select
            value={environment}
            onChange={e => setEnvironment(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="sandbox">Sandbox (testing)</option>
            <option value="development">Development</option>
            <option value="production">Production</option>
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>
    </div>
  )
}
