import { useState, useEffect, useRef, useCallback } from 'react'
import { evaluateInterruption } from '../lib/interruptionDetector'
import {
  InterruptionClassifier,
  interruptionClassifier
} from '../lib/interruptionClassifier'
import {
  RealtimeInterruptionService,
  realtimeInterruptionService
} from '../services/realtimeInterruptionService'
import { matchInterruptionWhitelist } from '../lib/interruptionVocabulary'

export type RealtimeVoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'no_response'
  | 'answer'
  | 'error'

export interface VoiceDiagnostic {
  timestamp: string
  event: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export interface VoiceResearchSource {
  title: string
  url: string
  snippet?: string
}

export interface VoiceResearchResult {
  query: string
  summary: string
  sources: VoiceResearchSource[]
  provider: string
  openedWebsite?: string | null
}

export interface OpenedWebsiteEvent {
  url: string
  title?: string
  source?: string
  timestamp: string
}

interface UseRealtimeVoiceOptions {
  onTranscript?: (text: string, isUser: boolean) => void
  onError?: (error: string) => void
  onStateChange?: (state: RealtimeVoiceState) => void
  onResearchStart?: (query: string) => void
  onResearchResults?: (result: VoiceResearchResult) => void
  onWebsiteOpened?: ((url: string, label?: string) => void) | ((event: OpenedWebsiteEvent) => void)
  onSearchComplete?: (sources: VoiceResearchSource[], query: string) => void
  onCaptureFrame?: () => string | null
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

function cleanString(str: string): string {
  return str.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"]/g, "").replace(/\s+/g, " ").trim();
}

function checkAssistantEcho(userText: string, assistantText: string): { isEcho: boolean; similarity: number; reason: string } {
  const cleanUser = cleanString(userText);
  const cleanAssistant = cleanString(assistantText);

  if (!cleanUser || !cleanAssistant) {
    return { isEcho: false, similarity: 0, reason: "Empty text" };
  }

  const userWords = cleanUser.split(" ");
  const assistantWords = cleanAssistant.split(" ");

  if (userWords.length === 0 || assistantWords.length === 0) {
    return { isEcho: false, similarity: 0, reason: "No words" };
  }

  const wakeWords = ['rowan', 'rowen', 'roman', 'rowin', 'rowon'];
  const stopWords = ['stop', 'cancel', 'no', 'wait', 'hold on', 'wrong', 'actually', 'shut up', 'shh'];
  
  const hasWakeWord = userWords.some(w => wakeWords.includes(w));
  const hasStopWord = userWords.some(w => stopWords.includes(w)) || 
                     cleanUser.includes('hold on') || 
                     cleanUser.includes('shut up');

  // If user says something extremely short (1-2 characters total) like a noise artifact
  if (cleanUser.length <= 2) {
    return { isEcho: true, similarity: 1.0, reason: "Extremely short noise fragment" };
  }

  // 1. Direct Substring Match
  // If the user's spoken phrase is exactly contained in Rowan's speech, and it doesn't contain a wake or stop word
  if (cleanAssistant.includes(cleanUser)) {
    if (!hasWakeWord && !hasStopWord) {
      return { isEcho: true, similarity: 1.0, reason: `Exact substring match: "${cleanUser}"` };
    }
  }

  // 2. Sequential Word Sequence Match (even for 2+ words)
  // Check if any 2-word or 3-word sub-sequence of the user's speech is inside the assistant's speech
  if (userWords.length >= 2) {
    const windowSize = Math.min(userWords.length, 3);
    for (let i = 0; i <= userWords.length - windowSize; i++) {
      const subSeq = userWords.slice(i, i + windowSize).join(" ");
      // Check if this subsegment exists in the assistant's clean text
      if (cleanAssistant.includes(subSeq)) {
        // If it doesn't contain wake or stop words, it's very likely an echo of this sequence!
        const subSeqHasStop = stopWords.some(w => subSeq.includes(w));
        const subSeqHasWake = wakeWords.some(w => subSeq.includes(w));
        if (!subSeqHasStop && !subSeqHasWake) {
          return { isEcho: true, similarity: windowSize / userWords.length, reason: `Sequential echo of "${subSeq}"` };
        }
      }
    }
  }

  // 3. Word Overlap Ratio
  // Count how many of the user's words are in the assistant's words
  let matchCount = 0;
  const assistantWordMap = new Map<string, number>();
  for (const word of assistantWords) {
    assistantWordMap.set(word, (assistantWordMap.get(word) || 0) + 1);
  }

  for (const word of userWords) {
    if (assistantWordMap.has(word) && assistantWordMap.get(word)! > 0) {
      matchCount++;
      assistantWordMap.set(word, assistantWordMap.get(word)! - 1);
    }
  }

  const wordOverlapRatio = matchCount / userWords.length;

  // If 50% or more of the user words are present in the assistant's spoken text,
  // and the phrase is short or doesn't have stop words, it is an echo.
  if (wordOverlapRatio >= 0.50 && !hasWakeWord && !hasStopWord) {
    return { isEcho: true, similarity: wordOverlapRatio, reason: `High word overlap (${Math.round(wordOverlapRatio * 100)}%) with no wake/stop words` };
  }

  return { isEcho: false, similarity: wordOverlapRatio, reason: "Low similarity" };
}

function verifyAudioTrackSettings(stream: MediaStream, addDiagnostic: (event: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void) {
  try {
    const tracks = stream.getAudioTracks()
    if (tracks.length === 0) {
      addDiagnostic('Audio Hardware', 'No audio tracks found in local stream', 'error')
      return
    }
    const track = tracks[0]
    const settings = track.getSettings()
    const constraints = track.getConstraints()
    
    console.log('[RealtimeVoice] Audio Track Constraints:', constraints)
    console.log('[RealtimeVoice] Audio Track Settings:', settings)
    
    const ec = settings.echoCancellation ? 'Enabled' : 'Not Supported/Disabled'
    const ns = settings.noiseSuppression ? 'Enabled' : 'Not Supported/Disabled'
    const agc = settings.autoGainControl ? 'Enabled' : 'Not Supported/Disabled'
    
    addDiagnostic(
      'Audio Hardware',
      `Mic initialized | Echo Cancellation: ${ec} | Noise Suppression: ${ns} | Auto Gain: ${agc} | Sample Rate: ${settings.sampleRate ?? 'default'}Hz | Latency: ${settings.latency ? (settings.latency * 1000).toFixed(1) + 'ms' : 'default'}`,
      'success'
    )
  } catch (err) {
    console.warn('[RealtimeVoice] Failed to verify audio track settings:', err)
  }
}

export function useRealtimeVoice(options?: UseRealtimeVoiceOptions) {
  const [state, setState] = useState<RealtimeVoiceState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string>('')
  const [activeResearch, setActiveResearch] = useState<VoiceResearchResult | null>(null)
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null)
  const [openedWebsites, setOpenedWebsites] = useState<OpenedWebsiteEvent[]>([])
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(false)

  // Conversation priority & diagnostics
  const [activeConversation, setActiveConversation] = useState<boolean>(false)
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostic[]>([])
  
  const activeConversationRef = useRef<boolean>(false)
  const conversationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const interruptionClassifierRef = useRef<InterruptionClassifier>(interruptionClassifier)
  const realtimeInterruptionServiceRef = useRef<RealtimeInterruptionService>(realtimeInterruptionService)
  const liveMonitorRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const processedCallIdsRef = useRef<Set<string>>(new Set())

  // Fallback voice mode references
  const fallbackRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const fallbackUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isFallbackActiveRef = useRef<boolean>(false)
  const isSpeakingFallbackRef = useRef<boolean>(false)
  const fallbackSessionIdRef = useRef<string>('')
  const stateRef = useRef<RealtimeVoiceState>('idle')
  const accumulatedTranscriptRef = useRef<string>('')
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingQueryRef = useRef<boolean>(false)
  const wasInterruptedRef = useRef<boolean>(false)
  
  const isDuckedRef = useRef<boolean>(false)
  const isPendingInterruptionCheckRef = useRef<boolean>(false)
  const duckedTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const currentSpokenAssistantTextRef = useRef<string>('')

  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Diagnostic logger helper
  const addDiagnostic = useCallback((event: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newDiag: VoiceDiagnostic = {
      timestamp: new Date().toLocaleTimeString(),
      event,
      message,
      type
    }
    setDiagnostics(prev => [newDiag, ...prev.slice(0, 49)])
    console.log(`[Voice Diagnostic] [${event}] ${message}`)
  }, [])

  // Periodic visual context injection for WebRTC Realtime mode
  useEffect(() => {
    if (state !== 'listening' && state !== 'thinking') return

    const intervalId = setInterval(() => {
      if (
        !isFallbackActiveRef.current &&
        dataChannelRef.current?.readyState === 'open' &&
        optionsRef.current?.onCaptureFrame
      ) {
        try {
          const rawFrame = optionsRef.current.onCaptureFrame()
          if (rawFrame) {
            // Remove data scheme prefix (e.g., "data:image/jpeg;base64,")
            const cleanBase64 = rawFrame.replace(/^data:image\/[a-z]+;base64,/, '')
            
            console.log('[RealtimeVoice] Injecting latest screen/camera frame into active OpenAI Realtime memory...')
            dataChannelRef.current.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [
                  {
                    type: 'input_image',
                    image: cleanBase64
                  }
                ]
              }
            }))
            addDiagnostic('Vision Sync', 'Injected latest visual frame into active OpenAI Realtime session history.', 'success')
          }
        } catch (err) {
          console.warn('[RealtimeVoice] Periodic vision capture failed:', err)
        }
      }
    }, 12000)

