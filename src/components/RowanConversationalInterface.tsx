import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowUp,
  Mic,
  Volume2,
  VolumeX,
  Plus,
  RotateCcw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Globe,
  FileText,
  Image as ImageIcon,
  Trash2,
  History,
  X,
  Headphones,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  GripHorizontal,
  Wand2,
  Monitor
} from 'lucide-react'
import { RowanMarkdown } from './RowanMarkdown'
import { RowanExpressiveAvatar } from './RowanExpressiveAvatar'
import { RowanIdleHero } from './RowanIdleHero'
import { RowanLiveVoiceView } from './RowanLiveVoiceView'
import { RowanResearchView } from './RowanResearchView'
import { RowanWebsitePreview } from './RowanWebsitePreview'
import { RowanImageCard } from './RowanImageCard'
import { useTTS } from '../hooks/useTTS'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { useRealtimeVoice } from '../hooks/useRealtimeVoice'
import { useWakeWord } from '../hooks/useWakeWord'
import type { RowanAvatarState, ResearchSourceItem } from '../types'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text: string
  products?: Array<{
    id?: string
    name: string
    price: number
    category?: string
  }>
  research?: {
    query: string
    summary?: string
    sources: ResearchSourceItem[]
  }
  image?: {
    url: string
    prompt: string
    provider?: string
  }
  timestamp?: number
}

interface ConversationItem {
  id: string
  title?: string
  snippet?: string
  created_at?: string
}

interface AttachedFile {
  name: string
  size: number
  type: string
}

interface RowanConversationalInterfaceProps {
  isMinimized?: boolean
  navigate?: (to: string) => void
  theme?: 'light' | 'dark'
  onThemeChange?: (theme: 'light' | 'dark') => void
  isFloating?: boolean
  onClose?: () => void
  onExpand?: () => void
  isExpanded?: boolean
  dragHandleProps?: {
    onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void
  }
}

// Generate unique ID safely
const getUniqueId = (prefix: string = 'msg') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

