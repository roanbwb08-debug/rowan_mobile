import React, { useState, useEffect } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { StatusIndicator } from '../components/StatusIndicator'
import { TradingOverlay } from '../components/TradingOverlay'
import type { TradingPlatformConnector } from '../components/TradingOverlay'
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Coins,
  Shield,
  Upload,
  AlertTriangle,
  TrendingUp,
  BrainCircuit,
  Sparkles,
  CheckCircle,
  Clock,
  Gauge,
  XCircle,
  HelpCircle,
  Wallet,
  Play,
  Monitor,
  Info
} from 'lucide-react'
import Markdown from 'react-markdown'

interface TradeExecution {
  id: string
  productName: string
  quantity: number
  price: number
  type: 'buy' | 'sell'
  timestamp: string
  status: 'completed' | 'pending'
}

interface AssetPreset {
  symbol: string
  lastPrice: string
  high24h: string
  low24h: string
  volume24h: string
  rsi: string
  macd: string
  entryPrice: string
  stopLoss: string
  takeProfit: string
}

const ASSET_PRESETS: Record<string, AssetPreset> = {
  'BTC/USDT': {
    symbol: 'BTC/USDT',
    lastPrice: '104250.00',
    high24h: '105400.00',
    low24h: '102150.00',
    volume24h: '14.2B USDT',
    rsi: '62.5',
    macd: '+145.2 (Bullish momentum)',
    entryPrice: '104250.00',
    stopLoss: '98000.00',
    takeProfit: '115000.00'
  },
  'ETH/USDT': {
    symbol: 'ETH/USDT',
    lastPrice: '3650.00',
    high24h: '3740.00',
    low24h: '3580.00',
    volume24h: '5.8B USDT',
    rsi: '54.2',
    macd: '+12.4 (Consolidating)',
    entryPrice: '3650.00',
    stopLoss: '3420.00',
    takeProfit: '4100.00'
  },
  'AAPL': {
    symbol: 'AAPL',
    lastPrice: '242.15',
    high24h: '244.80',
    low24h: '241.05',
    volume24h: '1.2B USD',
    rsi: '48.9',
    macd: '-0.45 (Ranging)',
    entryPrice: '242.15',
    stopLoss: '232.00',
    takeProfit: '265.00'
  },
  'EUR/USD': {
    symbol: 'EUR/USD',
    lastPrice: '1.0842',
    high24h: '1.0890',
    low24h: '1.0815',
    volume24h: '280M USD',
    rsi: '39.5',
    macd: '-0.0012 (Oversold rebound)',
    entryPrice: '1.0842',
    stopLoss: '1.0750',
    takeProfit: '1.1020'
  }
}

// Candlestick model for the Mock Chart
interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const DEFAULT_CANDLES_BULLISH: Candle[] = [
  { time: '10:00', open: 102000, high: 102400, low: 101800, close: 102300, volume: 150 },
  { time: '11:00', open: 102300, high: 102900, low: 102100, close: 102700, volume: 180 },
  { time: '12:00', open: 102700, high: 103200, low: 102500, close: 103100, volume: 210 },
  { time: '13:00', open: 103100, high: 103500, low: 102900, close: 103400, volume: 195 },
  { time: '14:00', open: 103400, high: 104100, low: 103200, close: 104050, volume: 250 },
  { time: '15:00', open: 104050, high: 104500, low: 103800, close: 104250, volume: 220 }
]

const DEFAULT_CANDLES_BEARISH: Candle[] = [
  { time: '10:00', open: 106000, high: 106200, low: 105100, close: 105300, volume: 170 },
  { time: '11:00', open: 105300, high: 105600, low: 104400, close: 104600, volume: 190 },
  { time: '12:00', open: 104600, high: 104900, low: 103800, close: 104100, volume: 220 },
  { time: '13:00', open: 104100, high: 104300, low: 103100, close: 103300, volume: 240 },
  { time: '14:00', open: 103300, high: 103700, low: 102200, close: 102500, volume: 280 },
  { time: '15:00', open: 102500, high: 103000, low: 101900, close: 102150, volume: 310 }
]

