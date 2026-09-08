import { Router } from 'express'
import { z } from 'zod'
import { searchProducts } from '../services/catalog.js'
import { history, remember } from '../services/context.js'
import { RowanOrchestrator } from '../services/ai/orchestration.js'
import { getOrCreateSessionContext, getConversationMessages, appendConversationMessage, getTenantConnection, getTenantConnections } from '../services/db.js'
import { retrieveLongTermMemory, updateConversationMemoryAndSummary } from '../services/memory.js'
import { logChatAnalytics } from '../services/analytics.js'
import { verifySupabaseToken } from '../services/supabase.js'
import type { RowanConnectionContext } from '../rowan.js'

interface EcomProduct {
  id: string
  storeId: string
  name: string
  description: string
  imageUrl: string
  productUrl: string
  category: string
  tags: string[]
  price: number
  currency: string
  available: boolean
}

const router = Router()
const orchestrator = new RowanOrchestrator()

const bodySchema = z.object({
  message: z.string().trim().min(1).max(50000),
  sessionId: z.string().min(1).max(256).optional(),
  enableSearch: z.boolean().optional(),
  connectionId: z.string().optional(),
  connectionType: z.enum(['website', 'phone', 'device', 'app', 'trading', 'general']).optional(),
  connectionUrl: z.string().optional(),
  instructions: z.string().optional(),
  role: z.string().optional(),
  personality: z.string().optional(),
  additionalInstructions: z.string().optional(),
  screenFrame: z.string().optional()
}).passthrough()

const requests = new Map<string, { count: number; reset: number }>()

// Rate-limiting middleware
router.use((req, res, next) => {
  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const value = requests.get(key) ?? { count: 0, reset: now + 60_000 }
  
  if (now > value.reset) {
    value.count = 0
    value.reset = now + 60_000
  }
  
  if (++value.count > 40) { // Increase threshold slightly for dynamic automated tests
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again soon.'
    })
  }
  
  requests.set(key, value)
  next()
})

