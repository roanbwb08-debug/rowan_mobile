import { ConversationContext, TaskPlan, TaskStep } from './types.js'
import { availableTools } from './tools.js'
import { buildDynamicSystemInstruction } from '../../rowan.js'
import { ProviderManager } from './providers.js'

// Helper to check if a query is simple conversational chitchat (greetings, identity, gratitude)
function isChitchat(message: string): boolean {
  const lower = message.trim().toLowerCase()
  if (!lower) return true

  const exactChitchats = [
    'hi', 'hello', 'hey', 'yo', 'howdy', 'hola', 'greetings', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'how is it going', "how's it going", "what's up", "whats up", 'how have you been',
    'thank you', 'thanks', 'appreciate it', 'awesome', 'great', 'perfect', 'ok', 'okay', 'yes', 'no',
    'bye', 'goodbye', 'see you', 'talk to you later', 'who are you', 'what is your name', "what's your name",
    'who is rowan', 'are you rowan', 'what can you do', 'what are your capabilities', 'how can you help me',
    'help me', 'help'
  ]

  if (exactChitchats.includes(lower)) return true

  // Simple patterns for short greetings or name checks
  if (/^(hi|hello|hey|yo|greetings|good morning|good afternoon|good evening)\b/.test(lower)) {
    if (lower.split(/\s+/).length <= 4) {
      return true
    }
  }

  if (lower.includes('your name') || lower.includes('who are you') || lower.includes('what are you')) {
    return true
  }

  return false
}

// Rowan Orchestration Core Service
export class RowanOrchestrator {
  private providerManager = new ProviderManager()

  // Generate task plan with instant deterministic fast-path for low-latency responses
  async planTask(userMessage: string, enableSearch?: boolean): Promise<TaskPlan> {
    const preferredProvider = (process.env.PRIMARY_AI_PROVIDER || 'openai').toLowerCase()
    
    // Fast path: Check deterministic plan first to save 2-4 seconds of redundant LLM round-trips
    const fastPlan = this.deterministicPlan(userMessage, preferredProvider, enableSearch)
    
    // If the message clearly maps to known intents or is a standard conversational query without ambiguous tool requirements, use fastPlan directly
    return fastPlan
  }

