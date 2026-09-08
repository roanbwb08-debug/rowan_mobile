import React, { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  Globe,
  Plus,
  Sparkles,
  Check,
  Laptop,
  ShieldCheck,
  Download,
  Loader2,
  TrendingUp,
  Blocks,
  Trash2,
  User,
  Lock,
  Terminal,
  FolderUp,
  AudioLines,
  Cpu,
  X,
  Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { WebsitesConnect } from './WebsitesConnect'
import { rowanAuth, rowanConnections } from '../lib/supabase'
import type { RowanConnection } from '../lib/supabase'
import { PhoneConnectionFlow } from '../components/PhoneConnectionFlow'
import { AppsView } from './Connect/AppsView'
import { AppSetupFlow } from './Connect/AppSetupFlow'
import { Card } from '../components/Card'
import { SUPPORTED_APPS } from '../data/apps'
import type { RowanApp } from '../data/apps'

type ConnectionCategory = 'devices' | 'websites' | 'apps' | 'developer' | 'data' | 'creative' | 'trading' | 'automation'

export const Connect: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ConnectionCategory>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tab = params.get('tab') as ConnectionCategory
      const validCategories: ConnectionCategory[] = ['devices', 'websites', 'apps', 'developer', 'data', 'creative', 'trading', 'automation']
      if (validCategories.includes(tab)) return tab
    }
    return 'devices'
  })
  
  const [connections, setConnections] = useState<RowanConnection[]>([])
  const [loading, setLoading] = useState(true)
  
  // Phone flow state
  const [showPhoneFlow, setShowPhoneFlow] = useState(false)
  
  // Trading state
  const [tradingKey, setTradingKey] = useState('')
  const [tradingSecret, setTradingSecret] = useState('')
  const [savingTrading, setSavingTrading] = useState(false)
  const [tradingConnected, setTradingConnected] = useState(false)
  
  // App setup wizard state
  const [selectedApp, setSelectedApp] = useState<RowanApp | null>(null)
  const [showAppSetup, setShowAppSetup] = useState(false)

  // Connection detail management modal state
  const [managedConnection, setManagedConnection] = useState<RowanConnection | null>(null)
  const [managedApp, setManagedApp] = useState<RowanApp | null>(null)

  const loadConnections = useCallback(async () => {
    setLoading(true)
    const user = await rowanAuth.getSessionUser()
    if (user) {
      const data = await rowanConnections.getConnections(user.id)
      setConnections(data)

      // Sync trading state
      const tradingConn = data.find(c => c.type === 'trading')
      if (tradingConn) {
        setTradingConnected(true)
        setTradingKey(tradingConn.metadata?.apiKey || '')
      } else {
        setTradingConnected(false)
        setTradingKey('')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      if (active) {
        await loadConnections()
      }
    }
    init()
    return () => {
      active = false
    }
  }, [loadConnections])

  const handleConnectTrading = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = await rowanAuth.getSessionUser()
    if (!user) return

    setSavingTrading(true)
    try {
      await rowanConnections.saveConnection({
        user_id: user.id,
        type: 'trading',
        name: 'Market Data Feed',
        status: 'connected',
        metadata: { 
          apiKey: tradingKey,
          role: 'Analyst & Strategist',
          instructions: 'Analyze live asset charts and propose sandbox risk evaluations only. Trading actions require manual confirmation.',
          lastActivity: new Date().toISOString()
        }
      })
      setTradingConnected(true)
      await loadConnections()
    } finally {
      setSavingTrading(false)
    }
  }

  const handleAppConnect = (app: RowanApp) => {
    setSelectedApp(app)
    setShowAppSetup(true)
  }

  const handleAppAuthorize = async (permissions: Record<string, boolean>, role: string, instructions: string) => {
    const user = await rowanAuth.getSessionUser()
    if (!user || !selectedApp) return

    if (selectedApp.authType === 'oauth') {
      // Redirect to backend OAuth initiation
      window.location.href = `/api/oauth/${selectedApp.id}/authorize?userId=${user.id}`
    } else {
      await rowanConnections.saveConnection({
        user_id: user.id,
        type: 'app',
        name: selectedApp.name,
        status: 'connected',
        metadata: { 
          service: selectedApp.id,
          role,
          instructions,
          lastActivity: new Date().toISOString()
        },
        permissions
      })
      setShowAppSetup(false)
      setSelectedApp(null)
      await loadConnections()
    }
  }

  const handleOpenManageModal = (conn: RowanConnection) => {
    const appId = conn.type === 'app' ? conn.metadata?.service : conn.type
    const matchingApp = SUPPORTED_APPS.find(a => a.id === appId)
    setManagedConnection(conn)
    setManagedApp(matchingApp || null)
  }

  const handleCloseManageModal = () => {
    setManagedConnection(null)
    setManagedApp(null)
  }

  const handleRevokeConnection = async (connId: string) => {
    if (confirm('Are you absolutely sure you want to revoke this connection and clear its authorizations?')) {
      await rowanConnections.deleteConnection(connId)
      handleCloseManageModal()
      await loadConnections()
    }
  }

  // Filter apps dynamically for the general categories
  const getCategoryApps = (category: ConnectionCategory): RowanApp[] => {
    switch (category) {
      case 'apps':
        return SUPPORTED_APPS.filter(app => ['Productivity', 'Business', 'Communication', 'Shopping', 'Other'].includes(app.category))
      case 'developer':
        return SUPPORTED_APPS.filter(app => app.category === 'Development')
      case 'data':
        return SUPPORTED_APPS.filter(app => app.category === 'Storage')
      case 'creative':
        return SUPPORTED_APPS.filter(app => app.category === 'Media')
      case 'automation':
        return SUPPORTED_APPS.filter(app => app.category === 'Automation')
      default:
        return []
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20">
      
      {/* 1. Header Section */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-mono font-bold uppercase tracking-widest text-teal-400">
          <Sparkles className="w-3 h-3 text-teal-400" />
          <span>What Rowan can reach</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 my-0">
          Connection Center
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto my-0 font-normal leading-relaxed">
          Manage authorized environments, tools, and platforms connected to Rowan Core. Logical isolation ensures your personal Rowan memory remains strictly protected.
        </p>

        {/* Dynamic Category Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          <button
            onClick={() => { setActiveCategory('devices'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'devices'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Devices</span>
          </button>

          <button
            onClick={() => { setActiveCategory('websites'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'websites'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Websites</span>
          </button>

          <button
            onClick={() => { setActiveCategory('apps'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'apps'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <Blocks className="w-4 h-4" />
            <span>Apps & Services</span>
          </button>

          <button
            onClick={() => { setActiveCategory('developer'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'developer'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Developer Environment</span>
          </button>

          <button
            onClick={() => { setActiveCategory('data'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'data'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <FolderUp className="w-4 h-4" />
            <span>Data & Knowledge</span>
          </button>

          <button
            onClick={() => { setActiveCategory('creative'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'creative'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <AudioLines className="w-4 h-4" />
            <span>Creative & Media</span>
          </button>

          <button
            onClick={() => { setActiveCategory('trading'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'trading'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Finance & Business</span>
          </button>

          <button
            onClick={() => { setActiveCategory('automation'); setShowAppSetup(false); }}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
              activeCategory === 'automation'
                ? 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-900/20'
                : 'bg-[#0e141c] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Automation</span>
          </button>
        </div>
      </div>

      {/* 2. Main Tab Context Panels */}
      <AnimatePresence mode="wait">
        
        {/* DEVICES TAB */}
        {activeCategory === 'devices' && (
          <motion.div
            key="tab-devices"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {showPhoneFlow ? (
              <PhoneConnectionFlow 
                onComplete={() => { setShowPhoneFlow(false); loadConnections(); }}
                onCancel={() => setShowPhoneFlow(false)}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Side: Dynamic Pairing Card */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl">
                    <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
                    <div className="relative z-10 space-y-8">
                      <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/40 transform -rotate-3">
                        <Smartphone className="w-12 h-12" />
                      </div>
                      <div className="space-y-3">
                        <h2 className="text-2xl font-extrabold text-white my-0">Pair Device</h2>
                        <p className="text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto my-0 font-medium">
                          Secure pairing uses high-grade cryptographic handshakes. Connect your mobile phone or companion headset instantly.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPhoneFlow(true)}
                        className="px-8 py-4 bg-white text-zinc-900 font-extrabold text-sm rounded-2xl shadow-xl hover:bg-zinc-100 transition-all transform active:scale-95 cursor-pointer flex items-center gap-2 mx-auto"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Pair New Device</span>
                      </button>
                    </div>
                  </div>

                  {/* Desktop Companion Download Card */}
                  <div className="bg-white border border-zinc-200 rounded-3xl p-8 space-y-4 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-600">
                        <Laptop className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 my-0">Desktop Companion Client</h3>
                        <p className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest mt-0.5">macOS, Windows & Linux</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                      Control system terminal workflows, edit files locally with Rowan agents, and utilize context-aware helper hooks securely.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button className="px-4 py-2.5 bg-zinc-900 text-white text-[10px] font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-800 transition-colors cursor-pointer">
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Agent (v1.0.4)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Paired Devices list */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h2 className="text-xs font-extrabold text-zinc-950 uppercase tracking-widest">Active Paired Devices</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 text-[10px] font-extrabold text-zinc-500 border border-zinc-200">
                      {connections.filter(c => ['phone', 'device'].includes(c.type)).length} Connected
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-zinc-200 rounded-[2.5rem] space-y-4">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Syncing pairing matrix...</span>
                    </div>
                  ) : connections.filter(c => ['phone', 'device'].includes(c.type)).length === 0 ? (
                    <div className="text-center py-20 bg-white border border-dashed border-zinc-200 rounded-[2.5rem] space-y-4 shadow-sm">
                      <div className="w-16 h-16 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center mx-auto text-zinc-300">
                        <Smartphone className="w-8 h-8" />
                      </div>
                      <div className="space-y-1 px-10">
                        <h3 className="text-sm font-bold text-zinc-900">No active device handshakes</h3>
                        <p className="text-xs text-zinc-500 font-medium">Generate a pairing token or tap pair phone to begin.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {connections.filter(c => ['phone', 'device'].includes(c.type)).map((conn) => (
                        <div 
                          key={conn.id}
                          className="bg-white border border-zinc-200 rounded-3xl p-6 flex items-center justify-between hover:border-zinc-350 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 relative">
                              <Smartphone className="w-7 h-7 text-zinc-400" />
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-zinc-950 my-0">{conn.name}</h3>
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">Live Handshake</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Role: {conn.role || 'Primary Device'}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  TLS Secure Hook
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenManageModal(conn)}
                              className="px-4 py-2 text-xs font-bold border border-zinc-200 hover:border-zinc-300 rounded-xl transition-all cursor-pointer"
                            >
                              Manage
                            </button>
                            <button
                              onClick={() => handleRevokeConnection(conn.id)}
                              className="p-2.5 rounded-xl hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* WEBSITES TAB */}
        {activeCategory === 'websites' && (
          <motion.div
            key="tab-websites"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <WebsitesConnect />
          </motion.div>
        )}

        {/* THE INTEGRATIONS TABS (APPS, DEVELOPER, DATA, CREATIVE, AUTOMATION) */}
        {['apps', 'developer', 'data', 'creative', 'automation'].includes(activeCategory) && (
          <motion.div
            key={`tab-apps-${activeCategory}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {showAppSetup && selectedApp ? (
              <AppSetupFlow 
                app={selectedApp} 
                onBack={() => setShowAppSetup(false)} 
                onConnect={handleAppAuthorize}
              />
            ) : (
              <AppsView 
                connections={connections}
                onConnect={handleAppConnect}
                onManage={handleOpenManageModal}
                apps={getCategoryApps(activeCategory)}
              />
            )}
          </motion.div>
        )}

        {/* TRADING TAB */}
        {activeCategory === 'trading' && (
          <motion.div
            key="tab-trading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Credentials Form */}
              <div className="lg:col-span-7 space-y-6">
                <Card title="Sandbox Broker & Market Feed Connection">
                  <form onSubmit={handleConnectTrading} className="space-y-5">
                    <p className="text-xs text-zinc-500 leading-relaxed my-0 font-medium">
                      Integrate the Sandbox Broker system. Rowan Core can inspect tickers, query virtual portfolios, and generate trade proposals with 100% transparent manual confirmation.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Sandbox API Public Token</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="password"
                          required
                          placeholder="Enter trading API client key..."
                          value={tradingKey}
                          onChange={(e) => setTradingKey(e.target.value)}
                          className="w-full text-xs rounded-2xl border border-zinc-200 pl-11 pr-4 py-3 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-zinc-800 font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Sandbox Passphrase / Secret</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="password"
                          required
                          placeholder="Enter secret phrase..."
                          value={tradingSecret}
                          onChange={(e) => setTradingSecret(e.target.value)}
                          className="w-full text-xs rounded-2xl border border-zinc-200 pl-11 pr-4 py-3 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-zinc-800 font-bold"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingTrading}
                        className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                      >
                        {savingTrading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : tradingConnected ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Connected & Active</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Link Sandbox Workspace</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </Card>
              </div>

              {/* Handshake Status Panel */}
              <div className="lg:col-span-5 space-y-6">
                <Card title="Handshake Protocol Info">
                  <div className="space-y-4 text-xs text-zinc-500 mt-1">
                    <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      <span className="font-extrabold text-zinc-400 uppercase tracking-widest text-[9px]">Market Feeds</span>
                      <span className="text-emerald-600 font-bold flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        Online
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      <span className="font-extrabold text-zinc-400 uppercase tracking-widest text-[9px]">Execution Mode</span>
                      <span className="text-zinc-650 font-extrabold text-[10px] uppercase">Manual Confirmation Required</span>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                      <span className="font-extrabold text-zinc-400 uppercase tracking-widest text-[9px]">Integrity Check</span>
                      <span className="text-blue-600 font-extrabold text-[10px] uppercase">TLS Sandbox Encrypted</span>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl space-y-2 text-[11px] leading-relaxed">
                      <div className="font-bold text-zinc-950 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" /> 
                        <span>Speculative Strategy Safety</span>
                      </div>
                      <p className="text-zinc-600 font-medium m-0">
                        Rowan does NOT handle funds directly. It only compiles risk scenarios, MACD trends, and drafts proposals which you must confirm visually before execution.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Sandbox Broker Integration App listing as unified entry */}
            <div className="space-y-4 pt-6">
              <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest">Available FinTech Connections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SUPPORTED_APPS.filter(app => app.category === 'Finance').map(app => {
                  const isConnected = tradingConnected
                  return (
                    <div key={app.id} className="bg-white border rounded-3xl p-6 border-zinc-200 shadow-sm hover:border-zinc-300 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-600'}`}>
                          {app.icon}
                        </div>
                        {isConnected && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
                            <Check className="w-3 h-3" />
                            Connected
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-zinc-900 leading-tight mb-1">{app.name}</h3>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-4">{app.description}</p>
                      {isConnected ? (
                        <button 
                          onClick={() => handleRevokeConnection('trading-api')}
                          className="w-full py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          Revoke Exchange Access
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setTradingKey('sandbox_demo_key'); setTradingSecret('sandbox_secret'); }}
                          className="w-full py-2 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-850 transition-all cursor-pointer"
                        >
                          Pre-fill Demo credentials
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. PREMIUM CONNECTION DETAIL MANAGEMENT MODAL */}
      <AnimatePresence>
        {managedConnection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white border border-zinc-200 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-700">
                    {managedApp?.icon || <Smartphone className="w-6 h-6 text-zinc-500" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-zinc-950 leading-tight">
                      {managedConnection.name || managedApp?.name || 'Environment Details'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100 uppercase tracking-wide">
                        Connected
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleCloseManageModal}
                  className="p-2 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 rounded-xl transition-all cursor-pointer border border-transparent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                
                {/* 1. Purpose & Assigned Role */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Assigned Environment Role</label>
                  <div className="p-4 bg-zinc-50 border border-zinc-150 rounded-2xl flex items-start gap-3">
                    <User className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 leading-snug">
                        Rowan Role: {managedConnection.metadata?.role || managedConnection.role || 'Primary Collaborator'}
                      </h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-medium mt-1">
                        {managedConnection.metadata?.instructions || managedConnection.instructions || 'Help coordinate tools and answer context queries.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Authorized Capabilities */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Authorized Tool Capabilities</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(managedApp?.capabilities || ['Query context parameters', 'Inspect data changes']).map(cap => (
                      <div key={cap} className="flex items-center gap-2.5 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-zinc-700 font-semibold">{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Granular Access Permissions */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Active Access Levels</label>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Read</span>
                      <span className="text-xs font-bold text-emerald-600 mt-1 block">AUTHORIZED</span>
                    </div>
                    <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Write</span>
                      <span className={`text-xs font-bold mt-1 block ${managedConnection.permissions?.writeAccess ? 'text-emerald-600' : 'text-zinc-450'}`}>
                        {managedConnection.permissions?.writeAccess ? 'AUTHORIZED' : 'OFF'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50">
                      <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Execution</span>
                      <span className={`text-xs font-bold mt-1 block ${managedConnection.permissions?.executionAccess ? 'text-emerald-600' : 'text-zinc-450'}`}>
                        {managedConnection.permissions?.executionAccess ? 'AUTHORIZED' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Infrastructure Handshake */}
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block">Handshake Integrity</label>
                  <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl flex items-start gap-3 text-[11px] leading-relaxed">
                    <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-zinc-900 m-0">Secure Handshake Storage</p>
                      <p className="text-zinc-600 mt-0.5 mb-0 font-medium">
                        This session is isolated in Firestore. Rowan Core is strictly prohibited from leaking this environment token outside of authorized reasoning contexts.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Connected Tools & Last Activity */}
                <div className="flex justify-between items-center bg-zinc-50 border border-zinc-100 p-4 rounded-xl text-xs text-zinc-500">
                  <span className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">Last Handshake Heartbeat</span>
                  <span className="font-bold text-zinc-700">
                    {managedConnection.metadata?.lastActivity ? new Date(managedConnection.metadata.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active now'}
                  </span>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 border-t border-zinc-150 flex items-center justify-between bg-zinc-50/50">
                <button 
                  onClick={handleCloseManageModal}
                  className="px-5 py-2.5 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer bg-white text-zinc-650"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleRevokeConnection(managedConnection.id)}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-500/10 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revoke Authorization</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
