import React, { useState, useEffect, useRef } from 'react'
import {
  Smartphone,
  Check,
  ArrowRight,
  Loader2,
  RefreshCw,
  Copy,
  AlertTriangle,
  Clock,
  XCircle,
  QrCode,
  Terminal,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import QRCode from 'qrcode'
import { rowanAuth } from '../lib/supabase'

interface PhoneConnectionFlowProps {
  onComplete: () => void
  onCancel: () => void
}

interface PairingSessionResponse {
  sessionId: string
  pairingCode: string
  expiresAt: string
  requestedCapabilities: string[]
  environment: 'production' | 'development'
  qrPayload: {
    protocol: string
    sessionId: string
    expiresAt: string
  }
}

interface PairedDeviceDetails {
  id: string
  deviceName: string
  platform: string
  environment: string
  status: string
}

const AVAILABLE_CAPABILITIES = [
  { id: 'MICROPHONE', name: 'Microphone & Voice', desc: 'Real-time spoken dialogue and wake triggers with Rowan' },
  { id: 'NOTIFICATIONS', name: 'Push Notifications', desc: 'Contextual updates, alerts, and task completion notices' },
  { id: 'SCREEN_CAPTURE', name: 'Screen Context', desc: 'Visual understanding when explicitly triggered by you' },
  { id: 'LOCATION', name: 'Location Awareness', desc: 'Geographic awareness for localized queries' },
  { id: 'FILES', name: 'File & Document Access', desc: 'Read authorized files and document attachments' }
]

export const PhoneConnectionFlow: React.FC<PhoneConnectionFlowProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'configure' | 'pair' | 'success'>('configure')
  const [instructions, setInstructions] = useState('')
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([
    'MICROPHONE',
    'NOTIFICATIONS'
  ])

  // Pairing session state
  const [session, setSession] = useState<PairingSessionResponse | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [pairingStatus, setPairingStatus] = useState<
    'PENDING' | 'SCANNED' | 'CONFIRMING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'ERROR'
  >('PENDING')
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pairedDevice, setPairedDevice] = useState<PairedDeviceDetails | null>(null)

  // Dev test harness toggle & state
  const [showDevHarness, setShowDevHarness] = useState(false)
  const [devSimulating, setDevSimulating] = useState(false)
  const [devMessage, setDevMessage] = useState<string | null>(null)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const toggleCapability = (id: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  // Get auth token helper
  const getAuthToken = async () => {
    const s = await rowanAuth.getSession()
    return s?.access_token || ''
  }

  // Step 1 -> Step 2: Create Pairing Session on Backend
  const handleStartPairing = async (env: 'production' | 'development' = 'production') => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/devices/pairing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          instructions: instructions.trim(),
          requestedCapabilities: selectedCapabilities,
          environment: env
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to initiate pairing session.')
      }

      setSession(data)
      setPairingStatus('PENDING')

      // Generate QR Code data URL safely client-side from opaque qrPayload
      const qrData = await QRCode.toDataURL(JSON.stringify(data.qrPayload), {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#09090b',
          light: '#ffffff'
        }
      })
      setQrCodeDataUrl(qrData)

      // Calculate initial countdown
      const msLeft = Math.max(0, Date.parse(data.expiresAt) - Date.now())
      setSecondsRemaining(Math.floor(msLeft / 1000))

      setStep('pair')
    } catch (err: unknown) {
      console.error('Pairing creation error:', err)
      setError(err instanceof Error ? err.message : 'Network error initiating pairing session.')
    } finally {
      setLoading(false)
    }
  }

  // Countdown timer effect
  useEffect(() => {
    if (step !== 'pair' || !session) return

    timerIntervalRef.current = setInterval(() => {
      const msLeft = Math.max(0, Date.parse(session.expiresAt) - Date.now())
      const sec = Math.floor(msLeft / 1000)
      setSecondsRemaining(sec)

      if (sec <= 0) {
        setPairingStatus('EXPIRED')
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      }
    }, 1000)

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [step, session])

  // Polling backend pairing status effect (every 2s)
  useEffect(() => {
    if (step !== 'pair' || !session || pairingStatus === 'COMPLETED' || pairingStatus === 'EXPIRED' || pairingStatus === 'CANCELLED') {
      return
    }

    const checkStatus = async () => {
      try {
        const token = await getAuthToken()
        const res = await fetch(`/api/devices/pairing/status/${session.sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (res.ok && data.success) {
          if (data.status !== pairingStatus) {
            setPairingStatus(data.status)
          }

          if (data.status === 'COMPLETED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
            // Fetch the device record
            if (data.deviceId) {
              const devRes = await fetch(`/api/devices/${data.deviceId}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
              const devData = await devRes.json()
              if (devData.success) {
                setPairedDevice(devData.device)
              }
            }
            setStep('success')
          } else if (data.status === 'EXPIRED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          }
        }
      } catch (err) {
        console.warn('Status poll error:', err)
      }
    }

    pollIntervalRef.current = setInterval(checkStatus, 2000)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [step, session, pairingStatus])

  // Cancel session
  const handleCancel = async () => {
    if (session && pairingStatus !== 'COMPLETED') {
      try {
        const token = await getAuthToken()
        await fetch(`/api/devices/pairing/cancel/${session.sessionId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch {
        // ignore
      }
    }
    onCancel()
  }

  // Copy pairing code to clipboard
  const handleCopyCode = () => {
    if (session?.pairingCode) {
      navigator.clipboard.writeText(session.pairingCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // -------------------------------------------------------------------------
  // Developer Test Harness Handlers (Explicitly testing the backend protocol)
  // -------------------------------------------------------------------------
  const handleDevSimulateScan = async () => {
    if (!session) return
    setDevSimulating(true)
    setDevMessage(null)
    try {
      const res = await fetch('/api/devices/pairing/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDevMessage('Scan simulated successfully. Session moved to SCANNED.')
        setPairingStatus('SCANNED')
      } else {
        setDevMessage(`Scan simulation rejected: ${data.message}`)
      }
    } catch (e: unknown) {
      setDevMessage(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDevSimulating(false)
    }
  }

  const handleDevSimulateConfirm = async () => {
    if (!session) return
    setDevSimulating(true)
    setDevMessage(null)
    try {
      const token = await getAuthToken()
      const installId = `dev_harness_${Math.random().toString(36).slice(2, 10)}`
      const res = await fetch('/api/devices/pairing/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          deviceName: 'Pixel Test Harness (Dev Client)',
          platform: 'Android',
          deviceInstallationId: installId,
          capabilities: session.requestedCapabilities,
          permissions: {
            MICROPHONE: 'GRANTED',
            NOTIFICATIONS: 'GRANTED',
            SCREEN_CAPTURE: 'DENIED',
            LOCATION: 'DENIED',
            FILES: 'GRANTED'
          },
          appVersion: 'v0.9.0-dev',
          environment: 'development'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDevMessage('Device confirmed in development environment!')
        setPairingStatus('COMPLETED')
        setPairedDevice(data.device)
        setStep('success')
      } else {
        setDevMessage(`Confirmation rejected: ${data.message}`)
      }
    } catch (e: unknown) {
      setDevMessage(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDevSimulating(false)
    }
  }

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-10 shadow-sm max-w-4xl mx-auto space-y-8 animate-fade-in text-zinc-900">
      {/* Step Indicator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 my-0">Connect Rowan to Phone</h2>
            <p className="text-xs text-zinc-400 font-medium my-0">
              {step === 'configure' && 'Step 1 of 2: Configure capabilities & security'}
              {step === 'pair' && 'Step 2 of 2: Scan QR or enter pairing code'}
              {step === 'success' && 'Connection Verified'}
            </p>
          </div>
        </div>

        <button
          onClick={handleCancel}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer px-3 py-1.5 rounded-xl hover:bg-zinc-100"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CONFIGURE CAPABILITIES & PERMISSIONS */}
      {step === 'configure' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
              1. Select Requested Capabilities
            </label>
            <p className="text-xs text-zinc-400 font-medium my-0">
              Choose the permissions Rowan Mobile will request upon installation. You can change these anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_CAPABILITIES.map(cap => {
              const active = selectedCapabilities.includes(cap.id)
              return (
                <div
                  key={cap.id}
                  onClick={() => toggleCapability(cap.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    active
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-xs font-bold ${active ? 'text-blue-900' : 'text-zinc-800'}`}>
                      {cap.name}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                        active ? 'bg-blue-600 text-white' : 'border border-zinc-300 bg-white'
                      }`}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 font-medium leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
              2. Assistant Custom Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. Always respond concisely when I speak over mobile voice..."
              className="w-full text-xs rounded-2xl border border-zinc-200 p-3.5 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-zinc-800 font-medium"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              onClick={() => handleStartPairing('production')}
              disabled={loading}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Generate Secure Pairing Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PAIRING QR CODE & MANUAL CODE SCREEN */}
      {step === 'pair' && session && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* QR Code Container */}
            <div className="md:col-span-6 flex flex-col items-center justify-center p-6 bg-zinc-50 border border-zinc-200 rounded-3xl text-center space-y-4">
              <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm relative">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Pairing QR Code"
                    className="w-56 h-56 rounded-xl block"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
                  </div>
                )}
                {pairingStatus === 'EXPIRED' && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-4">
                    <XCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <span className="text-xs font-bold text-zinc-900">QR Code Expired</span>
                    <button
                      onClick={() => handleStartPairing(session.environment)}
                      className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl shadow-sm hover:bg-blue-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-zinc-600 text-xs font-semibold">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Scan with Rowan Android or iOS App</span>
              </div>
            </div>

            {/* Manual Pairing Code & Details */}
            <div className="md:col-span-6 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
                  Manual Entry Alternative
                </span>
                <h3 className="text-base font-bold text-zinc-900 my-0">
                  Or enter this pairing code in app
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900 text-white flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">
                    6-Character Code
                  </span>
                  <div className="text-2xl sm:text-3xl font-mono font-bold tracking-widest text-blue-400">
                    {session.pairingCode}
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Countdown & Status Tracker */}
              <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    Code expires in:
                  </span>
                  <span
                    className={`font-mono font-bold text-xs ${
                      secondsRemaining < 60 ? 'text-rose-600 animate-pulse' : 'text-zinc-800'
                    }`}
                  >
                    {formatCountdown(secondsRemaining)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-zinc-200/60 pt-3">
                  <span className="font-medium text-zinc-500">Live Status:</span>
                  <div className="flex items-center gap-2">
                    {pairingStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Waiting for scan...
                      </span>
                    )}
                    {pairingStatus === 'SCANNED' && (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Scanned! Confirming...
                      </span>
                    )}
                    {pairingStatus === 'EXPIRED' && (
                      <span className="text-rose-600 font-bold text-xs">Expired</span>
                    )}
                    {pairingStatus === 'CANCELLED' && (
                      <span className="text-zinc-500 font-bold text-xs">Cancelled</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 font-medium space-y-1">
                <p className="my-0">
                  🔒 Security: The QR payload contains only a short-lived opaque session pointer. No permanent credentials or API keys are embedded.
                </p>
              </div>
            </div>
          </div>

          {/* DEVELOPER TESTING HARNESS (Strictly labeled & isolated) */}
          <div className="border border-zinc-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDevHarness(!showDevHarness)}
              className="w-full p-3.5 bg-zinc-100 hover:bg-zinc-150 text-left text-xs font-bold text-zinc-700 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                <span>🛠️ Developer Diagnostic Test Harness (Simulate Mobile Client)</span>
              </div>
              {showDevHarness ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDevHarness && (
              <div className="p-4 bg-zinc-50 space-y-3 text-xs border-t border-zinc-200">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium leading-relaxed">
                  <strong>DISCLAIMER:</strong> This is a development testing harness only. It tests backend pairing protocol and transitions. It does not run genuine Android/iOS hardware and is tagged as <code className="bg-amber-100 px-1 py-0.5 rounded">environment: development</code>.
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDevSimulateScan}
                    disabled={devSimulating || pairingStatus !== 'PENDING'}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-40"
                  >
                    1. Simulate Mobile QR Scan
                  </button>

                  <button
                    onClick={handleDevSimulateConfirm}
                    disabled={devSimulating || (pairingStatus !== 'SCANNED' && pairingStatus !== 'PENDING')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-40"
                  >
                    2. Simulate Mobile Confirmation
                  </button>
                </div>

                {devMessage && (
                  <div className="p-2 rounded-xl bg-zinc-200/70 text-zinc-800 font-mono text-[10px]">
                    {devMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS STATE */}
      {step === 'success' && (
        <div className="py-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold text-zinc-900 my-0">
              {pairedDevice?.environment === 'development'
                ? 'Test Harness Device Registered'
                : 'Phone Paired Successfully!'}
            </h3>
            <p className="text-xs text-zinc-500 font-medium my-0">
              Device <span className="font-bold text-zinc-800">{pairedDevice?.deviceName || 'Mobile Companion'}</span> has been authorized in your Rowan trust network.
            </p>
          </div>

          {pairedDevice && (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 max-w-sm mx-auto text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Device ID:</span>
                <span className="font-mono text-zinc-800 font-bold">{pairedDevice.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Platform:</span>
                <span className="text-zinc-800 font-bold">{pairedDevice.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Environment:</span>
                <span className="text-zinc-800 font-bold uppercase">{pairedDevice.environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-medium">Status:</span>
                <span className="text-emerald-600 font-bold">{pairedDevice.status}</span>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={onComplete}
              className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-2xl cursor-pointer shadow-sm transition-all"
            >
              Go to Devices Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