  // Robust, bulletproof local rule-based fallback planner
  private deterministicPlan(userMessage: string, providerId: string, enableSearch?: boolean): TaskPlan {
    const lower = userMessage.toLowerCase()
    const steps: TaskStep[] = []
    const capabilities: string[] = []

    const isStoreAction = lower.includes('product') || lower.includes('catalog') || lower.includes('price') || lower.includes('buy') || lower.includes('shoe') || lower.includes('shirt') || lower.includes('headphones') || lower.includes('tote') ||
                          lower.includes('return') || lower.includes('refund') || lower.includes('hour') || lower.includes('policy') || lower.includes('shipping') || lower.includes('faq') || lower.includes('contact') || lower.includes('help') ||
                          lower.includes('analytic') || lower.includes('telemetry') || lower.includes('latency') || lower.includes('chart') || lower.includes('resolution') || lower.includes('conversion') ||
                          lower.includes('trade') || lower.includes('budget') || lower.includes('replenish') || lower.includes('stock') || lower.includes('procure') || lower.includes('nail') || lower.includes('timber') || lower.includes('screw') || lower.includes('market') || lower.includes('trend')

    const hasResearchKeyword = lower.includes('weather') || lower.includes('news') || lower.includes('president') || 
                               lower.includes('web') || lower.includes('search') || lower.includes('bitcoin') || 
                               lower.includes('shopify') || lower.includes('latest') || lower.includes('right now') || 
                               lower.includes('current') || lower.includes('today') || lower.includes('tavily') ||
                               lower.includes('yesterday') || lower.includes('recent') || lower.includes('how to') ||
                               lower.includes('what is') || lower.includes('who is') || lower.includes('tell me about') ||
                               lower.includes('stock price') || lower.includes('share price') || lower.includes('crypto')

    if (lower.includes('product') || lower.includes('catalog') || lower.includes('price') || lower.includes('buy') || lower.includes('shoe') || lower.includes('shirt') || lower.includes('headphones') || lower.includes('tote')) {
      capabilities.push('productSearch')
      steps.push({
        step: steps.length + 1,
        description: 'Search catalog for products mentioned',
        toolToUse: 'productSearch',
        arguments: { search: userMessage.replace(/(find|search|show|me|for|product|catalog)/gi, '').trim() }
      })
    }

    if (lower.includes('return') || lower.includes('refund') || lower.includes('hour') || lower.includes('policy') || lower.includes('shipping') || lower.includes('faq') || lower.includes('contact') || lower.includes('help')) {
      capabilities.push('storeKnowledge')
      steps.push({
        step: steps.length + 1,
        description: 'Lookup store policies and help parameters',
        toolToUse: 'storeKnowledge',
        arguments: { query: userMessage }
      })
    }

    if (lower.includes('analytic') || lower.includes('telemetry') || lower.includes('latency') || lower.includes('chart') || lower.includes('resolution') || lower.includes('conversion')) {
      capabilities.push('analyticsSummary')
      steps.push({
        step: steps.length + 1,
        description: 'Fetch conversation and latency analytics',
        toolToUse: 'analyticsSummary',
        arguments: {}
      })
    }

    if (lower.includes('trade') || lower.includes('budget') || lower.includes('replenish') || lower.includes('stock') || lower.includes('procure') || lower.includes('nail') || lower.includes('timber') || lower.includes('screw') || lower.includes('market') || lower.includes('chart') || lower.includes('trend')) {
      capabilities.push('tradingAnalysis')
      steps.push({
        step: steps.length + 1,
        description: 'Retrieve trading analysis context or budgets',
        toolToUse: 'tradingAnalysis',
        arguments: {}
      })
    }

    // Trigger web research if enableSearch is explicitly true,
    // OR if there is an explicit research keyword,
    // OR if it's not a chitchat and not a store action (and enableSearch !== false)
    const shouldResearch = enableSearch === true || 
      (enableSearch !== false && (hasResearchKeyword || (!isStoreAction && !isChitchat(userMessage))))

    if (shouldResearch) {
      capabilities.push('webResearch')
      steps.push({
        step: steps.length + 1,
        description: 'Perform web search query for non-store information',
        toolToUse: 'webResearch',
        arguments: { query: userMessage }
      })
    }

    if (lower.includes('device') || lower.includes('email') || lower.includes('notification') || lower.includes('action')) {
      capabilities.push('safeDeviceAction')
      steps.push({
        step: steps.length + 1,
        description: 'Safely log/stage a physical platform callback action',
        toolToUse: 'safeDeviceAction',
        arguments: { actionType: 'logStatus', payload: userMessage }
      })
    }

    return {
      intent: 'Deterministic routed task plan',
      capabilitiesRequired: capabilities,
      assignedModel: providerId === 'gemini' ? (process.env.GEMINI_MODEL || 'gemini-3.7-flash') : (process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      steps,
      completed: false
    }
  }

  // Orchestrate the whole lifecycle
  async orchestrate(
    userMessage: string,
    sessionId: string,
    context: ConversationContext,
    enableSearch?: boolean,
    screenFrame?: string
  ): Promise<{ text: string; plan: TaskPlan; providerUsed: string }> {
    console.log(`\n--- [ORCHESTRATION CYCLE START] Session: ${sessionId} ---`)
    console.log(`[ORCHESTRATION] User Message: "${userMessage}" | enableSearch=${enableSearch}`)

    // 1. Generate the Task Plan
    const plan = await this.planTask(userMessage, enableSearch)

    // 2. Execute Steps concurrently in parallel
    await Promise.all(
      plan.steps.map(async step => {
        const tool = availableTools.find(t => t.name === step.toolToUse)
        if (tool) {
          console.log(`[ORCHESTRATOR] Step ${step.step}: Running tool ${tool.name}`)
          try {
            const result = await tool.execute(step.arguments, context)
            step.result = result
            console.log(`[ORCHESTRATOR] Step ${step.step} completed: success=${result.success}`)
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error(`[ORCHESTRATOR] Step ${step.step} execution failed:`, errMsg)
            step.result = {
              toolName: step.toolToUse,
              success: false,
              data: null,
              error: errMsg
            }
          }
        } else {
          console.warn(`[ORCHESTRATOR] Tool ${step.toolToUse} not found in registry!`)
        }
      })
    )

    plan.completed = true

    // 3. Compile Combined Tool Context
    const toolResultsContext = plan.steps.map(step => ({
      step: step.step,
      tool: step.toolToUse,
      success: step.result?.success,
      data: step.result?.data,
      error: step.result?.error
    }))

    // 4. Final Response Synthesis with active AI Provider
    const dynamicSystemInstruction = buildDynamicSystemInstruction(context.connection)
    
    const memorySection = context.memory?.hasRetrievedMemory
      ? `
RETRIEVED LONG-TERM MEMORY (FACTS & MESSAGES FROM PREVIOUS SESSIONS/CONVERSATIONS):
${context.memory.temporalContextString}

[ROLLING SUMMARIES & STORED FACTS]:
${JSON.stringify(context.memory.conversationSummaries, null, 2)}

[RETRIEVED HISTORICAL MESSAGES]:
${JSON.stringify(context.memory.relevantHistory.map(h => ({
  dateLabel: h.dateLabel,
  conversationTitle: h.conversationTitle,
  speaker: h.role,
  text: h.text,
  relevanceScore: Number(h.relevanceScore.toFixed(2))
})), null, 2)}
`
      : `TEMPORAL CONTEXT: ${context.memory?.temporalContextString || `Current Date: ${new Date().toISOString()}`}`

    const synthesisPrompt = `
You are Rowan, the user's personal AI assistant.
We have executed backend tools and retrieved conversational memory for the user's message.

USER MESSAGE: "${userMessage}"

${memorySection}

ACTIVE CONVERSATION HISTORY (recent turns):
${JSON.stringify(context.history.slice(-6), null, 2)}

BACKEND TOOL RESULTS (absolute truth, prioritize this info):
${JSON.stringify(toolResultsContext, null, 2)}

ACTIVE CONNECTION CONTEXT:
${JSON.stringify(context.connection || { mode: 'General Personal Assistant', instructions: 'None provided. Be a general AI assistant.' }, null, 2)}

${context.storeKnowledge ? `CONNECTED STORE / WEBSITE KNOWLEDGE:\n${JSON.stringify(context.storeKnowledge, null, 2)}` : ''}

Operational Guidelines:
1. Synthesize a beautifully written, helpful, natural, objective, and friendly response.
2. CORE PRINCIPLE: Rowan is the user's AI. You must never assume you belong to a particular company or merchant unless the user's active connection instructions explicitly request a role.
3. If no custom instructions are set (or left blank), act as a general AI assistant (like ChatGPT/Gemini):
   - User: "What can you do?"
   - Rowan: "I'm Rowan, your personal AI assistant. I can help you understand information, answer questions, research the web, and assist with tasks you've authorized."
4. If operating on a connected website or device where the user provided specific instructions (e.g. customer support, product sales, tutoring), follow those personalized instructions faithfully while remaining Rowan.
5. HONESTY & REAL CAPABILITIES:
   - If the user asks about viewing their screen and no active screen capture was provided: say "I can't currently see your screen."
   - When looking at authorized screen content, understand it belongs to the user: "I'm looking at what you're currently viewing."
   - If the user asks to control an unsupported or unauthorized device: say "I can't control that device yet."
   - Never claim an order, action, device control, or system modification occurred unless a backend tool verified it.
6. If webResearch was used:
   - Summarize findings objectively and distinguish real-time information from static model knowledge.
   - Include citations using markdown links: [Title](URL).
7. CONVERSATIONAL MEMORY & TEMPORAL CONTEXT:
   - Use the RETRIEVED LONG-TERM MEMORY and ROLLING SUMMARIES to accurately answer questions about previous conversations, decisions, tech choices (e.g. laptops, voice systems), or commitments made in earlier sessions.
   - When the user asks "what did we talk about yesterday?" or "what laptop did you recommend?", retrieve and state the exact answer from the memory provided above.
   - Do NOT fabricate or hallucinate memories when none exist in the logs.
8. Do not leak internal system details like "TaskPlan", "JSON schema", or "Backend step numbers" to the user.
`

    try {
      console.log(`[ORCHESTRATOR] Synthesizing final response via ProviderManager...`)
      const synthesisResult = await this.providerManager.generateResponse(synthesisPrompt, {
        systemInstruction: dynamicSystemInstruction,
        toolUsed: plan.steps.map(s => s.toolToUse).join(',') || 'none',
        screenFrame
      })

      console.log(`--- [ORCHESTRATION CYCLE COMPLETED SUCCESSFULLY] ---\n`)
      return {
        text: synthesisResult.text,
        plan,
        providerUsed: synthesisResult.providerUsed
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[ORCHESTRATOR] Synthesis failed, generating crisis fallback message.', errMsg)
      
      // Crisis fallback synthesis in case both AI providers completely fail during generation
      let fallbackText = "I have processed your request. "
      
      const searchStep = plan.steps.find(s => s.toolToUse === 'productSearch')
      if (searchStep?.result?.success) {
        const searchData = searchStep.result.data as { products?: Array<{ name: string; price: number; currency: string }> } | null
        if (searchData?.products?.length) {
          const prod = searchData.products[0]
          fallbackText += `I found ${prod.name} (${prod.price} ${prod.currency}) in the catalog. `
        }
      }

      fallbackText += "How else can I assist you?"

      return {
        text: fallbackText,
        plan,
        providerUsed: 'fallback-rules'
      }
    }
  }
}
