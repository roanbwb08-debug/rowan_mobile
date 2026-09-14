import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Mic,
  MicOff,
  Square,
  Terminal,
  Globe,
  X,
  Camera,
  Monitor
} from 'lucide-react'
import { RowanWebsitePreview } from './RowanWebsitePreview'
import { RowanLiveVoiceOrb } from './RowanLiveVoiceOrb'
import type { VoiceDiagnostic } from '../hooks/useRealtimeVoice'

interface RowanLiveVoiceViewProps {
  status: string
  isListening: boolean
  isSpeaking: boolean
  isThinking?: boolean
  isInterrupted?: boolean
  isSearching: boolean
  searchQuery?: string | null
  transcript?: string
  error?: string | null
  isMuted: boolean
  onToggleMute: () => void
  onStop: () => void
  onBackToChat: () => void
  theme?: 'dark' | 'light'
  activeConversationLock?: boolean
  diagnostics?: VoiceDiagnostic[]
  activePreview?: { url: string; title?: string } | null
  onClosePreview?: () => void
  onOpenWebsite?: (url: string, title?: string) => void
  // Unified Camera & Screen Sharing Props
  isScreenSharing?: boolean
  liveStreamType?: 'screen' | 'camera' | null
  onStartScreenShare?: () => void
  onStopScreenShare?: () => void
  onStartCameraShare?: (facingMode: 'user' | 'environment') => void
}

