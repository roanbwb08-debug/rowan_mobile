import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, X, Loader2 } from 'lucide-react'

export type RowanAvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'no_response'
  | 'answer'
  | 'error'

interface RowanExpressiveAvatarProps {
  state?: RowanAvatarState
  size?: number
  audioLevel?: number // 0 to 1
  onClick?: () => void
  sublabel?: string
  showStatusBadge?: boolean
  className?: string
  theme?: 'dark' | 'light'
  variant?: 'icon' | '3d_mascot'
}

export const RowanExpressiveAvatar: React.FC<RowanExpressiveAvatarProps> = ({
  state = 'idle',
  size = 140,
  audioLevel = 0,
  onClick,
  sublabel,
  showStatusBadge = true,
  className = ''
}) => {
  const [blink, setBlink] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(1)

  // Natural blink loop
  useEffect(() => {
    if (state === 'answer' || state === 'error') return

    const triggerBlink = () => {
      setBlink(true)
      setTimeout(() => setBlink(false), 160)
    }

    const interval = setInterval(() => {
      if (Math.random() > 0.2) {
        triggerBlink()
      }
    }, 3200)

    return () => clearInterval(interval)
  }, [state])

  // Mouth motion while speaking
  useEffect(() => {
    if (state !== 'speaking') return

    const interval = setInterval(() => {
      const baseLevel = audioLevel > 0.05 ? audioLevel * 2.8 : (0.4 + Math.random() * 0.8)
      setMouthOpen(Math.min(2.4, Math.max(0.6, baseLevel)))
    }, 110)

    return () => clearInterval(interval)
  }, [state, audioLevel])

  // Status badge label matching reference
  const getStatusLabel = () => {
    if (sublabel) return sublabel
    switch (state) {
      case 'listening':
        return 'Listening...'
      case 'thinking':
        return 'Thinking...'
      case 'processing':
        return 'Processing...'
      case 'speaking':
        return 'Speaking...'
      case 'interrupted':
        return 'Listening to you...'
      case 'no_response':
        return 'Sorry, I didn\'t get that.'
      case 'answer':
        return "Here's your answer"
      case 'error':
        return "Sorry, I didn't get that."
      case 'idle':
      default:
        return ''
    }
  }

  // Floating/Bobbing animation
  const getBounceAnimation = () => {
    switch (state) {
      case 'speaking':
        return { y: [0, -8, 0, -4, 0] }
      case 'listening':
        return { y: [0, -3, 0] }
      case 'answer':
        return { y: [0, -10, 0, -6, 0] }
      case 'idle':
      default:
        return { y: [0, -5, 0] }
    }
  }

  const bounceDuration = state === 'speaking' ? 0.7 : state === 'answer' ? 0.8 : 2.5

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ width: size, minHeight: size + (showStatusBadge && getStatusLabel() ? 28 : 0) }}
    >
      {/* 1. THINKING STATE: 3 Glowing Dots Floating Above Rowan */}
      {state === 'thinking' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="absolute -top-6 flex items-center gap-1.5 z-20"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]"
              animate={{
                y: [0, -6, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut'
              }}
            />
          ))}
        </motion.div>
      )}

      {/* 2. LISTENING STATE: Water Ripple Rings Underneath */}
      {state === 'listening' && (
        <div className="absolute bottom-1 flex items-center justify-center pointer-events-none z-0">
          <motion.div
            animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            className="w-24 h-6 rounded-full border border-sky-400/60 bg-sky-500/10"
          />
          <motion.div
            animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.8, 0.1, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: 0.3, ease: 'easeOut' }}
            className="absolute w-16 h-4 rounded-full border border-blue-400/80 bg-blue-500/20"
          />
        </div>
      )}

      {/* 3. MAIN CHARACTER: 3D SPEECH BUBBLE MASCOT */}
      <motion.div
        animate={getBounceAnimation()}
        transition={{
          duration: bounceDuration,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="relative flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Glowing Aura behind Bubble linked directly to Realtime Orb CSS animation classes */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-all duration-300 pointer-events-none ${
            state === 'interrupted'
              ? 'orb-interrupted bg-amber-500/80 shadow-[0_0_50px_rgba(245,158,11,0.9)]'
              : state === 'thinking' || state === 'processing'
              ? 'orb-thinking bg-cyan-400/80 shadow-[0_0_50px_rgba(34,211,238,0.9)]'
              : state === 'listening'
              ? 'orb-listening bg-sky-400/70 shadow-[0_0_50px_rgba(56,189,248,0.8)]'
              : state === 'speaking'
              ? 'orb-speaking bg-blue-400/80 shadow-[0_0_50px_rgba(96,165,250,0.9)]'
              : 'orb-glow bg-blue-600/50 shadow-[0_0_35px_rgba(37,99,235,0.6)]'
          }`}
        />

        {/* 3D SPEECH BUBBLE SVG */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full z-10 drop-shadow-[0_16px_32px_rgba(14,165,233,0.4)] cursor-pointer relative overflow-visible"
        >
          <defs>
            {/* 3D Glossy Blue Metallic Gradient */}
            <radialGradient id="rowanBubble3D" cx="35%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="65%" stopColor="#1d4ed8" />
              <stop offset="90%" stopColor="#1e3a8a" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>

            {/* Specular White Gloss Highlight */}
            <linearGradient id="bubbleGloss" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>

            {/* Eye Glow Filter */}
            <filter id="eyeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* MAIN 3D SPEECH BUBBLE BODY WITH TAIL */}
          <g id="rowan-speech-bubble-character">
            {/* Base Speech Bubble Shape */}
            <path
              d="M 38 20 
                 L 102 20 
                 A 28 28 0 0 1 130 48 
                 L 130 78 
                 A 28 28 0 0 1 102 106 
                 L 92 106 
                 Q 104 122 110 126 
                 Q 90 122 78 106 
                 L 38 106 
                 A 28 28 0 0 1 10 78 
                 L 10 48 
                 A 28 28 0 0 1 38 20 
                 Z"
              fill="url(#rowanBubble3D)"
              stroke="#60a5fa"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />

            {/* Glossy Top Reflection Arc */}
            <path
              d="M 38 23 
                 L 102 23 
                 A 25 25 0 0 1 125 48 
                 Q 70 38 15 48 
                 A 25 25 0 0 1 38 23 
                 Z"
              fill="url(#bubbleGloss)"
            />

            {/* Bottom Inner Rim Light */}
            <path
              d="M 22 78 
                 A 24 24 0 0 0 38 102 
                 L 78 102 
                 Q 90 118 104 122 
                 Q 98 116 90 102 
                 L 102 102 
                 A 24 24 0 0 0 122 78"
              fill="none"
              stroke="#93c5fd"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
          </g>

          {/* FACIAL EXPRESSIONS */}
          <g id="rowan-face-features">
            {/* STATE 1: ANSWER (Happy Arched Eyes ^^ and Smile) */}
            {state === 'answer' ? (
              <g filter="url(#eyeGlow)">
                {/* Left Arched Eye */}
                <path d="M 44 58 Q 54 42 64 58" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" />
                {/* Right Arched Eye */}
                <path d="M 76 58 Q 86 42 96 58" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" fill="none" />
                {/* Cute Smile Mouth */}
                <path d="M 62 76 Q 70 84 78 76" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>
            ) : state === 'no_response' || state === 'error' ? (
              /* STATE 2: NO RESPONSE / ERROR (Flat Line Eyes -- and Sad/Flat Mouth) */
              <g>
                <rect x="44" y="54" width="18" height="5" rx="2.5" fill="#ffffff" />
                <rect x="78" y="54" width="18" height="5" rx="2.5" fill="#ffffff" />
                <line x1="62" y1="74" x2="78" y2="74" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
              </g>
            ) : (
              /* STATE 3: LISTENING / THINKING / SPEAKING / IDLE (Pill Eyes || ||) */
              <g filter="url(#eyeGlow)">
                {/* Left Eye */}
                {blink ? (
                  <rect x="46" y="56" width="14" height="4" rx="2" fill="#ffffff" />
                ) : (
                  <rect x="46" y="42" width="14" height="28" rx="7" fill="#ffffff" />
                )}

                {/* Right Eye */}
                {blink ? (
                  <rect x="80" y="56" width="14" height="4" rx="2" fill="#ffffff" />
                ) : (
                  <rect x="80" y="42" width="14" height="28" rx="7" fill="#ffffff" />
                )}

                {/* Eye Specular Pupils (Glint) */}
                {!blink && (
                  <>
                    <circle cx="50" cy="47" r="2.5" fill="#38bdf8" />
                    <circle cx="84" cy="47" r="2.5" fill="#38bdf8" />
                  </>
                )}

                {/* Mouth for SPEAKING */}
                {state === 'speaking' ? (
                  <motion.path
                    d={`M 62 78 Q 70 ${75 + mouthOpen * 4} 78 78`}
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null}
              </g>
            )}
          </g>
        </svg>
      </motion.div>

      {/* 4. UNDER-AVATAR BADGES / EQUALIZER / STATUS (MATCHING REFERENCE SHEET) */}
      {showStatusBadge && (
        <div className="mt-2 flex flex-col items-center justify-center z-20">
          {/* EQUALIZER FOR SPEAKING */}
          {state === 'speaking' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/50 shadow-lg text-blue-400"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <motion.span
                  key={i}
                  className="w-0.5 rounded-full bg-blue-400"
                  animate={{
                    height: [4, 16, 6, 20, 4]
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: 'easeInOut'
                  }}
                />
              ))}
              <span className="text-[10px] font-bold ml-1">Speaking...</span>
            </motion.div>
          )}

          {/* CHECKMARK BADGE FOR ANSWER */}
          {state === 'answer' && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-400 text-xs font-bold shadow-xl"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Here's your answer</span>
            </motion.div>
          )}

          {/* SPINNER FOR PROCESSING */}
          {state === 'processing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/90 border border-blue-500/50 text-blue-400 text-xs font-bold shadow-xl"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Processing...</span>
            </motion.div>
          )}

          {/* ERROR BADGE FOR NO_RESPONSE */}
          {(state === 'no_response' || state === 'error') && (
            <motion.div
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-400 text-xs font-bold shadow-xl"
            >
              <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <X className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>{getStatusLabel()}</span>
            </motion.div>
          )}

          {/* STANDARD LISTENING / THINKING BADGES */}
          {(state === 'listening' || state === 'thinking') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-bold text-sky-400 tracking-wide mt-1"
            >
              {getStatusLabel()}
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}