export const RowanConversationalInterface: React.FC<RowanConversationalInterfaceProps> = ({
  theme: controlledTheme,
  onThemeChange,
  isFloating = false,
  isMinimized = false,
  onClose,
  onExpand,
  isExpanded = false,
  dragHandleProps
}) => {
  // Theme state
  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>('dark')
  const currentTheme = controlledTheme || internalTheme
  const isDark = currentTheme === 'dark'

  const toggleTheme = () => {
    const next = currentTheme === 'dark' ? 'light' : 'dark'
    if (onThemeChange) {
      onThemeChange(next)
    } else {
      setInternalTheme(next)
    }
  }

  // Session & Message State
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rowan_active_session_id') || getUniqueId('sess')
    }
    return getUniqueId('sess')
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResearching, setIsResearching] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generatingPrompt, setGeneratingPrompt] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({})

  // Attachments & Tools State
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [webSearchMode, setWebSearchMode] = useState(true)

  // Website Preview Layer State
  const [activePreview, setActivePreview] = useState<{ url: string; title?: string } | null>(null)

  // History Drawer & Auth State
  const [historyOpen, setHistoryOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationItem[]>([])

  // Voice Engine State
  const [voiceModeActive, setVoiceModeActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // Screen Sharing State
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isSharePickerGuiding, setIsSharePickerGuiding] = useState(false)
  const [liveStreamType, setLiveStreamType] = useState<'screen' | 'camera'>('screen')
  const [sharingModalTab, setSharingModalTab] = useState<'desktop' | 'mobile' | 'mac'>('desktop')
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null)

  // Clean up screen sharing stream on unmount
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [screenStream])

  // Realtime Voice Hook (subtle backend connection, zero provider branding exposed)
  const {
    status: rtStatus,
    transcript: rtTranscript,
    isListening: rtIsListening,
    isSpeaking: rtIsSpeaking,
    isSearching: rtIsSearching,
    currentSearchQuery: rtSearchQuery,
    error: rtError,
    start: rtStart,
    stop: rtStop,
    activeConversation,
    diagnostics
  } = useRealtimeVoice({
    onSearchComplete: (sources, query) => {
      // Map research findings directly into chat
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('research'),
          role: 'assistant',
          text: `I researched the web for **"${query}"** and gathered verified sources:`,
          research: {
            query,
            sources
          }
        }
      ])
    },
    onWebsiteOpened: (url, label) => {
      // Open website inside preview layer
      setActivePreview({ url, title: label || url })
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('open'),
          role: 'assistant',
          text: `Opened website preview for [${label || url}](${url})`
        }
      ])
    },
    onCaptureFrame: () => {
      return captureCurrentFrame()
    }
  })

  
  const isRealtimeActive = rtStatus !== 'idle' && rtStatus !== 'error'
  const rtAudioLevel = rtIsSpeaking ? 0.7 : rtIsListening ? 0.4 : 0

  // Global event listener to trigger voice mode externally (e.g., from "Test Live with Rowan" buttons)
  useEffect(() => {
    const handleStartVoiceEvent = () => {
      setVoiceModeActive(true)
      rtStart().catch(() => {})
    }
    window.addEventListener('start-rowan-voice', handleStartVoiceEvent)
    return () => window.removeEventListener('start-rowan-voice', handleStartVoiceEvent)
  }, [rtStart])

  const [wakeWordActive, setWakeWordActive] = useState(true)
  useEffect(() => {
    const syncSetting = () => {
      const stored = localStorage.getItem('rowan_wake_word_enabled')
      if (stored !== null) {
        setWakeWordActive(JSON.parse(stored))
      }
    }
    syncSetting()
    window.addEventListener('storage', syncSetting)
    return () => window.removeEventListener('storage', syncSetting)
  }, [])

  useWakeWord({
    wakeWord: 'rowan',
    enabled: isMinimized && wakeWordActive, // Only listen when minimized and enabled
    onWake: () => {
      // Direct wake activation - start realtime voice without expanding window
      if (!isRealtimeActive) {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3')
          audio.volume = 0.2
          audio.play().catch(() => {})
        } catch {
          // Ignore audio preview errors
        }
        rtStart()
      }
    }
  })

  // TTS Hook
  const { speak, stop: stopTTS, speakingId, pausedId, loadingId } = useTTS()

  const wasLastInputVoiceRef = useRef<boolean>(false)

  // STT Hook for dictation
  const baseInputRef = useRef<string>('')
  const {
    isListening: isListeningMic,
    start: startMic,
    stop: stopMic
  } = useSpeechRecognition({
    onResult: (text: string) => {
      const base = baseInputRef.current
      setInput(base ? `${base} ${text}` : text)
    },
    onEnd: (finalText: string) => {
      const base = baseInputRef.current
      const fullText = (base ? `${base} ${finalText}` : finalText).trim()
      if (fullText) {
        wasLastInputVoiceRef.current = true
        handleSendMessage(fullText)
      }
    }
  })

  const handleToggleMic = () => {
    if (isListeningMic) {
      stopMic()
    } else {
      stopTTS()
      wasLastInputVoiceRef.current = true
      baseInputRef.current = input.trim()
      startMic({ continuous: true, interimResults: true })
    }
  }

  // Screen Sharing Handlers
  const initiateScreenSharing = () => {
    setIsSharePickerGuiding(true)
  }

  const startCameraSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })
      
      setLiveStreamType('camera')
      setScreenStream(stream)
      setIsScreenSharing(true)
      setIsSharePickerGuiding(false)

      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('camera_system'),
          role: 'assistant',
          text: "📷 **Live Camera Connected.** I can now view your surroundings or point your phone's camera at any screens, MacBooks, or physical objects. Ask me questions about what's visible, e.g., *'Rowan, what am I pointing my camera at?'*"
        }
      ])
    } catch (err) {
      setIsSharePickerGuiding(false)
      console.warn("Camera access denied or failed:", err)
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('camera_error'),
          role: 'assistant',
          text: "⚠️ **Camera Access Restricted:** Could not access your device's camera. Please ensure you have granted camera permissions in your browser and device settings!"
        }
      ])
    }
  }

  const startScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      setLiveStreamType('screen')
      setScreenStream(stream)
      setIsScreenSharing(true)
      setIsSharePickerGuiding(false)
      
      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing(stream)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('screen_system'),
          role: 'assistant',
          text: "🔒 **Screen Sharing Connected.** I can now view your screen and receive your system/tab audio in real-time. Ask me anything about what's visible on your screen, e.g., *'Rowan, what am I seeing right now?'*"
        }
      ])
    } catch (err) {
      setIsSharePickerGuiding(false)
      console.warn("Screen sharing permission denied or failed:", err)
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('screen_error'),
          role: 'assistant',
          text: "⚠️ **Screen Capture Permission Restricted:** Display capture is blocked. If you are viewing Rowan inside a preview window, please click **'Open in new tab'** in the top right to grant screen capture access directly!"
        }
      ])
    }
  }

  const stopScreenSharing = (streamToStop?: MediaStream | null) => {
    const activeStream = streamToStop || screenStream
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop())
    }
    setScreenStream(null)
    setIsScreenSharing(false)
    
    setMessages((prev) => [
      ...prev,
      {
        id: getUniqueId('screen_system'),
        role: 'assistant',
        text: liveStreamType === 'camera'
          ? "🔓 **Camera Feed Disconnected.** I can no longer view your surroundings."
          : "🔓 **Screen Sharing Disconnected.** I can no longer view your screen or system audio."
      }
    ])
  }

  const captureCurrentFrame = (): string | null => {
    const video = hiddenVideoRef.current
    if (!video || !screenStream) return null
    
    const videoTrack = screenStream.getVideoTracks()[0]
    if (!videoTrack || videoTrack.readyState !== 'live') return null

    try {
      const canvas = document.createElement('canvas')
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      
      if (width === 0 || height === 0) return null
      
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height)
        return canvas.toDataURL('image/jpeg', 0.8)
      }
    } catch (err) {
      console.error("Failed to capture screen frame:", err)
    }
    return null
  }

  // DOM Refs
  const listRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)

  // Load past conversations
  useEffect(() => {
    let isMounted = true
    fetch('/api/tenant/conversations')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.conversations && Array.isArray(data.conversations)) {
          setConversations(data.conversations)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, isLoading, isResearching, isGeneratingImage])

  // Close attachment menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(e.target as Node)
      ) {
        setAttachmentMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load past conversation
  const selectConversation = async (convId: string) => {
    try {
      setIsLoading(true)
      setSessionId(convId)
      localStorage.setItem('rowan_active_session_id', convId)
      const res = await fetch(`/api/tenant/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: { id?: string; role?: 'user' | 'assistant'; content?: string; text?: string }) => ({
              id: m.id || getUniqueId('msg'),
              role: m.role || 'user',
              text: m.content || m.text || ''
            }))
          )
        }
      }
      setHistoryOpen(false)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  // Start fresh conversation
  const startNewConversation = () => {
    const newId = getUniqueId('sess')
    setSessionId(newId)
    localStorage.setItem('rowan_active_session_id', newId)
    setMessages([])
    setInput('')
    setAttachedFiles([])
    setHistoryOpen(false)
    stopTTS()
    if (voiceModeActive || isRealtimeActive) {
      rtStop()
      setVoiceModeActive(false)
    }
  }

  // Delete conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/tenant/conversations/${convId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (sessionId === convId) {
        localStorage.removeItem('rowan_active_session_id')
        startNewConversation()
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  // Generate & Edit Image Flow
  const handleGenerateImage = async (
    promptText: string,
    options?: {
      aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
      styleIntent?: string
      refineFromPrevious?: boolean
      previousPrompt?: string
      refinementInstruction?: string
      previousImageUrl?: string
    }
  ) => {
    const prompt = promptText.trim()
    if (!prompt) return

    setIsGeneratingImage(true)
    setGeneratingPrompt(options?.refinementInstruction ? `Editing with: "${options.refinementInstruction}"` : prompt)
    setAttachmentMenuOpen(false)

    try {
      let res: Response
      const imageFile = attachedFiles.find((f) => f.type.startsWith('image/'))
      
      // If we have an image attachment or previous image URL, route to /api/image/edit
      if (imageFile || (options?.refineFromPrevious && options?.previousImageUrl)) {
        const formData = new FormData()
        if (imageFile) {
          formData.append('image', imageFile.file)
          setAttachedFiles([])
        } else if (options?.previousImageUrl) {
          if (options.previousImageUrl.startsWith('data:image/')) {
            // Send base64 JSON payload directly
            res = await fetch('/api/image/edit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                imageData: options.previousImageUrl,
                prompt: options.refinementInstruction || prompt
              })
            })
          } else {
            // Fetch blob from URL and send as FormData
            try {
              const imageFetch = await fetch(options.previousImageUrl)
              const imageBlob = await imageFetch.blob()
              formData.append('image', imageBlob, 'source-image.png')
            } catch {
              formData.append('previousImageUrl', options.previousImageUrl)
            }
          }
        }

        if (!res!) {
          formData.append('prompt', options?.refinementInstruction || prompt)
          res = await fetch('/api/image/edit', {
            method: 'POST',
            body: formData
          })
        }
      } else {
        res = await fetch('/api/image/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            aspectRatio: options?.aspectRatio || '1:1',
            styleIntent: options?.styleIntent || 'general',
            refineFromPrevious: options?.refineFromPrevious || false,
            previousPrompt: options?.previousPrompt,
            refinementInstruction: options?.refinementInstruction
          })
        })
      }

      const data = await res.json() as { success?: boolean; imageUrl?: string; message?: string; enhancedPrompt?: string; provider?: string }
      if (data.success && data.imageUrl) {
        setMessages((prev) => [
          ...prev,
          {
            id: getUniqueId('img'),
            role: 'assistant',
            text: `Here is your ${options?.refinementInstruction ? 'edited' : 'generated'} image for: **"${prompt}"**\n${
              options?.refinementInstruction ? `*Applied edit instruction:* "${options.refinementInstruction}"\n` : ''
            }*Engine:* ${data.provider || 'ChatGPT Image (chatgpt-image-latest)'}`,
            image: {
              url: data.imageUrl,
              prompt: data.enhancedPrompt || prompt,
              provider: data.provider
            }
          }
        ])
      } else {
        throw new Error(data.message || 'Image process failed')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to process image'
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('err'),
          role: 'assistant',
          text: `I was unable to process the image: ${errMsg}. Please try another instruction!`
        }
      ])
    } finally {
      setIsGeneratingImage(false)
      setGeneratingPrompt('')
    }
  }

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    if (!textToSend) {
      wasLastInputVoiceRef.current = false
    }
    const query = (textToSend || input).trim()
    if (!query || isLoading || isGeneratingImage) return

    const lower = query.toLowerCase()

    // 1. Direct Image Generation Intent
    const isImageGenCommand =
      lower.startsWith('generate an image') ||
      lower.startsWith('create an image') ||
      lower.startsWith('rowan, generate an image') ||
      lower.startsWith('draw a ') ||
      lower.startsWith('generate image of') ||
      lower.startsWith('draw an image') ||
      lower.startsWith('make an image') ||
      lower.startsWith('make a picture') ||
      lower.startsWith('create a picture')

    // 2. Direct Image Edit / Modification Intent
    const isImageEditCommand =
      (lower.includes('edit') && (lower.includes('image') || lower.includes('picture') || lower.includes('photo') || lower.includes('this') || lower.includes('face'))) ||
      (lower.includes('modify') && (lower.includes('image') || lower.includes('picture') || lower.includes('photo') || lower.includes('this'))) ||
      (lower.includes('change') && (lower.includes('image') || lower.includes('picture') || lower.includes('photo') || lower.includes('background') || lower.includes('face'))) ||
      (lower.includes('transform') && (lower.includes('image') || lower.includes('picture') || lower.includes('photo'))) ||
      lower.startsWith('edit this') ||
      lower.startsWith('edit image') ||
      lower.startsWith('edit picture') ||
      lower.startsWith('change the picture') ||
      lower.startsWith('change this picture')

    const imageFileAttached = attachedFiles.some((f) => f.type.startsWith('image/'))
    const lastMsgWithImage = [...messages].reverse().find((m) => m.image?.url)

    // Handle Image Edit Request
    if (isImageEditCommand || (imageFileAttached && (lower.includes('edit') || lower.includes('change') || lower.includes('add') || lower.includes('make')))) {
      const promptInstruction = query
        .replace(/^(rowan,?\s*)?(edit\s+(this\s+)?(image|picture|photo)?|modify\s+(this\s+)?(image|picture|photo)?|change\s+(this\s+)?(image|picture|photo)?)/i, '')
        .trim() || query

      const userMsg: Message = {
        id: getUniqueId('user'),
        role: 'user',
        text: query
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      const sourceUrl = lastMsgWithImage?.image?.url
      await handleGenerateImage(promptInstruction, {
        refineFromPrevious: true,
        previousImageUrl: sourceUrl,
        refinementInstruction: promptInstruction
      })
      return
    }

    // Handle Image Creation Request
    if (isImageGenCommand) {
      const promptOnly = query
        .replace(/^(rowan,?\s*)?(generate\s+(an\s+)?image(\s+of)?|create\s+(an\s+)?image(\s+of)?|draw\s+(a|an)?|make\s+(a|an)?\s*(image|picture)?(\s+of)?)/i, '')
        .trim()
      
      const userMsg: Message = {
        id: getUniqueId('user'),
        role: 'user',
        text: query
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      
      await handleGenerateImage(promptOnly || query)
      return
    }

    // Normal message flow
    let fullQuery = query
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map((f) => `[Attachment: ${f.name} (${f.type})]`).join(' ')
      fullQuery = `${query}\n\n${fileList}`
    }

    let frameBase64: string | undefined = undefined
    if (isScreenSharing) {
      const captured = captureCurrentFrame()
      if (captured) {
        frameBase64 = captured
      }
    }

    const userMsg: Message = {
      id: getUniqueId('user'),
      role: 'user',
      text: query,
      image: frameBase64 ? { url: frameBase64, prompt: 'Screen Capture' } : undefined
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    // Name conversation after first message
    if (messages.length === 0) {
      const chatTitle = query.trim().substring(0, 50) 
      fetch(`/api/tenant/conversations/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chatTitle })
      }).catch(console.error)
      setConversations((prev) => [{ id: sessionId, title: chatTitle }, ...prev])
    }

    // Trigger research state indicator if webSearchMode is active or search query detected
    const isSearchQuery =
      webSearchMode &&
      (lower.includes('search') ||
        lower.includes('news') ||
        lower.includes('latest') ||
        lower.includes('who is') ||
        lower.includes('what is') ||
        lower.includes('weather') ||
        lower.includes('today') ||
        lower.includes('current'))
    if (isSearchQuery) {
      setIsResearching(true)
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: fullQuery,
          sessionId,
          enableSearch: webSearchMode,
          screenFrame: frameBase64
        })
      })

      const data = await response.json() as {
        success?: boolean
        message?: string
        products?: Array<{ id?: string; name: string; price: number; category?: string }>
        research?: {
          query?: string
          summary?: string
          sources?: ResearchSourceItem[]
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `Service error ${response.status}`)
      }

      const botReply = data.message?.trim() || 'Rowan could not generate a response.'

      // Format research if present
      let researchObj: Message['research'] = undefined
      if (data.research?.sources && data.research.sources.length > 0) {
        researchObj = {
          query: data.research.query || query,
          summary: data.research.summary,
          sources: data.research.sources
        }
      }

      const botMsg: Message = {
        id: getUniqueId('bot'),
        role: 'assistant',
        text: botReply,
        products: data.products,
        research: researchObj
      }

      setMessages((prev) => [...prev, botMsg])

      if (wasLastInputVoiceRef.current) {
        speak(botMsg.id, botMsg.text)
        wasLastInputVoiceRef.current = false
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown network failure'
      setMessages((prev) => [
        ...prev,
        {
          id: getUniqueId('err'),
          role: 'assistant',
          text: `Rowan encountered an error: ${errMsg}. Please try again.`
        }
      ])
    } finally {
      setIsLoading(false)
      setIsResearching(false)
    }
  }

  // Toggle Live Voice Mode
  const handleToggleVoiceMode = async () => {
    if (voiceModeActive || isRealtimeActive) {
      rtStop()
      setVoiceModeActive(false)
    } else {
      setVoiceModeActive(true)
      try {
        await rtStart()
      } catch {
        // Handled inside rt hook
      }
    }
  }

  // Message Actions
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedback((prev) => ({ ...prev, [id]: type }))
  }

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUser) {
      handleSendMessage(lastUser.text)
    }
  }

  // Open website preview
  const handleOpenWebsite = (url: string, title?: string) => {
    setActivePreview({ url, title })
  }

  // File Attachments
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles: AttachedFile[] = Array.from(files).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type || 'file'
    }))
    setAttachedFiles((prev) => [...prev, ...newFiles])
    setAttachmentMenuOpen(false)
  }

  // Active assistant state for avatar
  let currentAvatarState: RowanAvatarState = 'idle'
  if (voiceModeActive || isRealtimeActive) {
    if (rtError) currentAvatarState = 'error'
    else if (rtIsSearching) currentAvatarState = 'processing'
    else if (rtIsSpeaking) currentAvatarState = 'speaking'
    else if (rtIsListening) currentAvatarState = 'listening'
    else currentAvatarState = 'idle'
  } else if (isGeneratingImage) {
    currentAvatarState = 'processing'
  } else if (isResearching) {
    currentAvatarState = 'processing'
  } else if (isLoading) {
    currentAvatarState = 'thinking'
  }


  // Minimized Floating Avatar Mode
  if (isMinimized) {
    return (
      <div
        {...(dragHandleProps || {})}
        onClick={onExpand}
        className="w-full h-full flex flex-col items-center justify-center cursor-pointer relative transition-all hover:scale-[1.05] active:scale-[0.98] group touch-none select-none drop-shadow-[0_12px_30px_rgba(0,0,0,0.5)]"
        style={{ touchAction: 'none' }}
        title="Tap to expand chatbot window"
      >
        {/* Glow Aura when live voice mode is active */}
        {rtIsSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.75, 0.35] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-blue-500/30 blur-2xl pointer-events-none"
          />
        )}
        {rtIsListening && (
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-emerald-400/30 blur-2xl pointer-events-none"
          />
        )}

        {/* Mascot App Icon */}
        <div className="relative z-10 flex items-center justify-center">
          <RowanExpressiveAvatar
            state={currentAvatarState}
            size={80}
            audioLevel={rtAudioLevel}
            theme={currentTheme}
            variant="icon"
            showStatusBadge={false}
          />
        </div>

        {/* Live Mode State Badge when shouting Rowan */}
        {(rtIsListening || rtIsSpeaking || rtIsSearching) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute -bottom-1 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-blue-500/60 text-[10px] font-bold text-blue-400 flex items-center gap-1 shadow-xl pointer-events-none z-30"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${rtIsSpeaking ? 'bg-blue-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{rtIsSpeaking ? 'Speaking' : rtIsSearching ? 'Thinking' : 'Listening'}</span>
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col h-full w-full overflow-hidden select-none font-sans ${
        isDark ? 'bg-[#0c1017] text-white' : 'bg-white text-zinc-900'
      }`}
      id="rowan-conversational-interface"
    >
      {/* NATIVE CHROME/EDGE SCREEN PICKER GUIDE OVERLAY */}
      <AnimatePresence>
        {isSharePickerGuiding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`max-w-md w-full rounded-2xl border p-5 shadow-2xl relative flex flex-col gap-4 ${
                isDark
                  ? 'bg-[#131b2e] border-blue-500/30 text-zinc-100'
                  : 'bg-white border-zinc-200 text-zinc-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsSharePickerGuiding(false)}
                className={`absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">Live Visual & Screen Sharing</h3>
                  <p className="text-[10px] sm:text-xs text-zinc-400 leading-tight mt-0.5">Select a device layout or method to share your screen.</p>
                </div>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex border-b border-zinc-700/30 pb-1.5 gap-2">
                <button
                  type="button"
                  onClick={() => setSharingModalTab('desktop')}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sharingModalTab === 'desktop'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                      : isDark ? 'bg-slate-800/40 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  💻 Desktop / Windows
                </button>
                <button
                  type="button"
                  onClick={() => setSharingModalTab('mac')}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sharingModalTab === 'mac'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15'
                      : isDark ? 'bg-slate-800/40 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  🍎 macOS Setup
                </button>
                <button
                  type="button"
                  onClick={() => setSharingModalTab('mobile')}
                  className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    sharingModalTab === 'mobile'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15'
                      : isDark ? 'bg-slate-800/40 text-zinc-400 hover:text-white' : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  📱 Mobile / Camera
                </button>
              </div>

              {/* TAB CONTENT: DESKTOP */}
              {sharingModalTab === 'desktop' && (
                <div className="space-y-3 my-1">
                  <p className="text-xs text-zinc-400 leading-normal mb-1">
                    Perfect for Windows, Chrome, Edge, and other laptop/desktop screens. Unlock the grayed-out "Share" button:
                  </p>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">1</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Select a tab at the top: <span className="underline decoration-blue-500">Entire Screen</span> or <span className="underline decoration-blue-500">Window</span>.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">2</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      👉 <span className="text-emerald-400 font-extrabold uppercase">Click directly on the thumbnail preview image</span> of your screen in the browser popup list to highlight it.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">3</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      The browser's native <span className="text-blue-400 font-extrabold">"Share"</span> button will light up!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: MAC OS */}
              {sharingModalTab === 'mac' && (
                <div className="space-y-3 my-1">
                  <p className="text-xs text-zinc-400 leading-normal mb-1">
                    If screen sharing fails on your MacBook or iMac with a permission error:
                  </p>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">1</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Open 🍎 {"System Settings > Privacy & Security > Screen & System Audio Recording"}.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">2</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Toggle the switch **ON** for your browser (e.g., Chrome, Edge, Safari, Brave).
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">3</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      **Restart your browser** to apply the macOS permission changes, then click Share Screen!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: MOBILE / CAMERA */}
              {sharingModalTab === 'mobile' && (
                <div className="space-y-3 my-1">
                  <p className="text-xs text-zinc-400 leading-normal mb-1">
                    iOS and Android browsers restrict native screen recording for security. Point your **phone's back camera** at your screen, MacBook, paper, or surroundings to stream directly to Rowan:
                  </p>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">1</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Rowan uses your mobile device's high-definition back/environment camera.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">2</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Simply point your phone at any Windows PC, MacBook, paperwork, or physical device.
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">3</span>
                    <p className="text-xs font-semibold leading-relaxed">
                      Rowan will analyze the video feed in real-time. Feel free to ask questions about anything visible!
                    </p>
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="flex justify-between items-center mt-1 border-t border-zinc-700/30 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSharePickerGuiding(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                
                {sharingModalTab === 'mobile' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSharePickerGuiding(false)
                      startCameraSharing()
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-emerald-600/20 animate-pulse"
                  >
                    Launch Live Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSharePickerGuiding(false)
                      startScreenSharing()
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-colors shadow-lg shadow-blue-600/20"
                  >
                    {sharingModalTab === 'mac' ? 'Start Screen Share' : 'Got it, Share Screen!'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER BAR & DRAG HANDLE */}
      <header
        {...dragHandleProps}
        className={`flex-shrink-0 px-4 py-3 flex items-center justify-between border-b gap-3 z-20 select-none ${
          isFloating && !isExpanded ? 'cursor-grab active:cursor-grabbing' : ''
        } ${
          isDark
            ? 'bg-[#0e1420]/95 border-slate-800/90 text-zinc-100'
            : 'bg-white/95 border-zinc-200 text-zinc-800'
        }`}
      >
        {/* Left: Rowan Brand & Mode Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <RowanExpressiveAvatar
              state={currentAvatarState}
              size={32}
              theme={currentTheme}
              showStatusBadge={false}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm tracking-tight text-white dark:text-white">
                rowan<span className="text-blue-500">.ai</span>
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  voiceModeActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isGeneratingImage
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : isResearching
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : isDark
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {voiceModeActive
                  ? 'Live Voice'
                  : isGeneratingImage
                  ? 'Generating'
                  : isResearching
                  ? 'Researching'
                  : 'Assistant'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Subtle Drag Handle Pill (for clear affordance) */}
        {isFloating && !isExpanded && (
          <div
            className={`hidden sm:flex items-center justify-center px-2.5 py-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors ${
              isDark ? 'bg-slate-900/60' : 'bg-zinc-100'
            }`}
            title="Drag window anywhere"
          >
            <GripHorizontal className="w-4 h-4 opacity-70" />
          </div>
        )}

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-slate-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* History Toggle */}
          <button
            type="button"
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              historyOpen
                ? 'bg-blue-600/20 text-blue-400'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Chat History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Maximize / Minimize button */}
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-slate-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-slate-800' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. HISTORY DRAWER (INSIDE ROWAN WINDOW) */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`absolute top-12 left-0 bottom-0 w-64 z-40 p-4 flex flex-col border-r shadow-2xl backdrop-blur-xl ${
              isDark ? 'bg-[#0f1522]/98 border-slate-800 text-white' : 'bg-white/98 border-zinc-200 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Conversations</span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={startNewConversation}
              className="flex items-center justify-center gap-2 w-full py-2 mb-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Conversation</span>
            </button>

            <div className="flex-grow overflow-y-auto space-y-1 pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No previous conversations</p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      sessionId === c.id
                        ? 'bg-blue-600/20 text-blue-400 font-semibold'
                        : isDark
                        ? 'hover:bg-slate-800/80 text-zinc-300'
                        : 'hover:bg-zinc-100 text-zinc-700'
                    }`}
                  >
                    <span className="truncate max-w-[170px]">{c.title || c.snippet || 'Chat session'}</span>
                    <button
                      type="button"
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. WEBSITE PREVIEW LAYER (INSIDE ROWAN CONTAINER) */}
      <AnimatePresence>
        {activePreview && (
          <RowanWebsitePreview
            url={activePreview.url}
            title={activePreview.title}
            onClose={() => setActivePreview(null)}
            onBack={() => setActivePreview(null)}
            theme={currentTheme}
          />
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT AREA (DYNAMIC STATE SWITCHER) */}
      <div className="relative flex-grow overflow-hidden flex flex-col">
        {/* STATE: LIVE VOICE MODE */}
        {voiceModeActive ? (
          <RowanLiveVoiceView
            status={rtStatus}
            isListening={rtIsListening}
            isSpeaking={rtIsSpeaking}
            isSearching={rtIsSearching}
            searchQuery={rtSearchQuery}
            transcript={rtTranscript}
            error={rtError}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onStop={() => {
              rtStop()
              setVoiceModeActive(false)
            }}
            onBackToChat={() => setVoiceModeActive(false)}
            theme={currentTheme}
            activeConversationLock={activeConversation}
            diagnostics={diagnostics}
            activePreview={activePreview}
            onClosePreview={() => setActivePreview(null)}
            onOpenWebsite={(url, title) => setActivePreview({ url, title })}
          />
        ) : messages.length === 0 ? (
          /* STATE: IDLE HERO (NEW CHAT) */
          <div className="flex-grow overflow-y-auto flex items-center justify-center p-4">
            <RowanIdleHero
              onSelectPrompt={(p) => handleSendMessage(p)}
              onStartVoice={handleToggleVoiceMode}
              theme={currentTheme}
            />
          </div>
        ) : (
          /* STATE: CHAT CONVERSATION VIEW */
          <div
            ref={listRef}
            className="flex-grow overflow-y-auto p-4 sm:p-5 space-y-5 select-text"
          >
            {messages.map((m) => {
              const isUser = m.role === 'user'

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} group`}
                >
                  {/* Message Bubble Container */}
                  <div className={`flex gap-3 max-w-[88%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Assistant Avatar */}
                    {!isUser && (
                      <div className="flex-shrink-0 mt-0.5">
                        <RowanExpressiveAvatar
                          state="idle"
                          size={28}
                          theme={currentTheme}
                          showStatusBadge={false}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="space-y-2 min-w-0">
                      {isUser ? (
                        /* User Message: Contained subtle pill */
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                              isDark
                                ? 'bg-blue-600 text-white rounded-br-sm shadow-md'
                                : 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                            }`}
                          >
                            {m.text}
                          </div>
                          {m.image && (
                            <div className="relative rounded-xl overflow-hidden border border-slate-700/60 max-w-[200px] shadow-lg bg-black">
                              <img
                                src={m.image.url}
                                alt="Screen Capture"
                                referrerPolicy="no-referrer"
                                className="w-full h-auto object-cover max-h-[140px]"
                              />
                              <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-bold text-white tracking-wide uppercase">
                                {m.image.prompt || 'Screen Frame'}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Rowan Message: Unboxed free text with rich markdown & research */
                        <div
                          className={`text-xs sm:text-sm leading-relaxed ${
                            isDark ? 'text-zinc-100' : 'text-zinc-800'
                          }`}
                        >
                          <RowanMarkdown content={m.text} theme={currentTheme} />

                          {/* Generated Image Card */}
                          {m.image && (
                            <RowanImageCard
                              imageUrl={m.image.url}
                              prompt={m.image.prompt}
                              provider={m.image.provider}
                              onRegenerate={(p, opts) => handleGenerateImage(p, opts)}
                              theme={currentTheme}
                            />
                          )}

                          {/* Research Sources Card Section */}
                          {m.research?.sources && m.research.sources.length > 0 && (
                            <RowanResearchView
                              query={m.research.query}
                              summary={m.research.summary}
                              sources={m.research.sources}
                              onOpenWebsite={handleOpenWebsite}
                              theme={currentTheme}
                            />
                          )}

                          {/* Message Actions */}
                          <div className="flex items-center gap-1 mt-2 text-zinc-500 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleCopy(m.id, m.text)}
                              className="p-1 rounded hover:text-blue-400 hover:bg-slate-800/60 transition-colors"
                              title="Copy response"
                            >
                              {copiedId === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => speak(m.id, m.text)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                speakingId === m.id
                                  ? 'text-blue-400 bg-blue-500/20'
                                  : pausedId === m.id
                                  ? 'text-amber-400 bg-amber-500/20'
                                  : loadingId === m.id
                                  ? 'text-blue-400 animate-pulse'
                                  : 'hover:text-blue-400 hover:bg-slate-800/60'
                              }`}
                              title={
                                speakingId === m.id
                                  ? 'Pause read aloud'
                                  : pausedId === m.id
                                  ? 'Resume read aloud'
                                  : 'Read aloud'
                              }
                            >
                              {speakingId === m.id ? (
                                <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                              ) : (
                                <Volume2 className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleFeedback(m.id, 'up')}
                              className={`p-1 rounded transition-colors ${
                                feedback[m.id] === 'up' ? 'text-blue-400' : 'hover:text-blue-400 hover:bg-slate-800/60'
                              }`}
                              title="Good response"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleFeedback(m.id, 'down')}
                              className={`p-1 rounded transition-colors ${
                                feedback[m.id] === 'down' ? 'text-rose-400' : 'hover:text-rose-400 hover:bg-slate-800/60'
                              }`}
                              title="Bad response"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={handleRegenerate}
                              className="p-1 rounded hover:text-blue-400 hover:bg-slate-800/60 transition-colors"
                              title="Regenerate answer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* RESEARCHING / THINKING ACTIVE STATE */}
            {isResearching && (
              <div className="flex items-center gap-3 pl-1 text-xs font-semibold text-blue-400 animate-fade-in">
                <div className="w-5 h-5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin flex-shrink-0" />
                <span>Rowan is researching the web...</span>
              </div>
            )}

            {/* GENERATING IMAGE ACTIVE STATE */}
            {isGeneratingImage && (
              <div className="flex items-center gap-3 pl-1 text-xs font-semibold text-purple-400 animate-fade-in">
                <Wand2 className="w-4 h-4 animate-spin text-purple-400 flex-shrink-0" />
                <span>Creating your image: "{generatingPrompt}"...</span>
              </div>
            )}

            {/* GENERAL REASONING STATE */}
            {isLoading && !isResearching && !isGeneratingImage && (
              <div className="flex items-center gap-3 pl-1 text-xs font-semibold text-blue-400 animate-fade-in">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                <span>Rowan is thinking...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SCREEN SHARING STATUS & LIVE THUMBNAIL */}
      {isScreenSharing && (
        <div className={`mx-4 mb-2 p-2 rounded-xl border flex items-center justify-between gap-3 ${
          isDark ? 'bg-[#121824]/90 border-emerald-500/30' : 'bg-emerald-50/95 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative h-10 w-16 bg-black rounded border border-emerald-500/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
              <video
                ref={(node) => {
                  if (node) {
                    node.srcObject = screenStream
                  }
                  hiddenVideoRef.current = node
                }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0.5 left-0.5 bg-emerald-500 text-[8px] px-1 py-0.5 rounded-sm font-bold text-white uppercase tracking-wider scale-90 origin-top-left">
                LIVE
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  {liveStreamType === 'camera' ? 'Live Camera Feed' : 'Screen Connected'}
                </span>
              </div>
              <p className="text-[9px] text-zinc-400 truncate max-w-[180px] sm:max-w-xs">
                {liveStreamType === 'camera' 
                  ? 'Rowan is watching your live video feed. Point it at any screen or device.'
                  : 'Rowan is viewing and listening. Ask anything about your screen.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                const frame = captureCurrentFrame()
                if (frame) {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: getUniqueId('screen_snapshot'),
                      role: 'user',
                      text: liveStreamType === 'camera' 
                        ? 'Rowan, look at this camera frame.' 
                        : 'Rowan, look at this screen snapshot.',
                      image: { url: frame, prompt: liveStreamType === 'camera' ? 'Camera Capture' : 'Screen Capture' }
                    }
                  ])
                  handleSendMessage(liveStreamType === 'camera' 
                    ? 'Analyze this camera frame, explain what is visible, and answer any questions.' 
                    : 'Analyze this screen frame, explain what is visible, and answer any questions.')
                }
              }}
              className="text-[9px] sm:text-xs font-bold px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors"
            >
              Snapshot
            </button>
            <button
              type="button"
              onClick={() => stopScreenSharing()}
              className="text-[9px] sm:text-xs font-bold px-2 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white cursor-pointer transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* 5. FLOATING COMPOSER (ANCHORED INSIDE THE ROWAN WINDOW AT THE BOTTOM) */}
      <footer
        className={`flex-shrink-0 p-3 sm:p-3.5 border-t relative z-20 ${
          isDark
            ? 'bg-[#0c1017] border-slate-800/90'
            : 'bg-white border-zinc-200'
        }`}
        id="rowan-docked-composer"
      >
        {/* ATTACHMENT / TOOLS MENU POPOVER */}
        <AnimatePresence>
          {attachmentMenuOpen && (
            <motion.div
              ref={attachmentMenuRef}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={`absolute bottom-full left-3 mb-2 w-64 p-2 rounded-2xl border shadow-2xl backdrop-blur-xl z-40 space-y-1 ${
                isDark ? 'bg-[#121722] border-slate-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Rowan Capabilities
              </div>

              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click()
                  setAttachmentMenuOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isDark ? 'hover:bg-slate-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Upload Document</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  imageInputRef.current?.click()
                  setAttachmentMenuOpen(false)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isDark ? 'hover:bg-slate-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span>Upload Image</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWebSearchMode(!webSearchMode)
                  setAttachmentMenuOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isDark ? 'hover:bg-slate-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Web Research</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    webSearchMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {webSearchMode ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAttachmentMenuOpen(false)
                  setInput('Rowan, generate an image of ')
                  if (textareaRef.current) textareaRef.current.focus()
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isDark ? 'hover:bg-slate-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>Generate Image</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAttachmentMenuOpen(false)
                  if (isScreenSharing) {
                    stopScreenSharing()
                  } else {
                    initiateScreenSharing()
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isDark ? 'hover:bg-slate-800 text-zinc-200' : 'hover:bg-zinc-100 text-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Share Screen / Audio</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isScreenSharing ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {isScreenSharing ? 'ACTIVE' : 'START'}
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileUpload}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={handleFileUpload}
        />

        {/* Attached files pills */}
        {attachedFiles.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto py-1">
            {attachedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs border border-blue-500/30 flex-shrink-0"
              >
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* COMPOSER BAR MATCHING SPEC: [+] [Ask Rowan anything...] [Mic] [Voice] [Send] */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border transition-all ${
            isDark
              ? 'bg-[#121824] border-slate-800 focus-within:border-blue-500/60 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)]'
              : 'bg-zinc-100 border-zinc-200 focus-within:border-blue-400 focus-within:bg-white'
          }`}
        >
          {/* [+] Attachment Button */}
          <button
            type="button"
            onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
              attachmentMenuOpen
                ? 'bg-blue-600 text-white'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Attach or Tools"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask Rowan anything..."
            className={`flex-grow bg-transparent text-xs sm:text-sm resize-none focus:outline-none max-h-28 py-1.5 font-medium ${
              isDark ? 'text-zinc-100 placeholder-zinc-500' : 'text-zinc-800 placeholder-zinc-400'
            }`}
          />

          {/* Dictation Mic Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
              isListeningMic
                ? 'bg-rose-500 text-white animate-pulse'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title={isListeningMic ? 'Stop dictation' : 'Voice dictation'}
          >
            <Mic className="w-4 h-4" />
          </button>

          {/* Screen Sharing Toggle Button (Monitor) */}
          <button
            type="button"
            onClick={isScreenSharing ? () => stopScreenSharing() : initiateScreenSharing}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
              isScreenSharing
                ? 'bg-emerald-500 text-white shadow-lg animate-pulse'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <Monitor className="w-4 h-4" />
          </button>

          {/* Live Voice Toggle Button (Headphones) */}
          <button
            type="button"
            onClick={handleToggleVoiceMode}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer flex-shrink-0 ${
              voiceModeActive
                ? 'bg-emerald-500 text-white shadow-lg'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Switch to Live Voice Mode"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!input.trim() && attachedFiles.length === 0}
            className={`p-1.5 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
              input.trim() || attachedFiles.length > 0
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-500 active:scale-95'
                : isDark
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  )
}
