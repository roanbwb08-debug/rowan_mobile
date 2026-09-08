import { Tool, ToolResult } from './types.js'
import { searchProducts, productContext } from '../catalog.js'
import { demoStore } from '../../data/demo-store.js'
import { performWebResearch } from './research.js'

// Helper to wrap execution with safety timeouts
async function withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Tool execution timed out')), ms)
  })
  return Promise.race([promise, timeout])
}

export const productSearchTool: Tool = {
  name: 'productSearch',
  description: 'Search the e-commerce product catalog. Supports keyword, category, and price range filters.',
  parameters: {
    type: 'OBJECT',
    properties: {
      search: { type: 'STRING', description: 'Product title or keyword query (e.g. runner, shirt)' },
      category: { type: 'STRING', description: 'Product category (e.g. shoes, clothing, electronics)' },
      minPrice: { type: 'NUMBER', description: 'Minimum price filter' },
      maxPrice: { type: 'NUMBER', description: 'Maximum price filter' }
    }
  },
  async execute(args: Record<string, unknown>, context?: ConversationContext): Promise<ToolResult> {
    try {
      console.log('[ORCHESTRATOR] Executing productSearch with args:', JSON.stringify(args))
      
      const search = typeof args.search === 'string' ? args.search : undefined
      const category = typeof args.category === 'string' ? args.category : undefined
      const minPrice = typeof args.minPrice === 'number' ? args.minPrice : undefined
      const maxPrice = typeof args.maxPrice === 'number' ? args.maxPrice : undefined

      const storeId = (context?.metadata?.storeId as string) || 'demo-store'

      const results = await withTimeout(
        searchProducts(storeId, {
          search,
          category,
          minPrice,
          maxPrice
        })
      )
      return {
        toolName: 'productSearch',
        success: true,
        data: {
          count: results.length,
          products: productContext(results)
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[ORCHESTRATOR] Error in productSearch:', errMsg)
      return {
        toolName: 'productSearch',
        success: false,
        data: null,
        error: errMsg
      }
    }
  }
}

export const storeKnowledgeTool: Tool = {
  name: 'storeKnowledge',
  description: 'Retrieve general store specifications, store policies (shipping, returns, refunds), support details, operating hours, and FAQs.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'Specific knowledge or policy term (e.g. returns, hours)' }
    }
  },
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log('[ORCHESTRATOR] Executing storeKnowledge with query:', args.query)
      // Retrieve the store knowledge base
      const knowledge = demoStore.knowledge
      return {
        toolName: 'storeKnowledge',
        success: true,
        data: {
          storeName: knowledge.storeName,
          description: knowledge.description,
          shipping: knowledge.shipping,
          returns: knowledge.returns,
          contact: knowledge.contact,
          hours: knowledge.hours,
          faqs: knowledge.faqs
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        toolName: 'storeKnowledge',
        success: false,
        data: null,
        error: errMsg
      }
    }
  }
}

