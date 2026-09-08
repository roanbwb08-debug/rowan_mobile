import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft,
  Mic,
  MicOff,
  Square,
  Activity,
  ChevronDown,
  ChevronUp,
  Terminal,
  Globe,
  X,
  BookOpen,
  Newspaper
} from 'lucide-react'
import { RowanLiveVoiceOrb, type RealtimeVoiceOrbState } from './RowanLiveVoiceOrb'
import { RowanWebsitePreview } from './RowanWebsitePreview'
import type { RowanAvatarState } from '../types'
import type { VoiceDiagnostic } from '../hooks/useRealtimeVoice'

interface RowanLiveVoiceViewProps {
  status: string
  isListening: boolean
  isSpeaking: boolean
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
}

export const RowanLiveVoiceView: React.FC<RowanLiveVoiceViewProps> = ({
  status,
  isListening,
  isSpeaking,
  isSearching,
  searchQuery,
  error,
  isMuted,
  onToggleMute,
  onStop,
  onBackToChat,
  theme = 'dark',
  activeConversationLock = false,
  diagnostics = [],
  activePreview = null,
  onClosePreview,
  onOpenWebsite
}) => {
  const isDark = theme === 'dark'
  const [showConsole, setShowConsole] = useState(false)
  const [showWebSearchInput, setShowWebSearchInput] = useState(false)
  const [customUrlInput, setCustomUrlInput] = useState('')
  const consoleEndRef = useRef<HTMLDivElement>(null)

  // Map Realtime state directly to Rowan Expressive Avatar states
  let avatarState: RowanAvatarState = 'idle'
  let sublabel = 'Listening...'

  if (error) {
    avatarState = 'error'
    sublabel = error
  } else if (isSearching) {
    avatarState = 'processing'
    sublabel = searchQuery ? `Searching: "${searchQuery}"` : 'Rowan is researching...'
  } else if (isSpeaking) {
    avatarState = 'speaking'
    sublabel = 'Speaking...'
  } else if (status === 'interrupted') {
    avatarState = 'interrupted'
    sublabel = 'Interrupted'
  } else if (isListening) {
    avatarState = 'listening'
    sublabel = isMuted ? 'Microphone muted' : 'Listening...'
  } else if (status === 'thinking' || status === 'processing') {
    avatarState = 'thinking'
    sublabel = 'Thinking...'
  }

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
    <div
      className={`relative flex flex-col justify-between items-center h-full w-full p-3 sm:p-5 select-none transition-colors duration-300 overflow-hidden ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-zinc-900'
      }`}
    >
      {/* 1. TOP STATUS BAR */}
      <div className="w-full flex items-center justify-between z-10 flex-shrink-0">
        <button
          type="button"
          onClick={onBackToChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            isDark
              ? 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
              : 'bg-zinc-100 text-zinc-700 hover:text-zinc-900 border border-zinc-200'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Chat Mode</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">ROWAN AI</span>
          <h2 className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5 mt-0.5">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isSpeaking ? 'bg-blue-400' : isListening ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isSpeaking ? 'bg-blue-500' : isListening ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
              />
            </span>
            <span>{sublabel}</span>
          </h2>

          {/* Active Conversation Lock Badge */}
          <AnimatePresence>
            {activeConversationLock && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-widest"
              >
                <Activity className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                <span>Priority Lock Active</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowWebSearchInput(!showWebSearchInput)}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              showWebSearchInput
                ? 'bg-blue-600 border-blue-500 text-white'
                : isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
            }`}
            title="Open Website Input"
          >
            <Globe className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className={`p-2 rounded-full border transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : isDark
                ? 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:text-zinc-900'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* WEB SEARCH & OPEN URL BAR IN VOICE MODE */}
      <AnimatePresence>
        {showWebSearchInput && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleLaunchUrl}
            className="w-full max-w-md my-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-blue-500/40 z-20 shadow-xl"
          >
            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <input
              type="text"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              placeholder="Enter website URL (e.g., bbc.com or wikipedia.org)..."
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

      {/* 2. ACTIVE WEBSITE PREVIEW LAYER IN VOICE MODE */}
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
        /* 3. CENTER STAGE: LARGE EXPRESSIVE ROWAN AVATAR WITH EXPRESSIONS */
        <div className="flex flex-col items-center justify-center my-auto py-2 w-full flex-grow">
          {/* Breathing halo background */}
          <div className="relative mb-2 flex items-center justify-center">
            <RowanLiveVoiceOrb
              state={status as RealtimeVoiceOrbState}
              isListening={isListening}
              isSpeaking={isSpeaking}
              isThinking={avatarState === 'thinking' || avatarState === 'processing'}
              isInterrupted={status === 'interrupted'}
              size={135}
              theme={theme}
              showStatusBadge={false}
            />
          </div>

          {/* Dynamic status title */}
          <h3
            className={`text-base sm:text-lg font-black tracking-tight mt-2 text-center transition-colors duration-300 ${
              status === 'interrupted'
                ? 'text-amber-400'
                : isDark
                ? 'text-white'
                : 'text-zinc-900'
            }`}
          >
            {status === 'interrupted'
              ? 'Interrupted...'
              : isSpeaking
              ? 'Rowan is speaking...'
              : isSearching
              ? 'Researching the web...'
              : isListening
              ? 'Listening to you...'
              : 'How can I help you today?'}
          </h3>

          {/* Subtitle / Live Transcript Display */}
          <div className="mt-1 max-w-sm px-4 min-h-[36px] flex items-center justify-center text-center">
            <p className={`text-xs font-medium transition-all duration-300 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}>
              {sublabel || 'Speak naturally. Rowan listens and opens websites while explaining.'}
            </p>
          </div>

          {/* Voice reactive wave visualizer */}
          <div className="flex items-center justify-center gap-1.5 mt-3 h-5">
            {[0.4, 0.7, 1.2, 0.9, 1.4, 0.8, 1.1, 0.6, 0.3].map((mult, idx) => (
              <motion.div
                key={idx}
                className={`w-1 rounded-full ${
                  status === 'interrupted'
                    ? 'bg-amber-500/60 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                    : isSpeaking
                    ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                    : isListening
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                    : 'bg-zinc-500/40'
                }`}
                animate={{
                  height:
                    isSpeaking || (isListening && !isMuted)
                      ? [5, 20 * mult, 5]
                      : 5
                }}
                transition={{
                  duration: 0.7 + idx * 0.06,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: idx * 0.05
                }}
              />
            ))}
          </div>

          {/* QUICK WEBSITE LAUNCH BUTTONS DIRECTLY IN LIVE VOICE MODE */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
            <button
              type="button"
              onClick={() => onOpenWebsite && onOpenWebsite('https://news.google.com', 'Google News')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Newspaper className="w-3 h-3 text-blue-400" />
              <span>Latest News</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenWebsite && onOpenWebsite('https://en.wikipedia.org', 'Wikipedia')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>Wikipedia</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenWebsite && onOpenWebsite('https://bbc.com/news', 'BBC News')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>BBC World</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. DIAGNOSTICS LOGGING CONSOLE (DEVELOPER-ONLY, COMPACT & BEAUTIFUL) */}
      {diagnostics.length > 0 && (
        <div className="w-full max-w-sm mb-2 z-20 flex-shrink-0">
          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-blue-400" />
              <span>Real-Time Diagnostics</span>
            </div>
            {showConsole ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showConsole && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 100, opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className={`overflow-hidden border-x border-b rounded-b-lg text-[9px] font-mono leading-relaxed transition-all flex flex-col ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-slate-300'
                    : 'bg-zinc-50/95 border-zinc-200 text-zinc-800'
                }`}
              >
                <div className="overflow-y-auto p-2 space-y-1.5 flex-1 scrollbar-thin">
                  <div ref={consoleEndRef} />
                  {diagnostics.map((diag, index) => (
                    <div key={index} className="flex items-start gap-1">
                      <span className="text-zinc-500 shrink-0 select-none">[{diag.timestamp}]</span>
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
        </div>
      )}

      {/* 5. BOTTOM ACTION BAR: TAP TO STOP & CONTROLS */}
      <div className="w-full flex flex-col items-center gap-2 z-10 flex-shrink-0">
        <button
          type="button"
          onClick={onStop}
          className="flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xl hover:shadow-[0_0_25px_rgba(225,29,72,0.4)] transition-all cursor-pointer w-full max-w-xs"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>Tap to stop</span>
        </button>

        <p className={`text-[10px] font-medium text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Speak naturally or open websites while Rowan explains
        </p>
      </div>
    </div>
  )
}
