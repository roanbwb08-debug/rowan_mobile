import type { RowanConnectionContext } from '../../rowan.js'
import type { LongTermMemoryContext } from '../memory.js'

export interface ConversationContext {
  sessionId: string
  history: Array<{ role: 'user' | 'assistant' | 'system'; text: string; products?: string[] }>
  storeKnowledge?: unknown
  productContext?: unknown
  metadata?: Record<string, unknown>
  settings?: Record<string, unknown>
  connection?: RowanConnectionContext
  memory?: LongTermMemoryContext
}

export interface ToolResult {
  toolName: string
  success: boolean
  data: unknown
  error?: string
}

export interface Tool {
  name: string
  description: string
  parameters: {
    type: 'OBJECT'
    properties: Record<string, unknown>
    required?: string[]
  }
  execute(args: Record<string, unknown>, context?: ConversationContext): Promise<ToolResult>
}

export interface AIProvider {
  id: string // 'gemini' | 'openai'
  name: string
  generateResponse(
    prompt: string,
    options?: {
      systemInstruction?: string
      model?: string
      responseMimeType?: string
      responseSchema?: unknown
      screenFrame?: string
    }
  ): Promise<{ text: string; modelUsed: string }>
}

export interface TaskStep {
  step: number
  description: string
  toolToUse: string
  arguments: Record<string, unknown>
  result?: ToolResult
}

export interface TaskPlan {
  intent: string
  capabilitiesRequired: string[]
  assignedModel: string
  steps: TaskStep[]
  completed: boolean
}
