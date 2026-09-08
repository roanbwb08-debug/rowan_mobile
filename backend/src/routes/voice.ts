import { Router } from 'express'
import { z } from 'zod'
import { performWebResearch } from '../services/ai/research.js'
import { isOpenAIExhausted, markOpenAIQuotaExhausted, checkOpenAIQuotaStatus } from '../services/ai/providers.js'

const router = Router()

// Rate limiting and validation helper
const transcribeSchema = z.object({
  audio: z.string(), // base64 string
  mimeType: z.string().optional()
})

const speechSchema = z.object({
  text: z.string().trim().min(1),
  voice: z.string().optional()
})

// Endpoint 1: Transcribe Speech to Text (Gemini + OpenAI Whisper Fallback)
router.post('/transcribe', async (req, res) => {
  try {
    const parsed = transcribeSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid speech payload.' })
    }

    const { audio, mimeType } = parsed.data
    const base64Data = audio.includes('base64,') ? audio.split('base64,')[1] : audio
    const buffer = Buffer.from(base64Data, 'base64')

    if (buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Audio payload is empty.' })
    }

    console.log(`[VOICE] Transcribing audio buffer of size ${buffer.length} bytes, type ${mimeType || 'audio/webm'}`)

    // Priority 1: Gemini Multimodal Audio Transcription
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest']

        for (const modelName of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType || 'audio/webm'
                    }
                  },
                  {
                    text: 'Transcribe this spoken user audio query accurately into text. Return ONLY the exact transcribed text, without preambles or quotes.'
                  }
                ]
              }
            })

            const text = response.text?.trim()
            if (text) {
              console.log(`[VOICE] Gemini transcribed audio successfully with ${modelName}: "${text}"`)
              return res.json({
                success: true,
                text,
                provider: 'Gemini Multimodal Speech'
              })
            }
          } catch (mErr: unknown) {
            const isUnavailable = String(mErr).includes('503') || String(mErr).includes('UNAVAILABLE') || String(mErr).includes('high demand')
            if (isUnavailable) {
              console.log(`[VOICE] Model ${modelName} busy, trying alternate model...`)
              continue
            }
            throw mErr
          }
        }
      } catch (gErr) {
        console.warn('[VOICE] Gemini transcription note:', gErr instanceof Error ? gErr.message : String(gErr))
      }
    }

    // Priority 2: OpenAI Whisper API
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey && !isOpenAIExhausted() && !(await checkOpenAIQuotaStatus(apiKey))) {
      try {
        const ext = mimeType?.includes('wav') ? 'wav' : mimeType?.includes('mp3') ? 'mp3' : 'webm'
        const filename = `recording.${ext}`

        const formData = new FormData()
        const blob = new Blob([buffer], { type: mimeType || 'audio/webm' })
        formData.append('file', blob, filename)
        formData.append('model', 'whisper-1')

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        })

        if (response.ok) {
          const result = await response.json() as { text: string }
          console.log(`[VOICE] Whisper transcribed audio: "${result.text}"`)
          return res.json({
            success: true,
            text: result.text,
            provider: 'OpenAI Whisper'
          })
        } else {
          const errorText = await response.text()
          if (errorText.includes('insufficient_quota') || errorText.includes('credit_balance_exhausted')) {
            markOpenAIQuotaExhausted()
          }
        }
      } catch (wErr) {
        console.warn('[VOICE] Whisper transcription note:', wErr instanceof Error ? wErr.message : String(wErr))
      }
    }

    return res.status(200).json({
      success: false,
      message: 'Server speech transcription unavailable. Relying on client Web Speech API.'
    })
  } catch (err) {
    console.error('[VOICE] Transcription route crash:', err)
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Transcription failed due to an unexpected error.'
    })
  }
})

// Endpoint 2: Generate Speech from Text (OpenAI TTS)
// Endpoint 2.5: Generate Speech from Text via GET stream
router.get('/speech', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[VOICE ENDPOINT] OpenAI API Key is missing on the server for GET stream.')
    return res.status(503).json({
      success: false,
      useNativeSpeech: true,
      message: 'OpenAI is not configured. Please supply an OPENAI_API_KEY.'
    })
  }

  const text = (req.query.text as string || '').trim()
  const voice = (req.query.voice as string || 'nova').trim()

  if (!text) {
    return res.status(400).json({ success: false, message: 'Text query parameter is required.' })
  }

  if (isOpenAIExhausted() || await checkOpenAIQuotaStatus(apiKey)) {
    return res.status(503).json({
      success: false,
      isQuotaExhausted: true,
      useNativeSpeech: true,
      message: 'OpenAI speech quota exhausted. Use browser SpeechSynthesis.'
    })
  }

  try {
    console.log(`[VOICE GET STREAM] Streaming speech for text: "${text.substring(0, 40)}..." using voice ${voice}`)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      const isQuota = errorText.includes('insufficient_quota') || errorText.includes('credit_balance_exhausted')
      if (isQuota) {
        markOpenAIQuotaExhausted()
      }
      console.warn('[VOICE GET STREAM] OpenAI TTS API error:', response.status, errorText)
      return res.status(503).json({
        success: false,
        useNativeSpeech: true,
        message: 'OpenAI speech stream error. Use browser SpeechSynthesis.',
        isQuotaExhausted: isQuota
      })
    }

    res.set({
      'Content-Type': 'audio/mpeg'
    })

    if (response.body) {
      const readable = response.body as unknown as NodeJS.ReadableStream & {
        on: (event: string, cb: (chunk: Buffer) => void) => void
      }
      if (typeof readable.on === 'function') {
        readable.on('data', (chunk) => res.write(chunk))
        readable.on('end', () => res.end())
        readable.on('error', (err) => {
          console.error('[VOICE GET STREAM] Pipe error:', err)
          res.end()
        })
      } else {
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        res.set('Content-Length', String(buffer.length))
        res.send(buffer)
      }
    } else {
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      res.set('Content-Length', String(buffer.length))
      res.send(buffer)
    }
  } catch (err) {
    console.error('[VOICE GET STREAM] Speech generation crash:', err)
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Speech generation failed.'
    })
  }
})

