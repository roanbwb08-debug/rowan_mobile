import { GoogleGenAI } from '@google/genai'
import { AIProvider } from './types.js'
import { sanitizeGeminiModel } from './generation.js'

let isOpenAIQuotaExhausted = false
let lastOpenAIQuotaCheck = 0

export function isOpenAIExhausted(): boolean {
  return isOpenAIQuotaExhausted
}

export function markOpenAIQuotaExhausted(): void {
  isOpenAIQuotaExhausted = true
  lastOpenAIQuotaCheck = Date.now()
}

export async function checkOpenAIQuotaStatus(apiKey?: string): Promise<boolean> {
  const key = apiKey || process.env.OPENAI_API_KEY
  if (!key) return true

  const now = Date.now()
  if (isOpenAIQuotaExhausted && now - lastOpenAIQuotaCheck < 120000) {
    return true
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      if (errText.includes('insufficient_quota') || errText.includes('credit_balance_exhausted')) {
        isOpenAIQuotaExhausted = true
        lastOpenAIQuotaCheck = now
        return true
      }
    } else {
      isOpenAIQuotaExhausted = false
      lastOpenAIQuotaCheck = now
      return false
    }
  } catch {
    // If request fails, keep existing state
  }

  return isOpenAIQuotaExhausted
}

// 1. Custom Provider Error Class
export class ProviderError extends Error {
  public providerId: string
  public isRecoverable: boolean
  public status?: number
  public category: 'rate-limit' | 'unauthorized' | 'quota-exhausted' | 'timeout' | 'transient' | 'fatal' | 'unknown'

  constructor(
    providerId: string,
    message: string,
    isRecoverable: boolean,
    category: ProviderError['category'],
    status?: number
  ) {
    super(message)
    this.name = 'ProviderError'
    this.providerId = providerId
    this.isRecoverable = isRecoverable
    this.category = category
    this.status = status
    Object.setPrototypeOf(this, ProviderError.prototype)
  }
}

// 2. Provider Health State Interface
export interface ProviderHealthState {
  providerId: string
  consecutiveFailures: number
  lastFailureTime?: number
  cooldownUntil?: number
}

// Timeout wrapper helper
const fetchWithTimeout = async (
  url: string,
  options: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
  timeoutMs: number = 8000
): Promise<Response> => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return response
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

// 3. OpenAI AI Provider Implementation
export class OpenAIProvider implements AIProvider {
  public id = 'openai'
  public name = 'OpenAI GPT Platform'

  async generateResponse(
    prompt: string,
    options?: {
      systemInstruction?: string
      model?: string
      responseMimeType?: string
      responseSchema?: unknown
      screenFrame?: string
    }
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new ProviderError(
        'openai',
        'OPENAI_API_KEY is not configured on the server.',
        false,
        'unauthorized'
      )
    }

    const primaryModel = options?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const fallbackModels = [primaryModel, 'gpt-4o-mini', 'gpt-4o']
    const uniqueModels = Array.from(new Set(fallbackModels))

    let lastError: unknown = null

    for (const currentModel of uniqueModels) {
      try {
        console.log(`[PROVIDERS] Sending request to OpenAI using model: ${currentModel}`)
        const messages: Array<{
          role: string
          content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
        }> = []

        if (options?.systemInstruction) {
          messages.push({ role: 'system', content: options.systemInstruction })
        }

        if (options?.screenFrame) {
          const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
            { type: 'text', text: prompt }
          ]
          const cleanedFrame = options.screenFrame.startsWith('data:') ? options.screenFrame : `data:image/jpeg;base64,${options.screenFrame}`
          userContent.push({
            type: 'image_url',
            image_url: { url: cleanedFrame }
          })
          messages.push({ role: 'user', content: userContent })
        } else {
          messages.push({ role: 'user', content: prompt })
        }

        const body: Record<string, unknown> = {
          model: currentModel,
          messages,
          max_tokens: 1200,
          temperature: 0.7
        }

        if (options?.responseMimeType === 'application/json') {
          body.response_format = { type: 'json_object' }
        }

        const res = await fetchWithTimeout(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
          },
          10000
        )

