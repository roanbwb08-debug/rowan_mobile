import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  MessageSquare,
  Mic,
  ArrowRight,
  Send,
  Loader2,
  Globe,
  Smartphone,
  Search,
  Code2,
  Paintbrush,
  LineChart,
  Settings,
  ChevronRight,
  Calendar,
  Trash2,
  Radio,
  ArrowDown,
  Cpu
} from 'lucide-react'
import { rowanAuth, rowanConversations } from '../lib/supabase'
import type { SupabaseConversation, SandboxUser } from '../lib/supabase'
import { RowanExpressiveAvatar } from '../components/RowanExpressiveAvatar'
import { DashboardLiveVoiceModal } from '../components/DashboardLiveVoiceModal'
import { DashboardPairDeviceModal } from '../components/DashboardPairDeviceModal'

interface DashboardProps {
  navigate: (to: string) => void
}

function formatConversationDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Recent'
  }
}

export const Dashboard: React.FC<DashboardProps> = ({ navigate }) => {
  const [user, setUser] = useState<SandboxUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [queryInput, setQueryInput] = useState('')
  const [submittingQuery, setSubmittingQuery] = useState(false)
  
  // Real recent conversations state
  const [recentConversations, setRecentConversations] = useState<SupabaseConversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)

  // Modals state
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false)
  const [pairDeviceOpen, setPairDeviceOpen] = useState(false)

  useEffect(() => {
    let isSubscribed = true
    const fetchData = async () => {
      try {
        const currentUser = await rowanAuth.getSessionUser()
        if (!currentUser) {
          if (isSubscribed) navigate('/login')
          return
        }
        if (isSubscribed) setUser(currentUser)

        // Fetch real persisted conversations from database
        const convs = await rowanConversations.getConversations(currentUser.id)
        if (isSubscribed) setRecentConversations(convs.slice(0, 5))
      } catch (err) {
        console.error('[Dashboard] Error fetching dashboard state:', err)
      } finally {
        if (isSubscribed) {
          setLoading(false)
          setLoadingConversations(false)
        }
      }
    }

    fetchData()

    return () => {
      isSubscribed = false
    }
  }, [navigate])

  // Handle Ask Rowan Submit
  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queryInput.trim() || !user || submittingQuery) return

    const query = queryInput.trim()
    setSubmittingQuery(true)

    try {
      // Create real persistent conversation session
      const title = query.length > 36 ? `${query.slice(0, 36)}...` : query
      const newConv = await rowanConversations.createConversation(user.id, title)
      
      if (newConv) {
        // Save first message
        await rowanConversations.saveMessage(newConv.id, 'user', query, [])

        // Try getting initial reply from backend
        try {
          const token = await rowanAuth.getSessionToken()
          const headers: Record<string, string> = { 'Content-Type': 'application/json' }
          if (token) headers['Authorization'] = `Bearer ${token}`

          const res = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: query,
              sessionId: newConv.id
            })
          })
          const data = await res.json()
          if (data.success && data.message) {
            await rowanConversations.saveMessage(newConv.id, 'assistant', data.message, data.products || [])
          }
        } catch {
          // If offline/error, conversation still safely persists
        }

        // Navigate to conversations or chat view
        navigate(`/conversations`)
      }
    } catch (err) {
      console.error('[Dashboard] Error creating conversation:', err)
    } finally {
      setSubmittingQuery(false)
    }
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to remove this conversation from your history?')) return
    try {
      await rowanConversations.deleteConversation(convId)
      setRecentConversations(prev => prev.filter(c => c.id !== convId))
    } catch (err) {
      console.error('[Dashboard] Error deleting conversation:', err)
    }
  }

  const getUserDisplayName = () => {
    if (!user?.email) return 'there'
    const prefix = user.email.split('@')[0]
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <p className="text-xs font-semibold text-zinc-400">
          Synchronizing with Rowan Core...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-16 max-w-6xl mx-auto" id="dashboard-root">
      
      {/* 1. AUTHENTICATED HEADER */}
      <header
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2"
        id="dashboard-header"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
              Your Rowan space
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 my-1 font-display tracking-tight">
            Good to see you, {getUserDisplayName()}
          </h1>
          <p className="text-xs text-zinc-400 my-0">
            One unified AI core ready to think, speak, create, and connect across your space.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/settings')}
            className="px-3.5 py-2 rounded-2xl bg-[#131922] hover:bg-[#18202b] text-zinc-300 hover:text-zinc-100 text-xs font-semibold border border-zinc-800 transition-colors flex items-center gap-2 cursor-pointer"
            id="header-settings-btn"
          >
            <Settings className="w-3.5 h-3.5 text-teal-400" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* 2. ROWAN CORE HERO (Visual Focal Point) */}
      <section
        className="relative overflow-hidden rounded-3xl bg-[#0e141c] border border-teal-900/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(13,148,136,0.06)]"
        id="rowan-core-hero"
      >
        {/* Subtle background glow */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Hero Left Content */}
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] font-mono font-bold tracking-widest uppercase text-teal-400">
              <Cpu className="w-3 h-3 text-teal-400" />
              <span>One Rowan Core</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight my-0">
                Think, speak, create, and connect from one place.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed my-0">
                Rowan is a single integrated core. You talk to Rowan; Rowan autonomously orchestrates the capabilities, tools, memory context, and connections required.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate('/chat')}
                className="px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-lg shadow-teal-900/20 cursor-pointer"
                id="hero-start-conversation-cta"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start a conversation</span>
              </button>

              <button
                onClick={() => setLiveVoiceOpen(true)}
                className="px-5 py-3 rounded-2xl bg-[#141b25] hover:bg-[#1a2330] text-teal-300 font-semibold text-xs border border-teal-500/30 transition-all flex items-center gap-2 cursor-pointer"
                id="hero-live-voice-cta"
              >
                <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
                <span>Live Voice</span>
              </button>
            </div>
          </div>

          {/* Hero Right: Interactive Avatar & Architectural Rule Flow */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#0a0e14]/60 border border-zinc-800/80 shrink-0 lg:w-80">
            <div className="relative mb-3">
              <RowanExpressiveAvatar
                state="idle"
                size={110}
                theme="dark"
                showStatusBadge={false}
              />
            </div>

            {/* Architectural Rule Pipeline */}
            <div className="w-full space-y-1 text-center font-mono">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Product Architecture
              </span>
              <div className="text-[11px] font-semibold text-teal-300 flex items-center justify-center gap-1 py-0.5">
                <Sparkles className="w-3 h-3 text-teal-400" />
                <span>Rowan Core</span>
              </div>
              <ArrowDown className="w-3 h-3 text-zinc-600 mx-auto" />
              <span className="text-[10px] text-zinc-400 block">Context + Permissions</span>
              <ArrowDown className="w-3 h-3 text-zinc-600 mx-auto" />
              <span className="text-[10px] text-zinc-400 block">Capabilities + Tools</span>
              <ArrowDown className="w-3 h-3 text-zinc-600 mx-auto" />
              <span className="text-[10px] text-teal-400/90 block">Authenticated Connections</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIMARY ASK ROWAN EXPERIENCE */}
      <section
        className="rounded-3xl bg-[#0e141c] border border-zinc-800 p-4 sm:p-5 shadow-sm"
        id="ask-rowan-experience"
      >
        <form onSubmit={handleAskSubmit} className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Ask Rowan anything</span>
          </label>

          <div className="flex items-center gap-2 bg-[#090d12] border border-zinc-800 focus-within:border-teal-500/60 rounded-2xl px-4 py-2 transition-all">
            <input
              type="text"
              placeholder="Ask Rowan anything... (e.g., 'Research market trends', 'Write a script', or 'Analyze my connections')"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              disabled={submittingQuery}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none py-1"
              id="ask-rowan-input"
            />

            {/* Microphone Control -> Launches Live Voice Directly */}
            <button
              type="button"
              onClick={() => setLiveVoiceOpen(true)}
              className="p-2.5 rounded-xl bg-[#141a24] hover:bg-[#1a2330] text-teal-400 hover:text-teal-300 transition-colors border border-teal-500/20 cursor-pointer"
              title="Speak directly to Rowan with Live Voice"
              aria-label="Start voice mode"
              id="ask-rowan-mic-btn"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Action / Send Control */}
            <button
              type="submit"
              disabled={!queryInput.trim() || submittingQuery}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 text-white disabled:text-zinc-600 transition-colors cursor-pointer"
              title="Submit query to Rowan Core"
              aria-label="Send query"
              id="ask-rowan-send-btn"
            >
              {submittingQuery ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 pl-1">
            No need to select a mode. Rowan determines which tools, research, or connections are required.
          </p>
        </form>
      </section>

      {/* 4. WHAT ROWAN CAN DO */}
      <section className="space-y-4" id="what-rowan-can-do">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 my-0">
              What Rowan can do
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 my-0">
              Native capabilities wired into the unified Rowan Core.
            </p>
          </div>
        </div>

        {/* 3 Clear Capability Groups */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Group 1: TALK */}
          <div className="rounded-3xl bg-[#0e141c] border border-zinc-800 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Talk
              </span>
              <span className="text-[10px] text-zinc-500">2 capabilities</span>
            </div>

            <div className="space-y-2">
              {/* Chat */}
              <div
                onClick={() => navigate('/chat')}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Chat
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Interactive text dialogue with Rowan Core
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>

              {/* Live Voice */}
              <div
                onClick={() => setLiveVoiceOpen(true)}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                        Live Voice
                      </h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300">
                        WebRTC
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Low-latency bidirectional spoken dialogue
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>
            </div>
          </div>

          {/* Group 2: CONNECT */}
          <div className="rounded-3xl bg-[#0e141c] border border-zinc-800 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Connect
              </span>
              <span className="text-[10px] text-zinc-500">2 capabilities</span>
            </div>

            <div className="space-y-2">
              {/* Connections */}
              <div
                onClick={() => navigate('/connect')}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Connections
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Manage reachable environments and apps
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>

              {/* Pair a device */}
              <div
                onClick={() => setPairDeviceOpen(true)}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Pair a device
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Link mobile so Rowan follows you
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>
            </div>
          </div>

          {/* Group 3: CREATE & WORK */}
          <div className="rounded-3xl bg-[#0e141c] border border-zinc-800 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Create & Work
              </span>
              <span className="text-[10px] text-zinc-500">4 capabilities</span>
            </div>

            <div className="space-y-2">
              {/* Research */}
              <div
                onClick={() => navigate('/chat')}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Research
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Web synthesis with verified sources
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>

              {/* Code */}
              <div
                onClick={() => navigate('/coding')}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Code
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Technical development workspace
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>

              {/* Create */}
              <div
                onClick={() => navigate('/chat')}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Paintbrush className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Create
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Synthesize visuals, media, and artifacts
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>

              {/* Analyze */}
              <div
                onClick={() => navigate('/analytics')}
                className="p-3 rounded-2xl bg-[#090d12]/60 hover:bg-[#090d12] border border-zinc-850 hover:border-teal-900/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <LineChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200 my-0 group-hover:text-teal-300 transition-colors">
                      Analyze
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5 my-0">
                      Telemetry, activity signals, and insights
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-teal-400 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. RECENT CONVERSATIONS (Persistent Database State) */}
      <section className="space-y-4" id="recent-conversations-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 my-0">
              Recent Conversations
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 my-0">
              Real dialogue sessions synchronized from persistent storage.
            </p>
          </div>

          <button
            onClick={() => navigate('/conversations')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingConversations ? (
          <div className="p-8 rounded-3xl bg-[#0e141c] border border-zinc-800 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-teal-400" />
            <span className="text-xs text-zinc-400">Loading recent conversations...</span>
          </div>
        ) : recentConversations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recentConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => navigate('/conversations')}
                className="p-4 rounded-2xl bg-[#0e141c] hover:bg-[#121922] border border-zinc-800 hover:border-teal-900/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatConversationDate(conv.updated_at || conv.created_at)}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-200 line-clamp-2 my-0 group-hover:text-teal-300 transition-colors">
                    {conv.title}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-850/70">
                  <span className="text-[11px] font-medium text-teal-400 flex items-center gap-1">
                    <span>Reopen dialogue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 rounded text-zinc-600 hover:text-rose-400 transition-colors"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-[#0e141c] border border-zinc-800 text-center space-y-3">
            <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-300 my-0">
                No conversations yet
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Ask Rowan anything in the box above or start a conversation to begin your dialogue history.
              </p>
            </div>
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Start a conversation
            </button>
          </div>
        )}
      </section>

      {/* Modals for Live Voice and Pair Device */}
      <DashboardLiveVoiceModal
        isOpen={liveVoiceOpen}
        onClose={() => setLiveVoiceOpen(false)}
        onNavigateToChat={() => navigate('/chat')}
      />

      <DashboardPairDeviceModal
        isOpen={pairDeviceOpen}
        onClose={() => setPairDeviceOpen(false)}
        onSuccess={() => loadData()}
      />

    </div>
  )
}
