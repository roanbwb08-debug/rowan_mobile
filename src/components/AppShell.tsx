import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { RowanFloatingAssistant } from './RowanFloatingAssistant'
import { rowanAuth } from '../lib/supabase'
import type { SandboxUser } from '../lib/supabase'
import {
  Home,
  MessageSquare,
  Globe,
  Radio,
  Menu,
  X,
  Bell,
  LogOut,
  User,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { DashboardLiveVoiceModal } from './DashboardLiveVoiceModal'

interface AppShellProps {
  currentPath: string
  navigate: (to: string) => void
  children: React.ReactNode
}

export const AppShell: React.FC<AppShellProps> = ({ currentPath, navigate, children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [liveVoiceOpen, setLiveVoiceOpen] = useState(false)
  const [user, setUser] = useState<SandboxUser | null>(null)
  const [notifs, setNotifs] = useState([
    { id: '1', text: 'One Rowan Core synchronized and ready', time: 'Just now', read: false },
    { id: '2', text: 'Persistent dialogue history connected', time: '10m ago', read: false }
  ])

  useEffect(() => {
    rowanAuth.getSessionUser().then((u) => {
      setUser(u)
    })
  }, [])

  const handleNavigate = (path: string) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifs.filter((n) => !n.read).length

  // Determine active section for 4-item navigation
  const isHomeActive = currentPath === '/dashboard' || currentPath === '/'
  const isConversationsActive = currentPath === '/conversations' || currentPath === '/chat'
  const isConnectActive = currentPath === '/connect' || currentPath.startsWith('/connect') || currentPath === '/devices' || currentPath === '/websites'
  const isYouActive = currentPath === '/settings' || currentPath === '/you' || currentPath === '/assistant'

  return (
    <div className="min-h-screen bg-[#090d12] flex flex-col font-sans antialiased text-zinc-100 selection:bg-teal-500/20 selection:text-teal-300">
      <div className="flex flex-1 min-h-screen">
        {/* 1. Large Screen Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-850 bg-[#0c1117] flex-shrink-0 z-30 justify-between">
          <div>
            {/* Brand Header */}
            <div className="px-6 py-5 border-b border-zinc-850 flex items-center justify-between">
              <div
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => handleNavigate('/dashboard')}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-[0_0_15px_rgba(13,148,136,0.15)] group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-zinc-100 tracking-tight group-hover:text-teal-300 transition-colors">
                    rowan.ai
                  </span>
                  <p className="text-[9px] text-teal-400/80 font-mono uppercase tracking-wider leading-none mt-0.5">
                    One AI Core
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation list: 4 Core Sections */}
            <nav className="px-3 py-6 space-y-1.5" id="desktop-sidebar-nav">
              {/* 1. Home */}
              <button
                onClick={() => handleNavigate('/dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isHomeActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#121820]'
                }`}
              >
                <Home className={`w-4 h-4 ${isHomeActive ? 'text-teal-400' : 'text-zinc-500'}`} />
                <span>Home</span>
                {isHomeActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-teal-400" />}
              </button>

              {/* 2. Conversations */}
              <button
                onClick={() => handleNavigate('/conversations')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isConversationsActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#121820]'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${isConversationsActive ? 'text-teal-400' : 'text-zinc-500'}`} />
                <span>Conversations</span>
                {isConversationsActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-teal-400" />}
              </button>

              {/* 3. Connect */}
              <button
                onClick={() => handleNavigate('/connect')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isConnectActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#121820]'
                }`}
              >
                <Globe className={`w-4 h-4 ${isConnectActive ? 'text-teal-400' : 'text-zinc-500'}`} />
                <span>Connect</span>
                {isConnectActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-teal-400" />}
              </button>

              {/* 4. You */}
              <button
                onClick={() => handleNavigate('/settings')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isYouActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#121820]'
                }`}
              >
                <User className={`w-4 h-4 ${isYouActive ? 'text-teal-400' : 'text-zinc-500'}`} />
                <span>You</span>
                {isYouActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-teal-400" />}
              </button>

              {/* Live Voice Fast Trigger */}
              <div className="pt-4 px-1">
                <button
                  onClick={() => setLiveVoiceOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#141b25] hover:bg-[#1a2330] border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all cursor-pointer shadow-[0_0_15px_rgba(13,148,136,0.08)]"
                >
                  <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  <span>Start Live Voice</span>
                </button>
              </div>
            </nav>
          </div>

          {/* Sidebar Footer with Core status & User Profile */}
          <div className="p-4 border-t border-zinc-850 bg-[#0a0e14] space-y-3">
            <div className="p-3 bg-[#0e141c] rounded-2xl border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-300">One Rowan Core</span>
              </div>
              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono">
                Active
              </span>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-2xl bg-[#0e141c] border border-zinc-800">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-xs font-semibold truncate text-zinc-200 leading-none">
                  {user ? user.email.split('@')[0] : 'Rowan Space'}
                </h4>
                <p className="text-[10px] text-zinc-500 truncate block mt-1 leading-none">
                  {user ? user.email : 'Authenticated'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleNavigate('/')}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl bg-transparent hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer border border-transparent hover:border-zinc-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* 2. Mobile Drawer Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25 }}
                className="relative flex flex-col w-72 bg-[#0c1117] h-full border-r border-zinc-850 z-10 shadow-2xl p-4 justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-zinc-100">rowan.ai</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <nav className="py-4 space-y-1">
                    <button
                      onClick={() => handleNavigate('/dashboard')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl ${
                        isHomeActive ? 'bg-teal-500/15 text-teal-300' : 'text-zinc-400'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span>Home</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('/conversations')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl ${
                        isConversationsActive ? 'bg-teal-500/15 text-teal-300' : 'text-zinc-400'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Conversations</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('/connect')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl ${
                        isConnectActive ? 'bg-teal-500/15 text-teal-300' : 'text-zinc-400'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span>Connect</span>
                    </button>

                    <button
                      onClick={() => handleNavigate('/settings')}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl ${
                        isYouActive ? 'bg-teal-500/15 text-teal-300' : 'text-zinc-400'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>You</span>
                    </button>
                  </nav>
                </div>

                <div className="pt-4 border-t border-zinc-850 space-y-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setLiveVoiceOpen(true)
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold shadow-sm"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Live Voice</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('/')}
                    className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Sign out
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 3. Primary Content Engine */}
        <div className="flex-grow flex flex-col min-w-0 min-h-screen bg-[#090d12]">
          {/* Top Bar */}
          <header className="sticky top-0 z-20 h-16 border-b border-zinc-850/80 bg-[#0c1117]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 lg:hidden cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-teal-400">
                  Your Rowan space
                </span>
                <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-zinc-600" />
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="font-mono text-[11px] text-zinc-300">One Rowan Core Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Talk to Rowan AI / Live Voice quick trigger */}
              <button
                onClick={() => setLiveVoiceOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl px-3 py-1.5 shadow-sm transition-all cursor-pointer"
                title="Start Rowan Live Voice"
              >
                <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                <span>Live Voice</span>
              </button>

              {/* Chat Full Screen Terminal */}
              <button
                onClick={() => navigate('/chat')}
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 rounded-xl px-3 py-1.5 bg-[#0e141c] cursor-pointer transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                <span>Chat Terminal</span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer transition-colors"
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-400 rounded-full" />
                  )}
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        className="absolute right-0 mt-2 w-80 bg-[#0e141c] border border-zinc-800 rounded-2xl shadow-xl z-20 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-[#111822]">
                          <span className="text-xs font-bold text-zinc-200">
                            Notifications ({unreadCount})
                          </span>
                          <button
                            onClick={markAllRead}
                            className="text-[10px] font-semibold text-teal-400 hover:underline"
                          >
                            Mark read
                          </button>
                        </div>
                        <div className="divide-y divide-zinc-850 max-h-64 overflow-y-auto">
                          {notifs.map((n) => (
                            <div key={n.id} className="p-3 text-xs flex flex-col gap-1 hover:bg-[#131b26] transition-colors">
                              <p className="font-semibold text-zinc-300 my-0">{n.text}</p>
                              <span className="text-[10px] text-zinc-500">{n.time}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* View Layout Canvas */}
          <main className="flex-grow p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto pb-28 md:pb-12 bg-[#090d12]">
            {children}
          </main>
        </div>
      </div>

      {/* 4. MOBILE BOTTOM NAVIGATION (Simple 4-section mobile navigation) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c1117]/95 backdrop-blur-xl border-t border-zinc-850 px-2 py-2 flex items-center justify-around lg:hidden shadow-lg"
        id="mobile-bottom-nav"
      >
        {/* 1. Home */}
        <button
          onClick={() => handleNavigate('/dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            isHomeActive ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-tight whitespace-nowrap">Home</span>
        </button>

        {/* 2. Conversations */}
        <button
          onClick={() => handleNavigate('/conversations')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            isConversationsActive ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-tight whitespace-nowrap">Conversations</span>
        </button>

        {/* 3. Connect */}
        <button
          onClick={() => handleNavigate('/connect')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            isConnectActive ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Globe className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-tight whitespace-nowrap">Connect</span>
        </button>

        {/* 4. You */}
        <button
          onClick={() => handleNavigate('/settings')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer min-w-[64px] ${
            isYouActive ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium leading-tight whitespace-nowrap">You</span>
        </button>
      </nav>

      {/* Live Voice Global Modal */}
      <DashboardLiveVoiceModal
        isOpen={liveVoiceOpen}
        onClose={() => setLiveVoiceOpen(false)}
        onNavigateToChat={() => navigate('/chat')}
      />

      {/* Rowan AI Floating Assistant */}
      <RowanFloatingAssistant />
    </div>
  )
}
