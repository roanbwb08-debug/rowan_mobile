import 'dotenv/config'
import { RowanOrchestrator } from './src/services/ai/orchestration.js'

async function runTests() {
  console.log('================================================')
  console.log('       ROWAN AI ORCHESTRATION UNIT TESTS        ')
  console.log('================================================\n')

  // Set mock environment variables if none exist to enable standard local testing
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log('[TEST] No active LLM API keys detected. Testing under robust rule-based deterministic planner & fallback synthesis modes.\n')
    process.env.GEMINI_API_KEY = 'mock_gemini_key_for_testing'
  }

  const orchestrator = new RowanOrchestrator()
  const sessionId = 'test-session-uuid-123456'
  const context = {
    sessionId,
    history: [],
    storeKnowledge: {
      storeName: 'Northstar Supply',
      returns: 'Returns are accepted within 30 days.'
    }
  }

  const testCases = [
    {
      name: 'Scenario 1: Product Catalog Search',
      message: 'Show me black running shoes under 100 USD'
    },
    {
      name: 'Scenario 2: Store Policies & Knowledge Base',
      message: 'What is your refund policy and support contact email?'
    },
    {
      name: 'Scenario 3: E-commerce Telemetry & Analytics',
      message: 'Check the conversion rate and chat latency analytics'
    },
    {
      name: 'Scenario 4: Stock Replenishment & Trading Desk',
      message: 'What is the current screw procurement budget?'
    },
    {
      name: 'Scenario 5: Web Research Query',
      message: 'What is the current weather forecast?'
    },
    {
      name: 'Scenario 6: Safe Device Logs Control',
      message: 'Send an email notification for system status logs'
    },
    {
      name: 'Scenario 7: General Conversation',
      message: 'Hi Rowan, hope you are doing well today!'
    }
  ]

  for (const tc of testCases) {
    console.log(`>>> RUNNING: ${tc.name}`)
    console.log(`User query: "${tc.message}"`)
    
    try {
      const response = await orchestrator.orchestrate(tc.message, sessionId, context)
      
      console.log(`Assigned Model: ${response.plan.assignedModel}`)
      console.log(`Intent Detected: ${response.plan.intent}`)
      console.log(`Capabilities Required: ${JSON.stringify(response.plan.capabilitiesRequired)}`)
      console.log(`Steps Planned: ${response.plan.steps.length}`)
      
      for (const step of response.plan.steps) {
        console.log(`  - Step ${step.step} [${step.toolToUse}]: success=${step.result?.success}`)
        if (step.result?.success) {
          console.log(`    Result Data keys: ${Object.keys(step.result.data as Record<string, unknown> ?? {})}`)
        }
      }
      
      console.log(`Synthesized Response (Rowan): "${response.text.substring(0, 160)}..."`)
      console.log(`Provider Used: ${response.providerUsed}`)
      console.log('------------------------------------------------\n')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`[TEST ERROR] ${tc.name} failed:`, errMsg)
      process.exit(1)
    }
  }

  console.log('================================================')
  console.log('     ALL ORCHESTRATION TESTS COMPLETED GREEN     ')
  console.log('================================================')
}

runTests().catch(err => {
  console.error('Fatal test execution error:', err)
  process.exit(1)
})
