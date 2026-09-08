import { useEffect, useRef, useCallback } from 'react'
import { ALLOWED_INTERRUPTIONS } from '../lib/interruptionDetector'
import {
  interruptionClassifier,
  AudioCancellationTargets
} from '../lib/interruptionClassifier'
import { realtimeInterruptionService } from '../services/realtimeInterruptionService'

export interface UseInterruptListenerOptions {
  enabled?: boolean
  isSpeaking?: boolean
  userSpeechTranscript?: string
  onInterrupt?: (phrase: string) => void
  audioElementsToStop?: (HTMLAudioElement | null)[]
  audioContext?: AudioContext | null
  gainNode?: GainNode | null
  dataChannel?: RTCDataChannel | null
}

/**
 * Centralized InterruptListener Hook
 * Monitors incoming voice stream audio transcripts for high-confidence match triggers.
 * Automatically forces Web Audio API AudioContext/GainNode to mute at 0ms latency,
 * dispatches WebRTC data channel response.cancel, pauses HTMLAudioElements,
 * cancels browser speech synthesis, and triggers state resolution.
 */
export function useInterruptListener({
  enabled = true,
  isSpeaking = false,
  userSpeechTranscript = '',
  onInterrupt,
  audioElementsToStop = [],
  audioContext = null,
  gainNode = null,
  dataChannel = null
}: UseInterruptListenerOptions = {}) {
  const lastProcessedTranscriptRef = useRef<string>('')

  // Central trigger function to halt all current speech syntheses and audio elements
  const forceHaltAudioEngine = useCallback(() => {
    console.log('[InterruptListener] Activating audio engine halt: executing InterruptionClassifier cancellation.')

    const targets: AudioCancellationTargets = {
      audioContext,
      gainNode,
      audioElement: audioElementsToStop[0] || null,
      dataChannel
    }

    realtimeInterruptionService.attachTargets({
      audioContext,
      gainNode,
      audioElement: audioElementsToStop[0] || null,
      dataChannel
    })
    realtimeInterruptionService.cancelCurrentResponse()
    interruptionClassifier.cancelPlayback(targets)

    // Halt any remaining audio elements passed as references
    if (audioElementsToStop && audioElementsToStop.length > 0) {
      audioElementsToStop.forEach((audioEl, index) => {
        if (audioEl) {
          try {
            audioEl.pause()
            audioEl.currentTime = 0
            audioEl.muted = true
          } catch (err) {
            console.warn(`[InterruptListener] Failed to stop audio element ${index}:`, err)
          }
        }
      })
    }

    // Find and stop any other active <audio> elements in document as a bulletproof failsafe
    if (typeof document !== 'undefined') {
      try {
        const pageAudios = document.getElementsByTagName('audio')
        for (let i = 0; i < pageAudios.length; i++) {
          const pageAudio = pageAudios[i]
          if (pageAudio && !pageAudio.paused) {
            pageAudio.pause()
            pageAudio.currentTime = 0
            pageAudio.muted = true
          }
        }
      } catch (err) {
        console.debug('[InterruptListener] Failsafe audio pause failed:', err)
      }
    }
  }, [audioElementsToStop, audioContext, gainNode, dataChannel])

  // Evaluates transcript and triggers interruption sequence on high confidence match
  const processIncomingText = useCallback((text: string) => {
    if (!text || !isSpeaking) return null

    // Check with RealtimeInterruptionService first
    const interceptRes = realtimeInterruptionService.evaluateAndIntercept(text, {
      forceSpeakingCheck: true
    })

    if (interceptRes.intercepted) {
      console.log(`[InterruptListener] MATCH CONFIRMED (RealtimeInterruptionService): "${interceptRes.matchedPhrase}" detected. Halting speaking state.`)
      forceHaltAudioEngine()
      if (onInterrupt) {
        onInterrupt(interceptRes.matchedPhrase)
      }
      return interceptRes.matchedPhrase
    }

    const classification = interruptionClassifier.classifySpeech(text, {
      isSpeaking: true
    })

    if (classification.isInterruption && classification.action === 'CANCEL_PLAYBACK') {
      console.log(`[InterruptListener] MATCH CONFIRMED: "${classification.matchedKeyword}" detected. Halting speaking state.`)
      
      // Stop Web Audio GainNode, WebRTC DataChannel, AudioElement, & SpeechSynthesis
      forceHaltAudioEngine()

      if (onInterrupt && classification.matchedKeyword) {
        onInterrupt(classification.matchedKeyword)
      }
      return classification.matchedKeyword
    }

    // Fallback search in ALLOWED_INTERRUPTIONS
    const cleanUser = text
      .toLowerCase()
      .replace(/[^\w\s-']/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    const matchedAllowed = ALLOWED_INTERRUPTIONS.find((phrase) => {
      const escaped = phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, 'i')
      return regex.test(cleanUser)
    })

    if (matchedAllowed) {
      console.log(`[InterruptListener] MATCH CONFIRMED (Vocabulary): "${matchedAllowed}" detected. Halting speaking state.`)
      forceHaltAudioEngine()

      if (onInterrupt) {
        onInterrupt(matchedAllowed)
      }
      return matchedAllowed
    }

    return null
  }, [isSpeaking, forceHaltAudioEngine, onInterrupt])

  // Process voice stream transcription updates automatically
  useEffect(() => {
    if (!enabled || !userSpeechTranscript) return

    const sanitizedTranscript = userSpeechTranscript.trim()
    if (sanitizedTranscript === lastProcessedTranscriptRef.current) return

    processIncomingText(sanitizedTranscript)
    lastProcessedTranscriptRef.current = sanitizedTranscript
  }, [userSpeechTranscript, enabled, processIncomingText])

  return {
    processIncomingText,
    forceHaltAudioEngine
  }
}
