import { db } from './firebase.js'
import { TaskPlan } from './ai/types.js'

interface EcomProduct {
  id: string
  name: string
  price?: number
  [key: string]: unknown
}

/**
 * Parses and registers analytics events in the background from a chat message exchange.
 * Designed to be fire-and-forget so that it does not increase chat response latency.
 */
export async function logChatAnalytics(
  sessionId: string,
  orgId: string,
  userMessage: string,
  botMessage: string,
  plan: TaskPlan,
  finalProducts: EcomProduct[]
): Promise<void> {
  try {
    const timestamp = new Date().toISOString()
    const batch = db.batch()

    // 1. Log Conversation / Message Event
    const convRef = db.collection('analytics_events').doc()
    batch.set(convRef, {
      organizationId: orgId,
      sessionId,
      type: 'conversation',
      data: {
        messageLength: userMessage.length,
        responseLength: botMessage.length,
        productsCount: finalProducts.length
      },
      timestamp
    })

    // 2. Log Customer Intent
    const lowerUser = userMessage.toLowerCase()
    let intentName = plan.intent || 'General Conversation'
    
    // Normalize intent for charts grouping consistency
    if (intentName.toLowerCase().includes('search') || intentName.toLowerCase().includes('catalog') || finalProducts.length > 0) {
      intentName = 'Catalog Product Search'
    } else if (lowerUser.includes('return') || lowerUser.includes('refund') || lowerUser.includes('policy')) {
      intentName = 'Return/Refund Policy Verification'
    } else if (lowerUser.includes('shipping') || lowerUser.includes('fee') || lowerUser.includes('postage') || lowerUser.includes('deliver')) {
      intentName = 'Shipping Fee Questions'
    } else if (lowerUser.includes('hour') || lowerUser.includes('open') || lowerUser.includes('time') || lowerUser.includes('address')) {
      intentName = 'Store Operations Inquiry'
    } else if (lowerUser.includes('buy') || lowerUser.includes('order') || lowerUser.includes('purchase') || lowerUser.includes('checkout')) {
      intentName = 'Direct Buying Assistance'
    }

    const intentRef = db.collection('analytics_events').doc()
    const intentData: Record<string, unknown> = { intentName }

    // Detect Objections in User Query
    let objection: string | null = null
    if (lowerUser.includes('price') || lowerUser.includes('expensive') || lowerUser.includes('cost') || lowerUser.includes('too high')) {
      objection = 'Price is higher than expectations or competitors'
    } else if (lowerUser.includes('slow') || lowerUser.includes('shipping taking') || lowerUser.includes('wait')) {
      objection = 'Shipping delivery times are considered too slow'
    } else if (lowerUser.includes('return period') || lowerUser.includes('refund period') || lowerUser.includes('short')) {
      objection = '30-day return window is perceived as too restrictive'
    } else if (lowerUser.includes('sampler') || lowerUser.includes('sample') || lowerUser.includes('trial')) {
      objection = 'Lack of small starter samples or trial bundles'
    }

    if (objection) {
      intentData.objection = objection
    }

    batch.set(intentRef, {
      organizationId: orgId,
      sessionId,
      type: 'customer_intent',
      data: intentData,
      timestamp
    })

    // 3. Log Product Search Event
    const searchStep = plan.steps.find(step => step.toolToUse === 'productSearch')
    if (searchStep) {
      const queryArg = searchStep.arguments?.search || userMessage
      const searchRef = db.collection('analytics_events').doc()
      batch.set(searchRef, {
        organizationId: orgId,
        sessionId,
        type: 'product_search',
        data: {
          query: queryArg,
          resultsCount: finalProducts.length
        },
        timestamp
      })
    }

    // 4. Log Recommendations & Product Interest
    if (finalProducts.length > 0) {
      // Recommendations Event
      const recRef = db.collection('analytics_events').doc()
      batch.set(recRef, {
        organizationId: orgId,
        sessionId,
        type: 'product_recommendation',
        data: {
          products: finalProducts.map(p => p.id)
        },
        timestamp
      })

      // Product Interest (Views) Events
      finalProducts.forEach(p => {
        const interestRef = db.collection('analytics_events').doc()
        batch.set(interestRef, {
          organizationId: orgId,
          sessionId,
          type: 'product_interest',
          data: {
            productId: p.id,
            productName: p.name
          },
          timestamp
        })
      })
    }

    // 5. Log Unanswered Questions / Escalations
    // Check if bot indicates failure to address query
    const lowerBot = botMessage.toLowerCase()
    const isUnanswered = 
      lowerBot.includes('sorry, i don\'t') ||
      lowerBot.includes('do not have') ||
      lowerBot.includes('unable to find') ||
      lowerBot.includes('couldn\'t find') ||
      lowerBot.includes('unable to answer') ||
      lowerBot.includes('no information') ||
      lowerBot.includes('escalate') ||
      lowerBot.includes('human agent') ||
      lowerBot.includes('contact support')

    if (isUnanswered) {
      const unansweredRef = db.collection('analytics_events').doc()
      batch.set(unansweredRef, {
        organizationId: orgId,
        sessionId,
        type: 'unanswered_question',
        data: {
          question: userMessage,
          botResponseSnippet: botMessage.slice(0, 100)
        },
        timestamp
      })
    }

    // 6. Log Conversion (Expressions of purchase intent)
    const isConversion = 
      lowerUser.includes('buy') ||
      lowerUser.includes('order') ||
      lowerUser.includes('purchase') ||
      lowerUser.includes('checkout') ||
      lowerUser.includes('add to cart') ||
      lowerUser.includes('cart')

    if (isConversion && finalProducts.length > 0) {
      const convProd = finalProducts[0]
      const conversionRef = db.collection('analytics_events').doc()
      batch.set(conversionRef, {
        organizationId: orgId,
        sessionId,
        type: 'conversion',
        data: {
          productId: convProd.id,
          productName: convProd.name,
          value: convProd.price || 0
        },
        timestamp
      })
    }

    // Commit all telemetry logs to Firestore at once
    await batch.commit()
    console.log(`[TELEMETRY] Successfully recorded chat analytics for session: ${sessionId}`)
  } catch (err: unknown) {
    console.error('[TELEMETRY ERROR] Failed to log chat telemetry events:', err instanceof Error ? err.message : err)
  }
}
