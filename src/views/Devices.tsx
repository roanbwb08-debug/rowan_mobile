import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  Trash2,
  Activity,
  AlertTriangle
} from 'lucide-react'
import { rowanAuth } from '../lib/supabase'
import { PhoneConnectionFlow } from '../components/PhoneConnectionFlow'

export interface RowanDeviceItem {
  id: string
  userId: string
  organizationId: string
  deviceName: string
  platform: 'Android' | 'iOS' | 'Other'
  deviceInstallationId: string
  status: 'CONNECTED' | 'OFFLINE' | 'REVOKED'
  capabilities: string[]
  permissions: Record<string, 'GRANTED' | 'DENIED' | 'PROMPTED' | 'UNSUPPORTED'>
  environment: 'production' | 'development'
  appVersion?: string
  lastSeenAt: string
  createdAt: string
  updatedAt: string
  revokedAt?: string | null
  pairingSessionId?: string
}

export const Devices: React.FC = () => {
  const [devices, setDevices] = useState<RowanDeviceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPairingFlow, setShowPairingFlow] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Filters
  const [includeRevoked, setIncludeRevoked] = useState(false)
  const [showDevDevices, setShowDevDevices] = useState(false)

  const getAuthToken = async () => {
    const session = await rowanAuth.getSession()
    return session?.access_token || ''
  }

  useEffect(() => {
    let active = true
    const fetchList = async () => {
      try {
        const token = await getAuthToken()
        const url = `/api/devices?includeRevoked=${includeRevoked ? 'true' : 'false'}`
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (active && res.ok && data.success) {
          setDevices(data.devices || [])
        } else if (active && !res.ok) {
          setError(data.message || 'Failed to fetch devices')
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to connect to device service.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchList()
    return () => {
      active = false
    }
  }, [includeRevoked, refreshTrigger])

  const handleRefresh = () => {
    setLoading(true)
    setRefreshTrigger(prev => prev + 1)
  }

  // Revoke device action
  const handleRevoke = async (device: RowanDeviceItem) => {
    if (!window.confirm(`Are you sure you want to revoke authorization for "${device.deviceName}"? This device will be permanently invalidated.`)) {
      return
    }

    setActionLoading(device.id)
    try {
      const token = await getAuthToken()
      const res = await fetch(`/api/devices/${device.id}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        handleRefresh()
      } else {
        alert(data.message || 'Failed to revoke device.')
      }
    } catch (e: unknown) {
      alert(`Revoke error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Diagnostic Heartbeat Trigger
  const handleTriggerHeartbeat = async (device: RowanDeviceItem) => {
    setActionLoading(device.id)
    try {
      const token = await getAuthToken()
      const res = await fetch(`/api/devices/${device.id}/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceInstallationId: device.deviceInstallationId,
          appVersion: device.appVersion || 'v1.0.0'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        handleRefresh()
      } else {
        alert(`Heartbeat test response (${res.status}): ${data.message}`)
        handleRefresh()
      }
    } catch (e: unknown) {
      alert(`Heartbeat network error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setActionLoading(null)
    }
  }

  // Filtered devices for display
  const displayedDevices = devices.filter(d => {
    if (!showDevDevices && d.environment === 'development') return false
    return true
  })

  const productionConnectedCount = devices.filter(
    d => d.environment === 'production' && d.status === 'CONNECTED'
  ).length

  return (
    <div className="space-y-8 animate-fade-in text-zinc-900 max-w-7xl mx-auto pb-16">
      
      {/* 1. Header & Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-widest">
              CANONICAL DEVICE INFRASTRUCTURE
            </span>
            {productionConnectedCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {productionConnectedCount} Phone Connected
              </span>
            ) : (
              <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                No active production phones
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 my-0">
            Connected Devices
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl my-0 font-medium">
            Manage authorized Rowan Android and iOS mobile companion devices, review granted permissions, and audit device sessions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-600 transition-colors cursor-pointer shadow-xs"
            title="Refresh devices"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setShowPairingFlow(!showPairingFlow)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>{showPairingFlow ? 'Close Pairing Wizard' : 'Pair New Phone'}</span>
          </button>
        </div>
      </div>

      {/* 2. Embedded Pairing Wizard if toggled */}
      {showPairingFlow && (
        <div className="mb-8">
          <PhoneConnectionFlow
            onComplete={() => {
              setShowPairingFlow(false)
              handleRefresh()
            }}
            onCancel={() => setShowPairingFlow(false)}
          />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Filters and Management Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={includeRevoked}
              onChange={e => setIncludeRevoked(e.target.checked)}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Include Revoked Devices ({devices.filter(d => d.status === 'REVOKED').length})</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={showDevDevices}
              onChange={e => setShowDevDevices(e.target.checked)}
              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show Developer Test Harness Devices ({devices.filter(d => d.environment === 'development').length})</span>
          </label>
        </div>

        <span className="text-zinc-400 font-medium">
          Showing {displayedDevices.length} of {devices.length} registered records
        </span>
      </div>

      {/* 4. Devices List or Empty State */}
      {loading && devices.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Loading registered devices from Firestore...</p>
        </div>
      ) : displayedDevices.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center space-y-5 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Smartphone className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-900 my-0">No Devices Found</h3>
            <p className="text-xs text-zinc-500 font-medium my-0 leading-relaxed">
              You do not have any {includeRevoked ? '' : 'active '}phones paired with this Rowan account.
              Generate a short-lived pairing code to link the companion mobile app.
            </p>
          </div>
          <button
            onClick={() => setShowPairingFlow(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
          >
            Pair New Phone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedDevices.map(device => {
            const isRevoked = device.status === 'REVOKED'
            const isConnected = device.status === 'CONNECTED'
            const isDev = device.environment === 'development'

            return (
              <div
                key={device.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs transition-all ${
                  isRevoked
                    ? 'border-zinc-200 bg-zinc-50/50 opacity-75'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {/* Device Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-700 border border-zinc-200">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 my-0 flex items-center gap-1.5">
                          <span>{device.deviceName}</span>
                          {isDev && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                              DEV HARNESS
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-mono my-0">
                          {device.platform} &bull; {device.appVersion || 'v1.0.0'}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isConnected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          CONNECTED
                        </span>
                      )}
                      {device.status === 'OFFLINE' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          OFFLINE
                        </span>
                      )}
                      {isRevoked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          REVOKED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Device Metadata */}
                  <div className="space-y-1.5 pt-2 text-[11px] text-zinc-500 font-medium">
                    <div className="flex justify-between items-center">
                      <span>Device ID:</span>
                      <span className="font-mono text-zinc-700 font-bold">{device.id}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Installation ID:</span>
                      <span className="font-mono text-zinc-600 truncate max-w-[150px]" title={device.deviceInstallationId}>
                        {device.deviceInstallationId}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Last Active:</span>
                      <span className="text-zinc-700">
                        {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>

                    {device.revokedAt && (
                      <div className="flex justify-between items-center text-rose-600">
                        <span>Revoked At:</span>
                        <span>{new Date(device.revokedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Capabilities tags */}
                  {device.capabilities && device.capabilities.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">
                        Authorized Capabilities
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {device.capabilities.map(cap => (
                          <span
                            key={cap}
                            className="text-[9px] font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Device Actions */}
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  {!isRevoked ? (
                    <>
                      <button
                        onClick={() => handleTriggerHeartbeat(device)}
                        disabled={actionLoading === device.id}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-[11px] font-bold text-zinc-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Send heartbeat to verify credential & update last seen"
                      >
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        <span>Ping Heartbeat</span>
                      </button>

                      <button
                        onClick={() => handleRevoke(device)}
                        disabled={actionLoading === device.id}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-[11px] font-bold text-rose-600 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-zinc-400 italic">
                      Session revoked permanently.
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Security Audit Footnote */}
      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-500 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="my-0 leading-relaxed">
          <strong>Cryptographic Trust Boundary:</strong> Devices must present valid authentication tokens matching the authorized organization tenant and installation identifier. Revoked credentials cannot reconnect without a new pairing session.
        </p>
      </div>
    </div>
  )
}
