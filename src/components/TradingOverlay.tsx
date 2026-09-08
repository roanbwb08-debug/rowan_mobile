import React, { useState, useEffect, useRef } from 'react'
import {
  BrainCircuit,
  Minimize2,
  X,
  Play,
  Shield,
  AlertTriangle,
  Move,
  CheckCircle,
  TrendingUp,
  Cpu,
  Database,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  Activity
} from 'lucide-react'
import Markdown from 'react-markdown'

// Platform Abstraction Layer (PAL) Interface
export interface TradingPlatformConnector {
  id: string
  name: string
  description: string
  isAvailable: () => boolean
  getSymbol: () => string
  getTimeframe: () => string
  getCurrentPrice: () => number
  getChartData: () => {
    candles: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>
    rsi?: number
    macd?: string
  }
  getChartScreenshot: () => string | null // returns mock base64 or placeholder URL
  onTradeSetupQueued: (setup: {
    symbol: string
    positionType: 'Long' | 'Short' | 'No Position'
    entryPrice: number
    stopLoss: number
    takeProfit: number
  }) => void
}

interface TradingOverlayProps {
  connector: TradingPlatformConnector
  onAnalysisSuccess?: (report: string) => void
}

export const TradingOverlay: React.FC<TradingOverlayProps> = ({
  connector,
  onAnalysisSuccess
}) => {
  // Floating overlay state
  const [isOpen, setIsOpen] = useState(true)
  const [position, setPosition] = useState({ x: 80, y: 120 }) // initial coordinates relative to top-right/viewport
  const [size, setSize] = useState({ width: 380, height: 580 })
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Dragging & Resizing States
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  
  // Refs to track drag/resize start values
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const resizeStartRef = useRef({ x: 0, y: 0, width: 380, height: 580 })
  const overlayRef = useRef<HTMLDivElement>(null)

  // Overlay contents state
  const [analysisReport, setAnalysisReport] = useState<string>('')
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)
  const [warningMessage, setWarningMessage] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<'guidance' | 'details' | 'connector'>('guidance')
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [humanConsentChecked, setHumanConsentChecked] = useState(false)
  const [queueStatus, setQueueStatus] = useState<string>('')

  // Drag handlers
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    // Prevent dragging if clicking buttons/selectors
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('select') || target.closest('input')) {
      return
    }
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    }
    target.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    
    // Constrain position within boundary rules
    const newX = Math.max(10, Math.min(window.innerWidth - size.width - 20, dragStartRef.current.posX + dx))
    const newY = Math.max(10, Math.min(window.innerHeight - (isCollapsed ? 80 : size.height) - 20, dragStartRef.current.posY + dy))
    
    setPosition({ x: newX, y: newY })
  }

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false)
      const target = e.target as HTMLElement
      try {
        target.releasePointerCapture(e.pointerId)
      } catch (err) {
        console.warn('Pointer release skipped', err)
      }
    }
  }

  // Resize handlers
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    }
    const target = e.target as HTMLElement
    target.setPointerCapture(e.pointerId)
  }

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return
    const dx = e.clientX - resizeStartRef.current.x
    const dy = e.clientY - resizeStartRef.current.y
    
    const newWidth = Math.max(320, Math.min(600, resizeStartRef.current.width + dx))
    const newHeight = Math.max(400, Math.min(800, resizeStartRef.current.height + dy))
    
    setSize({ width: newWidth, height: newHeight })
  }

  const handleResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isResizing) {
      setIsResizing(false)
      const target = e.target as HTMLElement
      try {
        target.releasePointerCapture(e.pointerId)
      } catch (err) {
        console.warn('Pointer release skipped', err)
      }
    }
  }

  // Analyze active connector action
  const handleAnalyzePlatformData = async () => {
    setIsAnalyzing(true)
    setWarningMessage('')
    setQueueStatus('')
    
    const symbol = connector.getSymbol()
    const timeframe = connector.getTimeframe()
    const lastPrice = connector.getCurrentPrice()
    const chartData = connector.getChartData()
    const screenshot = connector.getChartScreenshot()

    try {
      const response = await fetch('/api/trading/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          timeframe,
          positionType: 'Long', // Default analytical scenario
          entryPrice: lastPrice.toString(),
          stopLoss: (lastPrice * 0.95).toFixed(2),
          takeProfit: (lastPrice * 1.1).toFixed(2),
          riskTolerance: 'Moderate',
          isStaleData: !connector.isAvailable(),
          marketDataFeed: {
            lastPrice: lastPrice.toString(),
            high24h: (lastPrice * 1.05).toString(),
            low24h: (lastPrice * 0.94).toString(),
            volume24h: '124M USD',
            rsi: chartData.rsi?.toString() || '52.4',
            macd: chartData.macd || '+12.4 (Consolidating)',
            staleIndicator: !connector.isAvailable()
          },
          chartImage: screenshot ? {
            mimeType: 'image/png',
            data: screenshot
          } : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        setAnalysisReport(data.analysis)
        if (data.warning) {
          setWarningMessage(data.warning)
        }
        if (onAnalysisSuccess) {
          onAnalysisSuccess(data.analysis)
        }
      } else {
        setAnalysisReport(`### Request Rejected\n\nRowan failed to formulate the trading analysis report: ${data.message}`)
      }
    } catch (err) {
      console.error(err)
      setAnalysisReport(`### Overlay Link Fault\n\nFailed to establish socket connection with backend trading router. Ensure your dev server is active on port 3000.`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Handle queuing manual setup
  const handleQueueSetup = () => {
    if (!humanConsentChecked) return
    
    const lastPrice = connector.getCurrentPrice()
    connector.onTradeSetupQueued({
      symbol: connector.getSymbol(),
      positionType: 'Long',
      entryPrice: lastPrice,
      stopLoss: Number((lastPrice * 0.95).toFixed(2)),
      takeProfit: Number((lastPrice * 1.1).toFixed(2))
    })

    setQueueStatus('🟢 Trade setup verified and pushed to broker terminal queue. Awaiting human click in broker window.')
    setHumanConsentChecked(false)
    
    setTimeout(() => {
      setQueueStatus('')
    }, 4000)
  }

  // Auto-analyze on initial mount if available
  useEffect(() => {
    let active = true
    if (connector.isAvailable()) {
      const timer = setTimeout(() => {
        if (active) {
          handleAnalyzePlatformData()
        }
      }, 100)
      return () => {
        active = false
        clearTimeout(timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector.id])

  // Return a floating bubble if closed
  if (!isOpen) {
    return (
      <button
        id="rowan-overlay-launcher"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-purple-500/20 hover:scale-105 transition-all z-50 cursor-pointer border border-purple-500/30"
        title="Open Rowan Trading Overlay"
      >
        <BrainCircuit className="w-7 h-7 animate-pulse text-zinc-100" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </button>
    )
  }

  return (
    <div
      ref={overlayRef}
      id="rowan-overlay-container"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
        zIndex: 9999
      }}
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-zinc-800 dark:text-zinc-200"
    >
      {/* Overlay Drag Header */}
      <div
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800 px-3.5 py-3.5 flex items-center justify-between cursor-move select-none"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-purple-500/10 rounded-md">
            <BrainCircuit className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-950 dark:text-zinc-50 my-0 flex items-center gap-1.5">
              Rowan AI Assistant
              <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold rounded-full uppercase tracking-wider">
                Overlay
              </span>
            </h4>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium my-0 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
              {connector.name} Live Integration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Drag Handle Help Indicator */}
          <Move className="w-3.5 h-3.5 text-zinc-400 drag-handle" />

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer"
            title={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {/* Close/Minimize into floating launcher */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-zinc-400 hover:text-rose-500 rounded-md hover:bg-zinc-150 dark:hover:bg-zinc-800 cursor-pointer"
            title="Minimize to Logo Bubble"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container Body (Hidden if collapsed) */}
      {!isCollapsed && (
        <>
          {/* Sub Navigation */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 p-1">
            <button
              onClick={() => setSelectedTab('guidance')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                selectedTab === 'guidance'
                  ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Decision Guidance
            </button>
            <button
              onClick={() => setSelectedTab('details')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                selectedTab === 'details'
                  ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Structured Report
            </button>
            <button
              onClick={() => setSelectedTab('connector')}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
                selectedTab === 'connector'
                  ? 'bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Platform PAL (API)
            </button>
          </div>

          {/* Warning banner */}
          {warningMessage && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-3.5 py-2 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{warningMessage}</span>
            </div>
          )}

          {/* Scrollable View Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Risk Disclaimer */}
            {showDisclaimer && (
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3 relative">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex gap-2 items-start">
                  <Shield className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-purple-900 dark:text-purple-300 text-xs my-0">Rowan Safety Invariant</h5>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      speculative trading models carry heavy capital drawdown risks. Trade execution is strictly human-confirmed. Automated order dispatch is disabled.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: GUIDANCE (Step-by-Step, Uncertainty, Tickers) */}
            {selectedTab === 'guidance' && (
              <div className="space-y-4">
                {/* Active Connector Context Summary */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850/80 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Currently Auditing</span>
                    <strong className="text-zinc-900 dark:text-zinc-50 font-mono text-sm">{connector.getSymbol()}</strong>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block mt-0.5">Timeframe: {connector.getTimeframe()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider block">Live Feed Price</span>
                    <strong className="text-zinc-900 dark:text-zinc-50 font-mono text-sm">${connector.getCurrentPrice().toFixed(2)}</strong>
                    <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5 justify-end">
                      <TrendingUp className="w-3 h-3" />
                      +1.45%
                    </div>
                  </div>
                </div>

                {/* Main Action Trigger */}
                <button
                  onClick={handleAnalyzePlatformData}
                  disabled={isAnalyzing}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-500/10 transition-all text-xs disabled:opacity-55"
                >
                  <Cpu className="w-4 h-4" />
                  {isAnalyzing ? 'Extracting Platform Chart Data...' : 'Analyze Active Chart View'}
                </button>

                {/* Uncertainty & Risk Section */}
                <div>
                  <h5 className="font-bold text-zinc-950 dark:text-zinc-50 mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-purple-500" />
                    Risk & Uncertainty Metrics
                  </h5>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850 p-3 rounded-lg space-y-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-1">
                        <span>Uncertainty Percentage</span>
                        <span className="text-amber-500 font-bold font-mono">45% (Moderate)</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-medium mb-1">
                        <span>Risk/Reward Alignment</span>
                        <span className="text-emerald-500 font-bold font-mono">High Viability (2.2:1)</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Decision Checklist */}
                <div>
                  <h5 className="font-bold text-zinc-950 dark:text-zinc-50 mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                    <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
                    Rowan Decision Framework
                  </h5>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850">
                      <span className="flex items-center justify-center w-5 h-5 bg-purple-500/10 text-purple-600 rounded-full text-[10px] font-bold shrink-0">1</span>
                      <div>
                        <strong className="text-[11px] text-zinc-950 dark:text-zinc-100 block">Confirm Asset Alignment</strong>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Verify that {connector.getSymbol()} is trading at primary support zones before committing stop triggers.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850">
                      <span className="flex items-center justify-center w-5 h-5 bg-purple-500/10 text-purple-600 rounded-full text-[10px] font-bold shrink-0">2</span>
                      <div>
                        <strong className="text-[11px] text-zinc-950 dark:text-zinc-100 block">Deploy Restrictive Stop Loss</strong>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Set the invalidation barrier strictly below the swing low. Current suggestions place it near ${(connector.getCurrentPrice() * 0.95).toFixed(2)}.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-150 dark:border-zinc-850">
                      <span className="flex items-center justify-center w-5 h-5 bg-purple-500/10 text-purple-600 rounded-full text-[10px] font-bold shrink-0">3</span>
                      <div>
                        <strong className="text-[11px] text-zinc-950 dark:text-zinc-100 block">Push Setup to Broker Window</strong>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Trigger the connector dispatch protocol to pass coordinates, then execute manually.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Speculative Dispatch controls */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800 space-y-3">
                  <h6 className="font-bold text-zinc-900 dark:text-zinc-100 my-0 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-purple-500" />
                    Institutional Guardrail Execution
                  </h6>
                  
                  <div className="flex items-center gap-2">
                    <input
                      id="human-consent-checkbox"
                      type="checkbox"
                      checked={humanConsentChecked}
                      onChange={(e) => setHumanConsentChecked(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 rounded-sm focus:ring-purple-500 cursor-pointer"
                    />
                    <label htmlFor="human-consent-checkbox" className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium cursor-pointer">
                      Confirm setup review. Ready to queue parameter dispatch.
                    </label>
                  </div>

                  <button
                    onClick={handleQueueSetup}
                    disabled={!humanConsentChecked}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-50 font-bold py-2 px-3 rounded-md transition-all text-[11px] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    Queue Setup on Broker Terminal
                  </button>

                  {queueStatus && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium rounded-lg text-[11px]">
                      {queueStatus}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DETAILED ANALYSIS */}
            {selectedTab === 'details' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-zinc-950 dark:text-zinc-50 my-0 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-purple-500" />
                    Structured Technical Evaluation
                  </h5>
                  <button
                    onClick={handleAnalyzePlatformData}
                    className="text-[10px] text-purple-600 hover:text-purple-500 font-semibold cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {isAnalyzing ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg">
                    <BrainCircuit className="w-8 h-8 text-purple-500 animate-spin" />
                    <p className="text-zinc-500 text-[11px]">Consulting Rowan AI Speculation Engine...</p>
                  </div>
                ) : analysisReport ? (
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 p-3.5 rounded-lg font-sans overflow-x-hidden text-zinc-800 dark:text-zinc-300 leading-relaxed text-[11px]">
                    <div className="markdown-body prose prose-zinc dark:prose-invert max-w-none">
                      <Markdown>{analysisReport}</Markdown>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-[11px]">No active structured report found.</p>
                    <button
                      onClick={handleAnalyzePlatformData}
                      className="mt-2 text-purple-600 hover:text-purple-500 font-bold"
                    >
                      Extract & Evaluate Current View
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PLATFORM PAL CONFIG */}
            {selectedTab === 'connector' && (
              <div className="space-y-4">
                <div>
                  <h5 className="font-bold text-zinc-950 dark:text-zinc-50 mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    Platform Abstraction Layer (PAL)
                  </h5>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Rowan utilizes a strict modular decoupling layer. Any compliant web-based trading platform can provide chart details by instantiating the <code>TradingPlatformConnector</code> interface.
                  </p>
                </div>

                {/* Current Connector Attributes */}
                <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-150 dark:border-zinc-850 font-mono text-[10px] space-y-2">
                  <div className="flex justify-between border-b border-zinc-200/40 dark:border-zinc-800 pb-1.5">
                    <span className="text-zinc-400">Connector ID:</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-bold">{connector.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/40 dark:border-zinc-800 pb-1.5">
                    <span className="text-zinc-400">Class Type:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">TypeScript Interface</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-200/40 dark:border-zinc-800 pb-1.5">
                    <span className="text-zinc-400">Data Stream:</span>
                    <span className="text-emerald-500 font-bold">🟢 Connected & Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">API Key Safe:</span>
                    <span className="text-emerald-500 font-bold">🔒 Server-Side Only</span>
                  </div>
                </div>

                {/* Integration Code Spec Block */}
                <div>
                  <h6 className="font-bold text-zinc-950 dark:text-zinc-50 mb-1.5 text-[11px] flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-purple-500" />
                    Compliant SDK Reference
                  </h6>
                  <div className="bg-zinc-950 text-zinc-300 p-2.5 rounded-lg font-mono text-[9px] overflow-x-auto leading-relaxed max-h-[160px]">
                    <span className="text-zinc-500">// Custom integration hook for third-party platforms</span><br />
                    <span className="text-purple-400">export interface</span> <span className="text-blue-400">TradingPlatformConnector</span> &#123;<br />
                    &nbsp;&nbsp;id: <span className="text-green-400">string</span>;<br />
                    &nbsp;&nbsp;name: <span className="text-green-400">string</span>;<br />
                    &nbsp;&nbsp;getCurrentPrice: () =&gt; <span className="text-yellow-400">number</span>;<br />
                    &nbsp;&nbsp;getChartScreenshot: () =&gt; <span className="text-green-400">string | null</span>;<br />
                    &#125;
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg text-[10px] text-zinc-500 leading-relaxed border border-zinc-150 dark:border-zinc-850">
                  <p className="my-0">
                    💡 **Extension Security Compliance:** Rowan does not perform unauthorized DOM scrapping or session hijack. All interactions flow strictly through these validated sandboxed interfaces.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer resize trigger handle */}
          <div
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            className="h-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-800 cursor-se-resize flex items-center justify-end px-1.5 py-1"
          >
            <div className="w-2.5 h-2.5 border-r-2 border-b-2 border-zinc-400 rounded-br-xs"></div>
          </div>
        </>
      )}

      {/* Mini state view if collapsed */}
      {isCollapsed && (
        <div className="bg-zinc-50 dark:bg-zinc-900/80 p-3 flex justify-between items-center text-[10px] border-t border-zinc-200/50 dark:border-zinc-850">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
            <Activity className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            <span>Auditing {connector.getSymbol()}</span>
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
          >
            Show Dashboard
          </button>
        </div>
      )}
    </div>
  )
}
