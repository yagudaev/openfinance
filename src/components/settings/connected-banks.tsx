'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Link2, Unlink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PlaidConnectionInfo {
  id: string
  institutionId: string
  institutionName: string
  status: string
  errorMessage: string | null
  lastSyncedAt: string | null
  createdAt: string
}

interface ConnectedBanksProps {
  plaidConfigured: boolean
}

export function ConnectedBanks({ plaidConfigured }: ConnectedBanksProps) {
  const [connections, setConnections] = useState<PlaidConnectionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/plaid/connections')
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections)
      }
    } catch {
      // Silently fail — user may not have Plaid configured
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (plaidConfigured) {
      fetchConnections()
    } else {
      setLoading(false)
    }
  }, [plaidConfigured, fetchConnections])

  async function handleConnect() {
    setConnecting(true)
    setMessage(null)

    try {
      // Create a link token
      const tokenRes = await fetch('/api/plaid/create-link-token', { method: 'POST' })
      if (!tokenRes.ok) {
        const data = await tokenRes.json()
        throw new Error(data.error || 'Failed to create link token')
      }

      const { link_token } = await tokenRes.json()

      // Load Plaid Link
      const { open } = await loadPlaidLink(link_token, async (publicToken, metadata) => {
        // Exchange the public token
        const exchangeRes = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
          }),
        })

        if (!exchangeRes.ok) {
          throw new Error('Failed to connect bank account')
        }

        setMessage({ type: 'success', text: `Connected to ${metadata.institution?.name || 'bank'}` })
        await fetchConnections()
      })

      open()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync(connectionId: string) {
    setSyncing(connectionId)
    setMessage(null)

    try {
      const res = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      if (!res.ok) {
        throw new Error('Sync failed')
      }

      const data = await res.json()
      setMessage({
        type: 'success',
        text: `Synced: ${data.added} added, ${data.modified} modified, ${data.removed} removed`,
      })
      await fetchConnections()
    } catch {
      setMessage({ type: 'error', text: 'Failed to sync transactions' })
    } finally {
      setSyncing(null)
    }
  }

  async function handleDisconnect(connectionId: string) {
    if (!confirm('Are you sure you want to disconnect this bank? Provisional transactions will be removed.')) {
      return
    }

    setDisconnecting(connectionId)
    setMessage(null)

    try {
      const res = await fetch(`/api/plaid/connections/${connectionId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to disconnect')
      }

      setMessage({ type: 'success', text: 'Bank disconnected' })
      await fetchConnections()
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect bank' })
    } finally {
      setDisconnecting(null)
    }
  }

  function formatLastSynced(dateString: string | null): string {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  function getStatusIcon(status: string) {
    if (status === 'active') return <CheckCircle2 className="h-4 w-4 text-green-500" />
    if (status === 'error') return <AlertCircle className="h-4 w-4 text-red-500" />
    return <AlertCircle className="h-4 w-4 text-yellow-500" />
  }

  if (!plaidConfigured) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Connected Banks</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Live bank sync via Plaid. Connect your bank accounts to automatically sync transactions.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            To enable live bank sync, configure your Plaid API keys below or ask your administrator to set up platform-level Plaid credentials.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Connected Banks</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Live bank sync via Plaid. Transactions sync automatically.
          </p>
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Connect Bank
        </button>
      </div>

      {message && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : connections.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <Link2 className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-900">No banks connected</p>
          <p className="mt-1 text-xs text-gray-500">
            Connect a bank to start syncing transactions automatically.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {connections.map(conn => (
            <div
              key={conn.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(conn.status)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {conn.institutionName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last synced: {formatLastSynced(conn.lastSyncedAt)}
                    {conn.status === 'error' && conn.errorMessage && (
                      <span className="ml-2 text-red-500">{conn.errorMessage}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(conn.id)}
                  disabled={syncing === conn.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Sync now"
                >
                  {syncing === conn.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <RefreshCw className="h-3 w-3" />}
                  Sync
                </button>
                <button
                  onClick={() => handleDisconnect(conn.id)}
                  disabled={disconnecting === conn.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Disconnect"
                >
                  {disconnecting === conn.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Unlink className="h-3 w-3" />}
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Dynamically load Plaid Link and return open/exit handlers.
 * In production, you'd use react-plaid-link or load the script.
 * For MVP, we load the script dynamically.
 */
function loadPlaidLink(
  linkToken: string,
  onSuccess: (publicToken: string, metadata: any) => Promise<void>,
): Promise<{ open: () => void; exit: () => void }> {
  return new Promise((resolve, reject) => {
    // Check if Plaid Link script is already loaded
    if ((window as any).Plaid) {
      const handler = (window as any).Plaid.create({
        token: linkToken,
        onSuccess: (public_token: string, metadata: any) => {
          onSuccess(public_token, metadata)
        },
        onExit: () => {},
        onEvent: () => {},
      })
      resolve({ open: () => handler.open(), exit: () => handler.exit() })
      return
    }

    // Load Plaid Link script
    const script = document.createElement('script')
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
    script.async = true
    script.onload = () => {
      const handler = (window as any).Plaid.create({
        token: linkToken,
        onSuccess: (public_token: string, metadata: any) => {
          onSuccess(public_token, metadata)
        },
        onExit: () => {},
        onEvent: () => {},
      })
      resolve({ open: () => handler.open(), exit: () => handler.exit() })
    }
    script.onerror = () => reject(new Error('Failed to load Plaid Link'))
    document.head.appendChild(script)
  })
}
