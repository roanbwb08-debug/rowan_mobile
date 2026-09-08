import React from 'react'
import { RowanExpressiveAvatar } from './RowanExpressiveAvatar'
import type { RowanAvatarState } from '../types'

export type RowanCatState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'processing' | 'answer' | 'error'

export interface RowanCatAvatarProps {
  state?: RowanCatState
  size?: number
  audioLevel?: number
  onClick?: () => void
  sublabel?: string
  showStatusBadge?: boolean
  className?: string
  theme?: 'dark' | 'light'
}

export const RowanCatAvatar: React.FC<RowanCatAvatarProps> = ({
  state = 'idle',
  size = 140,
  audioLevel = 0,
  onClick,
  sublabel,
  showStatusBadge = true,
  className = '',
  theme = 'dark'
}) => {
  return (
    <RowanExpressiveAvatar
      state={state as RowanAvatarState}
      size={size}
      audioLevel={audioLevel}
      onClick={onClick}
      sublabel={sublabel}
      showStatusBadge={showStatusBadge}
      className={className}
      theme={theme}
    />
  )
}

export default RowanCatAvatar