router.post('/speech', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('[VOICE ENDPOINT] OpenAI API Key is missing on the server.')
    return res.status(503).json({
      success: false,
      useNativeSpeech: true,
      message: 'OpenAI is not configured. Please supply an OPENAI_API_KEY in Settings/Secrets.'
    })
  }

  // Proactive check: if OpenAI credits are exhausted, advise client to use native SpeechSynthesis
  if (isOpenAIExhausted() || await checkOpenAIQuotaStatus(apiKey)) {
    return res.status(503).json({
      success: false,
      isQuotaExhausted: true,
      useNativeSpeech: true,
      message: 'OpenAI speech quota exhausted. Use browser SpeechSynthesis.'
    })
  }

  try {
    const parsed = speechSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: 'Invalid speech request body.' })
    }

    const { text, voice } = parsed.data
    const selectedVoice = voice || 'nova'

    console.log(`[VOICE] Generating speech for text: "${text.substring(0, 40)}..." using voice ${selectedVoice}`)

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: selectedVoice
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      const isQuota = errorText.includes('insufficient_quota') || errorText.includes('credit_balance_exhausted')
      if (isQuota) {
        markOpenAIQuotaExhausted()
      }
      console.warn('[VOICE] OpenAI TTS API response:', response.status, errorText)
      return res.status(503).json({
        success: false,
        useNativeSpeech: true,
        message: 'OpenAI speech quota exhausted. Use browser SpeechSynthesis.',
        isQuotaExhausted: isQuota
      })
    }

    // Retrieve audio arrayBuffer and send as binary stream
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length
    })

    return res.send(buffer)
  } catch (err) {
    console.error('[VOICE] Speech generation route crash:', err)
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Speech generation failed due to an unexpected error.'
    })
  }
})

// Endpoint 3: Ephemeral Session Token for OpenAI Realtime WebRTC / WebSocket APIs
router.post('/session', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.json({
      success: true,
      useFallbackMode: true,
      isQuotaExhausted: true,
      message: 'OpenAI is not configured. Activating Rowan Live Voice.'
    })
  }

  // Proactive check: if OpenAI credits are already exhausted, return fallback flag directly
  if (isOpenAIExhausted() || await checkOpenAIQuotaStatus(apiKey)) {
    console.log('[VOICE] OpenAI credits exhausted. Returning fallback mode flag to client directly.')
    return res.json({
      success: true,
      useFallbackMode: true,
      isQuotaExhausted: true,
      message: 'OpenAI realtime credits are exhausted. Activating Rowan Live Voice directly.'
    })
  }

  try {
    console.log('[VOICE] Requesting ephemeral session from OpenAI Realtime API...')
    
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-mini-realtime-preview'

    // Request a session token from OpenAI Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      const isQuota = errorText.includes('insufficient_quota') || errorText.includes('credit_balance_exhausted')
      if (isQuota) {
        markOpenAIQuotaExhausted()
      }
      console.warn('[VOICE] OpenAI Realtime Session response:', response.status, errorText)
      return res.json({
        success: true,
        useFallbackMode: true,
        isQuotaExhausted: true,
        message: 'OpenAI Realtime session unavailable. Activating Rowan Live Voice.'
      })
    }

    const data = (await response.json()) as { client_secret?: { value?: string } | string; value?: string }
    const secretValue = (typeof data.value === 'string' && data.value)
      ? data.value
      : (typeof data.client_secret === 'string'
        ? data.client_secret
        : (data.client_secret?.value || ''))

    console.log('[VOICE] Ephemeral session created successfully with model:', model)

    return res.json({
      success: true,
      client_secret: { value: secretValue },
      model
    })
  } catch (err) {
    console.error('[VOICE] Session creation route crash:', err)
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : 'Failed to create session context.'
    })
  }
})

// Endpoint 4: Live Web Research (Tavily Search API)
const voiceResearchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  sessionId: z.string().optional()
})

router.post('/research', async (req, res) => {
  const parsed = voiceResearchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid research query.' })
  }

  try {
    const { query, sessionId } = parsed.data
    console.log(`[VOICE RESEARCH] Performing live research query: "${query}"`)
    const result = await performWebResearch(query, sessionId || 'voice-live-research')
    return res.json({
      success: result.success,
      summary: result.summary,
      sources: result.sources,
      provider: result.provider,
      error: result.error
    })
  } catch (err) {
    console.error('[VOICE RESEARCH ROUTE ERROR]:', err)
    return res.status(500).json({
      success: false,
      summary: 'Web search encountered an unexpected error.',
      sources: [],
      error: err instanceof Error ? err.message : 'Unknown error'
    })
  }
})

export default router
