import { useEffect, useCallback } from 'react'
import { getWakeWordDetector } from '../lib/wakeWord'

interface WakeWordOptions {
  onWake?: () => void
  wakeWord?: string
  enabled?: boolean
}

/**
 * Hook to interface with the global WakeWordDetector utility.
 */
export function useWakeWord({ onWake, wakeWord = 'rowan', enabled = true }: WakeWordOptions) {
  useEffect(() => {
    const detector = getWakeWordDetector({
      wakeWord,
      onWake: () => onWake?.(),
      enabled
    })

    if (enabled) {
      detector?.start()
    } else {
      detector?.stop()
    }

    return () => {
      // We don't necessarily want to stop the global detector if this component unmounts,
      // as other components might still be using it. 
      // But for this app's context, usually it's fine.
    }
  }, [onWake, wakeWord, enabled])

  const start = useCallback(() => {
    getWakeWordDetector()?.start()
  }, [])

  const stop = useCallback(() => {
    getWakeWordDetector()?.stop()
  }, [])

  return { 
    start, 
    stop,
    supported: typeof window !== 'undefined' && !!((window as unknown as { SpeechRecognition?: unknown, webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { SpeechRecognition?: unknown, webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)
  }
}