        if (!res.ok) {
          const errText = await res.text()
          const status = res.status
          let isRecoverable = true
          let category: ProviderError['category'] = 'unknown'

          if (status === 401 || status === 403) {
            isRecoverable = false
            category = 'unauthorized'
          } else if (status === 429) {
            const isQuotaExhausted = errText.toLowerCase().includes('quota') || errText.toLowerCase().includes('credit_balance_exhausted')
            category = isQuotaExhausted ? 'quota-exhausted' : 'rate-limit'
            isRecoverable = true // Recoverable via fallback provider!
          } else if (status >= 500) {
            category = 'transient'
            isRecoverable = true
          }

          throw new ProviderError(
            'openai',
            `OpenAI HTTP Error ${status}: ${errText}`,
            isRecoverable,
            category,
            status
          )
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
        const text = data?.choices?.[0]?.message?.content?.trim()

        if (text) {
          console.log(`[PROVIDERS] OpenAI (${currentModel}) responded successfully.`)
          return { text, modelUsed: currentModel }
        }
        throw new ProviderError(
          'openai',
          'Empty response text from OpenAI model.',
          true,
          'transient'
        )
      } catch (err: unknown) {
        lastError = err
        if (err instanceof ProviderError) {
          // If it is fatal, quota-exhausted, unauthorized, or the final model failed, rethrow immediately to trigger fallback
          if (!err.isRecoverable || err.category === 'quota-exhausted' || err.category === 'unauthorized' || currentModel === uniqueModels[uniqueModels.length - 1]) {
            throw err
          }
        } else {
          const errMsg = err instanceof Error ? err.message : String(err)
          const isTimeout = errMsg.toLowerCase().includes('abort') || errMsg.toLowerCase().includes('timeout')
          throw new ProviderError(
            'openai',
            `OpenAI model request failed: ${errMsg}`,
            true,
            isTimeout ? 'timeout' : 'transient'
          )
        }
      }
    }

    throw lastError || new Error('All OpenAI fallback models failed.')
  }
}

// 4. Gemini AI Provider Implementation
export class GeminiProvider implements AIProvider {
  public id = 'gemini'
  public name = 'Gemini AI Platform'

  async generateResponse(
    prompt: string,
    options?: {
      systemInstruction?: string
      model?: string
      responseMimeType?: string
      responseSchema?: unknown
      screenFrame?: string
    }
  ): Promise<{ text: string; modelUsed: string }> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new ProviderError(
        'gemini',
        'GEMINI_API_KEY is not configured on the server.',
        false,
        'unauthorized'
      )
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })

    const requestedModel = options?.model || process.env.GEMINI_MODEL || 'gemini-3.7-flash'
    const primaryModel = sanitizeGeminiModel(requestedModel)
    const fallbackModels = [
      primaryModel,
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash'
    ]
    const uniqueModels = Array.from(new Set(fallbackModels))

    let lastError: unknown = null

    for (const currentModel of uniqueModels) {
      try {
        console.log(`[PROVIDERS] Sending request to Gemini using model: ${currentModel}`)
        
        type ContentPart = { text?: string; inlineData?: { data: string; mimeType: string } }
        type ContentItem = { role: string; parts: ContentPart[] }

        let contents: string | ContentItem[] = prompt
        if (options?.screenFrame) {
          const parts: ContentPart[] = [{ text: prompt }]
          const matches = options.screenFrame.match(/^data:([^;]+);base64,(.+)$/)
          if (matches) {
            const mimeType = matches[1]
            const data = matches[2]
            parts.push({
              inlineData: {
                data,
                mimeType
              }
            })
          } else {
            parts.push({
              inlineData: {
                data: options.screenFrame,
                mimeType: 'image/jpeg'
              }
            })
          }
          contents = [{ role: 'user', parts }]
        }

        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction: options?.systemInstruction,
            maxOutputTokens: 1200,
            responseMimeType: options?.responseMimeType,
            responseSchema: options?.responseSchema as Record<string, unknown> | undefined
          }
        })

        const text = response.text?.trim()
        if (text) {
          console.log(`[PROVIDERS] Gemini (${currentModel}) responded successfully.`)
          return { text, modelUsed: currentModel }
        }
        throw new ProviderError(
          'gemini',
          'Empty response text from Gemini model.',
          true,
          'transient'
        )
      } catch (err: unknown) {
        lastError = err
        const errMsg = err instanceof Error ? err.message : String(err)
        const isQuota = errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('429')
        const isAuth = errMsg.toLowerCase().includes('key') || errMsg.toLowerCase().includes('api_key') || errMsg.toLowerCase().includes('401') || errMsg.toLowerCase().includes('403')
        
        if (isAuth) {
          throw new ProviderError(
            'gemini',
            `Gemini Authentication Failure: ${errMsg}`,
            false,
            'unauthorized'
          )
        }

        if (isQuota) {
          // If the final model fails with quota, throw so backup fallback triggers if applicable
          if (currentModel === uniqueModels[uniqueModels.length - 1]) {
            throw new ProviderError('gemini', `Gemini Quota/Rate Limit: ${errMsg}`, true, 'quota-exhausted')
          }
          continue
        }

        if (currentModel === uniqueModels[uniqueModels.length - 1]) {
          throw new ProviderError('gemini', `Gemini failure: ${errMsg}`, true, 'transient')
        }
      }
    }

    throw lastError || new Error('All Gemini fallback models failed.')
  }
}

