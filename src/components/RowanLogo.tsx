import React from 'react'
import { RowanExpressiveAvatar } from './RowanExpressiveAvatar'

interface RowanLogoProps {
  className?: string
  size?: number
  variant?: 'icon' | 'orb' | 'sparkle'
  theme?: 'light' | 'dark'
  isProcessing?: boolean
  state?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'answer' | 'processing' | 'no_response'
}

export const RowanLogo: React.FC<RowanLogoProps> = ({
  className = '',
  size = 28,
  theme = 'dark',
  isProcessing = false,
  state
}) => {
  const avatarState = state || (isProcessing ? 'thinking' : 'idle')

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <RowanExpressiveAvatar
        state={avatarState}
        size={size}
        theme={theme}
        showStatusBadge={false}
      />
    </div>
  )
}
