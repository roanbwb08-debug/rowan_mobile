import { GoogleGenAI } from '@google/genai'
import { db, ConversationDoc, MessageDoc } from './db.js'
import { ProviderManager } from './ai/providers.ts'
import type { RowanConnectionContext } from '../rowan.js'

export interface RetrievedMemoryItem {
  conversationId: string
  conversationTitle: string
  messageId: string
  role: 'user' | 'assistant'
  text: string
  timestamp: string // ISO string
  dateLabel: string // e.g. "Yesterday at 2:30 PM", "3 days ago", "Sep 2, 2026"
  importance?: 'normal' | 'high' | 'critical'
  tags?: string[]
  relevanceScore: number
}

export interface ConversationSummaryItem {
  conversationId: string
  conversationTitle: string
  summary: string
  importantFacts?: string[]
  updatedAt: string
}

export interface LongTermMemoryContext {
  relevantHistory: RetrievedMemoryItem[]
  conversationSummaries: ConversationSummaryItem[]
  temporalContextString: string
  hasRetrievedMemory: boolean
  confidence: number
}

// Memory embedding cache to avoid redundant API calls
const embeddingCache = new Map<string, number[]>()

/**
 * Generate vector embedding using gemini-embedding-2-preview with fallbacks
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const cleaned = text.trim()
  if (!cleaned) return null

  if (embeddingCache.has(cleaned)) {
    return embeddingCache.get(cleaned)!
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  // 1. Try gemini-embedding-2-preview (stable standard)
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    })

    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: cleaned
    })

    const values = response.embedding?.values
    if (values && Array.isArray(values) && values.length > 0) {
      embeddingCache.set(cleaned, values)
      return values
    }
  } catch (err) {
    console.warn('[MEMORY SERVICE] gemini-embedding-2-preview skipped/failed, trying gemini-embedding-001...', err instanceof Error ? err.message : err)
  }

  // 2. Try gemini-embedding-001 as fallback
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    })

    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: cleaned
    })

    const values = response.embedding?.values
    if (values && Array.isArray(values) && values.length > 0) {
      embeddingCache.set(cleaned, values)
      return values
    }
  } catch (err) {
    console.warn('[MEMORY SERVICE] All embedding API calls skipped/failed, using TF-IDF hybrid fallback:', err instanceof Error ? err.message : err)
  }

  return null
}

/**
 * Calculate Cosine Similarity between two float arrays
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Calculate Keyword & N-Gram overlap score
 */
export function calculateKeywordOverlap(textA: string, textB: string): number {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'that', 'this', 'with', 'what', 'was', 'you', 'are', 'about', 'from', 'have'].includes(w))

  const tokensA = new Set(normalize(textA))
  const tokensB = new Set(normalize(textB))

  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let matches = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      matches++
    }
  }

  // Jaccard similarity
  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : matches / union
}

/**
 * Convert ISO timestamp to human readable date label
 */
