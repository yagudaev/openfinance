'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, HardDrive, CheckCircle2, Unlink } from 'lucide-react'

interface GoogleDriveConnectionProps {
  googleConfigured: boolean
}

interface DriveStatus {
  connected: boolean
  email: string | null
  connectedAt: string | null
}

export function GoogleDriveConnection({ googleConfigured }: GoogleDriveConnectionProps) {
  const [status, setStatus] = useState<DriveStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/drive/status')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (googleConfigured) {
      fetchStatus()
    } else {
      setLoading(false)
    }
  }, [googleConfigured, fetchStatus])

  // Check URL params for success/error from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('drive_connected') === 'true') {
      setMessage({ type: 'success', text: 'Google Drive connected successfully!' })
      fetchStatus()
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('drive_error')) {
      const error = params.get('drive_error')
      const errorMessages: Record<string, string> = {
        access_denied: 'Permission was denied. Please try again.',
        no_code: 'No authorization code received.',
        token_exchange_failed: 'Failed to connect. Please try again.',
      }
      setMessage({
        type: 'error',
        text: errorMessages[error ?? ''] ?? `Connection failed: ${error}`,
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [fetchStatus])

  async function handleConnect() {
    setConnecting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/drive/connect')
      if (!res.ok) {
        throw new Error('Failed to start connection')
      }

      const { url } = await res.json()
      window.location.href = url
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to connect',
      })
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Google Drive? Previously imported documents will remain in your library.')) {
      return
    }

    setDisconnecting(true)
    setMessage(null)

    try {
      const res = await fetch('/api/drive/disconnect', { method: 'POST' })
      if (!res.ok) {
        throw new Error('Failed to disconnect')
      }

      setStatus({ connected: false, email: null, connectedAt: null })
      setMessage({ type: 'success', text: 'Google Drive disconnected' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect Google Drive' })
    } finally {
      setDisconnecting(false)
    }
  }

  if (!googleConfigured) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Google Drive</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Import financial documents from Google Drive.
        </p>
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
            environment variables to enable Google Drive integration.
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
            <HardDrive className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Google Drive</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Import financial documents directly from your Google Drive.
          </p>
        </div>

        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        ) : status?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {disconnecting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Unlink className="h-4 w-4" />}
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {connecting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <HardDrive className="h-4 w-4" />}
            Connect Google Drive
          </button>
        )}
      </div>

      {message && (
        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {status?.connected && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <p className="text-sm font-medium text-green-900">Connected</p>
            {status.email && (
              <p className="text-xs text-green-700">{status.email}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
