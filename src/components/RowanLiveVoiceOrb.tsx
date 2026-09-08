import React from 'react'
import { RowanExpressiveAvatar, type RowanAvatarState } from './RowanExpressiveAvatar'

export type RealtimeVoiceOrbState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'error'

interface RowanLiveVoiceOrbProps {
  state?: RealtimeVoiceOrbState
  size?: number
  isListening?: boolean
  isSpeaking?: boolean
  isThinking?: boolean
  isInterrupted?: boolean
  onClick?: () => void
  sublabel?: string
  showStatusBadge?: boolean
  theme?: 'dark' | 'light'
  className?: string
}

export const RowanLiveVoiceOrb: React.FC<RowanLiveVoiceOrbProps> = ({
  state = 'idle',
  size = 140,
  isListening,
  isSpeaking,
  isThinking,
  isInterrupted,
  onClick,
  sublabel,
  showStatusBadge = false,
  theme = 'dark',
  className = ''
}) => {
  // Determine effective connection state directly from props without relying on artificial timers
  let effectiveState: RealtimeVoiceOrbState = state

  if (isInterrupted || state === 'interrupted') {
    effectiveState = 'interrupted'
  } else if (isSpeaking || state === 'speaking') {
    effectiveState = 'speaking'
  } else if (isThinking || state === 'thinking' || state === 'processing') {
    effectiveState = 'thinking'
  } else if (isListening || state === 'listening') {
    effectiveState = 'listening'
  }

  // Directly map the internal Realtime connection state to the required CSS animation class
  const getOrbAnimationClass = (): string => {
    switch (effectiveState) {
      case 'speaking':
        return 'orb-speaking'
      case 'thinking':
      case 'processing':
        return 'orb-thinking'
      case 'interrupted':
        return 'orb-interrupted'
      case 'listening':
        return 'orb-listening'
      case 'connecting':
      case 'idle':
      default:
        return 'orb-glow'
    }
  }

  // Map directly to RowanExpressiveAvatar state
  const getAvatarState = (): RowanAvatarState => {
    switch (effectiveState) {
      case 'speaking':
        return 'speaking'
      case 'thinking':
      case 'processing':
        return 'thinking'
      case 'interrupted':
        return 'interrupted'
      case 'listening':
        return 'listening'
      case 'error':
        return 'error'
      case 'idle':
      case 'connecting':
      default:
        return 'idle'
    }
  }

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center cursor-pointer transition-all ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      id="rowan-live-voice-orb"
    >
      {/* Outer Glowing Halo linked directly to CSS Animation Class */}
      <div
        className={`relative flex items-center justify-center rounded-full p-2 transition-all duration-300 ${getOrbAnimationClass()}`}
        style={{ width: size + 20, height: size + 20 }}
      >
        <RowanExpressiveAvatar
          state={getAvatarState()}
          size={size}
          theme={theme}
          sublabel={sublabel}
          showStatusBadge={showStatusBadge}
        />
      </div>
    </div>
  )
}