export const Trading: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'overlay' | 'procurement'>('overlay')
  
  // Existing Procurement state
  const [tradingActive, setTradingActive] = useState(true)
  const [history, setHistory] = useState<TradeExecution[]>([
    { id: 'TX-9042', productName: 'Steel Construction Nails (M)', quantity: 200, price: 1.5, type: 'buy', timestamp: '10 mins ago', status: 'completed' },
    { id: 'TX-9041', productName: 'Premium Pine Timber Plank', quantity: 150, price: 5.2, type: 'buy', timestamp: '2 hours ago', status: 'completed' },
    { id: 'TX-9040', productName: 'Industrial Safety Goggles', quantity: 80, price: 12.0, type: 'sell', timestamp: '5 hours ago', status: 'completed' },
    { id: 'TX-9039', productName: 'Heavy-Duty Tarpaulin Cover', quantity: 50, price: 18.5, type: 'buy', timestamp: '1 day ago', status: 'completed' }
  ])
  const [simulating, setSimulating] = useState(false)

  // New Trading Assistant State (Tab 1: Analytics Desk)
  const [selectedPreset, setSelectedPreset] = useState<string>('BTC/USDT')
  const [symbol, setSymbol] = useState<string>('BTC/USDT')
  const [timeframe, setTimeframe] = useState<string>('4h')
  const [positionType, setPositionType] = useState<string>('Long')
  const [entryPrice, setEntryPrice] = useState<string>('104250.00')
  const [stopLoss, setStopLoss] = useState<string>('98000.00')
  const [takeProfit, setTakeProfit] = useState<string>('115000.00')
  const [riskTolerance, setRiskTolerance] = useState<string>('Moderate')
  const [isStaleData, setIsStaleData] = useState<boolean>(false)

  // Chart upload
  const [chartImage, setChartImage] = useState<{ mimeType: string; data: string } | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Results
  const [analysisReport, setAnalysisReport] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [backendWarning, setBackendWarning] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Trade Setup deployment (Non-automated manual execution safety checkpoint)
  const [humanConfirmed, setHumanConfirmed] = useState<boolean>(false)
  const [isDeploying, setIsDeploying] = useState<boolean>(false)

  // Phase 12 Overlay & Mock Terminal Simulation State
  const [mockPlatform, setMockPlatform] = useState<'tradingview' | 'broker' | 'custom'>('tradingview')
  const [mockSymbol, setMockSymbol] = useState<string>('BTC/USDT')
  const [mockTimeframe, setMockTimeframe] = useState<string>('1h')
  const [mockCandles, setMockCandles] = useState<Candle[]>(DEFAULT_CANDLES_BULLISH)
  const [mockLastPrice, setMockLastPrice] = useState<number>(104250.0)
  const [mockTheme, setMockTheme] = useState<'light' | 'dark'>('dark')
  const [terminalPattern, setTerminalPattern] = useState<'bullish' | 'bearish'>('bullish')
  
  // Simualted Account Portfolio
  const [portfolioEquity, setPortfolioEquity] = useState<number>(100000.0)
  const [queuedSetups, setQueuedSetups] = useState<Array<{
    id: string
    symbol: string
    type: string
    entry: number
    sl: number
    tp: number
    timestamp: string
  }>>([])

  // Random price ticker effect
  useEffect(() => {
    const timer = setInterval(() => {
      setMockLastPrice(prev => {
        const delta = (Math.random() - 0.49) * 150
        const updated = parseFloat((prev + delta).toFixed(2))
        
        // Update the last candle close
        setMockCandles(prevCandles => {
          if (prevCandles.length === 0) return prevCandles
          const newCandles = [...prevCandles]
          const lastCandle = { ...newCandles[newCandles.length - 1] }
          lastCandle.close = updated
          if (updated > lastCandle.high) lastCandle.high = updated
          if (updated < lastCandle.low) lastCandle.low = updated
          newCandles[newCandles.length - 1] = lastCandle
          return newCandles
        })

        return updated
      })
    }, 3000)

    return () => clearInterval(timer)
  }, [])

  // Change terminal chart pattern simulation
  const handleTogglePattern = (pattern: 'bullish' | 'bearish') => {
    setTerminalPattern(pattern)
    if (pattern === 'bullish') {
      setMockCandles(DEFAULT_CANDLES_BULLISH)
      setMockLastPrice(104250.0)
    } else {
      setMockCandles(DEFAULT_CANDLES_BEARISH)
      setMockLastPrice(102150.0)
    }
  }

  // Abstraction Connector object
  const activeConnector: TradingPlatformConnector = {
    id: `connector-${mockPlatform}`,
    name: mockPlatform === 'tradingview' ? 'TradingView TVS' : mockPlatform === 'broker' ? 'Apex Broker API' : 'Custom Terminal API',
    description: `Validated Abstraction Hook for browser overlay linking`,
    isAvailable: () => true,
    getSymbol: () => mockSymbol,
    getTimeframe: () => mockTimeframe,
    getCurrentPrice: () => mockLastPrice,
    getChartData: () => ({
      candles: mockCandles,
      rsi: terminalPattern === 'bullish' ? 62.5 : 38.2,
      macd: terminalPattern === 'bullish' ? '+145.2 (Bullish Momentum)' : '-112.4 (Selling Pressure)'
    }),
    getChartScreenshot: () => {
      // In a real environment, this utilizes canvas.toDataURL() or chrome.tabs.captureVisibleTab
      // Returning a mock visual state placeholder string that triggers the model's multi-modal simulation
      return null
    },
    onTradeSetupQueued: (setup) => {
      setQueuedSetups(prev => [
        {
          id: `SET-${Math.floor(10000 + Math.random() * 90000)}`,
          symbol: setup.symbol,
          type: setup.positionType,
          entry: setup.entryPrice,
          sl: setup.stopLoss,
          tp: setup.takeProfit,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ])
    }
  }

  // Dynamic Risk to Reward calculation
  const getRiskRewardRatio = (): { ratio: number; text: string; color: string } | null => {
    const entry = parseFloat(entryPrice)
    const sl = parseFloat(stopLoss)
    const tp = parseFloat(takeProfit)

    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) return null
    
    const risk = positionType === 'Long' ? entry - sl : sl - entry
    const reward = positionType === 'Long' ? tp - entry : entry - tp

    if (risk <= 0 || reward <= 0) {
      return { ratio: 0, text: 'Invalid targets (Risk/Reward <= 0)', color: 'text-rose-500' }
    }

    const ratio = parseFloat((reward / risk).toFixed(2))

    if (ratio >= 2) {
      return { ratio, text: `${ratio}:1 (Highly Viable Profile)`, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/20' }
    } else if (ratio >= 1.25) {
      return { ratio, text: `${ratio}:1 (Moderate Profile)`, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/5 border-amber-500/20' }
    } else {
      return { ratio, text: `${ratio}:1 (Sub-optimal Profile)`, color: 'text-rose-600 dark:text-rose-400 bg-rose-500/5 border-rose-500/20' }
    }
  }

  // File Upload Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1]
      setChartImage({
        mimeType: file.type,
        data: base64String
      })
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1]
        setChartImage({
          mimeType: file.type,
          data: base64String
        })
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearChartImage = () => {
    setChartImage(null)
    setImagePreview(null)
  }

  // Trigger Gemini Analysis Call (Tab 1)
  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true)
    setBackendWarning('')
    setAnalysisReport('')
    setSuccessMessage('')

    const currentPresetData = ASSET_PRESETS[symbol] || {
      lastPrice: entryPrice || '100.00',
      high24h: (parseFloat(entryPrice || '100') * 1.02).toFixed(2),
      low24h: (parseFloat(entryPrice || '100') * 0.98).toFixed(2),
      volume24h: '50M USD',
      rsi: '50.0',
      macd: 'Neutral cross'
    }

    try {
      const response = await fetch('/api/trading/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          timeframe,
          positionType,
          entryPrice,
          stopLoss,
          takeProfit,
          riskTolerance,
          isStaleData,
          marketDataFeed: {
            lastPrice: currentPresetData.lastPrice,
            high24h: currentPresetData.high24h,
            low24h: currentPresetData.low24h,
            volume24h: currentPresetData.volume24h,
            rsi: currentPresetData.rsi,
            macd: currentPresetData.macd,
            staleIndicator: isStaleData
          },
          chartImage
        })
      })

      const responseText = await response.text()
      let data: { success: boolean; analysis?: string; warning?: string; message?: string } | null = null
      try {
        data = JSON.parse(responseText) as { success: boolean; analysis?: string; warning?: string; message?: string }
      } catch (parseError) {
        console.error('[TRADING ASSISTANT] Response was not valid JSON:', responseText.slice(0, 500))
        throw new Error('Rowan returned an invalid response. Please try again shortly.', { cause: parseError })
      }

      if (data.success) {
        setAnalysisReport(data.analysis)
        if (data.warning) {
          setBackendWarning(data.warning)
        }
      } else {
        setAnalysisReport(`### Analysis Blocked\n\nFailed to invoke Rowan AI Core: ${data.message || 'Unknown backend failure'}`)
      }
    } catch (err) {
      console.error(err)
      setAnalysisReport(`### System Connection Error\n\nRowan core connection failed. Verify that server endpoint is online.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Simulate deploying trade setup (Tab 1)
  const handleDeployTradeSetup = () => {
    if (!humanConfirmed) return
    setIsDeploying(true)
    setTimeout(() => {
      const volume = positionType === 'Long' ? 100 : 75
      const newTx: TradeExecution = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        productName: `Setup Deploy: ${symbol} (${timeframe})`,
        quantity: volume,
        price: parseFloat(entryPrice) || 1.0,
        type: positionType === 'Long' ? 'buy' : 'sell',
        timestamp: 'Just now',
        status: 'pending'
      }
      setHistory(prev => [newTx, ...prev])
      setIsDeploying(false)
      setSuccessMessage(`Spectacular! Trade setup registered in human-confirmed trade queue under Transaction ID ${newTx.id}. Execution remains fully non-automated as requested.`)
      setHumanConfirmed(false)
    }, 1000)
  }

  // Procurement function (Tab 3)
  const triggerMockReplenish = () => {
    setSimulating(true)
    setTimeout(() => {
      const newTx: TradeExecution = {
        id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        productName: 'Self-Drilling Metal Screws (P)',
        quantity: Math.floor(50 + Math.random() * 200),
        price: 0.85,
        type: 'buy',
        timestamp: 'Just now',
        status: 'completed'
      }
      setHistory(prev => [newTx, ...prev])
      setSimulating(false)
    }, 800)
  }

  const rrInfo = getRiskRewardRatio()

  return (
    <div className="space-y-6">
      {/* Header and Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 my-0 flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-purple-600" />
            Rowan Trading & Risk Assistant
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Evaluate speculative strategies, deploy draggable floating overlays, and integrate standard abstraction connectors.
          </p>
        </div>
        
        {/* Switcher Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg self-start md:self-auto border border-zinc-200/50 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('overlay')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overlay'
                ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Rowan Overlay Terminal
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            Rowan Analysis Desk
          </button>
          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'procurement'
                ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Supply Procurements Log
          </button>
        </div>
      </div>

      {/* TAB 1: OVERLAY SIMULATION DASHBOARD */}
      {activeTab === 'overlay' && (
        <div className="space-y-6 relative">
          
          {/* Draggable Rowan Overlay Active - Mounted into viewport or local simulated terminal! */}
          <TradingOverlay connector={activeConnector} />

          {/* Intro Information Callout banner */}
          <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-zinc-950 dark:text-zinc-50 block mb-0.5">Welcome to Phase 12 Draggable Integration Hub</span>
              The floating Rowan Overlay is actively rendered below! Try **dragging it** by its grey header bar or **resizing it** using the bottom-right grabber handle. Use the Simulation Terminal controls below to inject alternate candlestick trends and watch Rowan auto-extract variables through our abstraction connector!
            </div>
          </div>

          {/* Layout Grid of the Mock Trading Terminal */}
          <div className={`border rounded-xl shadow-md overflow-hidden ${
            mockTheme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
          }`}>
            
            {/* Mock Platform Bar */}
            <div className={`px-4 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
              mockTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" />
                  Terminal Sandbox
                </span>
                <select
                  value={mockPlatform}
                  onChange={(e) => setMockPlatform(e.target.value as 'tradingview' | 'broker' | 'custom')}
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 bg-white dark:bg-zinc-800 font-bold outline-none cursor-pointer"
                >
                  <option value="tradingview">TradingView Pro Chart</option>
                  <option value="broker">Apex Broker Terminal</option>
                  <option value="custom">Coinbase Pro Interface</option>
                </select>

                <select
                  value={mockSymbol}
                  onChange={(e) => {
                    setMockSymbol(e.target.value)
                    if (e.target.value === 'ETH/USDT') {
                      setMockLastPrice(3650.0)
                    } else if (e.target.value === 'AAPL') {
                      setMockLastPrice(242.15)
                    } else if (e.target.value === 'EUR/USD') {
                      setMockLastPrice(1.0842)
                    } else {
                      setMockLastPrice(104250.0)
                    }
                  }}
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 bg-white dark:bg-zinc-800 font-bold outline-none cursor-pointer"
                >
                  <option value="BTC/USDT">BTC/USDT</option>
                  <option value="ETH/USDT">ETH/USDT</option>
                  <option value="AAPL">AAPL</option>
                  <option value="EUR/USD">EUR/USD</option>
                </select>

                <select
                  value={mockTimeframe}
                  onChange={(e) => setMockTimeframe(e.target.value)}
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 bg-white dark:bg-zinc-800 font-bold outline-none cursor-pointer"
                >
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>

              {/* Simulation Adjusters */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleTogglePattern('bullish')}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    terminalPattern === 'bullish'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'border border-zinc-350 dark:border-zinc-700'
                  }`}
                >
                  Inject Bullish Trend
                </button>
                <button
                  onClick={() => handleTogglePattern('bearish')}
                  className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    terminalPattern === 'bearish'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold'
                      : 'border border-zinc-350 dark:border-zinc-700'
                  }`}
                >
                  Inject Bearish Crash
                </button>
                <div className="h-5 w-px bg-zinc-350 dark:bg-zinc-700 mx-1"></div>
                <button
                  onClick={() => setMockTheme(mockTheme === 'light' ? 'dark' : 'light')}
                  className="p-1.5 rounded border border-zinc-350 dark:border-zinc-750 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Theme: {mockTheme === 'light' ? 'Light' : 'Dark'}
                </button>
              </div>
            </div>

            {/* Mock Platform Inside Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800 min-h-[460px]">
              
              {/* Left Canvas: Live Interactive Chart */}
              <div className="lg:col-span-8 p-4 flex flex-col justify-between">
                
                {/* Ticker bar info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <strong className="text-sm font-mono tracking-tight font-bold">{mockSymbol}</strong>
                      <span className="text-[10px] text-zinc-500 block">TIME: {mockTimeframe} (Simulated)</span>
                    </div>
                    <div className="font-mono">
                      <span className="text-xs text-zinc-400 block uppercase">Last Price</span>
                      <strong className={`text-base font-bold ${terminalPattern === 'bullish' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        ${mockLastPrice.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Technical Status Pill */}
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block uppercase">Pattern Profile</span>
                    <strong className={`text-xs ${terminalPattern === 'bullish' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {terminalPattern === 'bullish' ? 'Accumulation Breakout' : 'Heavy Distribution Squeeze'}
                    </strong>
                  </div>
                </div>

                {/* SVG Candlestick Canvas (Adaptive visual simulation) */}
                <div className={`relative h-[280px] rounded-lg border flex flex-col justify-between p-4 ${
                  mockTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  
                  {/* Grid Lines background */}
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-20 dark:opacity-10">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="border border-zinc-400 dark:border-zinc-500"></div>
                    ))}
                  </div>

                  {/* SVG Candlesticks */}
                  <div className="relative w-full h-full flex items-end justify-between px-6 z-10 pt-8 pb-4">
                    {mockCandles.map((c, idx) => {
                      // Normalize heights based on min/low of candles
                      const minPrice = terminalPattern === 'bullish' ? 101000 : 101000
                      const maxPrice = terminalPattern === 'bullish' ? 105500 : 107000
                      const range = maxPrice - minPrice

                      const getPercent = (val: number) => ((val - minPrice) / range) * 100

                      const isGreen = c.close >= c.open
                      const candleColor = isGreen ? '#10b981' : '#f43f5e'
                      
                      const openPct = getPercent(c.open)
                      const closePct = getPercent(c.close)
                      const highPct = getPercent(c.high)
                      const lowPct = getPercent(c.low)

                      const bodyTop = Math.max(openPct, closePct)
                      const bodyBottom = Math.min(openPct, closePct)
                      const bodyHeight = Math.max(3, bodyTop - bodyBottom)

                      return (
                        <div key={idx} className="flex flex-col items-center w-12 relative group h-full">
                          {/* Wick (Line) */}
                          <div
                            className="absolute w-0.5 bg-zinc-400 dark:bg-zinc-600 transition-all duration-300"
                            style={{
                              bottom: `${lowPct}%`,
                              top: `${100 - highPct}%`
                            }}
                          ></div>
                          
                          {/* Candle Real Body */}
                          <div
                            className="absolute w-8 rounded-xs transition-all duration-300 shadow-sm"
                            style={{
                              bottom: `${bodyBottom}%`,
                              height: `${bodyHeight}%`,
                              backgroundColor: candleColor
                            }}
                          ></div>

                          {/* Hover Tooltip detailing parameters */}
                          <div className="absolute -top-12 scale-0 group-hover:scale-100 transition-all bg-zinc-950 text-white text-[9px] font-mono p-1.5 rounded shadow-xl z-50 whitespace-nowrap leading-relaxed">
                            O: ${c.open} | H: ${c.high}<br />
                            L: ${c.low} | C: ${c.close}
                          </div>
                          
                          {/* X Axis stamp */}
                          <span className="absolute bottom-[-18px] text-[9px] text-zinc-400 font-mono">{c.time}</span>
                        </div>
                      )
                    })}

                    {/* Horizontal Indicator Trigger Labels (PAL Target visualizer) */}
                    <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-purple-500/30 z-20 pointer-events-none flex justify-between px-2 text-[9px] text-purple-500 bg-purple-500/[0.02]">
                      <span>Thesis Level Entry Zone</span>
                      <span>${(mockLastPrice).toFixed(2)}</span>
                    </div>

                    <div className="absolute left-0 right-0 bottom-1/3 border-t border-dashed border-rose-500/30 z-20 pointer-events-none flex justify-between px-2 text-[9px] text-rose-500 bg-rose-500/[0.02]">
                      <span>PAL Automatic Invalidation Stop Trigger</span>
                      <span>${(mockLastPrice * 0.95).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Indicator Box overlay status */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/50 dark:border-zinc-800/80 pt-2 font-mono">
                    <span>RSI-14: {terminalPattern === 'bullish' ? '62.5 (Bullish)' : '38.2 (Bearish Squeeze)'}</span>
                    <span>MACD: {terminalPattern === 'bullish' ? '+145.2 (Consolidating)' : '-112.4 (Selling Pressure)'}</span>
                  </div>
                </div>

                {/* Simulated Console Log */}
                <div className="mt-4 bg-zinc-950 text-zinc-400 p-3 rounded-lg border border-zinc-800 font-mono text-[10px] space-y-1 max-h-[85px] overflow-y-auto">
                  <div className="text-zinc-500">[{new Date().toLocaleTimeString()}] Establishing Rowan Overlay platform hook...</div>
                  <div className="text-purple-400">[{new Date().toLocaleTimeString()}] Registered Platform PAL Hook on: {mockPlatform}</div>
                  <div className="text-emerald-400">[{new Date().toLocaleTimeString()}] Platform connector is sending live candlestick streaming data to Rowan.</div>
                </div>
              </div>

              {/* Right Panel: Simulated Broker Terminal Order book & Queue */}
              <div className="lg:col-span-4 p-4 space-y-4 flex flex-col justify-between">
                
                {/* Portfolio Status */}
                <div>
                  <h5 className="font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-purple-600" />
                    Broker Portfolio
                  </h5>
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-850 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Available Balance</span>
                      <strong className="text-sm font-mono text-zinc-900 dark:text-zinc-100 font-bold">${portfolioEquity.toLocaleString()} USD</strong>
                    </div>
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold text-[9px] rounded-full uppercase tracking-wider">
                      Demo Mode
                    </span>
                  </div>
                </div>

                {/* Queue of manual set-ups passed from overlay */}
                <div className="flex-1">
                  <h5 className="font-bold text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Queued Setup Pipeline</span>
                    <span className="text-[9px] text-purple-600 font-bold bg-purple-500/10 px-1.5 py-0.2 rounded-full">
                      {queuedSetups.length} Setups
                    </span>
                  </h5>
                  
                  {queuedSetups.length === 0 ? (
                    <div className="py-8 text-center text-[10px] text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-lg flex flex-col items-center justify-center space-y-1.5">
                      <HelpCircle className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
                      <div>
                        <p className="font-semibold">No Setups Queued</p>
                        <p className="text-[9px] opacity-80 max-w-[140px]">Queue a setup from the floating Rowan Overlay to display parameters here.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {queuedSetups.map((setup) => (
                        <div key={setup.id} className="p-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-850 rounded-lg space-y-1.5 text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-850 dark:text-zinc-50 font-mono">{setup.id} ({setup.symbol})</span>
                            <span className="text-[8px] text-zinc-500">{setup.timestamp}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 font-mono text-[9px] border-t border-b border-zinc-200/40 dark:border-zinc-800/80 py-1">
                            <div>
                              <span className="text-zinc-500 block">Entry:</span>
                              <strong>${setup.entry}</strong>
                            </div>
                            <div>
                              <span className="text-rose-500 block">Stop:</span>
                              <strong>${setup.sl}</strong>
                            </div>
                            <div>
                              <span className="text-emerald-500 block">Target:</span>
                              <strong>${setup.tp}</strong>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Perform simulated broker purchase
                              setPortfolioEquity(prev => prev - 500)
                              setQueuedSetups(prev => prev.filter(s => s.id !== setup.id))
                              
                              // Log to order history
                              const newTx: TradeExecution = {
                                id: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
                                productName: `Manual Order Fill: ${setup.symbol}`,
                                quantity: 5,
                                price: setup.entry,
                                type: 'buy',
                                timestamp: 'Just now',
                                status: 'completed'
                              }
                              setHistory(prev => [newTx, ...prev])
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded-md text-[9px] transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Play className="w-2.5 h-2.5 fill-white" />
                            Manually Execute Setup
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-200/40 dark:border-zinc-800/80 pt-3">
                  ⚠️ **Manual Placement Sandbox:** Trade setups passed through the connector pipeline will NOT run automatic executions. Full manual authorization is required inside the terminal wrapper.
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ORIGINAL ROWAN ANALYSIS DESK */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form Parameters */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Assets Preset Selector */}
            <Card title="Quick Load Presets" subtitle="Populate real-time indicators and metrics from primary feeds">
              <div className="grid grid-cols-2 gap-2 mt-4">
                {Object.keys(ASSET_PRESETS).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedPreset(key)
                      setIsStaleData(false)
                      const p = ASSET_PRESETS[key]
                      setSymbol(p.symbol)
                      setEntryPrice(p.entryPrice)
                      setStopLoss(p.stopLoss)
                      setTakeProfit(p.takeProfit)
                    }}
                    className={`p-3 text-left rounded-lg border transition-all text-xs cursor-pointer ${
                      selectedPreset === key
                        ? 'border-purple-500/40 bg-purple-500/5 text-purple-900 dark:text-purple-300 font-bold shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-850/30'
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>{ASSET_PRESETS[key].symbol}</span>
                      <Sparkles className={`w-3 h-3 ${selectedPreset === key ? 'text-purple-500' : 'text-zinc-400'}`} />
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-1">
                      ${ASSET_PRESETS[key].lastPrice}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Speculative Inputs form */}
            <Card title="Strategy Parameters" subtitle="Specify targets and custom technical context">
              <div className="space-y-4 mt-4">
                
                {/* Symbol & Timeframe row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">Asset Symbol</label>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => {
                        setSymbol(e.target.value.toUpperCase())
                        setSelectedPreset('')
                      }}
                      placeholder="e.g. BTC/USDT"
                      className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-purple-500 outline-none text-zinc-900 dark:text-zinc-100 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">Timeframe</label>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-purple-500 outline-none text-zinc-900 dark:text-zinc-100 font-medium cursor-pointer"
                    >
                      <option value="5m">5 Minutes (Scalping)</option>
                      <option value="15m">15 Minutes</option>
                      <option value="1h">1 Hour (Intraday)</option>
                      <option value="4h">4 Hours (Swing)</option>
                      <option value="Daily">Daily Chart (Macro)</option>
                      <option value="Weekly">Weekly Chart (Structural)</option>
                    </select>
                  </div>
                </div>

                {/* Position Context & Risk level */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">Position Bias</label>
                    <select
                      value={positionType}
                      onChange={(e) => setPositionType(e.target.value)}
                      className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-purple-500 outline-none text-zinc-900 dark:text-zinc-100 font-medium cursor-pointer"
                    >
                      <option value="Long">Long (Bullish Thesis)</option>
                      <option value="Short">Short (Bearish Thesis)</option>
                      <option value="No Position">Flat (Ranging/Neutral Evaluation)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1.5">Risk Tolerance</label>
                    <select
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(e.target.value)}
                      className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-purple-500 outline-none text-zinc-900 dark:text-zinc-100 font-medium cursor-pointer"
                    >
                      <option value="Conservative">Conservative (0.5% cap per setup)</option>
                      <option value="Moderate">Moderate (1-2% standard risk)</option>
                      <option value="Aggressive">Aggressive (3%+ high conviction)</option>
                    </select>
                  </div>
                </div>

                {/* Entry, Stop Loss, Take Profit */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">Entry Price</label>
                    <input
                      type="number"
                      step="any"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-purple-500 outline-none text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1 text-rose-500">Stop Loss</label>
                    <input
                      type="number"
                      step="any"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full text-xs rounded-lg border border-rose-200 dark:border-rose-950/40 px-2.5 py-1.5 bg-rose-500/[0.02] dark:bg-zinc-950 focus:ring-2 focus:ring-rose-500 outline-none text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1 text-emerald-500">Take Profit</label>
                    <input
                      type="number"
                      step="any"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="w-full text-xs rounded-lg border border-emerald-200 dark:border-emerald-950/40 px-2.5 py-1.5 bg-emerald-500/[0.02] dark:bg-zinc-950 focus:ring-2 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                {/* Risk-to-Reward Calculator Callout */}
                {rrInfo && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center justify-between font-medium transition-all ${rrInfo.color}`}>
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      Risk-to-Reward Ratio:
                    </span>
                    <span className="font-bold">{rrInfo.text}</span>
                  </div>
                )}

                {/* Stale Feeds Indicator Toggle */}
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200/40 dark:border-zinc-800">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      Simulate Stale Market Feed
                    </span>
                    <span className="text-[10px] text-zinc-500">Test Rowan alert response to delayed data</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isStaleData}
                    onChange={(e) => setIsStaleData(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded-sm border-zinc-300 focus:ring-purple-500 cursor-pointer"
                  />
                </div>

                {/* Drag-and-Drop Image Uploader */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Upload Chart Screenshot</label>
                  
                  {!imagePreview ? (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-purple-500/40 transition-all rounded-lg p-5 text-center bg-zinc-50/50 dark:bg-zinc-900/30 cursor-pointer relative"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Drag & drop your chart, or click to browse</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Supports PNG, JPG, WebP. Multi-modal parsing active.</p>
                    </div>
                  ) : (
                    <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 bg-white dark:bg-zinc-950">
                      <img
                        src={imagePreview}
                        alt="Chart preview"
                        className="w-full h-40 object-cover rounded-md"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={clearChartImage}
                        className="absolute top-4 right-4 bg-zinc-900/80 hover:bg-zinc-900 text-white p-1 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer"
                        title="Clear image"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1.5 px-1 flex items-center justify-between">
                        <span>Multi-modal chart package ready</span>
                        <span className="text-purple-600 font-semibold">Base64 Encoded</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Analyze Trigger Button */}
                <Button
                  variant="primary"
                  className="w-full py-2.5"
                  onClick={handleTriggerAnalysis}
                  isLoading={isAnalyzing}
                  icon={<BrainCircuit className="w-4 h-4" />}
                >
                  Evaluate Strategic Thesis
                </Button>

              </div>
            </Card>

            {/* Integration architecture notes */}
            <Card title="Connective Infrastructure" subtitle="Prepared APIs & Hooks">
              <div className="space-y-3 mt-4 text-[11px] text-zinc-500 leading-relaxed">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200/30">
                  <span className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Rowan Execution Engine</span>
                  Rowan is configured strictly as a **decision support desk**. Auto-execution hooks remain physically decoupled inside the container. Manual verification (Human-in-the-Loop) is an immutable runtime requirement.
                </div>
                <div className="flex items-center justify-between px-2 font-mono text-[10px] border-t border-zinc-100 dark:border-zinc-800 pt-2 text-zinc-400">
                  <span>API Proxy Endpoint</span>
                  <span className="text-purple-500">POST /api/trading/analyze</span>
                </div>
              </div>
            </Card>

          </div>

          {/* Right Column: Rowan Analysis Report Display */}
          <div className="lg:col-span-7">
            <Card title="Rowan Intelligence Output" subtitle="Objective, data-driven speculative scenario assessment">
              
              <div className="mt-4 min-h-[400px] flex flex-col justify-between">
                
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-4 border-purple-100 dark:border-purple-950/40 border-t-purple-600 animate-spin"></div>
                      <BrainCircuit className="w-5 h-5 text-purple-600 absolute animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Analyzing Market Parameters</h4>
                      <div className="text-[11px] text-zinc-500 font-mono mt-1 space-y-1">
                        <p className="animate-pulse">Loading core metrics for {symbol}...</p>
                        <p className="opacity-80">Grounded in non-guaranteed probability scenarios...</p>
                      </div>
                    </div>
                  </div>
                ) : analysisReport ? (
                  <div className="space-y-6">
                    
                    {/* Warnings and Banners */}
                    {backendWarning && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-lg flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">System Environment Alert:</span> {backendWarning}
                        </div>
                      </div>
                    )}

                    {isStaleData && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs rounded-lg flex items-start gap-2.5">
                        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Stale Market Feed Alert:</span> Historical indicators and unconfirmed prices in use. Thesis is locked to retrospective testing conditions.
                        </div>
                      </div>
                    )}

                    {/* Report Text Container */}
                    <div className="markdown-body text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-900/20 p-5 rounded-lg border border-zinc-150 dark:border-zinc-850/60 max-h-[600px] overflow-y-auto font-sans pr-4 prose prose-zinc dark:prose-invert max-w-none">
                      <Markdown>{analysisReport}</Markdown>
                    </div>

                    {/* Safety Sign-off & Human Trade Setup Deployment Option */}
                    <div className="p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-800/80 space-y-4">
                      
                      <div className="flex gap-2.5 text-[11px] text-zinc-500 leading-relaxed">
                        <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-zinc-850 dark:text-zinc-200 block mb-0.5">Non-Execution and Speculative Safety Protocol</span>
                          All analyses compiled by Rowan represent technical scenarios only. Past performance does not guarantee future yield. Trading derivatives, indices, or digital assets involves severe risk. Ensure comprehensive backtesting and check live feeds prior to placing manual operations on your platform.
                        </div>
                      </div>

                      {successMessage && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="font-semibold">{successMessage}</div>
                        </div>
                      )}

                      {/* Manual confirmation controls */}
                      <div className="border-t border-zinc-200/50 dark:border-zinc-800 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="flex items-start sm:items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={humanConfirmed}
                            onChange={(e) => setHumanConfirmed(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded-sm border-zinc-300 focus:ring-purple-500 mt-0.5 sm:mt-0 cursor-pointer"
                          />
                          <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                            I manually confirm this trade setup scenario is aligned with risk parameters.
                          </span>
                        </label>

                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!humanConfirmed || isDeploying}
                          onClick={handleDeployTradeSetup}
                          isLoading={isDeploying}
                        >
                          Queue Setup
                        </Button>
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center text-zinc-500 space-y-3">
                    <Activity className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                    <div>
                      <p className="text-sm font-semibold">Rowan Intelligence Idle</p>
                      <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                        Provide trade parameters, upload structural charts, or click "Evaluate Strategic Thesis" to invoke the risk analysis planner.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </Card>
          </div>

        </div>
      )}

      {/* TAB 3: PROCUREMENT HISTORY LOG (Original Phase 11 features preserved) */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 my-0">
                Catalog Supply Routing & Auto Procurement
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Replenish materials logs, check order state vectors, and view automated commercial restocking history.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={tradingActive ? 'success' : 'secondary'}
                size="sm"
                onClick={() => setTradingActive(!tradingActive)}
                icon={<Activity className={`w-4 h-4 ${tradingActive ? 'animate-pulse' : ''}`} />}
              >
                {tradingActive ? 'AI Procurement Online' : 'Procurement Paused'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={triggerMockReplenish}
                isLoading={simulating}
                icon={<Coins className="w-4 h-4" />}
              >
                Replenish Screw Catalog
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Procurement Budget</span>
                <BarChart2 className="w-4.5 h-4.5 text-purple-600" />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">$12,450.00</h3>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +2.4% yield savings
                </span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Auto Purchases executed</span>
                <span className="text-xs font-bold text-purple-600">42 trades</span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">1,240 Units</h3>
                <span className="text-[10px] text-zinc-500">Rowan triggered restocking orders directly</span>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Trading Activity Desk</span>
                <StatusIndicator status={tradingActive ? 'active' : 'inactive'} />
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">1.2s avg</h3>
                <span className="text-[10px] text-zinc-500">Catalog routing execution latency</span>
              </div>
            </Card>
          </div>

          {/* Historical Log table */}
          <Card title="Supply Trading Orders Log" subtitle="Recent real-time catalog purchase operations">
            <div className="overflow-x-auto mt-4 border border-zinc-100 dark:border-zinc-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                    <th className="px-4 py-3">Tx ID</th>
                    <th className="px-4 py-3">Catalog Material</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Volume</th>
                    <th className="px-4 py-3 text-right">Unit cost</th>
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-zinc-850 dark:text-zinc-200">
                  {history.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-zinc-500">{tx.id}</td>
                      <td className="px-4 py-3 font-semibold">{tx.productName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'buy'
                            ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {tx.type === 'buy' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.type === 'buy' ? 'Procure' : 'Liquidate'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{tx.quantity}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">${tx.price}</td>
                      <td className="px-4 py-3 text-zinc-500">{tx.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                          {tx.status === 'completed' ? 'Completed' : 'Pending Manual Review'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