    return () => clearInterval(intervalId)
  }, [state, addDiagnostic])

  // Dynamic VAD update helper
  const updateVadThreshold = useCallback((threshold: number) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        addDiagnostic('VAD Parameter Update', `Updating VAD threshold to ${threshold}`, 'info')
        const update = {
          type: 'session.update',
          session: {
            audio: {
              input: {
                turn_detection: {
                  type: 'server_vad',
                  threshold: threshold,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500
                }
              }
            }
          }
        }
        dataChannelRef.current.send(JSON.stringify(update))
      } catch (err) {
        console.warn('[Conversation Priority] Failed to update dynamic VAD threshold:', err)
      }
    }
  }, [addDiagnostic])

  // Active Conversation Lock helpers
  const refreshConversationLock = useCallback(() => {
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current)
    }
    
    if (!activeConversationRef.current) {
      addDiagnostic('Conversation Lock', 'Priority lock ACTIVATED. Quick turn-taking mode enabled.', 'success')
      activeConversationRef.current = true
      setActiveConversation(true)
    }

    conversationTimeoutRef.current = setTimeout(() => {
      addDiagnostic('Conversation Lock', 'Priority lock EXPIRED (15s of silence). Returning to passive listening.', 'warning')
      activeConversationRef.current = false
      setActiveConversation(false)
      // Automatically adjust VAD threshold to be slightly less trigger-happy in passive mode
      updateVadThreshold(0.65)
    }, 15000)
  }, [addDiagnostic, updateVadThreshold])

  // Evaluates whether a voice transmission was an intentional user action
  const evaluateVoiceIntent = useCallback((text: string, wasSpeakingWhenInterrupted: boolean): { 
    isIntentional: boolean; 
    reason: string; 
    confidence: number;
    category?: string;
  } => {
    const assistantText = currentSpokenAssistantTextRef.current || ''
    const result = evaluateInterruption(
      text, 
      assistantText, 
      wasSpeakingWhenInterrupted, 
      activeConversationRef.current,
      'en' // locale
    )
    return {
      isIntentional: result.isIntentional,
      reason: result.reason,
      confidence: result.confidence,
      category: result.category
    }
  }, [])

  const changeState = useCallback((newState: RealtimeVoiceState) => {
    stateRef.current = newState
    setState(newState)
    optionsRef.current?.onStateChange?.(newState)

    // Notify interruption classifier and realtime interruption service of speaking state change
    const isSpeakingNow = newState === 'speaking'
    interruptionClassifierRef.current.setSpeakingState(isSpeakingNow)
    realtimeInterruptionServiceRef.current.setSpeakingState(isSpeakingNow)

    // Play/resume remote audio track automatically on entering speaking state
    if (newState === 'speaking') {
      // Resume and unmute Web Audio API GainNode if attached
      if (audioContextRef.current && gainNodeRef.current) {
        try {
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(() => {})
          }
          gainNodeRef.current.gain.cancelScheduledValues(audioContextRef.current.currentTime)
          gainNodeRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime)
        } catch (ctxErr) {
          console.debug('[RealtimeVoice] AudioContext resume error:', ctxErr)
        }
      }

      if (audioElRef.current) {
        try {
          audioElRef.current.muted = false
          audioElRef.current.volume = 1.0
          audioElRef.current.play().catch(playErr => {
            console.warn('[RealtimeVoice] Failed to play remote audio track:', playErr)
          })
        } catch (e) {
          console.debug('[RealtimeVoice] play catch block:', e)
        }
      }
    }

    // Dynamic VAD adjustments on state changes to combat background noise
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      try {
        let threshold = 0.5
        if (newState === 'speaking') {
          threshold = 0.92 // High resistance to avoid interruption by Rowan's own voice/echo
        } else if (newState === 'listening') {
          threshold = activeConversationRef.current ? 0.5 : 0.65 // Responsive vs noise-resistant
        } else if (newState === 'thinking' || newState === 'connecting') {
          threshold = 0.8 // Standard high threshold when processing
        }
        
        const update = {
          type: 'session.update',
          session: {
            audio: {
              input: {
                turn_detection: {
                  type: 'server_vad',
                  threshold: threshold,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500
                }
              }
            }
          }
        }
        dataChannelRef.current.send(JSON.stringify(update))
      } catch {
        // ignore
      }
    }
  }, [])

  // Safely stop and cleanup the session (both WebRTC and Fallback)
  const stop = useCallback(() => {
    console.log('[RealtimeVoice] Stopping session and cleaning up...')
    
    // 0. Cancel any active response and detach targets in RealtimeInterruptionService
    realtimeInterruptionServiceRef.current.cancelCurrentResponse()
    realtimeInterruptionServiceRef.current.attachTargets({
      audioContext: null,
      gainNode: null,
      audioElement: null,
      dataChannel: null
    })

    // 1. Cleanup Fallback Web Speech & Synthesis
    isFallbackActiveRef.current = false
    isSpeakingFallbackRef.current = false
    setIsFallbackMode(false)
    isProcessingQueryRef.current = false
    accumulatedTranscriptRef.current = ''

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    if (fallbackRecognitionRef.current) {
      try {
        fallbackRecognitionRef.current.abort()
      } catch {
        // ignore
      }
      fallbackRecognitionRef.current = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }

    if (fallbackUtteranceRef.current) {
      fallbackUtteranceRef.current.onstart = null
      fallbackUtteranceRef.current.onend = null
      fallbackUtteranceRef.current.onerror = null
      fallbackUtteranceRef.current = null
    }

    // 2. Cleanup WebRTC Data Channel
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close()
      } catch {
        // ignore
      }
      dataChannelRef.current = null
    }

    // 3. Cleanup Peer Connection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close()
      } catch {
        // ignore
      }
      peerConnectionRef.current = null
    }

    // 4. Stop Microphone tracks
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      } catch {
        // ignore
      }
      localStreamRef.current = null
    }

    // 5. Cleanup Audio Element and Web Audio Context
    if (audioElRef.current) {
      try {
        audioElRef.current.pause()
        audioElRef.current.srcObject = null
        audioElRef.current.remove()
      } catch {
        // ignore
      }
      audioElRef.current = null
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {})
      } catch (ctxErr) {
        console.debug(ctxErr)
      }
      audioContextRef.current = null
      gainNodeRef.current = null
    }

    if (liveMonitorRecognitionRef.current) {
      try {
        liveMonitorRecognitionRef.current.stop()
      } catch {
        // ignore
      }
      liveMonitorRecognitionRef.current = null
    }

    // 6. Cleanup active conversation priorities
    if (conversationTimeoutRef.current) {
      clearTimeout(conversationTimeoutRef.current)
      conversationTimeoutRef.current = null
    }
    activeConversationRef.current = false
    setActiveConversation(false)
    setDiagnostics([])

    processedCallIdsRef.current.clear()
    setIsSearching(false)
    changeState('idle')
  }, [changeState])

  const clearResearch = useCallback(() => {
    setActiveResearch(null)
    setActiveSearchQuery(null)
    setIsSearching(false)
  }, [])

  const openWebsite = useCallback((url: string, titleOrLabel?: string) => {
    let targetUrl = url.trim()
    if (targetUrl && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`
    }
    if (!targetUrl) return
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.warn('[RealtimeVoice] Failed to open URL via window.open:', err)
    }
    const openEvent: OpenedWebsiteEvent = {
      url: targetUrl,
      title: titleOrLabel || targetUrl,
      source: 'Voice Action',
      timestamp: new Date().toISOString()
    }
    setOpenedWebsites(prev => [openEvent, ...prev.slice(0, 9)])
    
    // Call callback safely handling both single and dual argument styles
    if (optionsRef.current?.onWebsiteOpened) {
      try {
        (optionsRef.current.onWebsiteOpened as (url: string, label?: string) => void)(targetUrl, titleOrLabel)
      } catch {
        try {
          (optionsRef.current.onWebsiteOpened as (event: OpenedWebsiteEvent) => void)(openEvent)
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Process a recognized spoken query in Fallback mode using Gemini & Tavily via /api/chat
  const processFallbackUserQuery = useCallback(async (spokenQuery: string) => {
    if (!spokenQuery || !spokenQuery.trim()) return

    const query = spokenQuery.trim()
    console.log(`[RealtimeVoice Fallback] User said: "${query}"`)

    // If user issued a stop/wait command from the 100-word whitelist, stop and wait for them to finish talking!
    const whitelistCheck = matchInterruptionWhitelist(query)
    if (whitelistCheck.matched) {
      console.log(`[RealtimeVoice Fallback] User issued stop/wait command: "${whitelistCheck.match}". Rowan stops and listens.`)
      addDiagnostic('WAITING_FOR_USER', `Rowan stopped and is quietly listening for you to finish talking.`, 'success')
      isProcessingQueryRef.current = false
      setTranscript('')
      changeState('listening')
      return
    }

    // Assess if this query was intentional or just background chatter
    const intent = evaluateVoiceIntent(query, false)
    if (!intent.isIntentional) {
      addDiagnostic('Noise Filtered', `Filtered background speech: "${query}" (Reason: ${intent.reason})`, 'info')
      isProcessingQueryRef.current = false
      setTranscript('')
      changeState('no_response')
      setTimeout(() => {
        if (stateRef.current === 'no_response') {
          changeState('listening')
        }
      }, 2000)
      return
    }

    // Valid query - refresh conversation lock
    refreshConversationLock()

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    accumulatedTranscriptRef.current = ''
    isProcessingQueryRef.current = true

    changeState('thinking')
    setTranscript(query)
    optionsRef.current?.onTranscript?.(query, true)

    try {
      const capturedFrame = optionsRef.current?.onCaptureFrame?.() || undefined

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          sessionId: fallbackSessionIdRef.current,
          screenFrame: capturedFrame,
          additionalInstructions: 'You are Rowan in Interactive Live Voice mode. Reply conversationally, warmly, and concisely in 1 to 3 spoken sentences. If web research was performed, explicitly mention the key fact. If a screen frame is provided, describe or comment on what you see on the user\'s screen or camera feed!'
        })
      })

      const data = await res.json() as {
        success?: boolean
        message?: string
        text?: string
        research?: {
          query?: string
          sources?: VoiceResearchSource[]
        }
      }

      if (!res.ok) {
        throw new Error(data.message || `Chat service response error ${res.status}`)
      }

      const replyText = (data.message || data.text || 'I have processed your request.').trim()

      // Handle Tavily research sources if attached
      if (data.research?.sources && data.research.sources.length > 0) {
        const sources = data.research.sources
        const researchQuery = data.research.query || query
        optionsRef.current?.onSearchComplete?.(sources, researchQuery)
        const researchResult: VoiceResearchResult = {
          query: researchQuery,
          summary: replyText,
          sources,
          provider: 'Tavily Search API'
        }
        setActiveResearch(researchResult)
        optionsRef.current?.onResearchResults?.(researchResult)
      }

      // Check if the user asked to open a website or if a URL was provided
      const urlMatch = query.match(/(?:open|visit|go to|launch)\s+(?:https?:\/\/)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i)
      if (urlMatch && urlMatch[1]) {
        openWebsite(urlMatch[1], urlMatch[1])
      }

      setTranscript(replyText)
      optionsRef.current?.onTranscript?.(replyText, false)

      // Clean markdown tags for spoken audio
      const cleanSpeech = replyText
        .replace(/[*_#`~]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/[^\s]+/g, 'website')
        .trim()

      isProcessingQueryRef.current = false

      // Speak reply using OpenAI server-side TTS (high-quality & reliable) with local browser speech synthesis as a fallback
      if (cleanSpeech) {
        changeState('speaking')
        isSpeakingFallbackRef.current = true
        currentSpokenAssistantTextRef.current = cleanSpeech

        const runLocalBrowserSynthesis = () => {
          if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            changeState('listening')
            if (fallbackRecognitionRef.current) {
              try {
                fallbackRecognitionRef.current.start()
              } catch {
                // ignore
              }
            }
            return
          }

          try {
            window.speechSynthesis.cancel()
            window.speechSynthesis.resume()
          } catch {
            // ignore
          }

          const utterance = new SpeechSynthesisUtterance(cleanSpeech)
          fallbackUtteranceRef.current = utterance

          // Keep global window ref to prevent V8 garbage collection mid-speech
          const win = window as unknown as { __activeVoiceUtterance?: SpeechSynthesisUtterance | null }
          win.__activeVoiceUtterance = utterance

          const availableVoices = window.speechSynthesis.getVoices()
          if (availableVoices && availableVoices.length > 0) {
            const preferredVoice = availableVoices.find(v => 
              v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))
            ) || availableVoices.find(v => v.lang.startsWith('en'))
            if (preferredVoice) {
              utterance.voice = preferredVoice
            }
          }

          utterance.rate = 1.05
          utterance.pitch = 1.0

          utterance.onend = () => {
            fallbackUtteranceRef.current = null
            isSpeakingFallbackRef.current = false
            if (isFallbackActiveRef.current) {
              changeState('listening')
              setTranscript('')
              if (fallbackRecognitionRef.current) {
                try {
                  fallbackRecognitionRef.current.start()
                } catch {
                  // already running
                }
              }
            }
          }

          utterance.onerror = (e) => {
            fallbackUtteranceRef.current = null
            isSpeakingFallbackRef.current = false
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
              console.warn('[RealtimeVoice Fallback] Speech synthesis utterance note:', e.error || e)
            }
            if (isFallbackActiveRef.current) {
              changeState('listening')
              if (fallbackRecognitionRef.current) {
                try {
                  fallbackRecognitionRef.current.start()
                } catch {
                  // already running
                }
              }
            }
          }

          try {
            window.speechSynthesis.speak(utterance)
          } catch (speakErr) {
            console.warn('[RealtimeVoice Fallback] Failed to start speech synthesis:', speakErr)
            isSpeakingFallbackRef.current = false
            changeState('listening')
          }
        }

        // Try high-quality Server-Side OpenAI TTS first!
        const fetchAndPlayServerTTS = async () => {
          try {
            const preferredVoice = (typeof window !== 'undefined' && window.localStorage)
              ? (window.localStorage.getItem('rowan_preferred_voice_id') || 'nova')
              : 'nova'

            const response = await fetch('/api/voice/speech', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                text: cleanSpeech,
                voice: preferredVoice
              })
            })

            const contentType = response.headers.get('content-type') || ''
            if (!response.ok || contentType.includes('application/json')) {
              console.warn('[RealtimeVoice Fallback] Server TTS unavailable or quota exhausted. Falling back to local browser speech synthesis.')
              runLocalBrowserSynthesis()
              return
            }

            const blob = await response.blob()
            if (!blob || blob.size < 64) {
              runLocalBrowserSynthesis()
              return
            }

            // Cleanup any previous HTML audio element
            if (audioElRef.current) {
              try {
                audioElRef.current.pause()
                audioElRef.current.remove()
              } catch {
                // ignore
              }
              audioElRef.current = null
            }

            const url = URL.createObjectURL(blob)
            const audioEl = document.createElement('audio')
            audioEl.autoplay = true
            audioElRef.current = audioEl
            document.body.appendChild(audioEl)

            audioEl.src = url

            audioEl.onplay = () => {
              addDiagnostic('SPEECH_PLAYING', 'Playing high-quality server-side speech synthesis audio stream.', 'success')
            }

            audioEl.onended = () => {
              try { URL.revokeObjectURL(url) } catch { /* ignore */ }
              if (audioElRef.current === audioEl) {
                audioElRef.current = null
              }
              try { audioEl.remove() } catch { /* ignore */ }

              isSpeakingFallbackRef.current = false
              if (isFallbackActiveRef.current) {
                changeState('listening')
                setTranscript('')
                if (fallbackRecognitionRef.current) {
                  try {
                    fallbackRecognitionRef.current.start()
                  } catch {
                    // already running
                  }
                }
              }
            }

            audioEl.onerror = () => {
              try { URL.revokeObjectURL(url) } catch { /* ignore */ }
              if (audioElRef.current === audioEl) {
                audioElRef.current = null
              }
              try { audioEl.remove() } catch { /* ignore */ }

              console.warn('[RealtimeVoice Fallback] Audio element play error, falling back to local browser speech synthesis.')
              runLocalBrowserSynthesis()
            }

            await audioEl.play()
          } catch (err) {
            console.warn('[RealtimeVoice Fallback] Fetching server TTS failed:', err)
            runLocalBrowserSynthesis()
          }
        }

        fetchAndPlayServerTTS()
      } else {
        changeState('listening')
        if (fallbackRecognitionRef.current) {
          try {
            fallbackRecognitionRef.current.start()
          } catch {
            // ignore
          }
        }
      }
    } catch (chatErr) {
      console.warn('[RealtimeVoice Fallback] Chat processing error:', chatErr)
      isProcessingQueryRef.current = false
      changeState('listening')
      if (fallbackRecognitionRef.current) {
        try {
          fallbackRecognitionRef.current.start()
        } catch {
          // ignore
        }
      }
    }
  }, [changeState, openWebsite, evaluateVoiceIntent, addDiagnostic, refreshConversationLock])

  // Start Interactive Web Speech & Gemini fallback mode
  const startFallbackVoiceMode = useCallback(async (): Promise<boolean> => {
    console.log('[RealtimeVoice] Activating Rowan Interactive Web Voice & Speech Mode...')
    
    // Cleanup active WebRTC components first to prevent resource conflicts/leaks
    if (dataChannelRef.current) {
      try { dataChannelRef.current.close() } catch (err) { console.debug(err) }
      dataChannelRef.current = null
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close() } catch (err) { console.debug(err) }
      peerConnectionRef.current = null
    }
    if (audioElRef.current) {
      try {
        audioElRef.current.pause()
        audioElRef.current.srcObject = null
        audioElRef.current.remove()
      } catch (err) {
        console.debug(err)
      }
      audioElRef.current = null
    }

    isFallbackActiveRef.current = true
    setIsFallbackMode(true)
    setError(null)
    fallbackSessionIdRef.current = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    changeState('listening')

    if (typeof window === 'undefined') return false

    // Request microphone permission with high quality echo/noise settings
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        localStreamRef.current = stream
        verifyAudioTrackSettings(stream, addDiagnostic)
      }
    } catch (micErr: unknown) {
      const errName = micErr instanceof Error ? micErr.name : String(micErr)
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        const msg = 'Microphone permission denied. Please allow microphone access.'
        setError(msg)
        changeState('error')
        optionsRef.current?.onError?.(msg)
        return false
      }
    }

    // Check for native browser SpeechRecognition
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition
    }
    const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        fallbackRecognitionRef.current = recognition

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          if (!isFallbackActiveRef.current) return

          let interimChunk = ''
          let finalChunk = ''

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i]
            if (item.isFinal) {
              finalChunk += item[0].transcript
            } else {
              interimChunk += item[0].transcript
            }
          }

          const currentSpoken = ((accumulatedTranscriptRef.current + ' ' + finalChunk).trim() + ' ' + interimChunk).trim()

          // 1. BARGE-IN INTERRUPTION WITH CONFIDENCE EVALUATION:
          // If Rowan is currently speaking or thinking and the user speaks, evaluate if it is a confident intentional interruption
          if (isSpeakingFallbackRef.current || (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking)) {
            if (currentSpoken.length > 2) {
              // Check for assistant echo first!
              const assistantText = currentSpokenAssistantTextRef.current || ''
              const echoCheck = checkAssistantEcho(currentSpoken, assistantText)
              
              if (echoCheck.isEcho) {
                console.log(`[RealtimeVoice Fallback] VAD: speech detected | Assistant speaking: true | Transcript: "${currentSpoken}" | Classification: ASSISTANT_ECHO | Action: IGNORE | Reason: ${echoCheck.reason}`)
                addDiagnostic('ASSISTANT_ECHO', `Filtered out assistant voice reflection: "${currentSpoken}" | Reason: ${echoCheck.reason}`, 'warning')
                return // Ignore this result completely!
              }

              const intent = evaluateVoiceIntent(currentSpoken, true)
              const shouldInterrupt = intent.isIntentional

              if (shouldInterrupt) {
                console.log('[ROWAN VOICE] INTERRUPTION_DETECTED')
                console.log(`[ROWAN VOICE] INTERRUPTION_CONFIDENCE: ${intent.confidence.toFixed(2)} | Category: ${intent.category || 'IMMEDIATE_INTERRUPTION'}`)
                console.log(`[RealtimeVoice Fallback] VAD: speech detected | Assistant speaking: true | Transcript: "${currentSpoken}" | Classification: USER_INTERRUPTION | Action: INTERRUPT | Reason: ${intent.reason}`)
                addDiagnostic('TRANSCRIPT_DETECTED', `Raw user speech input: "${currentSpoken}"`, 'info')
                addDiagnostic('USER_SPEECH', `Verified intentional speech barge-in: "${currentSpoken}" | Reason: ${intent.reason}`, 'success')
                const lowerSpoken = currentSpoken.toLowerCase()
                if (lowerSpoken.includes('rowan') || lowerSpoken.includes('rowen') || lowerSpoken.includes('roman')) {
                  addDiagnostic('DIRECT_ADDRESS', `Matched direct address prefix/suffix in fallback mode.`, 'success')
                }
                addDiagnostic('INTERRUPTION_CONFIRMED', `Confirmed intentional interruption (score ${intent.confidence} >= 0.75). Stopping playback immediately.`, 'success')
                
                // Immediately cancel audio playback across Web Audio API GainNode, HTMLAudioElement, and SpeechSynthesis
                interruptionClassifierRef.current.cancelPlayback({
                  audioContext: audioContextRef.current,
                  gainNode: gainNodeRef.current,
                  audioElement: audioElRef.current
                })

                if (fallbackUtteranceRef.current) {
                  fallbackUtteranceRef.current.onstart = null
                  fallbackUtteranceRef.current.onend = null
                  fallbackUtteranceRef.current.onerror = null
                  fallbackUtteranceRef.current = null
                }
                isSpeakingFallbackRef.current = false
                currentSpokenAssistantTextRef.current = ''
                changeState('interrupted')
              } else {
                console.log(`[RealtimeVoice Fallback] VAD: speech detected | Assistant speaking: true | Transcript: "${currentSpoken}" | Classification: BACKGROUND_SPEECH/ENVIRONMENTAL_NOISE | Action: IGNORE | Reason: ${intent.reason}`)
                addDiagnostic('BACKGROUND_SPEECH', `Identified background noise or conversational snippet: "${currentSpoken}" | Reason: ${intent.reason}`, 'warning')
                 addDiagnostic('INTERRUPTION_REJECTED', `Utterance did not meet threshold (score ${intent.confidence} < 0.75).`, 'warning')
                 addDiagnostic('ROWAN_CONTINUING', `Keeping Rowan speech active. Continuing synthesis.`, 'success')
                return // Ignore this result as it is background speech or noise
              }
            }
          }

          if (finalChunk) {
            accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + finalChunk).trim()
          }

          // Live transcript displayed immediately even if user hasn't finished what they are saying!
          if (currentSpoken) {
            setTranscript(currentSpoken)
            optionsRef.current?.onTranscript?.(currentSpoken, false)
            if (stateRef.current !== 'thinking' && stateRef.current !== 'interrupted') {
              changeState('listening')
            }
          }

          // Reset silence debounce timer:
          // User is actively speaking. Give the user ample time to finish their complete sentence (1300ms pause)
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          // Only schedule query processing if there's actual speech and we're not currently querying
          if (currentSpoken.length > 1 && !isProcessingQueryRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              const fullQuery = (accumulatedTranscriptRef.current + ' ' + interimChunk).trim()
              if (fullQuery.length > 1 && !isProcessingQueryRef.current) {
                accumulatedTranscriptRef.current = ''
                processFallbackUserQuery(fullQuery)
              }
            }, 1300)
          }
        }

        recognition.onerror = (e: BrowserSpeechRecognitionErrorEvent) => {
          if (e.error === 'no-speech') {
            return
          }
          console.warn('[RealtimeVoice Fallback] Speech recognition error event:', e.error)
          if (e.error === 'not-allowed') {
            setError('Microphone permission denied.')
            changeState('error')
          }
        }

        recognition.onend = () => {
          // Keep listening continuously so Rowan is ALWAYS listening when the user speaks!
          if (isFallbackActiveRef.current && stateRef.current !== 'thinking' && !isProcessingQueryRef.current) {
            setTimeout(() => {
              if (isFallbackActiveRef.current && fallbackRecognitionRef.current) {
                try {
                  fallbackRecognitionRef.current.start()
                } catch {
                  // already started
                }
              }
            }, 150)
          }
        }

        recognition.start()
        return true
      } catch (err) {
        console.warn('[RealtimeVoice Fallback] Native SpeechRecognition start failed:', err)
      }
    }

    // MediaRecorder Fallback when native SpeechRecognition API is unavailable
    if (localStreamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = localStreamRef.current
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/wav'

        let audioChunks: Blob[] = []
        const mediaRecorder = new MediaRecorder(stream, { mimeType })

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunks.push(e.data)
          }
        }

        mediaRecorder.onstop = async () => {
          if (!isFallbackActiveRef.current || audioChunks.length === 0) return
          const audioBlob = new Blob(audioChunks, { type: mimeType })
          audioChunks = []

          if (audioBlob.size < 500) return // Skip tiny empty audio

          try {
            const reader = new FileReader()
            reader.readAsDataURL(audioBlob)
            reader.onloadend = async () => {
              const base64Audio = reader.result as string
              if (!base64Audio) return

              changeState('thinking')
              const res = await fetch('/api/voice/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64Audio, mimeType })
              })
              const data = await res.json() as { success?: boolean; text?: string }
              if (data.success && data.text) {
                processFallbackUserQuery(data.text)
              } else {
                changeState('listening')
              }
            }
          } catch (err) {
            console.warn('[RealtimeVoice MediaRecorder] Transcription failed:', err)
            changeState('listening')
          }
        }

        // Record in 3.5 second conversational bursts continuously
        mediaRecorder.start()
        const recorderInterval = setInterval(() => {
          if (!isFallbackActiveRef.current) {
            clearInterval(recorderInterval)
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
            return
          }
          if (mediaRecorder.state === 'recording' && stateRef.current === 'listening') {
            mediaRecorder.stop()
            setTimeout(() => {
              if (isFallbackActiveRef.current && mediaRecorder.state === 'inactive') {
                try { mediaRecorder.start() } catch { /* ignore */ }
              }
            }, 100)
          }
        }, 3500)

        setTranscript('Listening... Speak to Rowan.')
        return true
      } catch (recErr) {
        console.warn('[RealtimeVoice] MediaRecorder fallback init failed:', recErr)
      }
    }

    setTranscript('Microphone active. Rowan is ready.')
    return true
  }, [changeState, processFallbackUserQuery, addDiagnostic, evaluateVoiceIntent])

  // Establish standard WebRTC low-latency connection or smoothly fallback if OpenAI credits are exhausted
  const start = useCallback(async () => {
    if (typeof window === 'undefined') return false

    // Clean up any ongoing session first
    stop()
    setError(null)
    setTranscript('')
    processedCallIdsRef.current.clear()
    changeState('connecting')

    try {
      console.log('[RealtimeVoice] Initiating voice session...')

      // 1. Request user microphone permissions with high quality echo/noise settings
      let localStream: MediaStream
      try {
        console.log('[ROWAN VOICE] MIC_PERMISSION - Requesting browser microphone permissions')
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        localStreamRef.current = localStream
        console.log('[ROWAN VOICE] MIC_PERMISSION - Microphone permission granted successfully')
        verifyAudioTrackSettings(localStream, addDiagnostic)
      } catch (micErr: unknown) {
        const errName = micErr instanceof Error ? micErr.name : String(micErr)
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.', { cause: micErr })
        } else {
          throw new Error('Could not access microphone. Ensure it is connected and not in use.', { cause: micErr })
        }
      }

      // 2. Fetch ephemeral client secret token from backend proxy
      console.log('[ROWAN VOICE] SESSION_REQUEST - Requesting ephemeral session from backend proxy')
      const tokenResponse = await fetch('/api/voice/session', { method: 'POST' })
      if (!tokenResponse.ok) {
        const errJson = await tokenResponse.json().catch(() => ({})) as { message?: string; isQuotaExhausted?: boolean }
        console.warn('[RealtimeVoice] Backend session token unavailable, falling back to Web Voice mode:', errJson.message)
        console.log('[ROWAN VOICE] ERROR - Backend session token request failed')
        return startFallbackVoiceMode()
      }

      const tokenData = await tokenResponse.json() as {
        success: boolean
        client_secret?: { value?: string }
        model?: string
        useFallbackMode?: boolean
        message?: string
      }
      if (!tokenData.success || tokenData.useFallbackMode || !tokenData.client_secret?.value) {
        console.log('[RealtimeVoice] Using Rowan Web Voice mode:', tokenData.message || 'Connecting...')
        console.log('[ROWAN VOICE] SESSION_SUCCESS - Session request returned fallback flag')
        return startFallbackVoiceMode()
      }

      console.log('[ROWAN VOICE] SESSION_SUCCESS - Received ephemeral session token successfully')
      const clientSecret = tokenData.client_secret.value
      const model = tokenData.model || 'gpt-4o-mini-realtime-preview'

      // 3. Setup RTCPeerConnection with STUN servers for NAT/firewall traversal and poor network resilience
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      })
      peerConnectionRef.current = pc
      console.log('[ROWAN VOICE] PEER_CREATED - WebRTC peer connection created')

      pc.onconnectionstatechange = () => {
        const connectionState = pc.connectionState
        console.log(`[RealtimeVoice] WebRTC connection state changed: ${connectionState}`)
        addDiagnostic('Network State', `Connection state is ${connectionState}`, connectionState === 'failed' || connectionState === 'disconnected' ? 'warning' : 'info')
        
        if (connectionState === 'failed' || connectionState === 'disconnected') {
          console.warn('[RealtimeVoice] WebRTC connection failed/disconnected. Triggering fallback...')
          addDiagnostic('Network Resilience', 'WebRTC connection lost. Automatically switching to resilient Fallback Web Voice mode...', 'error')
          startFallbackVoiceMode()
        }
      }

      pc.oniceconnectionstatechange = () => {
        const iceState = pc.iceConnectionState
        console.log(`[RealtimeVoice] ICE connection state changed: ${iceState}`)
        if (iceState === 'failed' || iceState === 'disconnected') {
          addDiagnostic('Network State', `ICE connection dropped: ${iceState}. Switching to Web Voice.`, 'warning')
          startFallbackVoiceMode()
        }
      }

      // Add local audio tracks to peer connection
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream)
      })
      console.log('[ROWAN VOICE] LOCAL_AUDIO_ADDED - Attached local microphone track to peer connection')

      // 4. Setup remote audio output stream (Rowan speaking)
      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioElRef.current = audioEl
      document.body.appendChild(audioEl)
      interruptionClassifierRef.current.attachAudioElement(audioEl)

      pc.ontrack = (event) => {
        console.log('[ROWAN VOICE] REMOTE_AUDIO_TRACK - Received remote audio track')
        if (audioElRef.current && event.streams && event.streams[0]) {
          audioElRef.current.srcObject = event.streams[0]
          console.log('[ROWAN VOICE] AUDIO_ELEMENT_READY - Audio element srcObject assigned successfully')
          
          // Connect Web Audio API GainNode for hardware-level 0ms muting upon interruption
          try {
            const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            if (AudioCtxClass) {
              const ctx = audioContextRef.current || new AudioCtxClass()
              audioContextRef.current = ctx
              if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {})
              }
              const sourceNode = ctx.createMediaStreamSource(event.streams[0])
              const gainNode = ctx.createGain()
              gainNode.gain.setValueAtTime(1.0, ctx.currentTime)
              sourceNode.connect(gainNode)
              gainNode.connect(ctx.destination)
              gainNodeRef.current = gainNode
              interruptionClassifierRef.current.attachAudioContext(ctx, gainNode)
              realtimeInterruptionServiceRef.current.attachTargets({
                audioContext: ctx,
                gainNode: gainNode,
                audioElement: audioElRef.current
              })
              console.log('[ROWAN VOICE] AUDIO_CONTEXT_ATTACHED - Web Audio GainNode initialized for 0ms interruption muting')
            }
          } catch (ctxErr) {
            console.debug('[RealtimeVoice] AudioContext initialization notice:', ctxErr)
          }

          // Workaround for browser autoplay blockages
          console.log('[ROWAN VOICE] AUDIO_PLAY_STARTED - Attempting to play remote audio track')
          audioElRef.current.play().then(() => {
            console.log('[ROWAN VOICE] AUDIO_RECEIVED')
            console.log('[ROWAN VOICE] AUDIO_PLAY_STARTED - Remote audio track playing successfully')
          }).catch(playErr => {
            console.warn('[RealtimeVoice] Remote audio autoplay blocked by browser policy:', playErr)
            console.log('[ROWAN VOICE] ERROR - Playback blocked by browser autoplay policy')
            setError('Audio autoplay is restricted. Please tap/interact with the screen to hear Rowan.')
          })
        }
      }

      // 5. Create Bidirectional Realtime Event Data Channel
      const dc = pc.createDataChannel('oai-events')
      dataChannelRef.current = dc
      interruptionClassifierRef.current.attachDataChannel(dc)
      realtimeInterruptionServiceRef.current.attachTargets({ dataChannel: dc })

      dc.onopen = () => {
        console.log('[ROWAN VOICE] DATA_CHANNEL_OPEN - Bidirectional data channel (oai-events) opened')
        try {
          const sessionUpdate = {
            type: 'session.update',
            session: {
              type: 'realtime',
              instructions: `You are Rowan, an advanced, warm, intelligent, and natural AI voice companion having a real, live spoken conversation.

Voice Personality & Conversational Rules:
- Speak naturally, warmly, and authentically — like a real, intelligent human companion having a spontaneous conversation, NOT a chatbot reading a prepared text response or reading an essay.
- Adapt your response length dynamically: keep answers short, crisp, and conversational (1 to 3 sentences) for casual dialogue; expand smoothly only when the user explicitly asks for detailed explanations or complex technical help.
- NEVER use repetitive assistant cliches, customer-service fluff, or mechanical phrases (e.g. NEVER say "Absolutely", "Great question", "Certainly", "I'd be happy to help", "Of course", "As an AI").
- Adapt to the user's emotional tone naturally: sound warm, attentive, amused when appropriate, focused during serious topics, and patient during confusion.
- Conversational Expressiveness & Natural Laughter: When a topic or user comment is genuinely amusing, lighthearted, or funny, you may express natural, brief conversational laughter (e.g. "[laughs softly]", "[chuckles]", or a light chuckle in your voice) before or during your answer. Keep laughter brief, occasional, contextual, and natural — never forced or robotic.
- Avoid formal call-center or corporate voice tone. Use natural sentence pacing, authentic pauses, and varied inflection.

Real-Time Tools Available:
1. 'search_web': Perform live web research using Tavily search. Call this when asked about current events, news, weather, facts, articles, documentation, or when requested to find/research links.
2. 'open_website': Open any website URL in a new browser tab for the user when requested.

When delivering search results:
- Concisely summarize key findings in natural, spoken conversational English.
- Explicitly mention website names or URLs discovered.
- If you opened a website, warmly confirm that you launched the site for them.`,
              tools: [
                {
                  type: 'function',
                  name: 'search_web',
                  description: 'Search the live web using the Tavily search engine for real-time information, current news, facts, articles, documentation, or links.',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'The search query to research via Tavily'
                      },
                      open_first_result: {
                        type: 'boolean',
                        description: 'Set to true if the user asked to open, visit, or launch the website directly in their browser.'
                      }
                    },
                    required: ['query']
                  }
                },
                {
                  type: 'function',
                  name: 'open_website',
                  description: 'Open a website or link in a new browser tab for the user.',
                  parameters: {
                    type: 'object',
                    properties: {
                      url: {
                        type: 'string',
                        description: 'The full HTTP or HTTPS URL to open in the user browser'
                      },
                      title: {
                        type: 'string',
                        description: 'Optional title or name of the website'
                      }
                    },
                    required: ['url']
                  }
                }
              ],
              tool_choice: 'auto',
              audio: {
                input: {
                  transcription: {
                    model: 'whisper-1'
                  },
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 500
                  }
                },
                output: {
                  voice: (() => {
                    const voiceId = (typeof window !== 'undefined' && window.localStorage)
                      ? (window.localStorage.getItem('rowan_preferred_voice_id') || 'nova')
                      : 'nova';
                    console.log('[ROWAN VOICE] FEMALE_VOICE_SELECTED', voiceId);
                    return voiceId;
                  })()
                }
              }
            }
          }
          dc.send(JSON.stringify(sessionUpdate))
          console.log('[RealtimeVoice] Sent session.update event with Tavily search and open_website tools.')
        } catch (updateErr) {
          console.warn('[RealtimeVoice] Failed to send session.update event:', updateErr)
        }
        changeState('listening')
      }

      dc.onclose = () => {
        console.log('[RealtimeVoice] Bidirectional data channel closed.')
        if (stateRef.current !== 'idle' && !isFallbackActiveRef.current) {
          addDiagnostic('Network Resilience', 'Data channel closed unexpectedly. Switching to Fallback Web Voice mode...', 'warning')
          startFallbackVoiceMode()
        }
      }

      dc.onerror = (e) => {
        console.warn('[RealtimeVoice] Data channel error:', e)
        if (!isFallbackActiveRef.current) {
          addDiagnostic('Network Resilience', 'Data channel error encountered. Switching to Fallback Web Voice mode...', 'warning')
          startFallbackVoiceMode()
        }
      }

      // Handler for executing model tool calls
      const handleFunctionCall = async (
        callId: string,
        name: string,
        rawArgs: string
      ) => {
        console.log(`[RealtimeVoice] Executing function call: ${name} (call_id: ${callId})`)
        
        if (name === 'search_web') {
          let parsed: { query?: string; open_first_result?: boolean }
          try {
            parsed = JSON.parse(rawArgs)
          } catch {
            parsed = { query: rawArgs }
          }
          const query = parsed.query?.trim() || 'latest news'
          setIsSearching(true)
          setActiveSearchQuery(query)
          optionsRef.current?.onResearchStart?.(query)

          try {
            console.log(`[RealtimeVoice] Calling /api/voice/research for "${query}"...`)
            const res = await fetch('/api/voice/research', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query })
            })
            const data = (await res.json()) as {
              success: boolean
              summary?: string
              sources?: VoiceResearchSource[]
              provider?: string
              error?: string
            }

            const sources = data.sources || []
            const summary = data.summary || 'Search completed.'
            let openedWebsiteUrl: string | null = null

            if (parsed.open_first_result && sources.length > 0) {
              openedWebsiteUrl = sources[0].url
              openWebsite(openedWebsiteUrl, sources[0].title)
            }

            const researchResult: VoiceResearchResult = {
              query,
              summary,
              sources,
              provider: data.provider || 'Tavily Search API',
              openedWebsite: openedWebsiteUrl
            }

            setActiveResearch(researchResult)
            setIsSearching(false)
            optionsRef.current?.onResearchResults?.(researchResult)
            optionsRef.current?.onSearchComplete?.(sources, query)

            if (dc.readyState === 'open') {
              const toolOutput = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: callId,
                  output: JSON.stringify({
                    success: true,
                    query,
                    summary,
                    sources: sources.slice(0, 4).map(s => ({ title: s.title, url: s.url, snippet: s.snippet })),
                    opened_first_website: openedWebsiteUrl
                  })
                }
              }
              dc.send(JSON.stringify(toolOutput))
              dc.send(JSON.stringify({ type: 'response.create' }))
              console.log('[RealtimeVoice] Sent function_call_output and response.create for search_web')
            }
          } catch (err) {
            console.error('[RealtimeVoice] Search error:', err)
            setIsSearching(false)
            if (dc.readyState === 'open') {
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: callId,
                  output: JSON.stringify({ success: false, error: 'Failed to complete web search.' })
                }
              }))
              dc.send(JSON.stringify({ type: 'response.create' }))
            }
          }
        } else if (name === 'open_website') {
          let parsed: { url?: string; title?: string }
          try {
            parsed = JSON.parse(rawArgs)
          } catch {
            parsed = { url: rawArgs }
          }
          const url = parsed.url?.trim() || ''
          if (url) {
            openWebsite(url, parsed.title || url)
          }

          if (dc.readyState === 'open') {
            dc.send(JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify({
                  success: true,
                  opened: url,
                  title: parsed.title || url,
                  message: `Successfully opened ${url} in a new tab for the user.`
                })
              }
            }))
            dc.send(JSON.stringify({ type: 'response.create' }))
            console.log('[RealtimeVoice] Sent function_call_output and response.create for open_website')
          }
        }
      }

      dc.onmessage = (event) => {
        try {
          const oaiEvent = JSON.parse(event.data) as {
            type: string
            delta?: string
            transcript?: string
            call_id?: string
            name?: string
            arguments?: string
            item_id?: string
            item?: {
              type?: string
              name?: string
              call_id?: string
              arguments?: string
            }
            response?: {
              status?: string
              output?: Array<{
                type: string
                content?: Array<{ type: string; transcript?: string }>
              }>
            }
          }

          // Pass event to Realtime Interruption Service to monitor active response ID and prevent premature talking
          realtimeInterruptionServiceRef.current.handleRealtimeEvent(oaiEvent)

          switch (oaiEvent.type) {
            case 'input_audio_buffer.speech_started': {
               console.log('[ROWAN VOICE] USER_SPEECH_ONSET | VAD input_audio_buffer.speech_started received')
               const wasSpeaking = stateRef.current === 'speaking' || realtimeInterruptionServiceRef.current.getIsSpeaking()
               console.log(`[RealtimeVoice] Speech started (WebRTC). Was speaking: ${wasSpeaking}`)
               addDiagnostic('AUDIO_DETECTED', `VAD audio signal start. Assistant speaking: ${wasSpeaking}`, 'info')
               
               if (wasSpeaking) {
                 console.log('[ROWAN VOICE] USER_SPEECH_ONSET | User spoke over Rowan. Triggering immediate 0ms general barge-in.')
                 realtimeInterruptionServiceRef.current.executeGeneralBargeIn('VAD_SPEECH_ONSET')
                 wasInterruptedRef.current = true
                 isDuckedRef.current = false
                 isPendingInterruptionCheckRef.current = false
                 changeState('interrupted')
                 setTimeout(() => {
                   changeState('listening')
                 }, 50)
                 addDiagnostic('GENERAL_BARGE_IN', 'Immediate barge-in: user speech onset detected. Playback halted and active response cancelled.', 'success')
               } else {
                 isDuckedRef.current = false
                 isPendingInterruptionCheckRef.current = false
                 changeState('listening')
                 addDiagnostic('Speech Started', 'Audio input detected, listening...', 'info')
               }
               break
             }
 
             case 'input_audio_buffer.speech_stopped': {
               console.log('[ROWAN VOICE] SPEECH_STOPPED')
               console.log('[RealtimeVoice] User stopped speaking (WebRTC).')
               const isDucked = isDuckedRef.current
               if (isDucked) {
                 addDiagnostic('Speech Stopped', 'User stopped speaking. Evaluating transcription...', 'info')
               } else {
                 addDiagnostic('Speech Stopped', 'User stopped speaking. Awaiting transcription...', 'info')
                 changeState('thinking')
               }
               break
             }
 
             case 'response.created':
               console.log('[ROWAN VOICE] RESPONSE_CREATED')
               console.log('[RealtimeVoice] Rowan response.created.')
               addDiagnostic('Response Created', 'Rowan is starting to formulate an answer...', 'info')
               setTranscript('')
               currentSpokenAssistantTextRef.current = ''
               isDuckedRef.current = false
               isPendingInterruptionCheckRef.current = false
               changeState('thinking')
               break
 
             case 'response.output_item.added':
               changeState('speaking')
               break
 
             case 'conversation.item.input_audio_transcription.completed': {
                // Clear ducked timeout since we received a transcription
                if (duckedTimeoutRef.current) {
                  clearTimeout(duckedTimeoutRef.current)
                  duckedTimeoutRef.current = null
                }
               const text = oaiEvent.transcript?.trim() || ''
               if (text) {
                 optionsRef.current?.onTranscript?.(text, true)
                  addDiagnostic('TRANSCRIPT_DETECTED', `Raw user speech input: "${text}"`, 'info')
                 
                 const wasSpeaking = stateRef.current === 'speaking' || isDuckedRef.current || isPendingInterruptionCheckRef.current
                 // 1. Check for ASSISTANT_ECHO first!
                 if (wasSpeaking) {
                   const assistantText = currentSpokenAssistantTextRef.current || ''
                   const echoCheck = checkAssistantEcho(text, assistantText)
                   
                   if (echoCheck.isEcho) {
                     // Diagnostic logging as requested by user
                     console.log(`[RealtimeVoice] VAD: speech detected | Assistant speaking: true | Transcript: "${text}" | Classification: ASSISTANT_ECHO | Action: IGNORE | Reason: ${echoCheck.reason}`)
                     addDiagnostic('ASSISTANT_ECHO', `Filtered out assistant voice reflection: "${text}" | Reason: ${echoCheck.reason}`, 'warning')
                     
                     // Restore volume (unduck)
                     if (audioElRef.current) {
                       try {
                         audioElRef.current.volume = 1.0
                       } catch (err) {
                         console.debug(err)
                       }
                     }
                     isDuckedRef.current = false
                     isPendingInterruptionCheckRef.current = false
                     break // Stop processing this transcription, do not interrupt Rowan!
                   }
                 }

                 wasInterruptedRef.current = false // Reset after evaluation
                 const intent = evaluateVoiceIntent(text, wasSpeaking)
                 addDiagnostic('Transcription Completed', `User: "${text}" | Intentional: ${intent.isIntentional} | Confidence: ${intent.confidence} (${intent.reason})`, intent.isIntentional ? 'success' : 'warning')
                 
                 if (wasSpeaking || realtimeInterruptionServiceRef.current.isAwaitingUserSpeech()) {
                   const interceptRes = realtimeInterruptionServiceRef.current.evaluateAndIntercept(text, {
                     assistantText: currentSpokenAssistantTextRef.current,
                     customKeyword: (typeof window !== 'undefined' && localStorage.getItem('rowan_interruption_word')) || 'stop',
                     forceSpeakingCheck: wasSpeaking
                   })

                   if (interceptRes.intercepted) {
                     console.log('[ROWAN VOICE] INTERRUPTION_DETECTED')
                     console.log(`[RealtimeVoice] Interruption confirmed by 100-word whitelist: "${interceptRes.matchedPhrase}". Halting audio at 0ms and waiting for user.`)
                     addDiagnostic('INTERRUPTION_CONFIRMED', `Confirmed whitelist interruption ("${interceptRes.matchedPhrase}"). Stopped playback. Rowan is quietly listening for you to finish talking.`, 'success')
                     
                     realtimeInterruptionServiceRef.current.cancelCurrentResponse()
                     
                     isDuckedRef.current = false
                     isPendingInterruptionCheckRef.current = false
                     wasInterruptedRef.current = true
                     
                     refreshConversationLock()
                     changeState('listening')
                     console.log('[ROWAN VOICE] LISTENING_AFTER_INTERRUPT - Rowan is quiet and waiting for user to finish speaking')
                     break
                   }

                    if (intent.isIntentional) {
                      console.log('[ROWAN VOICE] INTERRUPTION_DETECTED')
                      console.log(`[ROWAN VOICE] INTERRUPTION_CONFIDENCE: ${intent.confidence.toFixed(2)} | Category: ${intent.category || 'IMMEDIATE_INTERRUPTION'}`)
                      console.log(`[RealtimeVoice] VAD: speech detected | Assistant speaking: true | Transcript: "${text}" | Classification: USER_INTERRUPTION | Action: INTERRUPT | Reason: ${intent.reason}`)
                      addDiagnostic('INTERRUPTION_CANDIDATE', `Evaluating barge-in transcript: "${text}" | Score: ${intent.confidence}`, 'info')
                       addDiagnostic('USER_SPEECH', `Verified intentional speech barge-in: "${text}" | Reason: ${intent.reason}`, 'success')
                       if (text.toLowerCase().includes('rowan') || text.toLowerCase().includes('rowen') || text.toLowerCase().includes('roman')) {
                         addDiagnostic('DIRECT_ADDRESS', `Matched direct address prefix/suffix.`, 'success')
                       }
                       addDiagnostic('INTERRUPTION_CONFIRMED', `Confirmed intentional interruption (score ${intent.confidence} >= 0.75). Stopping playback immediately.`, 'success')
                      
                      // Immediately cancel audio playback across Web Audio API GainNode, HTMLAudioElement, and WebRTC data channel
                      interruptionClassifierRef.current.cancelPlayback({
                        audioContext: audioContextRef.current,
                        gainNode: gainNodeRef.current,
                        audioElement: audioElRef.current,
                        dataChannel: dc.readyState === 'open' ? dc : dataChannelRef.current
                      })
                      
                      isDuckedRef.current = false
                      isPendingInterruptionCheckRef.current = false
                      wasInterruptedRef.current = true
                      
                      refreshConversationLock()
                      changeState('listening')
                      console.log('[ROWAN VOICE] LISTENING_AFTER_INTERRUPT')
                    } else {
                      console.log(`[RealtimeVoice] VAD: speech detected | Assistant speaking: true | Transcript: "${text}" | Classification: BACKGROUND_SPEECH/ENVIRONMENTAL_NOISE | Action: IGNORE | Reason: ${intent.reason}`)
                      addDiagnostic('BACKGROUND_SPEECH', `Identified background noise or conversational snippet: "${text}" | Reason: ${intent.reason}`, 'warning')
                      addDiagnostic('INTERRUPTION_REJECTED', `Utterance did not meet threshold (score ${intent.confidence} < 0.75).`, 'warning')
                      addDiagnostic('ROWAN_CONTINUING', `Accidental sound ignored. Instructing Rowan to resume last thought.`, 'success')
                      
                      // Restore volume (unduck)
                      if (audioElRef.current) {
                        try {
                          audioElRef.current.volume = 1.0
                        } catch (err) {
                          console.debug(err)
                        }
                      }
                      isDuckedRef.current = false
                      isPendingInterruptionCheckRef.current = false

                      // 1. Delete the unintended conversation item from the server
                      if (dc.readyState === 'open' && oaiEvent.item_id) {
                        try {
                          console.log(`[RealtimeVoice] Deleting unintended conversation item: ${oaiEvent.item_id}`)
                          dc.send(JSON.stringify({
                            type: 'conversation.item.delete',
                            item_id: oaiEvent.item_id
                          }))
                        } catch (err) {
                          console.error('[RealtimeVoice] Failed to delete unintended item:', err)
                        }
                      }

                      // 2. Cancel the unintended response generated on the server
                      if (dc.readyState === 'open') {
                        try {
                          console.log('[RealtimeVoice] Canceling unintended response generation')
                          dc.send(JSON.stringify({ type: 'response.cancel' }))
                        } catch (err) {
                          console.error('[RealtimeVoice] Failed to cancel response:', err)
                        }
                      }

                      // 3. Instruct Rowan to resume speaking from where he was cut off
                      if (dc.readyState === 'open') {
                        try {
                          const assistantText = currentSpokenAssistantTextRef.current || 'what I was saying'
                          console.log(`[RealtimeVoice] Requesting continuation for: "${assistantText}"`)
                          
                          dc.send(JSON.stringify({
                            type: 'conversation.item.create',
                            item: {
                              type: 'message',
                              role: 'system',
                              content: [
                                {
                                  type: 'input_text',
                                  text: `[System Note: The user made an accidental sound/voice that was filtered out. You were cut off mid-sentence while saying: "${assistantText}". Please continue exactly where you left off, resuming your sentence naturally without acknowledging the interruption or apologizing.]`
                                }
                              ]
                            }
                          }))

                          // Trigger the response creation to resume talking
                          dc.send(JSON.stringify({ type: 'response.create' }))
                          changeState('thinking')
                        } catch (err) {
                          console.error('[RealtimeVoice] Failed to send continuation message:', err)
                        }
                      }
                    }
                  } else {
                    // If Rowan wasn't speaking, and we got user transcription
                    if (intent.isIntentional) {
                      refreshConversationLock()
                      changeState('thinking')
                    } else {
                      console.log(`[RealtimeVoice] Passive background text filtered: "${text}"`)
                      addDiagnostic('Noise Filtered', `Filtered background sound: "${text}"`, 'info')
                      if (dc.readyState === 'open') {
                        try {
                          dc.send(JSON.stringify({ type: 'response.cancel' }))
                        } catch {
                          // ignore
                        }
                      }
                      changeState('no_response')
                      setTranscript('')
                      setTimeout(() => {
                        if (stateRef.current === 'no_response') {
                          changeState('listening')
                        }
                      }, 1500)
                    }
                  }
              }
              break
            }

            case 'response.audio_transcript.delta':
            case 'response.output_audio_transcript.delta':
              console.log('[ROWAN VOICE] AUDIO_RECEIVED')
              if (oaiEvent.delta) {
                setTranscript(prev => prev + oaiEvent.delta)
                currentSpokenAssistantTextRef.current += oaiEvent.delta
                optionsRef.current?.onTranscript?.(oaiEvent.delta, false)
              }
              break

            case 'response.function_call_arguments.done': {
              const callId = oaiEvent.call_id
              const name = oaiEvent.name
              const rawArgs = oaiEvent.arguments || '{}'
              if (callId && name && !processedCallIdsRef.current.has(callId)) {
                processedCallIdsRef.current.add(callId)
                handleFunctionCall(callId, name, rawArgs)
              }
              break
            }

            case 'response.output_item.done': {
              const item = oaiEvent.item
              if (item?.type === 'function_call' && item.call_id && item.name && !processedCallIdsRef.current.has(item.call_id)) {
                processedCallIdsRef.current.add(item.call_id)
                handleFunctionCall(item.call_id, item.name, item.arguments || '{}')
              }
              break
            }

            case 'response.done':
              console.log('[ROWAN VOICE] RESPONSE_DONE')
              console.log('[RealtimeVoice] Rowan finished speaking.')
              isDuckedRef.current = false
              isPendingInterruptionCheckRef.current = false
              changeState('listening')
              break

            case 'error':
              console.warn('[RealtimeVoice] Event channel error event:', oaiEvent)
              break

            default:
              break
          }
        } catch (e) {
          console.warn('[RealtimeVoice] Error parsing data channel message:', e)
        }
      }

      // 6. WebRTC SDP Negotiation Handshake with OpenAI directly
      const offer = await pc.createOffer()

      // SDP munging to enable Forward Error Correction (FEC) and Discontinuous Transmission (DTX) for poor network resilience
      let modifiedSdp = offer.sdp
      try {
        const lines = modifiedSdp.split('\r\n')
        let opusPayloadType = null
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.startsWith('a=rtpmap:') && line.toLowerCase().includes('opus/48000')) {
            const match = line.match(/a=rtpmap:(\d+)\s/i)
            if (match) {
              opusPayloadType = match[1]
              break
            }
          }
        }
        if (opusPayloadType) {
          let fmtpFound = false
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (line.startsWith(`a=fmtp:${opusPayloadType}`)) {
              let updatedLine = line
              if (!line.includes('useinbandfec=1')) {
                updatedLine += ';useinbandfec=1'
              }
              if (!line.includes('usedtx=1')) {
                updatedLine += ';usedtx=1'
              }
              lines[i] = updatedLine
              fmtpFound = true
              break
            }
          }
          if (!fmtpFound) {
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith(`a=rtpmap:${opusPayloadType}`)) {
                lines.splice(i + 1, 0, `a=fmtp:${opusPayloadType} useinbandfec=1;usedtx=1`)
                break
              }
            }
          }
          modifiedSdp = lines.join('\r\n')
        }
      } catch (sdpErr) {
        console.warn('[RealtimeVoice] Failed to munge SDP for FEC/DTX:', sdpErr)
      }

      await pc.setLocalDescription({
        type: offer.type,
        sdp: modifiedSdp
      })

      console.log('[RealtimeVoice] Exchanging SDP offer with OpenAI...')
      console.log('[ROWAN VOICE] SDP_OFFER_CREATED - Exchanging local SDP offer with OpenAI')
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn('[RealtimeVoice] SDP negotiation request timed out. Aborting.')
        controller.abort()
      }, 6000)

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime/calls?model=${model}`, {
        method: 'POST',
        body: modifiedSdp,
        headers: {
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!sdpResponse.ok) {
        console.warn('[RealtimeVoice] Activating Rowan Interactive Web Voice fallback mode.')
        console.log('[ROWAN VOICE] ERROR - SDP offer rejected by OpenAI')
        // Cleanup failed WebRTC peer connection before activating fallback
        try {
          pc.close()
        } catch {
          // ignore
        }
        peerConnectionRef.current = null
        return startFallbackVoiceMode()
      }

      const answerSdp = await sdpResponse.text()
      console.log('[ROWAN VOICE] SDP_ANSWER_RECEIVED - SDP remote answer received from OpenAI')
      console.log('[RealtimeVoice] SDP negotiation successful. Setting remote description.')
      
      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp
      }
      await pc.setRemoteDescription(answer)
      console.log('[ROWAN VOICE] REMOTE_DESCRIPTION_SET - WebRTC remote description set successfully')

      // 7. Start local zero-latency speech recognition interruption monitor if supported by browser
      try {
        if (typeof window !== 'undefined') {
          const windowWithSpeech = window as unknown as {
            SpeechRecognition?: BrowserSpeechRecognitionConstructor
            webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
          }
          const SpeechRecognitionClass = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition
          if (SpeechRecognitionClass) {
            const recognition = new SpeechRecognitionClass()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
              if (stateRef.current !== 'speaking' && !isDuckedRef.current) return

              let chunk = ''
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                chunk += event.results[i][0].transcript
              }
              const trimmed = chunk.trim()
              if (!trimmed || trimmed.length < 2) return

              const interceptRes = realtimeInterruptionServiceRef.current.evaluateAndIntercept(trimmed, {
                assistantText: currentSpokenAssistantTextRef.current,
                customKeyword: (typeof window !== 'undefined' && localStorage.getItem('rowan_interruption_word')) || 'stop',
                forceSpeakingCheck: true
              })

              if (interceptRes.intercepted) {
                console.log(`[RealtimeVoice Live Interruption Monitor] Rapid interruption triggered by "${interceptRes.matchedPhrase}". Rowan stopped and waiting for user.`)
                addDiagnostic('LOCAL_INTERRUPTION_TRIGGERED', `Instant local interruption by "${interceptRes.matchedPhrase}". Rowan stopped and is listening for you to finish talking.`, 'success')
                
                realtimeInterruptionServiceRef.current.cancelCurrentResponse()
                
                isDuckedRef.current = false
                isPendingInterruptionCheckRef.current = false
                wasInterruptedRef.current = true
                refreshConversationLock()
                changeState('listening')
              }
            }

            recognition.onerror = () => {
              // Ignore background recognition errors
            }

            recognition.onend = () => {
              // Restart if WebRTC session is still active
              if (peerConnectionRef.current && stateRef.current !== 'idle' && !isFallbackActiveRef.current) {
                try {
                  recognition.start()
                } catch {
                  // ignore
                }
              }
            }

            recognition.start()
            liveMonitorRecognitionRef.current = recognition
            console.log('[ROWAN VOICE] LIVE_INTERRUPTION_MONITOR_STARTED - Local speech recognition monitor active')
          }
        }
      } catch (monitorErr) {
        console.debug('[RealtimeVoice] Local interruption speech monitor initialization notice:', monitorErr)
      }

      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Microphone') || msg.includes('permission') || msg.includes('Permission')) {
        console.error('[RealtimeVoice] Microphone access error:', err)
        setError(msg)
        changeState('error')
        optionsRef.current?.onError?.(msg)
        stop()
        return false
      }
      console.warn('[RealtimeVoice] Live voice session error. Activating Rowan Interactive Web Voice fallback:', err)
      return startFallbackVoiceMode()
    }
  }, [stop, changeState, openWebsite, startFallbackVoiceMode, addDiagnostic, evaluateVoiceIntent, refreshConversationLock])

  // Clean up on component destruction
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    state,
    status: state,
    error,
    transcript,
    activeResearch,
    isSearching,
    activeSearchQuery,
    currentSearchQuery: activeSearchQuery,
    lastOpenedUrl: openedWebsites[0]?.url || null,
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    isThinking: state === 'thinking',
    isConnecting: state === 'connecting',
    isFallbackMode,
    mode: isFallbackMode ? 'interactive-web' : 'webrtc',
    openedWebsites,
    openWebsite,
    clearResearch,
    start,
    stop,
    setError,
    setTranscript,
    activeConversation,
    activeConversationLock: activeConversation,
    diagnostics
  }
}
