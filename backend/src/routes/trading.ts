import { Router, Request, Response } from 'express'
import { GoogleGenAI } from '@google/genai'

const router = Router()

// Define the shape of incoming analysis request
interface AnalyzeRequest {
  symbol: string
  timeframe: string
  positionType: string
  entryPrice?: string
  stopLoss?: string
  takeProfit?: string
  riskTolerance: string
  isStaleData: boolean
  marketDataFeed?: {
    lastPrice: string
    high24h: string
    low24h: string
    volume24h: string
    rsi?: string
    macd?: string
    staleIndicator: boolean
  }
  chartImage?: {
    mimeType: string
    data: string // base64 encoded string
  }
}

router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  const {
    symbol,
    timeframe,
    positionType,
    entryPrice,
    stopLoss,
    takeProfit,
    riskTolerance,
    isStaleData,
    marketDataFeed,
    chartImage
  } = req.body as AnalyzeRequest

  if (!symbol || !timeframe) {
    res.status(400).json({ success: false, message: 'Symbol and Timeframe are required fields for analysis.' })
    return
  }

  // Warning if stale data is indicated or custom market data indicates stale
  const staleWarningNeeded = isStaleData || (marketDataFeed?.staleIndicator === true)

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Generate an extremely high-quality mock report to guarantee immediate functional display
    const mockReport = generateMockAnalysis(
      symbol,
      timeframe,
      positionType,
      entryPrice,
      stopLoss,
      takeProfit,
      riskTolerance,
      staleWarningNeeded,
      marketDataFeed
    )
    res.json({
      success: true,
      analysis: mockReport,
      isMock: true,
      warning: 'GEMINI_API_KEY is not defined in the workspace environment variables. Displaying local Rowan Trading Desk simulation report.'
    })
    return
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    })

    // Construct precise system & content prompt
    const staleDataNotice = staleWarningNeeded
      ? 'CRITICAL WARNING: The market data provided is STALE and out-of-date. Highlight this clearly in your response.'
      : 'Note: The market data is reported as live and active.'

    const promptText = `
You are Rowan, a world-class institutional Trading Analyst, Risk Manager, and Scenario Planner.
Analyze the following trading scenario and provide a comprehensive, objective, and multi-faceted report.

--- SPECULATIVE ASSET CONFIGURATION ---
Symbol: ${symbol}
Timeframe: ${timeframe}
Position Context: ${positionType}
Suggested Entry Price: ${entryPrice || 'Not provided'}
Suggested Stop Loss: ${stopLoss || 'Not provided'}
Suggested Take Profit: ${takeProfit || 'Not provided'}
Risk Tolerance Level: ${riskTolerance}
${staleDataNotice}

--- ADDITIONAL MARKET DATA CODES ---
Last Price: ${marketDataFeed?.lastPrice || 'N/A'}
24h High: ${marketDataFeed?.high24h || 'N/A'}
24h Low: ${marketDataFeed?.low24h || 'N/A'}
24h Volume: ${marketDataFeed?.volume24h || 'N/A'}
RSI (14): ${marketDataFeed?.rsi || 'N/A'}
MACD: ${marketDataFeed?.macd || 'N/A'}

--- MANDATORY DIRECTIVES & SAFETY CONSTRAINTS ---
1. ABSOLUTE CEILING FOR TRUST: NEVER guarantee any profit, claim certainty about market direction, or represent speculative analysis as guaranteed financial advice. Speculative trading carries severe risks, including complete capital loss.
2. DO NOT INVENT LIVE PRICES. If price fields are stale or missing, explicitly declare that prices cannot be verified and are unconfirmed.
3. PREPARE THE ARCHITECTURE: Mention that Rowan's trading assistant acts as a decision support desk. Rowan does NOT automatically execute trades. Human confirmation is always required for any trade execution.
4. MISSING DATA GAPS: If any parameters are missing (e.g. Entry, Stop Loss, Take Profit, or an uploaded Chart image), identify the missing values and politely request them to complete a fuller assessment.

--- REQUIRED STRUCTURED OUTPUT ---
Your report must be structured with the following exact headings:

### ⚠️ STALE DATA WARNING (Only display this if stale warning is active: ${staleWarningNeeded ? 'YES' : 'NO'})
[Include high-visibility warning detailing that analysis is based on out-of-date records if active]

### 1. Market Context
[Assess broad environment, news, macro sentiment, and recent developments related to ${symbol}]

### 2. Trend Assessment
[Identify current structural direction: bullish, bearish, ranging, or transition on the ${timeframe} timeframe]

### 3. Key Levels (Support / Resistance)
[Define major horizontal support zones, dynamic resistance lines, and pivot areas based on input or uploaded chart]

### 4. Relevant Indicators
[Analyze technical status: RSI, MACD, Volume profile, moving averages, and structural patterns]

### 5. Bullish Scenario
[Outline the logical path for a bullish move, catalysts required, and target ranges]

### 6. Bearish Scenario
[Outline the logical path for a bearish move, breakdown catalysts, and target ranges]

### 7. Risk Assessment
[Perform deep risk analysis, assessing volatility levels, drawdown scenarios, and potential leverage traps]

### 8. Potential Invalidation Level
[Define the exact level where the speculative thesis fails entirely and stop-losses must be triggered]

### 9. Position / Risk Considerations
[Discuss risk-reward ratio, proposed position size based on the "${riskTolerance}" tolerance level, and stop-loss placement safety]

### 10. Step-by-Step Decision Framework
[Provide a logical sequence of criteria the trader should confirm sequentially before acting on this asset]

### 11. Confidence / Uncertainty Explanation
[Explain the balance of probabilities, emphasizing high market uncertainty, lack of guarantees, and speculative warning]
`

    const contents: Array<{ inlineData?: { mimeType: string; data: string }; text?: string }> = []

    if (chartImage?.data) {
      contents.push({
        inlineData: {
          mimeType: chartImage.mimeType,
          data: chartImage.data
        }
      })
    }

    contents.push({ text: promptText })

    const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.1-flash-lite']
    let responseText = ''
    let lastError: unknown = null

    for (const currentModel of models) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: { parts: contents }
        })
        if (response.text) {
          responseText = response.text
          break
        }
      } catch (err: unknown) {
        lastError = err
        console.warn(`[TRADING] Model ${currentModel} failed:`, err instanceof Error ? err.message : String(err))
      }
    }

    if (!responseText) {
      throw lastError || new Error('Failed to generate coherent trading analysis from the AI core.')
    }

    res.json({
      success: true,
      analysis: responseText,
      isMock: false
    })
  } catch (error) {
    const err = error as Error
    console.error('Error generating trading report via Gemini:', err)
    res.status(500).json({
      success: false,
      message: `Gemini Engine Exception: ${err.message || 'Unknown error occurred during generative model execution.'}`
    })
  }
})

