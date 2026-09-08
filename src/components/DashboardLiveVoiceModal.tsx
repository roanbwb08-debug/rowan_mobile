import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mic,
  MicOff,
  Square,
  AlertCircle,
  Radio,
  X,
  Terminal,
  Activity
} from 'lucide-react'
import { useRealtimeVoice } from '../hooks/useRealtimeVoice'
import { RowanLiveVoiceOrb, type RealtimeVoiceOrbState } from './RowanLiveVoiceOrb'

interface DashboardLiveVoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onNavigateToChat?: () => void
}

export const DashboardLiveVoiceModal: React.FC<DashboardLiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onNavigateToChat
}) => {
  const {
    status,
    isListening,
    isSpeaking,
    isThinking,
    isConnecting,
    error,
    transcript,
    start,
    stop,
    diagnostics
  } = useRealtimeVoice({})

  const [isMuted, setIsMuted] = React.useState(false)
  const [showDiagnostics, setShowDiagnostics] = React.useState(false)
  const diagnosticsEndRef = useRef<HTMLDivElement>(null)

  // Start voice session when modal opens, stop when closed
  useEffect(() => {
    if (isOpen) {
      start().catch((err) => {
        console.error('[LiveVoiceModal] Failed to initiate voice session:', err)
      })
    } else {
      stop()
    }
  }, [isOpen, start, stop])

  // Scroll diagnostics to bottom
  useEffect(() => {
    if (showDiagnostics && diagnosticsEndRef.current) {
      diagnosticsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [diagnostics, showDiagnostics])

  // Compute explicit product-defined state
  const getDisplayState = (): 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'INTERRUPTED' | 'RECONNECTING' | 'ERROR' => {
    if (error || status === 'error') return 'ERROR'
    if (isConnecting || status === 'connecting') return 'RECONNECTING'
    if (status === 'interrupted') return 'INTERRUPTED'
    if (isSpeaking || status === 'speaking') return 'SPEAKING'
    if (isThinking || status === 'thinking' || status === 'processing') return 'THINKING'
    if (isListening || status === 'listening') return 'LISTENING'
    return 'IDLE'
  }

  const currentRealtimeState = getDisplayState()

  const getStatusBadgeColor = () => {
    switch (currentRealtimeState) {
      case 'LISTENING':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30'
      case 'SPEAKING':
        return 'bg-teal-400/20 text-teal-300 border-teal-400/40'
      case 'THINKING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      case 'INTERRUPTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      case 'RECONNECTING':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30'
      case 'ERROR':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700'
    }
  }

  const handleClose = () => {
    stop()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          id="dashboard-live-voice-overlay"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg bg-[#0d131a] border border-teal-900/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(13,148,136,0.12)] relative flex flex-col items-center text-center overflow-hidden"
            id="dashboard-live-voice-card"
          >
            {/* Subtle background gradient glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar */}
            <div className="w-full flex items-center justify-between relative z-10 pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Rowan Live Voice
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors text-xs flex items-center gap-1"
                  title="Toggle WebRTC Telemetry"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="text-[10px] hidden sm:inline">Telemetry</span>
                </button>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                  aria-label="Close voice session"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* State Indicator Badge */}
            <div className="mt-5 relative z-10">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest border transition-all ${getStatusBadgeColor()}`}
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span>STATE: {currentRealtimeState}</span>
              </div>
            </div>

            {/* Central Avatar Orb */}
            <div className="my-6 relative z-10 flex flex-col items-center">
              <div className="relative">
                <RowanLiveVoiceOrb
                  state={status as RealtimeVoiceOrbState}
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  isThinking={isThinking || status === 'thinking' || status === 'processing'}
                  isInterrupted={status === 'interrupted'}
                  size={140}
                  theme="dark"
                  showStatusBadge={false}
                />
              </div>

              {/* Audio Wave Bar Feedback */}
              <div className="flex items-center gap-1 mt-4 h-6">
                {[0.4, 0.8, 1, 0.7, 0.5, 0.9, 0.6, 0.3].map((heightScale, idx) => (
                  <motion.div
                    key={idx}
                    animate={{
                      scaleY:
                        currentRealtimeState === 'SPEAKING' || currentRealtimeState === 'LISTENING'
                          ? [0.3, heightScale, 0.3]
                          : 0.2
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: idx * 0.08,
                      ease: 'easeInOut'
                    }}
                    className={`w-1 rounded-full ${
                      currentRealtimeState === 'SPEAKING'
                        ? 'bg-teal-400'
                        : currentRealtimeState === 'LISTENING'
                        ? 'bg-teal-500/60'
                        : 'bg-zinc-800'
                    }`}
                    style={{ height: '20px', transformOrigin: 'bottom' }}
                  />
                ))}
              </div>
            </div>

            {/* Realtime Live Transcript */}
            <div className="w-full min-h-[64px] max-h-32 overflow-y-auto px-4 py-3 rounded-2xl bg-[#090d12]/80 border border-zinc-850 text-xs text-zinc-300 relative z-10 flex items-center justify-center text-center">
              {transcript ? (
                <p className="leading-relaxed m-0 italic text-teal-100">"{transcript}"</p>
              ) : error ? (
                <p className="leading-relaxed m-0 text-rose-400 flex items-center gap-1.5 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </p>
              ) : (
                <p className="leading-relaxed m-0 text-zinc-500">
                  {currentRealtimeState === 'LISTENING'
                    ? 'Listening... speak naturally to Rowan Core.'
                    : currentRealtimeState === 'THINKING'
                    ? 'Rowan is processing your thoughts...'
                    : currentRealtimeState === 'SPEAKING'
                    ? 'Rowan is speaking...'
                    : currentRealtimeState === 'INTERRUPTED'
                    ? 'Interrupted — Rowan is quiet and listening to you.'
                    : 'Connecting to OpenAI Realtime Core...'}
                </p>
              )}
            </div>

            {/* Realtime Interruption Hint */}
            <p className="text-[11px] text-zinc-500 mt-2.5 relative z-10">
              Speak anytime to interrupt, or say <span className="text-teal-400 font-semibold">"stop"</span> to pause speech instantly.
            </p>

            {/* Controls Bar */}
            <div className="mt-6 flex items-center gap-3 relative z-10">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                    : 'bg-zinc-850 border-zinc-750 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={handleClose}
                className="px-6 py-3.5 rounded-2xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-rose-900/20 cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>End Voice Session</span>
              </button>

              {onNavigateToChat && (
                <button
                  onClick={() => {
                    stop()
                    onClose()
                    onNavigateToChat()
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-750 transition-colors"
                >
                  Open in Chat
                </button>
              )}
            </div>

            {/* Expandable WebRTC Telemetry / Diagnostics Drawer */}
            {showDiagnostics && (
              <div className="w-full mt-5 p-3 rounded-xl bg-black/70 border border-zinc-800 text-left font-mono text-[10px] max-h-36 overflow-y-auto space-y-1 relative z-10">
                <div className="flex items-center justify-between text-zinc-400 pb-1 border-b border-zinc-850">
                  <span>WebRTC Diagnostics Stream</span>
                  <Activity className="w-3 h-3 text-teal-400" />
                </div>
                {diagnostics.length > 0 ? (
                  diagnostics.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 text-zinc-400">
                      <span className="text-zinc-600">{d.timestamp.split('T')[1]?.slice(0, 8)}</span>
                      <span className={d.type === 'error' ? 'text-rose-400' : d.type === 'warning' ? 'text-amber-400' : 'text-teal-400'}>
                        [{d.event}]
                      </span>
                      <span className="text-zinc-300 truncate">{d.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-600 italic">No telemetry events logged yet.</p>
                )}
                <div ref={diagnosticsEndRef} />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
