/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { 
  MessageSquare, Sparkles, RefreshCw, AlertCircle, ShoppingBag, 
  HelpCircle, ThumbsDown, Heart, ArrowUpRight, BadgeHelp, CheckCircle2 
} from 'lucide-react'

interface ObservedMetrics {
  totalConversations: number
  productSearchesCount: number
  recommendationsCount: number
  unansweredCount: number
  conversionsCount: number
  resolutionRate: number
  timeline: Array<{ date: string; chats: number; searches: number; conversions: number }>
  topIntents: Array<{ name: string; value: number }>
  productInterest: Array<{ name: string; views: number }>
  unansweredQuestionsList: Array<{ question: string; timestamp: string }>
}

interface RowanInsights {
  frequentlyRequestedProducts: string[]
  commonCustomerQuestions: string[]
  commonObjections: string[]
  productsSearchedButUnavailable: string[]
  potentialCatalogGaps: string[]
  conversationTrends: string[]
}

export const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'observed' | 'ai_insights'>('observed')
  const [metrics, setMetrics] = useState<ObservedMetrics | null>(null)
  const [insights, setInsights] = useState<RowanInsights | null>(null)
  const [insightsSource, setInsightsSource] = useState<string>('')
  
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Fetch telemetry and insights data
  const fetchData = async () => {
    await Promise.resolve()
    setRefreshing(true)
    try {
      // 1. Fetch observed metrics
      const metricsRes = await fetch('/api/analytics')
      const metricsData = await metricsRes.json()
      if (metricsData.success) {
        setMetrics(metricsData.observedData.metrics)
      }

      // 2. Fetch AI Insights
      const insightsRes = await fetch('/api/analytics/insights')
      const insightsData = await insightsRes.json()
      if (insightsData.success) {
        setInsights(insightsData.insights)
        setInsightsSource(insightsData.source)
      }
    } catch (err) {
      console.error('[ANALYTICS FRONTEND ERROR]:', err)
    } finally {
      setLoadingMetrics(false)
      setLoadingInsights(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-6 text-zinc-800 pb-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 pb-5">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
            METRICS & SYNTHESIS
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 my-0">
            Merchant Intelligence
          </h1>
          <p className="text-sm text-zinc-500 mt-1 my-0">
            Track real customer interactions and unlock Rowan-generated catalogs and objection findings.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              onClick={() => setActiveTab('observed')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-0 ${
                activeTab === 'observed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
              }`}
            >
              Observed Metrics
            </button>
            <button
              onClick={() => setActiveTab('ai_insights')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer border-0 ${
                activeTab === 'ai_insights'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 bg-transparent'
              }`}
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              Rowan AI Insights
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center justify-center p-2 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors cursor-pointer"
            title="Refresh Analytics Stream"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : 'text-zinc-500'}`} />
          </button>
        </div>
      </div>

      {/* Safety and Isolation Banner */}
      <div className="bg-emerald-50 border border-emerald-150 rounded-2xl p-4 flex gap-3 items-start">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-zinc-900 my-0">Tenant Isolation & Privacy Protection Enforced</p>
          <p className="text-zinc-500 leading-relaxed my-0 font-medium">
            All analytical events and chat queries are strictly isolated to your tenant organization ID. Under strict privacy rules, raw customer messages are aggregated, and no personal identifying information (PII) is processed by external synthesis engines.
          </p>
        </div>
      </div>

      {/* -------------------- TAB 1: OBSERVED TELEMETRY -------------------- */}
      {activeTab === 'observed' && (
        <div className="space-y-6">
          {loadingMetrics ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-3 bg-white border border-zinc-200 rounded-2xl shadow-sm">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Loading observed telemetry dashboards...</p>
            </div>
          ) : !metrics ? (
            <div className="text-center py-20 border border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
              <p className="text-sm text-zinc-500 font-medium">No observed analytics history retrieved.</p>
            </div>
          ) : (
            <>
              {/* Stat Bento Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-zinc-200 p-5 rounded-xl shadow-sm bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-450 block">Total Conversations</span>
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">{metrics.totalConversations} Sessions</h3>
                    <p className="text-[10px] text-zinc-450 font-bold mt-1 my-0 uppercase tracking-wider">Direct from Widget Embed</p>
                  </div>
                </Card>

                <Card className="border border-zinc-200 p-5 rounded-xl shadow-sm bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-455 block">Resolution Accuracy</span>
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">{metrics.resolutionRate}%</h3>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1 my-0 uppercase tracking-wider">Solved natively by Rowan</p>
                  </div>
                </Card>

                <Card className="border border-zinc-200 p-5 rounded-xl shadow-sm bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-450 block">Ecom Conversions</span>
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">{metrics.conversionsCount} Sales</h3>
                    <p className="text-[10px] text-amber-600 font-bold mt-1 my-0 uppercase tracking-wider">
                      {metrics.totalConversations > 0 ? ((metrics.conversionsCount / metrics.totalConversations) * 100).toFixed(1) : 0}% Click-to-buy rate
                    </p>
                  </div>
                </Card>

                <Card className="border border-zinc-200 p-5 rounded-xl shadow-sm bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-455 block">Searches Initiated</span>
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                      <BadgeHelp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">{metrics.productSearchesCount} Queries</h3>
                    <p className="text-[10px] text-zinc-455 font-bold mt-1 my-0 uppercase tracking-wider">Automatic catalog matches</p>
                  </div>
                </Card>
              </div>

              {/* Main Graphs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Performance Timeline */}
                <Card title="Observed Activity Timeline" subtitle="Chat traffic, searches, and cart conversions" className="lg:col-span-2 border border-zinc-200 shadow-sm bg-white">
                  <div className="h-[280px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d97706" stopOpacity={0.12}/>
                            <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                        <XAxis dataKey="date" stroke="#999" fontSize={10} tickLine={false} />
                        <YAxis stroke="#999" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e4e4e7',
                            color: '#18181b',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                          }}
                        />
                        <Area type="monotone" dataKey="chats" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorChats)" name="Inbound Conversations" />
                        <Area type="monotone" dataKey="searches" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 4" fill="none" name="Product Searches" />
                        <Area type="monotone" dataKey="conversions" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorConversions)" name="Conversions (Add-To-Cart)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Intents Distribution */}
                <Card title="Primary Customer Intents" subtitle="NLP classifications of inbound queries" className="border border-zinc-200 shadow-sm bg-white">
                  <div className="h-[280px] w-full mt-4 flex flex-col justify-between">
                    <div className="flex-1 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.topIntents} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <XAxis type="number" stroke="#999" fontSize={10} hide />
                          <YAxis dataKey="name" type="category" stroke="#999" fontSize={10} width={90} tickLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              borderColor: '#e4e4e7',
                              color: '#18181b',
                              borderRadius: '8px',
                              fontSize: '11px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                          />
                          <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={10} name="Sessions" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Product Interest Index vs Unresolved Log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Interest Index */}
                <Card title="Catalog Product Interest Index" subtitle="Top viewed/searched products by customer queries" className="border border-zinc-200 shadow-sm bg-white">
                  <div className="h-[240px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.productInterest} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                        <XAxis dataKey="name" stroke="#999" fontSize={10} tickLine={false} />
                        <YAxis stroke="#999" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e4e4e7',
                            color: '#18181b',
                            borderRadius: '8px',
                            fontSize: '11px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                          }}
                        />
                        <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Interest Index (Views)" barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Unresolved / Unanswered Questions Stream */}
                <Card title="Unanswered Questions Log" subtitle="Queries where Rowan flagged missing knowledge parameters" className="border border-zinc-200 shadow-sm bg-white">
                  <div className="mt-4 space-y-3 max-h-[240px] overflow-y-auto pr-1">
                    {metrics.unansweredQuestionsList.length === 0 ? (
                      <div className="h-40 flex items-center justify-center text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        No unanswered questions logged. Rowan answered everything!
                      </div>
                    ) : (
                      metrics.unansweredQuestionsList.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-2.5">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-xs flex-1 min-w-0">
                            <p className="font-bold text-zinc-900 truncate my-0">"{item.question}"</p>
                            <span className="text-[10px] text-zinc-400 block mt-1 my-0 font-medium">
                              {new Date(item.timestamp).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* -------------------- TAB 2: ROWAN AI INSIGHTS -------------------- */}
      {activeTab === 'ai_insights' && (
        <div className="space-y-6">
          {loadingInsights ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-3 bg-white border border-zinc-200 rounded-2xl shadow-sm">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Synthesizing customer conversations intelligence...</p>
            </div>
          ) : !insights ? (
            <div className="text-center py-20 border border-dashed border-zinc-200 rounded-3xl bg-zinc-50/50">
              <p className="text-sm text-zinc-500">No interpretations or insights generated.</p>
            </div>
          ) : (
            <>
              {/* Premium AI Badging */}
              <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-sm border border-zinc-800 relative overflow-hidden">
                <div className="relative space-y-2 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold bg-blue-600 text-white px-2.5 py-1 rounded-md border border-blue-500 flex items-center gap-1 leading-none">
                      <Sparkles className="w-3 h-3" />
                      Rowan GenAI Interpretation
                    </span>
                    <span className="text-[9px] uppercase font-extrabold bg-white/10 text-zinc-300 px-2 py-0.5 rounded border border-white/10 leading-none">
                      Mode: {insightsSource === 'rowan_ai_analysis' ? 'Active LLM Synthesis' : 'Programmatic Fallback Rule Engine'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mt-3 text-white my-0">Advanced Tenant Catalog Optimization</h2>
                  <p className="text-xs text-zinc-450 leading-relaxed my-0 font-medium">
                    Rowan reads and synthesizes your isolated tenant log events to isolate exact product issues, customer hesitation triggers, and missing items catalog holes. Raw numbers are contextualized below into actionable intelligence.
                  </p>
                </div>
              </div>

              {/* Observed vs Interpreted Legend */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center gap-2.5 text-zinc-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                  <span><strong>Observed Telemetry:</strong> Verifiable logs of clicks, search counts, and system responses.</span>
                </div>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center gap-2.5 text-zinc-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span><strong>Rowan Interpretation:</strong> High-level thematic syntheses and operational suggestions.</span>
                </div>
              </div>

              {/* Insights Bento Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Frequently Requested Products */}
                <Card 
                  title="Frequently Requested Products" 
                  subtitle="Catalogue items commanding the highest consumer inquiry volumes"
                  extra={<Heart className="w-4.5 h-4.5 text-rose-500" />}
                  className="border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="mt-4 space-y-2.5">
                    {insights.frequentlyRequestedProducts.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                        <span className="text-xs font-bold text-zinc-900">{p}</span>
                        <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded border border-blue-100">High Demand</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Common Customer Questions */}
                <Card 
                  title="Common Inquiries Index" 
                  subtitle="Recurring consumer concerns and product FAQ questions"
                  extra={<HelpCircle className="w-4.5 h-4.5 text-blue-600" />}
                  className="border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="mt-4 space-y-3">
                    {insights.commonCustomerQuestions.map((q, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start text-xs border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-blue-100">Q</span>
                        <p className="text-zinc-600 leading-relaxed font-bold my-0">"{q}"</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Common Objections */}
                <Card 
                  title="Objection Analysis" 
                  subtitle="Primary points of consumer hesitation or purchase friction"
                  extra={<ThumbsDown className="w-4.5 h-4.5 text-amber-500" />}
                  className="border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="mt-4 space-y-3">
                    {insights.commonObjections.map((o, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start text-xs border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0">
                        <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-amber-100">!</span>
                        <p className="text-zinc-650 leading-relaxed font-semibold my-0">{o}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Products searched but unavailable & catalog gaps */}
                <Card 
                  title="Catalog Gaps & Procurement Needs" 
                  subtitle="Searched terms returning zero results and gap alerts"
                  extra={<AlertCircle className="w-4.5 h-4.5 text-rose-500" />}
                  className="border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-rose-600 mb-2">Unavailable Search Terms</h4>
                      <div className="flex flex-wrap gap-2">
                        {insights.productsSearchedButUnavailable.map((item, idx) => (
                          <span key={idx} className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-lg border border-rose-100">
                            "{item}"
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-amber-600 mb-2">Identified Catalog Gaps</h4>
                      <div className="space-y-2">
                        {insights.potentialCatalogGaps.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center text-xs text-zinc-650 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Conversation Trends Card */}
              <Card 
                title="Conversation Trends & Strategic Guidance" 
                subtitle="Thematic insights to fine-tune operations and inventories"
                className="border border-zinc-200 bg-white shadow-sm"
              >
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {insights.conversationTrends.map((trend, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col justify-between">
                      <p className="text-xs text-zinc-600 leading-relaxed font-bold my-0">"{trend}"</p>
                      <div className="flex items-center gap-1.5 mt-4 text-blue-600 text-xs font-extrabold uppercase tracking-wider">
                        <span>Read Detail Analysis</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}