// 5. Provider Manager Core Implementation
export class ProviderManager {
  private openaiProvider = new OpenAIProvider()
  private geminiProvider = new GeminiProvider()

  // Track provider health states
  private healthStates: Record<string, ProviderHealthState> = {
    openai: { providerId: 'openai', consecutiveFailures: 0 },
    gemini: { providerId: 'gemini', consecutiveFailures: 0 }
  }

  // Cooldown rules
  private COOLDOWN_DURATION_MS = 45000 // 45 seconds cooldown before retrying a failing provider

  /**
   * Determine primary and backup provider mapping based on ENV or default
   */
  private getProviderConfiguration(): { primaryId: string; backupId: string } {
    const rawPrimary = (process.env.PRIMARY_AI_PROVIDER || '').trim().toLowerCase()
    const rawBackup = (process.env.BACKUP_AI_PROVIDER || '').trim().toLowerCase()

    let primaryId = 'gemini'
    let backupId = rawBackup === 'openai' ? 'openai' : 'gemini'

    // If OpenAI has exhausted credits, route both primary and backup through Gemini to prevent 429 quota exceptions
    if (isOpenAIQuotaExhausted) {
      return { primaryId: 'gemini', backupId: 'gemini' }
    }

    if (rawPrimary === 'openai') {
      primaryId = 'openai'
      backupId = rawBackup === 'openai' ? 'gemini' : (rawBackup || 'gemini')
    } else if (rawPrimary === 'gemini') {
      primaryId = 'gemini'
      backupId = rawBackup === 'gemini' ? 'openai' : (rawBackup || 'openai')
    } else {
      // Default: If Gemini is available, use gemini as primary for optimal speed & reliability in AI Studio
      if (process.env.GEMINI_API_KEY) {
        primaryId = 'gemini'
        backupId = 'openai'
      } else if (process.env.OPENAI_API_KEY) {
        primaryId = 'openai'
        backupId = 'gemini'
      }
    }

    return { primaryId, backupId }
  }

  /**
   * Resolve instances by ID
   */
  private getProviderInstance(id: string): AIProvider {
    return id === 'gemini' ? this.geminiProvider : this.openaiProvider
  }

