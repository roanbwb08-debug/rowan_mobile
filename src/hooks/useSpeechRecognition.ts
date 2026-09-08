import { useState, useEffect, useRef, useCallback } from 'react'

export type SpeechState = 'idle' | 'listening' | 'error'

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void
  onEnd?: (finalTranscript: string) => void
  onError?: (error: string) => void
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: {
        transcript: string
      }
    }
  }
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

export function useSpeechRecognition(options?: UseSpeechRecognitionOptions) {
  const [supported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition || (navigator.mediaDevices && window.MediaRecorder))
  })

  const [state, setState] = useState<SpeechState>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const nativeRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const isRecordingRef = useRef<boolean>(false)
  const latestTranscriptRef = useRef<string>('')

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Stop recording and cleanup
  const stop = useCallback(() => {
    if (nativeRecognitionRef.current) {
      try {
        nativeRecognitionRef.current.stop()
      } catch {
        // ignore
      }
      nativeRecognitionRef.current = null
    }

    if (mediaRecorderRef.current && isRecordingRef.current) {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.warn('Error stopping media recorder:', e)
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop())
      } catch (e) {
        console.warn('Error stopping media stream tracks:', e)
      }
      streamRef.current = null
    }

    isRecordingRef.current = false
    setState('idle')
  }, [])

  // Verify microphone access utility
  const verifyMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Microphone access is not supported in this browser.'
      setError(msg)
      setState('error')
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      return true
    } catch (err: unknown) {
      console.warn('Speech mic verification error:', err)
      const errName = err instanceof Error ? err.name : String(err)
      
      let friendlyMessage = 'Unable to access your microphone.'
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        friendlyMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.'
      }
      setError(friendlyMessage)
      setState('error')
      return false
    }
  }, [])

  // Start speech recognition
  const start = useCallback(async (params?: { continuous?: boolean; interimResults?: boolean; lang?: string }) => {
    if (typeof window === 'undefined') return false

    // Reset before start
    stop()
    setTranscript('')
    latestTranscriptRef.current = ''
    setError(null)

    const hasAccess = await verifyMicrophoneAccess()
    if (!hasAccess) {
      return false
    }

    // 1. Prefer native browser SpeechRecognition if available (Chrome, Safari, Edge, Android)
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition
    }
    const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass()
        recognition.continuous = params?.continuous ?? false
        recognition.interimResults = params?.interimResults ?? true
        recognition.lang = params?.lang || 'en-US'
        nativeRecognitionRef.current = recognition

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          let interimText = ''
          let finalText = ''

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i]
            if (item.isFinal) {
              finalText += item[0].transcript
            } else {
              interimText += item[0].transcript
            }
          }

          const currentText = (finalText || interimText).trim()
          if (currentText) {
            setTranscript(currentText)
            latestTranscriptRef.current = currentText
            optionsRef.current?.onResult?.(currentText, Boolean(finalText))
          }
        }

        recognition.onerror = (e: BrowserSpeechRecognitionErrorEvent) => {
          if (e.error === 'no-speech') {
            return
          }
          console.warn('[SpeechInput] Native speech recognition error:', e.error)
          if (e.error === 'not-allowed') {
            setError('Microphone permission denied.')
            setState('error')
            optionsRef.current?.onError?.('Microphone permission denied.')
          }
        }

        recognition.onend = () => {
          setState('idle')
          if (latestTranscriptRef.current) {
            optionsRef.current?.onEnd?.(latestTranscriptRef.current)
          }
        }

        recognition.start()
        setState('listening')
        return true
      } catch (err) {
        console.warn('[SpeechInput] Failed to start native SpeechRecognition, falling back to MediaRecorder:', err)
      }
    }

    // 2. Fallback: MediaRecorder + /api/voice/transcribe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav'
      }

      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      isRecordingRef.current = true

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = async () => {
        setState('idle')
        isRecordingRef.current = false

        if (chunksRef.current.length === 0) {
          return
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        if (audioBlob.size < 100) {
          return
        }

        try {
          const reader = new FileReader()
          reader.readAsDataURL(audioBlob)
          reader.onloadend = async () => {
            const base64Audio = reader.result as string

            try {
              const response = await fetch('/api/voice/transcribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  audio: base64Audio,
                  mimeType
                })
              })

              if (!response.ok) {
                const errJson = await response.json().catch(() => ({})) as { message?: string }
                throw new Error(errJson.message || `Whisper transcription failed with status ${response.status}`)
              }

              const data = await response.json() as { success: boolean; text: string }
              if (data.success && data.text) {
                const resultText = data.text.trim()
                setTranscript(resultText)
                latestTranscriptRef.current = resultText
                optionsRef.current?.onResult?.(resultText, true)
                optionsRef.current?.onEnd?.(resultText)
              }
            } catch (innerErr) {
              console.warn('[SpeechInput] Transcription upload notice:', innerErr)
              const errMessage = innerErr instanceof Error ? innerErr.message : 'Transcription unavailable.'
              setError(errMessage)
              optionsRef.current?.onError?.(errMessage)
            }
          }
        } catch (readerErr) {
          console.warn('[SpeechInput] Error reading audio blob:', readerErr)
        }
      }

      recorder.start()
      setState('listening')
      return true
    } catch (err) {
      console.warn('[SpeechInput] Failed to start MediaRecorder:', err)
      setState('error')
      setError(err instanceof Error ? err.message : String(err))
      optionsRef.current?.onError?.(err instanceof Error ? err.message : 'Microphone start failed.')
      return false
    }
  }, [stop, verifyMicrophoneAccess])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    supported,
    state,
    isListening: state === 'listening',
    transcript,
    error,
    start,
    stop,
    setTranscript,
    setError,
    setState,
    verifyMicrophoneAccess
  }
}