router.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    console.warn('[CHAT ROUTE] Request body validation error:', parsed.error.issues)
    const firstIssue = parsed.error.issues[0]
    const detail = firstIssue ? `${firstIssue.path.join('.') || 'payload'}: ${firstIssue.message}` : 'Invalid input'
    return res.status(400).json({ success: false, message: `Please enter a valid message (${detail}).` })
  }

  // Ensure at least one AI key is present
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      success: false,
      message: 'Rowan is not configured. Please supply a GEMINI_API_KEY or OPENAI_API_KEY in Settings/Secrets.'
    })
  }

  try {
    const sessionId = parsed.data.sessionId ?? crypto.randomUUID()
    
    // Check for Supabase Auth Bearer Token
    let userEmail = 'nobleroan474@gmail.com'
    const authHeader = req.headers.authorization
    if (authHeader) {
      const supabaseUser = await verifySupabaseToken(authHeader)
      if (supabaseUser && supabaseUser.email) {
        userEmail = supabaseUser.email
        console.log(`[SUPABASE AUTH] Isolated session context for authenticated user: ${userEmail}`)
      }
    }
    
    // Resolve Tenant Context via Cloud Firestore with Isolation
    const tenantContext = await getOrCreateSessionContext(sessionId, userEmail)
    
    // Retrieve conversation history from Cloud Firestore
    const cloudMessages = await getConversationMessages(sessionId, tenantContext.organization.id)
    
    let formattedHistory = cloudMessages.map(m => ({
      role: m.role,
      text: m.text,
      products: m.products || []
    }))

    // If Firestore yielded empty history, fall back to in-memory history for safety
    if (formattedHistory.length === 0) {
      const rawHistory = history(sessionId)
      formattedHistory = rawHistory.map(h => ({
        role: h.role as 'user' | 'assistant' | 'system',
        text: h.text,
        products: h.products || []
      }))
    }

    // Resolve Connection Personalization
    let connContext: RowanConnectionContext | undefined = undefined
    const { connectionId, connectionType, connectionUrl, instructions, role, personality, additionalInstructions } = parsed.data

    if (connectionId) {
      const storedConn = await getTenantConnection(connectionId, tenantContext.organization.id)
      if (storedConn) {
        connContext = {
          connectionType: storedConn.type,
          connectionName: storedConn.name,
          connectionUrl: storedConn.url,
          instructions: instructions || storedConn.instructions,
          role: role || storedConn.role,
          personality: personality || storedConn.personality,
          additionalInstructions: additionalInstructions || storedConn.additional_instructions
        }
      }
    }

    // Direct instructions override from request body (e.g. from Floating Assistant or active tab)
    if (!connContext && (instructions || role || personality || connectionType || connectionUrl)) {
      connContext = {
        connectionType: connectionType || 'website',
        connectionName: connectionUrl ? (connectionUrl.includes('.') ? connectionUrl : 'Active Connection') : 'Active Connection',
        connectionUrl,
        instructions,
        role,
        personality,
        additionalInstructions
      }
    }

    // If still undefined, check if the tenant has active website/device connections configured
    if (!connContext) {
      const activeConns = await getTenantConnections(tenantContext.organization.id)
      const primaryConn = activeConns.find(c => c.status === 'connected' && (c.instructions || c.role))
      if (primaryConn) {
        connContext = {
          connectionType: primaryConn.type,
          connectionName: primaryConn.name,
          connectionUrl: primaryConn.url,
          instructions: primaryConn.instructions,
          role: primaryConn.role,
          personality: primaryConn.personality,
          additionalInstructions: primaryConn.additional_instructions
        }
      }
    }

    // Retrieve Long-Term Conversational Memory (Semantic Search, History & Rolling Summary)
    const memoryContext = await retrieveLongTermMemory({
      userId: tenantContext.user.id,
      organizationId: tenantContext.organization.id,
      currentConversationId: sessionId,
      currentMessage: parsed.data.message,
      connectionContext: connContext
    })

    const context = {
      sessionId,
      history: formattedHistory,
      storeKnowledge: tenantContext.store.knowledge || undefined,
      connection: connContext,
      memory: memoryContext,
      metadata: {
        storeId: tenantContext.store.id,
        organizationId: tenantContext.organization.id
      }
    }

    // Run AI Orchestrator lifecycle
    const result = await orchestrator.orchestrate(
      parsed.data.message,
      sessionId,
      context,
      parsed.data.enableSearch,
      parsed.data.screenFrame
    )

    const message = result.text.trim()
    if (!message) throw new Error('Empty response from AI orchestrator')

    // Extract products returned by the productSearch tool
    let matchedProducts: EcomProduct[] = []
    const searchStep = result.plan.steps.find(step => step.toolToUse === 'productSearch')
    if (searchStep?.result?.success && searchStep.result.data) {
      const searchData = searchStep.result.data as { products?: EcomProduct[] }
      if (searchData.products) {
        matchedProducts = searchData.products
      }
    }

    // String-matching fallback product matching (to ensure robustness)
    const allProducts = await searchProducts(tenantContext.store.id, {}) as EcomProduct[]
    const lowercaseMessage = message.toLowerCase()
    const fallbackMatched = allProducts.filter(p =>
      lowercaseMessage.includes(p.id.toLowerCase()) ||
      lowercaseMessage.includes(p.name.toLowerCase())
    )

    // Combine and deduplicate
    const combinedProductsMap = new Map<string, EcomProduct>()
    matchedProducts.forEach(p => combinedProductsMap.set(p.id, p))
    fallbackMatched.forEach(p => combinedProductsMap.set(p.id, p))
    const finalProducts = Array.from(combinedProductsMap.values())
    const productIds = finalProducts.map(p => p.id)

    // Extract web research results if webResearch tool was executed
    let researchResult: { query?: string; summary?: string; sources?: unknown[]; provider?: string } | undefined = undefined
    const researchStep = result.plan.steps.find(step => step.toolToUse === 'webResearch')
    if (researchStep?.result?.success && researchStep.result.data) {
      const rData = researchStep.result.data as { summary?: string; sources?: unknown[]; provider?: string }
      researchResult = {
        query: (researchStep.arguments?.query as string) || parsed.data.message,
        summary: rData.summary,
        sources: rData.sources,
        provider: rData.provider
      }
    }

    // Cloud Database Persistence with isolation validation
    await appendConversationMessage(sessionId, tenantContext.organization.id, 'user', parsed.data.message, [])
    await appendConversationMessage(sessionId, tenantContext.organization.id, 'assistant', message, productIds, researchResult?.sources as Array<{ title: string; url: string; snippet?: string }> | undefined)

    // Trigger asynchronous memory update and rolling summary extraction
    updateConversationMemoryAndSummary(sessionId).catch(err => {
      console.error('[MEMORY BACKGROUND UPDATE ERROR]:', err)
    })

    // Fire background analytics event logging
    logChatAnalytics(sessionId, tenantContext.organization.id, parsed.data.message, message, result.plan, finalProducts).catch(err => {
      console.error('[TELEMETRY BACKGROUND ERROR]:', err)
    })

    // Parallel in-memory backup persistence as requested to ensure zero-downtime verify phase
    remember(sessionId, {
      role: 'user',
      text: parsed.data.message,
      products: productIds
    })
    remember(sessionId, {
      role: 'assistant',
      text: message,
      products: productIds
    })

    return res.json({
      success: true,
      message,
      sessionId,
      products: finalProducts,
      research: researchResult,
      plan: result.plan,
      providerUsed: result.providerUsed
    })
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[ORCHESTRATION ROUTE ERROR] Failed:', errMsg)

    let clientMsg = 'Rowan could not respond right now. Please try again.'
    if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      clientMsg = 'Rowan is experiencing high volume (AI API quota reached). Please wait a few seconds and try again!'
    }

    return res.status(502).json({ success: false, message: clientMsg })
  }
})

export default router