interface FallbackFeed {
  lastPrice: string
  high24h: string
  low24h: string
  volume24h: string
  rsi?: string
  macd?: string
  staleIndicator: boolean
}

/**
 * High-quality fallback text generator if API key is not configured
 */
function generateMockAnalysis(
  symbol: string,
  timeframe: string,
  positionType: string,
  entryPrice?: string,
  stopLoss?: string,
  takeProfit?: string,
  riskTolerance: string,
  staleWarning: boolean,
  marketDataFeed?: FallbackFeed
): string {
  const currentPrice = marketDataFeed?.lastPrice || '104.20'
  const entryVal = entryPrice || currentPrice
  const slVal = stopLoss || '95.00'
  const tpVal = takeProfit || '120.00'

  return `
### ${staleWarning ? '⚠️ STALE DATA WARNING' : ''}
${staleWarning ? `**CRITICAL FEED ALERT:** Market data feeds for **${symbol}** are currently flagged as STALE or OUT-OF-DATE. Ticker prices, technical metrics, and order book states do not represent real-time live trading. Do not place active market orders based on this data.` : ''}

### 1. Market Context
**Asset Analyzed:** **${symbol}** on a **${timeframe}** timeframe. 
Broad market sentiment is currently reflecting high structural dispersion. Macroeconomic factors and supply dynamics for ${symbol} suggest key consolidation near major distribution nodes. News flows highlight upcoming index rebalancings and local liquidity shifts, triggering increased dynamic volatility.

### 2. Trend Assessment
The trend on the **${timeframe}** chart exhibits a **Neutral-to-Bearish** structure. Price action shows a series of lower highs, though an ascending dynamic channel from weekly lows is still defending key support levels. Price is trading below its 50-period EMA, hinting at short-term distribution.

### 3. Key Levels (Support / Resistance)
- **Primary Resistance Zone:** Resistance is established heavily between **$${(parseFloat(entryVal) * 1.1).toFixed(2)}** and **$${(parseFloat(entryVal) * 1.15).toFixed(2)}** (confluence of previous weekly high and order block).
- **Primary Support Zone:** Hard horizontal support resides at **$${(parseFloat(entryVal) * 0.9).toFixed(2)}** with psychological demand clusters lower at **$${(parseFloat(entryVal) * 0.85).toFixed(2)}**.

### 4. Relevant Indicators
- **Relative Strength Index (RSI-14):** Currently printed at **${marketDataFeed?.rsi || '44.5'}**, indicating neutral momentum with room to expand downwards before reaching classical oversold territories.
- **MACD Profile:** Bearish momentum histogram expansion below the zero line, signal line cross pending.
- **Volume Profile (VPVR):** The Point of Control (POC) lies near current price, indicating high-density transaction churn.

### 5. Bullish Scenario
For a bullish continuation to unfold:
1. Support must hold firmly at **$${(parseFloat(entryVal) * 0.92).toFixed(2)}** with a high-volume reversal pattern.
2. Clear close above the 50-EMA is required to open the path to **$${tpVal}**.
3. *Note: speculative targets do not guarantee arrival; unexpected seller supply can invalidate breakouts instantly.*

### 6. Bearish Scenario
If structural breakdown occurs:
1. A clean hourly close below the invalidation level at **$${slVal}** will trigger massive stop-loss liquidations.
2. Expected downside target resides at **$${(parseFloat(entryVal) * 0.82).toFixed(2)}** (previous liquidity sweep pool).

### 7. Risk Assessment
- **Volatility Risk:** Volatility is high due to impending macroeconomic news releases.
- **Leverage Risk:** Avoid high leverage. The wide trading range raises liquidation risk if stop-losses are not placed conservatively.
- **No Guarantees:** Markets are highly complex and erratic. Rowan provides speculative analysis, never guaranteed profit.

### 8. Potential Invalidation Level
The speculative thesis is completely invalidated below **$${slVal}**. Any position size must be structured around this level to prevent uncontrolled capital drawdown.

### 9. Position / Risk Considerations
- **Risk-Reward Profile:** Based on your selected **${riskTolerance}** risk tolerance, a maximum risk exposure of 1-2% of total trading equity per trade is strongly suggested.
- **Ratio:** Current scenario offers an estimated risk-reward ratio of **1:2.1**, which is statistically viable assuming strict execution of stop placement.

### 10. Step-by-Step Decision Framework
1. **Confirm Feed Accuracy:** Ensure live price streams correspond to external exchange tickers before acting.
2. **Support Verification:** Wait for a 4-hour candle close above the dynamic level.
3. **Execution Safety:** Enter stop-loss and take-profit parameters simultaneously into your trading interface. **Never trade without an active stop-loss.**
4. **Platform Confirmation:** Trade execution is NOT automated. You must manually confirm and place any trade yourself.

### 11. Confidence / Uncertainty Explanation
Market uncertainty remains **Extremely High**. Speculative analyses are derived from technical probability distributions and historical charts, which do not guarantee future performance. Capital preservation is the core rule.
`
}

export default router
