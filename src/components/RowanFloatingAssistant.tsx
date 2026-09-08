import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { RowanConversationalInterface } from './RowanConversationalInterface'

interface RowanFloatingAssistantProps {
  navigate?: (to: string) => void
}

export const RowanFloatingAssistant: React.FC<RowanFloatingAssistantProps> = ({ navigate }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Calculate default safe position (anchored bottom-right with margin)
  const computeDefaultPosition = () => {
    if (typeof window === 'undefined') return { x: 24, y: 24 }
    const width = Math.min(window.innerWidth - 24, 480)
    const height = Math.min(window.innerHeight - 32, 660)
    const safeX = Math.max(12, window.innerWidth - width - 24)
    const safeY = Math.max(12, window.innerHeight - height - 24)
    return { x: safeX, y: safeY }
  }

  const [position, setPosition] = useState<{ x: number; y: number }>(() => computeDefaultPosition())
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, posX: 0, posY: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  const handleNavigate = (to: string) => {
    if (navigate) {
      navigate(to)
    } else {
      window.history.pushState({}, '', to)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }
  }

  // Keep window within viewport bounds on screen resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null
        const width = Math.min(window.innerWidth - 24, 480)
        const height = Math.min(window.innerHeight - 32, 660)
        const maxX = Math.max(12, window.innerWidth - width - 12)
        const maxY = Math.max(12, window.innerHeight - height - 12)
        return {
          x: Math.min(maxX, Math.max(12, prev.x)),
          y: Math.min(maxY, Math.max(12, prev.y))
        }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Pointer-event drag handlers
  const handleDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExpanded || e.button !== 0) return
    const target = e.target as HTMLElement
    // Ignore clicks on buttons, inputs, links, except if it's minimized we want to allow dragging the avatar
    if (isOpen && (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('textarea'))) {
      return
    }
    isDraggingRef.current = true
    hasMovedRef.current = false
    const currentPos = position || computeDefaultPosition()
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handleDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.pointerX
    const dy = e.clientY - dragStartRef.current.pointerY
    if (Math.hypot(dx, dy) > 5) {
      hasMovedRef.current = true
    }
    const width = isOpen ? Math.min(window.innerWidth - 24, 480) : 56 // 56 is the width of the orb
    const height = isOpen ? Math.min(window.innerHeight - 32, 660) : 56
    const minX = 12
    const maxX = Math.max(12, window.innerWidth - width - 12)
    const minY = 12
    const maxY = Math.max(12, window.innerHeight - height - 12)
    
    const nextX = Math.min(maxX, Math.max(minX, dragStartRef.current.posX + dx))
    const nextY = Math.min(maxY, Math.max(minY, dragStartRef.current.posY + dy))
    
    setPosition({ x: nextX, y: nextY })
  }

  const handleDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }
  }

  // Global window open/close event listeners
  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    const handleClose = () => setIsOpen(false)
    const handleToggle = () => setIsOpen((prev) => !prev)

    window.addEventListener('open-rowan-assistant', handleOpen)
    window.addEventListener('close-rowan-assistant', handleClose)
    window.addEventListener('toggle-rowan-assistant', handleToggle)

    ;(window as unknown as { openRowanAssistant?: () => void }).openRowanAssistant = handleOpen
    ;(window as unknown as { closeRowanAssistant?: () => void }).closeRowanAssistant = handleClose
    ;(window as unknown as { toggleRowanAssistant?: () => void }).toggleRowanAssistant = handleToggle

    return () => {
      window.removeEventListener('open-rowan-assistant', handleOpen)
      window.removeEventListener('close-rowan-assistant', handleClose)
      window.removeEventListener('toggle-rowan-assistant', handleToggle)
    }
  }, [])

  const currentPos = position || computeDefaultPosition()
  
  // When minimized, we adjust the coordinates so that the orb stays roughly where the bottom-right corner of the window was, or just floats wherever it was dragged.
  // Actually, we'll just let it use the current position, but adjust the size of the container.

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 select-none print:hidden"
      id="rowan-floating-assistant-system"
    >
      <motion.div
        ref={windowRef}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          width: isExpanded ? 'auto' : isOpen ? (window.innerWidth < 640 ? '94vw' : '480px') : '90px',
          height: isExpanded ? 'auto' : isOpen ? '670px' : '100px',
          borderRadius: isOpen ? '24px' : '28px',
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        style={
          isExpanded
            ? { position: 'fixed', left: '1rem', right: '1rem', top: '1rem', bottom: '1rem' }
            : {
                position: 'fixed',
                left: isOpen ? `${currentPos.x}px` : undefined,
                top: isOpen ? `${currentPos.y}px` : undefined,
                right: !isOpen ? '24px' : undefined,
                bottom: !isOpen ? '24px' : undefined,
              }
        }
        className={`pointer-events-auto transition-shadow duration-200 flex flex-col z-50 ${
          isOpen && !isExpanded ? 'max-h-[86vh]' : ''
        } ${
          theme === 'dark'
            ? isOpen ? 'bg-[#0c1017] text-white border border-slate-800/90 shadow-[0_25px_65px_rgba(0,0,0,0.85),0_0_40px_rgba(37,99,235,0.15)]' : 'bg-transparent drop-shadow-[0_15px_35px_rgba(0,0,0,0.5)]'
            : isOpen ? 'bg-white text-zinc-900 border border-zinc-200 shadow-[0_25px_65px_rgba(0,0,0,0.25)]' : 'bg-transparent drop-shadow-[0_15px_35px_rgba(0,0,0,0.25)]'
        } ${isOpen ? 'overflow-hidden' : 'overflow-visible flex items-center justify-center'}`}
        id="rowan-floating-window"
      >
        <RowanConversationalInterface
          navigate={handleNavigate}
          isFloating={true}
          isMinimized={!isOpen}
          onClose={() => setIsOpen(false)}
          onExpand={() => {
            if (hasMovedRef.current) return
            if (!isOpen) {
              setIsOpen(true)
            } else {
              setIsExpanded((prev) => !prev)
            }
          }}
          isExpanded={isExpanded}
          theme={theme}
          onThemeChange={(newTheme) => setTheme(newTheme)}
          dragHandleProps={{
            onPointerDown: handleDragPointerDown,
            onPointerMove: handleDragPointerMove,
            onPointerUp: handleDragPointerUp
          }}
        />
      </motion.div>
    </div>
  )
}
