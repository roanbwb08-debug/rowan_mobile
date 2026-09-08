import { Router } from 'express'
import { GoogleGenAI } from '@google/genai'
import { buildDynamicSystemInstruction } from '../rowan.js'
import { getOrCreateTenant } from '../services/db.js'
import { history, remember } from '../services/context.js'
import { generateContentWithFallback } from '../services/ai/generation.js'

const router = Router()

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  })
}

router.post('/sms', async (req, res) => {
  const incomingMessage = (req.body.Body ?? '').trim()
  const sender = (req.body.From ?? '').trim()

  res.set('Content-Type', 'text/xml')

  if (!incomingMessage || !sender) {
    return res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Rowan is not configured yet. Please configure the GEMINI_API_KEY in the settings menu.</Message>
</Response>`)
  }

  const model = process.env.GEMINI_MODEL ?? 'gemini-flash-latest'

  try {
    const tenant = await getOrCreateTenant()
    const context = {
      history: history(sender),
      storeKnowledge: tenant.store.knowledge || ''
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })

    const dynamicInstruction = buildDynamicSystemInstruction({
      connectionType: 'phone',
      connectionName: 'SMS Assistant',
      additionalInstructions: 'Keep responses concise and direct for SMS delivery.'
    })

    const result = await generateContentWithFallback(ai, model, {
      contents: `CONTEXT: ${JSON.stringify(context)}\n\nUSER SMS: ${incomingMessage}`,
      config: { systemInstruction: dynamicInstruction, maxOutputTokens: 250 }
    })

    const message = result.text?.trim()
    if (!message) throw new Error('Empty Gemini response')

    remember(sender, { role: 'user', text: incomingMessage, products: [] })
    remember(sender, { role: 'assistant', text: message, products: [] })

    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Gemini SMS webhook failed:', errMsg)

    let clientMsg = 'Rowan is experiencing some technical difficulties. Please try again shortly!'
    if (errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      clientMsg = 'Rowan is experiencing a high volume of text messages. Please try texting again in a few seconds!'
    }

    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(clientMsg)}</Message>
</Response>`)
  }
})

export default router