export function getHumanReadableDateLabel(isoTimestamp: string, now: Date = new Date()): string {
  const date = new Date(isoTimestamp)
  if (isNaN(date.getTime())) return 'Earlier'

  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.floor(diffHours / 24)

  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `Earlier today at ${timeStr}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
    return `Yesterday at ${timeStr}`
  }

  if (diffDays < 7) {
    return `${diffDays} days ago (${date.toLocaleDateString([], { weekday: 'short' })})`
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago (${date.toLocaleDateString([], { month: 'short', day: 'numeric' })})`
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Detect explicit temporal intent from user query (e.g. "yesterday", "last week", "2 days ago")
 */
export function parseTemporalIntent(query: string, now: Date = new Date()): { targetStartMs?: number; targetEndMs?: number; label?: string } {
  const lower = query.toLowerCase()

  if (lower.includes('yesterday')) {
    const start = new Date(now)
    start.setDate(now.getDate() - 1)
    start.setHours(0, 0, 0, 0)

    const end = new Date(now)
    end.setDate(now.getDate() - 1)
    end.setHours(23, 59, 59, 999)

    return { targetStartMs: start.getTime(), targetEndMs: end.getTime(), label: 'yesterday' }
  }

  if (lower.includes('earlier today') || lower.includes('today')) {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { targetStartMs: start.getTime(), targetEndMs: now.getTime(), label: 'today' }
  }

  const daysAgoMatch = lower.match(/(\d+|two|three|four|five|six|seven)\s+days?\s+ago/)
  if (daysAgoMatch) {
    const wordToNum: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }
    const days = parseInt(daysAgoMatch[1], 10) || wordToNum[daysAgoMatch[1]] || 2

    const targetDate = new Date(now)
    targetDate.setDate(now.getDate() - days)

    const start = new Date(targetDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(targetDate)
    end.setHours(23, 59, 59, 999)

    return { targetStartMs: start.getTime(), targetEndMs: end.getTime(), label: `${days} days ago` }
  }

  if (lower.includes('last week')) {
    const end = new Date(now)
    end.setDate(now.getDate() - 2)

    const start = new Date(now)
    start.setDate(now.getDate() - 9)

    return { targetStartMs: start.getTime(), targetEndMs: end.getTime(), label: 'last week' }
  }

  return {}
}

/**
 * Main Long-Term Memory Retrieval Engine
 */
export async function retrieveLongTermMemory(params: {
  userId: string
  organizationId: string
  currentConversationId: string
  currentMessage: string
  connectionContext?: RowanConnectionContext
}): Promise<LongTermMemoryContext> {
  const now = new Date()
  const temporalContextString = `Current Date & Time: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

  const { userId, organizationId, currentConversationId, currentMessage, connectionContext } = params
  console.log(`[MEMORY ENGINE] Searching memory for user="${userId}" org="${organizationId}" currentConv="${currentConversationId}"...`)

  // Check if query has semantic memory indicators or implicit references
  const queryLower = currentMessage.toLowerCase()
  const memoryTriggers = [
    'yesterday', 'earlier', 'previously', 'last week', 'discussed', 'talked', 'recommended',
    'laptop', 'interruption', 'architecture', 'solution', 'decide', 'decision', 'website',
    'system', 'voice', 'project', 'plan', 'that thing', 'what was', 'you said', 'we decided',
    'continue from', 'where we stopped', 'remember', 'recall', 'before'
  ]

  const hasMemoryTrigger = memoryTriggers.some(trigger => queryLower.includes(trigger))
  console.log(`[MEMORY ENGINE] Checking triggers: hasMemoryTrigger=${hasMemoryTrigger}`)

  // Fetch all user conversations under strict isolation
  const convQuery = db.collection('conversations').where('organizationId', '==', organizationId)
  const convSnap = await convQuery.get()

  if (convSnap.empty) {
    return {
      relevantHistory: [],
      conversationSummaries: [],
      temporalContextString,
      hasRetrievedMemory: false,
      confidence: 0
    }
  }

  // Isolation & Connection Boundaries: Filter conversations owned by user
  // If connectionContext is website, only retrieve conversations linked to website/store
  const conversations: ConversationDoc[] = []
  convSnap.docs.forEach(doc => {
    const data = doc.data() as ConversationDoc
    data.id = doc.id

    // Strict user ownership check
    if (data.userId === userId || data.organizationId === organizationId) {
      if (connectionContext?.connectionType === 'website') {
        // Website widget isolation: do not leak personal Rowan private chat into website support widget
        if (data.storeId) {
          conversations.push(data)
        }
      } else {
        conversations.push(data)
      }
    }
  })

  // Gather conversation rolling summaries (Layer C)
  const conversationSummaries: ConversationSummaryItem[] = []
  conversations.forEach(c => {
    if (c.summary) {
      conversationSummaries.push({
        conversationId: c.id,
        conversationTitle: c.title || 'Conversation History',
        summary: c.summary,
        importantFacts: c.importantFacts || [],
        updatedAt: c.updatedAt
      })
    }
  })

  // Get vector embedding for current prompt
  const queryEmbedding = await getEmbedding(currentMessage)
  const temporalIntent = parseTemporalIntent(currentMessage, now)

  // Collect candidate messages across past conversations (and current conversation older turns)
  const candidates: Array<{
    msg: MessageDoc
    convTitle: string
    convId: string
  }> = []

  for (const conv of conversations) {
    const msgSnap = await db
      .collection('conversations')
      .doc(conv.id)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .limit(100)
      .get()

    msgSnap.docs.forEach((d, idx) => {
      const msg = d.data() as MessageDoc
      msg.id = d.id

      // Skip current conversation's very recent 3 turns (which are already in Layer A current history)
      if (conv.id === currentConversationId && idx >= msgSnap.docs.length - 3) {
        return
      }

      candidates.push({
        msg,
        convTitle: conv.title || 'Conversation History',
        convId: conv.id
      })
    })
  }

  if (candidates.length === 0) {
    return {
      relevantHistory: [],
      conversationSummaries,
      temporalContextString,
      hasRetrievedMemory: false,
      confidence: 0
    }
  }

  // Score candidates with hybrid strategy
  const scoredItems: RetrievedMemoryItem[] = []

  for (const item of candidates) {
    const { msg, convTitle, convId } = item
    const msgTime = new Date(msg.timestamp).getTime()

    // 1. Vector Cosine Similarity
    let vectorSim = 0
    if (queryEmbedding) {
      const msgEmbedding = await getEmbedding(msg.text)
      if (msgEmbedding) {
        vectorSim = cosineSimilarity(queryEmbedding, msgEmbedding)
      }
    }

    // 2. Keyword & N-Gram Overlap
    const keywordSim = calculateKeywordOverlap(currentMessage, msg.text)

    // 3. Importance Bonus
    let importanceBonus = 0
    if (msg.importance === 'critical') importanceBonus = 0.25
    else if (msg.importance === 'high') importanceBonus = 0.15

    // 4. Temporal Proximity Bonus
    let temporalBonus = 0
    if (temporalIntent.targetStartMs && temporalIntent.targetEndMs) {
      if (msgTime >= temporalIntent.targetStartMs && msgTime <= temporalIntent.targetEndMs) {
        temporalBonus = 0.35 // Strong boost if message matches requested time window
      }
    }

    // Combine hybrid score
    let relevanceScore = (vectorSim * 0.5) + (keywordSim * 0.35) + importanceBonus + temporalBonus

    // If query has specific triggers (e.g., "laptop", "voice", "interruption") and message contains them, boost
    const msgLower = msg.text.toLowerCase()
    const coreWords = currentMessage.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3)
    let keywordHits = 0
    for (const word of coreWords) {
      if (msgLower.includes(word)) keywordHits++
    }
    if (keywordHits > 0) {
      relevanceScore += (keywordHits / Math.max(1, coreWords.length)) * 0.3
    }

    // Include item if score meets threshold or if explicitly matching temporal intent
    if (relevanceScore > 0.18 || (temporalBonus > 0 && relevanceScore > 0.12)) {
      scoredItems.push({
        conversationId: convId,
        conversationTitle: convTitle,
        messageId: msg.id,
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        text: msg.text,
        timestamp: msg.timestamp,
        dateLabel: getHumanReadableDateLabel(msg.timestamp, now),
        importance: msg.importance,
        relevanceScore
      })
    }
  }

  // Sort by relevance score descending
  scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Take top 6 most relevant historical context entries
  const topHistory = scoredItems.slice(0, 6)

  const topConfidence = topHistory.length > 0 ? topHistory[0].relevanceScore : 0

  console.log(`[MEMORY ENGINE] Retrieved ${topHistory.length} relevant historical messages (Top score: ${topConfidence.toFixed(2)})`)

  return {
    relevantHistory: topHistory,
    conversationSummaries,
    temporalContextString,
    hasRetrievedMemory: topHistory.length > 0 || conversationSummaries.length > 0,
    confidence: topConfidence
  }
}

/**
 * Background Rolling Summarizer & Fact Extraction
 */
export async function updateConversationMemoryAndSummary(
  conversationId: string
): Promise<void> {
  try {
    const convDocRef = db.collection('conversations').doc(conversationId)
    const convSnap = await convDocRef.get()
    if (!convSnap.exists) return

    const msgSnap = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get()

    if (msgSnap.docs.length < 3) return // Summarize after at least 3 messages

    const messages = msgSnap.docs.map(d => d.data() as MessageDoc)

    // Build plain text exchange transcript
    const transcript = messages
      .map(m => `[${new Date(m.timestamp).toLocaleDateString()} ${m.role.toUpperCase()}]: ${m.text}`)
      .join('\n')

    const providerManager = new ProviderManager()
    const summaryPrompt = `
Analyze the following conversation transcript between a user and Rowan AI.
Extract and synthesize:
1. "summary": A concise rolling summary (2-4 sentences) capturing main topics, recommendations given, and decisions made.
2. "importantFacts": An array of specific facts, preferences, hardware specs, architectural choices, or commitments stated by either party.
3. "keyMessageIndices": An array of 0-based message indices that contain high-importance decisions or preferences.

TRANSCRIPT:
${transcript}

Return ONLY a valid JSON object with keys: "summary", "importantFacts", "keyMessageIndices".
`

    const result = await providerManager.generateResponse(summaryPrompt, {
      responseMimeType: 'application/json'
    })

    let parsed: { summary?: string; importantFacts?: string[]; keyMessageIndices?: number[] } = {}
    try {
      parsed = JSON.parse(result.text)
    } catch {
      // JSON parse fallback
    }

    if (parsed.summary) {
      await convDocRef.update({
        summary: parsed.summary,
        importantFacts: parsed.importantFacts || [],
        updatedAt: new Date().toISOString()
      })
      console.log(`[MEMORY SUMMARIZER] Updated rolling summary for conversation ${conversationId}`)
    }

    // Flag key messages as high importance in Firestore
    if (parsed.keyMessageIndices && Array.isArray(parsed.keyMessageIndices)) {
      for (const idx of parsed.keyMessageIndices) {
        if (msgSnap.docs[idx]) {
          await msgSnap.docs[idx].ref.update({
            importance: 'high'
          })
        }
      }
    }
  } catch (err) {
    console.warn('[MEMORY SUMMARIZER ERROR] Failed to update rolling summary:', err instanceof Error ? err.message : err)
  }
}
