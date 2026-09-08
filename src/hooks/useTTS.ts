import { useState, useEffect, useRef } from 'react'

export interface UseTTSOptions {
  onStart?: (msgId: string) => void
  onEnd?: (msgId: string) => void
  onError?: (msgId: string, error: unknown) => void
}

export interface OpenAIVoice {
  name: string
  id: string
}

const OPENAI_VOICES: OpenAIVoice[] = [
  { name: 'Alloy', id: 'alloy' },
  { name: 'Echo', id: 'echo' },
  { name: 'Fable', id: 'fable' },
  { name: 'Onyx', id: 'onyx' },
  { name: 'Nova', id: 'nova' },
  { name: 'Shimmer', id: 'shimmer' }
]

// Global flag to prevent useless network latency if backend OpenAI TTS is known to be unavailable/exhausted
let isBackendTTSExhausted = false

// Split long text into natural sentences/chunks (< 160 chars) to prevent Chromium 15s freeze bug
function splitTextIntoSentences(text: string): string[] {
  const clean = text
    .replace(/[*_#`~]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s]+/g, 'link')
    .replace(/\s+/g, ' ')
    .trim()

  if (!clean) return []

  const rawMatches = clean.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g)
  if (!rawMatches || rawMatches.length === 0) {
    return [clean]
  }

  const result: string[] = []
  for (const part of rawMatches) {
    const trimmed = part.trim()
    if (!trimmed) continue
    if (trimmed.length > 180) {
      // Split large clauses by comma or semicolon
      const subparts = trimmed.split(/([,;]\s+)/)
      let current = ''
      for (const s of subparts) {
        if ((current + s).length > 180 && current) {
          result.push(current.trim())
          current = s
        } else {
          current += s
        }
      }
      if (current.trim()) {
        result.push(current.trim())
      }
    } else {
      result.push(trimmed)
    }
  }

  return result.length > 0 ? result : [clean]
}

export function useTTS(options?: UseTTSOptions) {
  const [supported] = useState<boolean>(true)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [pausedId, setPausedId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rowan_tts_muted') === 'true'
    }
    return false
  })
  const [voices] = useState<OpenAIVoice[]>(OPENAI_VOICES)
  const [selectedVoice, setSelectedVoice] = useState<OpenAIVoice>(() => {
    try {
      const saved = localStorage.getItem('rowan_preferred_voice_id')
      if (saved) {
        const found = OPENAI_VOICES.find(v => v.id === saved)
        if (found) return found
      }
    } catch {
      // ignore
    }
    return OPENAI_VOICES.find(v => v.id === 'nova') || OPENAI_VOICES[0]
  })
  const [speechWarning, setSpeechWarning] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentMsgIdRef = useRef<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const isStoppingRef = useRef<boolean>(false)
  const sentenceQueueRef = useRef<string[]>([])
  const currentSentenceIdxRef = useRef<number>(0)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Sync muted state
  const handleSetMuted = (muted: boolean) => {
    setIsMuted(muted)
    localStorage.setItem('rowan_tts_muted', String(muted))
    if (muted) {
      stop()
    }
  }

  // Toggle voice selection
  const toggleVoice = () => {
    const currentIndex = voices.findIndex(v => v.id === selectedVoice.id)
    const nextIndex = (currentIndex + 1) % voices.length
    const nextVoice = voices[nextIndex]
    setSelectedVoice(nextVoice)
    try {
      localStorage.setItem('rowan_preferred_voice_id', nextVoice.id)
    } catch {
      // ignore
    }
    
    if (speakingId && currentMsgIdRef.current) {
      stop()
    }
  }

  const stop = () => {
    isStoppingRef.current = true
    sentenceQueueRef.current = []
    currentSentenceIdxRef.current = 0

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }

    // Clean up window reference to prevent dangling listeners
    if (typeof window !== 'undefined') {
      const win = window as unknown as { __activeTTSUtterance?: SpeechSynthesisUtterance | null }
      if (win.__activeTTSUtterance) {
        win.__activeTTSUtterance.onstart = null
        win.__activeTTSUtterance.onend = null
        win.__activeTTSUtterance.onerror = null
        win.__activeTTSUtterance = null
      }
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current.load()
      } catch {
        // ignore
      }
      audioRef.current = null
    }

    if (objectUrlRef.current) {
      try {
        URL.revokeObjectURL(objectUrlRef.current)
      } catch {
        // ignore
      }
      objectUrlRef.current = null
    }

    setSpeakingId(null)
    setLoadingId(null)
    setPausedId(null)
    currentMsgIdRef.current = null
  }

  // Helper to get natural system voices
  const getBestSystemVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
    const synthVoices = window.speechSynthesis.getVoices()
    if (!synthVoices || synthVoices.length === 0) return null

    // Prefer high quality English voices
    return (
      synthVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen') || v.name.includes('Arthur') || v.name.includes('Serena'))) ||
      synthVoices.find(v => v.lang.startsWith('en') && !v.name.includes('deprecated')) ||
      synthVoices.find(v => v.lang.startsWith('en')) ||
      synthVoices[0] ||
      null
    )
  }

  // Robust Browser SpeechSynthesis with sentence queueing & keep-alive
  const speakWithBrowserSynthesis = (cleanText: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechWarning('Speech playback is not supported in this browser environment.')
      setTimeout(() => setSpeechWarning(null), 4000)
      stop()
      optionsRef.current?.onError?.(msgId, new Error('speechSynthesis unsupported'))
      return
    }

    const sentences = splitTextIntoSentences(cleanText)
    if (sentences.length === 0) {
      stop()
      return
    }

    isStoppingRef.current = false
    sentenceQueueRef.current = sentences
    currentSentenceIdxRef.current = 0

    // Ensure audio engine is unpaused
    try {
      window.speechSynthesis.cancel()
      window.speechSynthesis.resume()
    } catch {
      // ignore
    }

    const speakNextSentence = () => {
      if (isStoppingRef.current || currentMsgIdRef.current !== msgId) {
        return
      }

      if (currentSentenceIdxRef.current >= sentenceQueueRef.current.length) {
        // Finished all sentences
        stop()
        optionsRef.current?.onEnd?.(msgId)
        return
      }

      const sentence = sentenceQueueRef.current[currentSentenceIdxRef.current]
      const utterance = new SpeechSynthesisUtterance(sentence)
      
      // Store globally on window to protect from V8 garbage collection mid-sentence
      const win = window as unknown as { __activeTTSUtterance?: SpeechSynthesisUtterance | null }
      win.__activeTTSUtterance = utterance

      const voice = getBestSystemVoice()
      if (voice) {
        utterance.voice = voice
      }

      utterance.rate = 1.05
      utterance.pitch = 1.0

      utterance.onstart = () => {
        if (isStoppingRef.current || currentMsgIdRef.current !== msgId) return
        setSpeakingId(msgId)
        setLoadingId(null)
        setPausedId(null)
        if (currentSentenceIdxRef.current === 0) {
          optionsRef.current?.onStart?.(msgId)
        }
      }

      utterance.onend = () => {
        if (isStoppingRef.current || currentMsgIdRef.current !== msgId) return
        currentSentenceIdxRef.current += 1
        speakNextSentence()
      }

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') {
          // Normal during pause, stop, or navigation
          return
        }
        console.warn('[TTS] Speech synthesis sentence note:', e.error || e)
        if (isStoppingRef.current || currentMsgIdRef.current !== msgId) return
        currentSentenceIdxRef.current += 1
        speakNextSentence()
      }

      try {
        window.speechSynthesis.speak(utterance)
      } catch (speakErr) {
        console.warn('[TTS] window.speechSynthesis.speak failed:', speakErr)
        stop()
        optionsRef.current?.onError?.(msgId, speakErr)
      }
    }

    // Begin speaking the first sentence
    speakNextSentence()
  }

  const speak = async (msgId: string, text: string, voiceOverride?: OpenAIVoice | null) => {
    if (typeof window === 'undefined') return

    // 1. If user clicks an active message that is currently speaking -> Pause it
    if (speakingId === msgId) {
      if (audioRef.current) {
        audioRef.current.pause()
        setPausedId(msgId)
        setSpeakingId(null)
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        setPausedId(msgId)
        setSpeakingId(null)
      }
      return
    }

    // 2. If user clicks a paused message -> Resume it
    if (pausedId === msgId) {
      if (audioRef.current) {
        try {
          await audioRef.current.play()
          setSpeakingId(msgId)
          setPausedId(null)
        } catch {
          stop()
        }
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume()
        setSpeakingId(msgId)
        setPausedId(null)
      }
      return
    }

    // 3. Otherwise, stop any current playback and read the requested message
    stop()

    if (isMuted) {
      handleSetMuted(false)
    }

    const cleanText = text
      .replace(/[*_#`~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()

    if (!cleanText) return

    setLoadingId(msgId)
    currentMsgIdRef.current = msgId
    isStoppingRef.current = false

    // If backend TTS is known to be exhausted/unconfigured, immediately play with browser synthesis
    // This preserves user activation gesture and eliminates network waiting!
    if (isBackendTTSExhausted) {
      speakWithBrowserSynthesis(cleanText, msgId)
      return
    }

    try {
      const voiceToUse = voiceOverride || selectedVoice
      const streamUrl = `/api/voice/speech?text=${encodeURIComponent(cleanText)}&voice=${voiceToUse.id}`

      if (currentMsgIdRef.current !== msgId || isStoppingRef.current) {
        return
      }

      const audio = new Audio(streamUrl)
      audioRef.current = audio

      audio.onplay = () => {
        setSpeakingId(msgId)
        setLoadingId(null)
        setPausedId(null)
        optionsRef.current?.onStart?.(msgId)
      }

      audio.onended = () => {
        stop()
        optionsRef.current?.onEnd?.(msgId)
      }

      audio.onerror = (e) => {
        console.warn('[TTS] Audio streaming element error, falling back to browser synthesis:', e)
        isBackendTTSExhausted = true
        audioRef.current = null
        speakWithBrowserSynthesis(cleanText, msgId)
      }

      await audio.play()
    } catch (err) {
      console.warn('[TTS] Error playing streamed audio, falling back to browser synthesis:', err)
      isBackendTTSExhausted = true
      speakWithBrowserSynthesis(cleanText, msgId)
    }
  }

  // Preload browser voices on mount and keep updated
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices()
      }
      window.speechSynthesis.addEventListener?.('voiceschanged', handleVoicesChanged)
      return () => {
        window.speechSynthesis.removeEventListener?.('voiceschanged', handleVoicesChanged)
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [])

  return {
    supported,
    speakingId,
    loadingId,
    pausedId,
    isMuted,
    setIsMuted: handleSetMuted,
    voices,
    selectedVoice,
    toggleVoice,
    speak,
    stop,
    speechWarning,
    setSpeechWarning
  }
}