export const RowanLiveVoiceView: React.FC<RowanLiveVoiceViewProps> = ({
  isListening,
  isSpeaking,
  isThinking,
  isInterrupted,
  isSearching,
  searchQuery,
  transcript,
  error,
  isMuted,
  onToggleMute,
  onStop,
  onBackToChat,
  theme = 'dark',
  diagnostics = [],
  activePreview = null,
  onClosePreview,
  onOpenWebsite,
  isScreenSharing = false,
  liveStreamType = null,
  onStartScreenShare,
  onStopScreenShare,
  onStartCameraShare
}) => {
  const [showConsole, setShowConsole] = useState(false)
  const [showWebSearchInput, setShowWebSearchInput] = useState(false)
  const [customUrlInput, setCustomUrlInput] = useState('')
  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Map state to human-readable tag
  let stateTag = 'THINKING'
  if (error) stateTag = 'ERROR'
  else if (isSearching) stateTag = 'RESEARCHING'
  else if (isSpeaking) stateTag = 'SPEAKING'
  else if (isListening) stateTag = 'LISTENING'

  // Auto-scroll diagnostics console to top when new events arrive
  useEffect(() => {
    if (showConsole && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [diagnostics, showConsole])

  const handleLaunchUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!customUrlInput.trim()) return
    let target = customUrlInput.trim()
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`
    }
    if (onOpenWebsite) {
      onOpenWebsite(target, customUrlInput)
    } else {
      window.open(target, '_blank', 'noopener,noreferrer')
    }
    setCustomUrlInput('')
    setShowWebSearchInput(false)
  }

  return (
    <div className="relative flex flex-col justify-between items-center h-full w-full p-4 sm:p-6 select-none bg-[#080c14] text-white overflow-hidden font-sans">
      
      {/* 1. MOCKUP TITLE HEADER BAR */}
      <div className="w-full flex items-center justify-between z-10 flex-shrink-0 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0cd5b1] animate-pulse shadow-[0_0_10px_rgba(12,213,177,0.8)]" />
          <span className="text-xs font-black tracking-widest text-[#0cd5b1]">ROWAN LIVE VOICE</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>Telemetry</span>
          </button>
          
          <button
            type="button"
            onClick={onBackToChat}
            className="hover:text-white transition-colors p-1 cursor-pointer"
            title="Close Voice View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WEB SEARCH & OPEN URL BAR */}
      <AnimatePresence>
        {showWebSearchInput && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleLaunchUrl}
            className="w-full max-w-md my-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-[#0cd5b1]/40 z-20 shadow-xl"
          >
            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Enter website URL (e.g., wikipedia.org)..."
              className="flex-grow bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => setShowWebSearchInput(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 2. ACTIVE WEBSITE PREVIEW LAYER */}
      {activePreview ? (
        <div className="relative w-full flex-grow my-2 rounded-2xl overflow-hidden border border-blue-500/30 bg-slate-900 shadow-2xl flex flex-col z-20">
          <RowanWebsitePreview
            url={activePreview.url}
            title={activePreview.title}
            onClose={() => {
              if (onClosePreview) onClosePreview()
            }}
            onBack={() => {
              if (onClosePreview) onClosePreview()
            }}
            theme={theme}
          />
        </div>
      ) : (
        /* 3. CENTER STAGE */
        <div className="flex flex-col items-center justify-center my-auto py-2 w-full flex-grow">
          
          {/* Pulsing Badge: STATE: LISTENING */}
          <div className="mb-6 px-4 py-1.5 rounded-full border border-[#0cd5b1]/40 bg-[#0cd5b1]/5 text-[10px] sm:text-xs font-black tracking-widest text-[#0cd5b1] flex items-center gap-1.5 shadow-[0_0_15px_rgba(12,213,177,0.1)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0cd5b1] animate-ping" />
            <span>STATE: {stateTag}</span>
          </div>

          {/* Rowan Live Voice Orb with compact listening state and clear visual feedback */}
          <div className="relative flex items-center justify-center my-2">
            <RowanLiveVoiceOrb
              state={
                isInterrupted
                  ? 'interrupted'
                  : isSpeaking
                  ? 'speaking'
                  : isThinking || isSearching
                  ? 'thinking'
                  : 'listening'
              }
              size={140}
              isListening={isListening}
              isSpeaking={isSpeaking}
              isThinking={isThinking || isSearching}
              isInterrupted={isInterrupted}
              showStatusBadge={false}
              theme={theme}
            />
          </div>

          {/* Quick toggle capsules from mockup image */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-sm mt-6">
            <button
              type="button"
              onClick={() => {
                if (onStartCameraShare) onStartCameraShare('user')
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                liveStreamType === 'camera' && isScreenSharing
                  ? 'bg-[#0cd5b1]/15 border-[#0cd5b1] text-[#0cd5b1] shadow-[0_0_12px_rgba(12,213,177,0.2)]'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Front Cam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onStartCameraShare) onStartCameraShare('environment')
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                liveStreamType === 'camera' && isScreenSharing
                  ? 'bg-[#0cd5b1]/15 border-[#0cd5b1] text-[#0cd5b1] shadow-[0_0_12px_rgba(12,213,177,0.2)]'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Back Cam</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isScreenSharing && liveStreamType === 'screen') {
                  if (onStopScreenShare) onStopScreenShare()
                } else {
                  if (onStartScreenShare) onStartScreenShare()
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                isScreenSharing && liveStreamType === 'screen'
                  ? 'bg-blue-500/15 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                  : 'bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Share Screen</span>
            </button>
          </div>

          {/* Voice reactive wave visualizer bars */}
          <div className="flex items-center justify-center gap-1 mt-6 h-5">
            {[0.4, 0.7, 1.2, 0.9, 1.4, 0.8, 1.1, 0.6, 0.3].map((mult, idx) => (
              <motion.div
                key={idx}
                className={`w-1 rounded-full ${
                  isSpeaking
                    ? 'bg-blue-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                    : isListening && !isMuted
                    ? 'bg-[#0cd5b1] shadow-[0_0_8px_rgba(12,213,177,0.6)]'
                    : 'bg-zinc-700'
                }`}
                animate={{
                  height:
                    isSpeaking || (isListening && !isMuted)
                      ? [5, 20 * mult, 5]
                      : 5
                }}
                transition={{
                  duration: 0.6 + idx * 0.05,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: idx * 0.04
                }}
              />
            ))}
          </div>

          {/* Status text outline box from mockup image */}
          <div className="w-full max-w-sm mt-5 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-md flex items-center justify-center text-center min-h-[64px]">
            <p className="text-xs sm:text-sm font-medium text-zinc-300 leading-relaxed">
              {transcript || (error ? `Error: ${error}` : isSpeaking ? 'Rowan is speaking...' : isSearching ? `Searching: "${searchQuery || 'the web'}..."` : 'Listening... speak naturally to Rowan / Arlo.')}
            </p>
          </div>

          {/* Interrupt instructional note */}
          <p className="text-[10px] sm:text-xs text-zinc-500 mt-4 text-center">
            Speak anytime to interrupt, or say <span className="text-[#0cd5b1] font-semibold">"stop"</span> to pause speech instantly.
          </p>
        </div>
      )}

      {/* 4. DIAGNOSTICS LOGGING CONSOLE */}
      <AnimatePresence>
        {showConsole && diagnostics.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 110, opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-sm mb-3 z-20 flex-shrink-0 overflow-hidden border border-zinc-800 rounded-xl bg-zinc-950/95 text-[9px] font-mono leading-relaxed flex flex-col"
          >
            <div className="overflow-y-auto p-2 space-y-1 flex-1 scrollbar-thin text-zinc-300">
              <div ref={consoleEndRef} />
              {diagnostics.map((diag, index) => (
                <div key={index} className="flex items-start gap-1">
                  <span className="text-zinc-600 shrink-0 select-none">[{diag.timestamp}]</span>
                  <span className={`font-semibold shrink-0 select-none ${
                    diag.type === 'success' ? 'text-emerald-400' :
                    diag.type === 'warning' ? 'text-amber-400' :
                    diag.type === 'error' ? 'text-rose-400' : 'text-blue-400'
                  }`}>
                    {diag.event}:
                  </span>
                  <span className="text-zinc-400">{diag.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. BOTTOM ACTION CONTROLS */}
      <div className="w-full flex items-center justify-center gap-3.5 z-10 flex-shrink-0 border-t border-zinc-800/60 pt-4 mt-1">
        
        {/* Mic Toggle circle button */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            isMuted
              ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              : 'bg-zinc-950/60 hover:bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
          }`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
        </button>

        {/* End Voice Session crimson button */}
        <button
          type="button"
          onClick={onStop}
          className="px-6 py-2.5 rounded-full bg-[#e11d48] hover:bg-rose-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(225,29,72,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 fill-white" />
          <span>End Voice Session</span>
        </button>

        {/* Open in Chat button */}
        <button
          type="button"
          onClick={onBackToChat}
          className="px-4 py-2.5 rounded-full border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-xs font-black text-zinc-300 hover:text-white transition-all cursor-pointer"
        >
          Open in Chat
        </button>
      </div>

    </div>
  )
}
