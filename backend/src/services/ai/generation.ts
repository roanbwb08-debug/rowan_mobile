import { GoogleGenAI } from '@google/genai'

export function sanitizeGeminiModel(model?: string): string {
  if (!model) return 'gemini-3.7-flash'
  const trimmed = model.trim()
  if (
    trimmed.startsWith('gemini-2.5') ||
    trimmed.startsWith('gemini-2.0') ||
    trimmed.startsWith('gemini-1.5') ||
    trimmed === 'gemini-pro' ||
    trimmed === 'gemini-flash-latest'
  ) {
    return 'gemini-3.7-flash'
  }
  return trimmed
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  options: { contents: string; config?: { systemInstruction?: string; maxOutputTokens?: number } }
) {
  const sanitizedPrimary = sanitizeGeminiModel(primaryModel)
  const models = [
    sanitizedPrimary,
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash'
  ].filter((m, i, arr) => arr.indexOf(m) === i)

  let lastError: unknown = null
  for (const currentModel of models) {
    try {
      console.log(`[GEMINI] Attempting content generation with model: ${currentModel}`)
      const result = await ai.models.generateContent({
        ...options,
        model: currentModel
      })
      if (result.text) {
        console.log(`[GEMINI] Successfully generated content using model: ${currentModel}`)
        return result
      }
      throw new Error('Empty text response from Gemini')
    } catch (err) {
      lastError = err
      const errMsg = err instanceof Error ? err.message : String(err)
      console.warn(`[GEMINI] Model ${currentModel} failed:`, errMsg)
    }
  }
  throw lastError
}

