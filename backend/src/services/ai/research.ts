import { GoogleGenAI } from '@google/genai'
import { sanitizeGeminiModel } from './generation.js'

export interface ResearchSource {
  title: string
  url: string
  snippet?: string
  image?: string
}

export interface ResearchResult {
  success: boolean
  summary: string
  sources: ResearchSource[]
  provider: string
  error?: string
}

const researchRateLimits = new Map<string, { count: number; reset: number }>()

/**
 * Check and enforce rate limits for web research tool (max 10 requests per minute per session)
 */
function isRateLimited(sessionId: string): boolean {
  const now = Date.now()
  const current = researchRateLimits.get(sessionId) ?? { count: 0, reset: now + 60_000 }

  if (now > current.reset) {
    current.count = 0
    current.reset = now + 60_000
  }

  current.count++
  researchRateLimits.set(sessionId, current)

  return current.count > 10
}

/**
 * Execute web research via Tavily or Gemini Google Search Grounding
 */
export async function performWebResearch(
  query: string,
  sessionId: string = 'global-research'
): Promise<ResearchResult> {
  if (isRateLimited(sessionId)) {
    console.warn(`[RESEARCH] Rate limit exceeded for session: ${sessionId}`)
    return {
      success: false,
      summary: 'Research requests are rate-limited. Please wait a moment and try again.',
      sources: [],
      provider: 'none',
      error: 'Rate limit exceeded'
    }
  }

  const providerPreference = (process.env.PRIMARY_RESEARCH_PROVIDER ?? 'tavily').toLowerCase()
  const tavilyKey = process.env.TAVILY_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  const trimmedQuery = (query || '').trim()
  if (!trimmedQuery || trimmedQuery.length < 2) {
    console.warn(`[RESEARCH] Query is too short or empty for research: "${query}"`)
    return {
      success: false,
      summary: 'Please provide a more specific search query.',
      sources: [],
      provider: 'none',
      error: 'Query is empty or too short'
    }
  }

  console.log(`[RESEARCH] Initiating research. Query: "${trimmedQuery}". Provider preference: ${providerPreference}`)

  // 1. Tavily Search Path (if key is present)
  if (tavilyKey) {
    try {
      console.log('[RESEARCH] Executing Tavily Search API request...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tavilyKey}`
        },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: trimmedQuery,
          search_depth: 'basic',
          max_results: 5,
          include_answer: true,
          include_images: true
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Tavily HTTP Error ${response.status}: ${errText}`)
      }

      const data = await response.json() as {
        answer?: string
        results?: Array<{ title: string; url: string; content: string; image?: string }>
        images?: string[]
      }

      const returnedImages = Array.isArray(data.images) ? data.images : []

      const sources: ResearchSource[] = (data.results || []).map((r, index) => ({
        title: r.title || 'Untitled Source',
        url: r.url || '#',
        snippet: r.content,
        image: r.image || returnedImages[index] || undefined
      }))

      const summary = data.answer || 
        (sources.length > 0 
          ? `Summarized web findings for "${trimmedQuery}":\n\n` + sources.map(s => `- ${s.title}: ${s.snippet}`).join('\n')
          : 'No specific research content found.')

      console.log(`[RESEARCH] Tavily query completed successfully with ${sources.length} sources.`)
      return {
        success: true,
        summary,
        sources,
        provider: 'Tavily Search API'
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[RESEARCH] Tavily Search failed:', errMsg)
      
      // Fallback to Gemini Grounding if key is present
      if (geminiKey) {
        console.log('[RESEARCH] Tavily failed. Falling back to Google Search Grounding...')
        return performGeminiSearchGrounding(trimmedQuery)
      }

      return {
        success: false,
        summary: 'Web search research was unsuccessful.',
        sources: [],
        provider: 'Tavily Search API',
        error: errMsg
      }
    }
  }

  // 2. Google Search Grounding Path (if key is present)
  if (geminiKey) {
    return performGeminiSearchGrounding(trimmedQuery)
  }

  console.warn('[RESEARCH] No active search keys (TAVILY_API_KEY or GEMINI_API_KEY) configured.')
  return {
    success: false,
    summary: 'Web research is currently unavailable (no keys configured on the server).',
    sources: [],
    provider: 'none',
    error: 'No search credentials'
  }
}

/**
 * Execute grounding with Google Search via official @google/genai SDK
 */
async function performGeminiSearchGrounding(query: string): Promise<ResearchResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      summary: 'Gemini API key not configured for search grounding.',
      sources: [],
      provider: 'Google Search Grounding',
      error: 'Missing GEMINI_API_KEY'
    }
  }

  try {
    console.log('[RESEARCH] Executing Google Search Grounding via Gemini SDK...')
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })

    // Use a fast flash model supporting grounding (e.g., gemini-3.7-flash)
    const primaryModel = sanitizeGeminiModel(process.env.GEMINI_MODEL || 'gemini-3.7-flash')
    const groundingModels = [
      primaryModel,
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash'
    ].filter((m, i, arr) => arr.indexOf(m) === i)

    let response = null
    let lastError: unknown = null

    for (const currentModel of groundingModels) {
      try {
        console.log(`[RESEARCH] Attempting Google Search Grounding with model: ${currentModel}`)
        response = await ai.models.generateContent({
          model: currentModel,
          contents: `Perform web research and synthesize a fresh, comprehensive, and objective factual summary answering this query. Clearly reference current state vs historical model knowledge where applicable. Query: "${query}"`,
          config: {
            systemInstruction: 'You are an elite research assistant. Synthesize real-time facts accurately.',
            maxOutputTokens: 800
          },
          tools: [{ googleSearch: {} }]
        })
        if (response.text) {
          break
        }
      } catch (err: unknown) {
        lastError = err
        const errMsg = err instanceof Error ? err.message : String(err)
        console.warn(`[RESEARCH] Grounding model ${currentModel} failed:`, errMsg)
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All grounding models failed.')
    }

    const text = response.text?.trim() || 'No grounding summary generated.'
    const metadata = response.candidates?.[0]?.groundingMetadata

    const sources: ResearchSource[] = []
    
    if (metadata?.groundingChunks) {
      const uniqueUrls = new Set<string>()
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri && !uniqueUrls.has(chunk.web.uri)) {
          uniqueUrls.add(chunk.web.uri)
          sources.push({
            title: chunk.web.title || 'Google Search Source',
            url: chunk.web.uri,
            snippet: chunk.web.title || undefined
          })
        }
      }
    }

    console.log(`[RESEARCH] Google Search Grounding completed with ${sources.length} sources.`)
    return {
      success: true,
      summary: text,
      sources,
      provider: 'Google Search Grounding'
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[RESEARCH] Google Search Grounding failed:', errMsg)
    return {
      success: false,
      summary: 'Google Search Grounding failed.',
      sources: [],
      provider: 'Google Search Grounding',
      error: errMsg
    }
  }
}