export const analyticsSummaryTool: Tool = {
  name: 'analyticsSummary',
  description: 'Fetch conversational analytics, agent latency metrics, message volumes, resolution rates, and automatic sales conversion rates.',
  parameters: {
    type: 'OBJECT',
    properties: {}
  },
  async execute(): Promise<ToolResult> {
    try {
      console.log('[ORCHESTRATOR] Executing analyticsSummary')
      return {
        toolName: 'analyticsSummary',
        success: true,
        data: {
          totalConversations: '1,860 Chats (last 7 days)',
          avgResponseTimeMs: 1120,
          resolutionRatePercent: 98.4,
          autoMatchConversionPercent: 28.5,
          activeModels: ['Gemini 3.7 Flash', 'OpenAI GPT-4o-mini']
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        toolName: 'analyticsSummary',
        success: false,
        data: null,
        error: errMsg
      }
    }
  }
}

export const tradingAnalysisTool: Tool = {
  name: 'tradingAnalysis',
  description: 'Access inventory replenishment data, automated purchase procurement budgets, catalog trade histories, and current replenishment statuses.',
  parameters: {
    type: 'OBJECT',
    properties: {}
  },
  async execute(): Promise<ToolResult> {
    try {
      console.log('[ORCHESTRATOR] Executing tradingAnalysis')
      return {
        toolName: 'tradingAnalysis',
        success: true,
        data: {
          procurementBudget: '$12,450.00 USD',
          autoPurchasesExecuted: '42 trades',
          totalUnitsProcured: '1,240 Units',
          recentTrades: [
            { id: 'TX-9042', product: 'Steel Construction Nails (M)', quantity: 200, type: 'buy', price: 1.5 },
            { id: 'TX-9041', product: 'Premium Pine Timber Plank', quantity: 150, type: 'buy', price: 5.2 }
          ]
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        toolName: 'tradingAnalysis',
        success: false,
        data: null,
        error: errMsg
      }
    }
  }
}

export const webResearchTool: Tool = {
  name: 'webResearch',
  description: 'Perform a web search query for real-time, external, or generic informational queries that are not e-commerce or store-specific.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'The search query to search the web for' },
      topic: { type: 'STRING', description: 'The specific search topic classification' },
      timeRange: { type: 'STRING', description: 'Optional time range constraint (e.g. past week, past month)' },
      maxResults: { type: 'NUMBER', description: 'Maximum number of results to fetch (up to 10)' }
    },
    required: ['query']
  },
  async execute(args: Record<string, unknown>, context?: unknown): Promise<ToolResult> {
    try {
      console.log('[ORCHESTRATOR] Executing webResearch with:', JSON.stringify(args))
      const queryStr = typeof args.query === 'string' ? args.query : ''
      if (!queryStr) {
        return {
          toolName: 'webResearch',
          success: false,
          data: null,
          error: 'Query parameter is missing'
        }
      }

      const topic = typeof args.topic === 'string' ? args.topic : undefined
      const timeRange = typeof args.timeRange === 'string' ? args.timeRange : undefined
      const maxResults = typeof args.maxResults === 'number' ? args.maxResults : undefined

      const result = await withTimeout(performWebResearch(queryStr, context?.sessionId, { topic, timeRange, maxResults }))

      return {
        toolName: 'webResearch',
        success: result.success,
        data: {
          query: queryStr,
          summary: result.summary,
          sources: result.sources,
          provider: result.provider,
          retrievalStatus: result.retrievalStatus,
          timestamp: new Date().toISOString()
        },
        error: result.error
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        toolName: 'webResearch',
        success: false,
        data: null,
        error: errMsg
      }
    }
  }
}

export const safeDeviceActionTool: Tool = {
  name: 'safeDeviceAction',
  description: 'Log and stage user-requested device operations, notifications, emails, or platform callbacks safely.',
  parameters: {
    type: 'OBJECT',
    properties: {
      actionType: { type: 'STRING', description: 'Type of operation (e.g. logStatus, sendNotification)' },
      payload: { type: 'STRING', description: 'System text payload or detail logging parameters' }
    },
    required: ['actionType']
  },
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    try {
      console.log('[ORCHESTRATOR] Executing safeDeviceAction with:', JSON.stringify(args))
      const actionType = typeof args.actionType === 'string' ? args.actionType : 'unknown'
      return {
        toolName: 'safeDeviceAction',
        success: true,
        data: {
          actionRegistered: actionType,
          status: 'Staged',
          message: `Operation '${actionType}' has been safely registered and staged for operational dispatch. Dangerous or active local device controls are restricted.`
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      return {
        toolName: 'safeDeviceAction',
        success: false,
        data: null,
        error: errMsg
      }
    }
  }
}

export const availableTools: Tool[] = [
  productSearchTool,
  storeKnowledgeTool,
  analyticsSummaryTool,
  tradingAnalysisTool,
  webResearchTool,
  safeDeviceActionTool
]