  /**
   * Execute content generation with circuit breaking, logging and robust fallbacks
   */
  async generateResponse(
    prompt: string,
    options?: {
      systemInstruction?: string
      model?: string
      responseMimeType?: string
      responseSchema?: unknown
      toolUsed?: string
      screenFrame?: string
    }
  ): Promise<{ text: string; providerUsed: string; modelUsed: string }> {
    const startTime = Date.now()
    const config = this.getProviderConfiguration()

    let selectedId = config.primaryId
    let isFallbackActive = false

    const primaryState = this.healthStates[config.primaryId]
    const now = Date.now()

    // 1. Circuit breaker check: If primary is on cooldown and backup exists, use backup directly
    if (primaryState.cooldownUntil && now < primaryState.cooldownUntil) {
      console.warn(`[PROVIDERS] Primary provider '${config.primaryId}' is on cooldown until ${new Date(primaryState.cooldownUntil).toISOString()}. Bypassing directly to '${config.backupId}'.`)
      selectedId = config.backupId
      isFallbackActive = true
    }

    const primaryProvider = this.getProviderInstance(selectedId)
    let errorCategory: ProviderError['category'] = 'unknown'

    try {
      // Execute attempt with primary selected provider
      const response = await primaryProvider.generateResponse(prompt, {
        ...options,
        // Override model name if the provider is primary and customized
        model: selectedId === 'openai' ? process.env.OPENAI_MODEL : process.env.GEMINI_MODEL
      })

      // Success! Reset health state on success
      const state = this.healthStates[selectedId]
      state.consecutiveFailures = 0
      state.cooldownUntil = undefined
      state.lastFailureTime = undefined

      // Observation Log
      const latency = Date.now() - startTime
      console.log(`[PROVIDERS-LOG] SUCCESS: provider=${selectedId} latency=${latency}ms fallback_occurred=${isFallbackActive} tool_used=${options?.toolUsed || 'none'}`)

      return {
        text: response.text,
        providerUsed: selectedId,
        modelUsed: response.modelUsed
      }
    } catch (err: unknown) {
      const latency = Date.now() - startTime
      const errMsg = err instanceof Error ? err.message : String(err)
      let isRecoverable = true

      if (err instanceof ProviderError) {
        isRecoverable = err.isRecoverable
        errorCategory = err.category
      }

      console.error(`[PROVIDERS-LOG] FAILURE: provider=${selectedId} status=failed latency=${latency}ms error_category=${errorCategory} error_message="${errMsg}"`)

      // Update failure tracking for the provider that failed
      const state = this.healthStates[selectedId]
      state.consecutiveFailures++
      state.lastFailureTime = now
      
      if (isRecoverable) {
        // Set cooldown if consecutive failures are piling up (minimum 1 failure to trigger immediate single-fallback, set cooldown thereafter)
        state.cooldownUntil = now + this.COOLDOWN_DURATION_MS
        console.warn(`[PROVIDERS] Set cooldown on provider '${selectedId}' for ${this.COOLDOWN_DURATION_MS}ms.`)
      } else {
        // For non-recoverable configuration errors, place on a very long cooldown (e.g. 1 hour)
        // so that subsequent requests don't keep retrying it (no infinite retries)
        state.cooldownUntil = now + (3600 * 1000)
        console.warn(`[PROVIDERS] Set long cooldown on non-recoverable provider '${selectedId}' to avoid infinite retries.`)
      }

      // 2. Perform Fallback to the alternative provider if we haven't already fallen back
      if (!isFallbackActive) {
        const fallbackId = config.backupId
        console.warn(`[PROVIDERS] Attempting automatic fallback from '${config.primaryId}' to '${fallbackId}'...`)

        const fallbackState = this.healthStates[fallbackId]
        if (fallbackState.cooldownUntil && now < fallbackState.cooldownUntil) {
          throw new Error(`Fallback provider '${fallbackId}' is also currently on cooldown. All AI providers unavailable.`, { cause: err })
        }

        const fallbackProvider = this.getProviderInstance(fallbackId)
        const fallbackStartTime = Date.now()

        try {
          const fallbackResponse = await fallbackProvider.generateResponse(prompt, {
            ...options,
            model: fallbackId === 'openai' ? process.env.OPENAI_MODEL : process.env.GEMINI_MODEL
          })

          // Fallback Success!
          fallbackState.consecutiveFailures = 0
          fallbackState.cooldownUntil = undefined
          fallbackState.lastFailureTime = undefined

          const totalLatency = Date.now() - startTime
          console.log(`[PROVIDERS-LOG] FALLBACK_SUCCESS: primary_provider=${config.primaryId} primary_status=failed fallback_provider=${fallbackId} fallback_status=success total_latency=${totalLatency}ms tool_used=${options?.toolUsed || 'none'}`)

          return {
            text: fallbackResponse.text,
            providerUsed: fallbackId,
            modelUsed: fallbackResponse.modelUsed
          }
        } catch (fallbackErr: unknown) {
          const fbLatency = Date.now() - fallbackStartTime
          const fbErrMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
          
          fallbackState.consecutiveFailures++
          fallbackState.lastFailureTime = now
          fallbackState.cooldownUntil = now + this.COOLDOWN_DURATION_MS

          console.error(`[PROVIDERS-LOG] BOTH_FAILED: primary_provider=${config.primaryId} fallback_provider=${fallbackId} fallback_latency=${fbLatency}ms error_message="${fbErrMsg}"`)
          throw new Error(`All configured AI Providers ('${config.primaryId}' and '${fallbackId}') failed. Details: ${fbErrMsg}`, { cause: fallbackErr })
        }
      } else {
        // If we were already in fallback mode and failed, then we are completely out of options
        throw new Error(`Primary and backup providers are exhausted. Execution failed: ${errMsg}`, { cause: err })
      }
    }
  }
}
