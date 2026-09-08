import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Sparkles,
  ArrowRight,
  Headphones,
  Globe,
  Smartphone,
  ShieldCheck,
  ShoppingBag,
  ChevronDown,
  Check,
  Cpu,
  Radio,
  Menu,
  X,
  Bot,
  Image as ImageIcon,
  Wand2,
  Send
} from 'lucide-react'
import { RowanLogo } from './components/RowanLogo'

interface LandingProps {
  navigate: (to: string) => void
}

export default function Landing({ navigate }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'orb' | 'image' | 'chat' | 'devices' | 'store'>('orb')
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'researching' | 'speaking'>('idle')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0)
  const [quickPrompt, setQuickPrompt] = useState('')
  
  // Interactive Image Generator Preview State
  const [previewAspect, setPreviewAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>(
    'https://image.pollinations.ai/prompt/A%20futuristic%20minimalist%20AI%20companion%20orb%20floating%20gently%20in%20a%20clean%20sunlit%20modern%20architectural%20studio%20with%20soft%20diffused%20lighting?width=1024&height=1024&seed=88231&nologo=true&model=flux'
  )

  const samplePrompts = [
    { label: '🎨 Generate Image', prompt: 'Create a photorealistic image of a golden retriever in a modern living room' },
    { label: '🌐 Web Research', prompt: 'Find recent breakthroughs in artificial intelligence research this week' },
    { label: '🔩 Hardware Catalog', prompt: 'Search fasteners inventory for heavy drywall anchors and screws' },
    { label: '📱 SMS Gateway', prompt: 'How do I text Rowan from my cellular phone?' }
  ]

  const faqs = [
    {
      q: 'What is Rowan AI?',
      a: 'Rowan is a unified personal AI companion engineered to follow you across devices, browsers, and business environments. It combines low-latency real-time voice, dual neural image generation (OpenAI & Flux.1), live Tavily web research, and autonomous workflows in one cohesive interface.'
    },
    {
      q: 'How does the floating AI assistant work?',
      a: 'Click the glowing Rowan orb in the bottom-right corner of any screen or press the floating trigger button to open the full conversational workspace. You can generate images, search the web in real-time, attach files, speak naturally with voice mode, or query product catalogs.'
    },
    {
      q: 'How does Rowan handle Image Generation?',
      a: 'Rowan utilizes a dual-engine neural image pipeline. By default, it sends prompts to OpenAI ChatGPT Image (chatgpt-image-latest) with high-definition rendering. If an API quota or provider event occurs, it seamlessly fails over to Flux.1 with zero downtime, accurately labeling the engine.'
    },
    {
      q: 'Can I connect my cellular phone via SMS?',
      a: 'Yes. Rowan integrates directly with Twilio and native cellular SMS gateways. Text or call your dedicated Rowan number from any standard mobile phone with zero app download required.'
    },
    {
      q: 'How fast is Rowan voice mode?',
      a: 'Rowan utilizes OpenAI Realtime WebRTC protocols combined with low-latency streaming speech synthesis, delivering sub-500ms conversational turn-around times that feel like talking to a live human.'
    },
    {
      q: 'Can Rowan integrate with my e-commerce storefront?',
      a: 'Absolutely. Rowan connects to product catalogs (like fasteners, tools, apparel, or electronics) to provide instant inventory answers, quote calculations, and autonomous checkout assistance for your visitors.'
    },
    {
      q: 'Is my data private and secure?',
      a: 'Rowan operates on a zero-trust, multi-tenant architecture with end-to-end sandbox privacy. All AI model keys remain strictly server-side, and your conversation data is isolated.'
    }
  ]

  const triggerOrbAction = (state: 'idle' | 'listening' | 'researching' | 'speaking') => {
    setOrbState(state)
  }

  const handleOpenFloatingChat = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-rowan-assistant'))
    }
  }

  const handleQuickPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPrompt.trim()) return
    navigate(`/chat?q=${encodeURIComponent(quickPrompt)}`)
  }

  const handleRunSamplePrompt = (promptText: string) => {
    navigate(`/chat?q=${encodeURIComponent(promptText)}`)
  }

  const handleSimulateImageGen = () => {
    setIsGeneratingPreview(true)
    setTimeout(() => {
      const seed = Math.floor(Math.random() * 900000) + 100000
      let dims = 'width=1024&height=1024'
      if (previewAspect === '16:9') dims = 'width=1024&height=576'
      if (previewAspect === '9:16') dims = 'width=576&height=1024'
      
      setPreviewImage(
        `https://image.pollinations.ai/prompt/A%20sleek%20modern%20industrial%20design%20product%20shot%20of%20a%20smart%20home%20device%20on%20a%20clean%20wooden%20desk%20with%20warm%20ambient%20lighting?${dims}&seed=${seed}&nologo=true&model=flux`
      )
      setIsGeneratingPreview(false)
    }, 1200)
  }

  return (
    <div
      className="min-h-screen bg-[#fafafa] text-zinc-800 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden relative"
      id="landing-container"
    >
      {/* Background Radial Light Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[680px] pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[650px] h-[650px] rounded-full bg-blue-100/50 blur-[140px]" />
        <div className="absolute top-[-5%] right-[15%] w-[550px] h-[550px] rounded-full bg-indigo-100/40 blur-[130px]" />
        <div className="absolute top-[30%] left-[40%] w-[400px] h-[400px] rounded-full bg-sky-100/40 blur-[100px]" />
      </div>

      {/* 1. STICKY GLASS HEADER */}
      <header
        className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 border-b border-zinc-200/70"
        id="landing-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer group"
            id="landing-brand-logo"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-zinc-900">
                rowan<span className="text-blue-600">.ai</span>
              </span>
              <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/50">
                2.4
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-zinc-600">
            <a
              href="#showcase"
              className="hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Capabilities
            </a>
            <a
              href="#features"
              className="hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Architecture
            </a>
            <button
              type="button"
              onClick={() => navigate('/devices')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-sm font-semibold text-zinc-600"
            >
              Devices
            </button>
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-sm font-semibold text-zinc-600"
            >
              Demo Store
            </button>
            <a
              href="#faq"
              className="hover:text-zinc-900 transition-colors cursor-pointer"
            >
              FAQ
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3.5 py-2 text-xs font-bold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all cursor-pointer"
              id="landing-signin-btn"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
              id="landing-chat-nav-btn"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Launch Rowan Chat</span>
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="p-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
              aria-label="Open Chat"
            >
              <Bot className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-zinc-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3"
            >
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-zinc-700 py-1"
              >
                Capabilities
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-zinc-700 py-1"
              >
                Architecture
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/devices')
                }}
                className="block w-full text-left text-sm font-semibold text-zinc-700 py-1"
              >
                Devices & SMS
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  navigate('/demo')
                }}
                className="block w-full text-left text-sm font-semibold text-zinc-700 py-1"
              >
                Demo Storefront
              </button>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-semibold text-zinc-700 py-1"
              >
                FAQ
              </a>
              <div className="pt-2 border-t border-zinc-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/login')
                  }}
                  className="flex-1 py-2 text-center text-xs font-bold text-zinc-700 bg-zinc-100 rounded-xl"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/chat')
                  }}
                  className="flex-1 py-2 text-center text-xs font-bold text-white bg-blue-600 rounded-xl"
                >
                  Launch Chat
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative z-10 pt-12 sm:pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center" id="landing-hero">
        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs mb-6 cursor-pointer hover:bg-blue-100/80 transition-all"
          onClick={() => navigate('/chat')}
          id="hero-status-pill"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Rowan 2.4 Omni Engine</span>
          <span className="text-blue-300">•</span>
          <span className="font-semibold text-blue-600">Voice • Dual Neural Images • Tavily Search</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-blue-500" />
        </motion.div>

        {/* Display Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 leading-[1.12] mb-6"
          id="hero-main-title"
        >
          Unified personal intelligence that follows you everywhere.
        </motion.h1>

        {/* Subtitle Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed mb-8"
          id="hero-subtitle"
        >
          From low-latency WebRTC voice and neural HD image generation to grounded Tavily web search, mobile SMS sync, and automated e-commerce catalogs.
        </motion.p>

        {/* INTERACTIVE QUICK PROMPT INPUT BOX */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="max-w-2xl mx-auto mb-10"
        >
          <form
            onSubmit={handleQuickPromptSubmit}
            className="p-2 rounded-2xl bg-white border border-zinc-200/90 shadow-lg flex items-center gap-2 hover:border-blue-300 transition-all"
          >
            <div className="pl-3 text-blue-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Ask Rowan anything or generate an image (e.g. 'A mechanical watch concept')..."
              className="flex-1 bg-transparent border-0 text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0 px-2"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
            >
              <span>Ask Rowan</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Prompt Suggestion Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {samplePrompts.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleRunSamplePrompt(item.prompt)}
                className="px-3 py-1 rounded-full bg-zinc-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-zinc-600 text-xs font-semibold border border-zinc-200 transition-all cursor-pointer flex items-center gap-1"
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Action Button Group */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3.5 mb-10"
          id="hero-cta-buttons"
        >
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            id="hero-start-chat-btn"
          >
            <Bot className="w-4 h-4" />
            <span>Open Conversational Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleOpenFloatingChat}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-sm border border-zinc-200 shadow-sm transition-all cursor-pointer"
            id="hero-trigger-floating-btn"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Toggle Floating Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-sm transition-all cursor-pointer"
            id="hero-launch-workspace-btn"
          >
            <Cpu className="w-4 h-4" />
            <span>Control Center</span>
          </button>
        </motion.div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 font-medium pt-2 border-t border-zinc-200/60 max-w-3xl mx-auto">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>ChatGPT Image & Flux.1 Dual Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Sub-500ms WebRTC Voice</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Live Tavily Web Research</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Sandboxed Security</span>
          </div>
        </div>
      </section>

      {/* 3. METRICS TICKER STRIP */}
      <section className="border-y border-zinc-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">&lt; 500ms</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Realtime WebRTC Latency</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 tracking-tight">100%</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Server-Side Secret Protection</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 tracking-tight">Dual-Engine</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">OpenAI HD & Flux.1 Image Pipeline</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">SMS Sync</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Native Twilio Gateway</p>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE SHOWCASE BENTO GRID */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16" id="showcase">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Interactive Capability Matrix
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight mt-2">
            Experience Rowan in real-time.
          </h2>
          <p className="text-sm text-zinc-600 mt-2">
            Select a capability below to inspect how Rowan handles multi-modal tasks seamlessly.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xl overflow-hidden">
          {/* Showcase Tabs */}
          <div className="flex border-b border-zinc-200 bg-zinc-50/60 p-2 overflow-x-auto gap-1">
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('orb')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeShowcaseTab === 'orb'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Realtime WebRTC Voice</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('image')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeShowcaseTab === 'image'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Neural Image Engine</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('chat')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeShowcaseTab === 'chat'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Grounded Web Research</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('devices')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeShowcaseTab === 'devices'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>SMS Cellular Gateway</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveShowcaseTab('store')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeShowcaseTab === 'store'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Storefront Catalog</span>
            </button>
          </div>

          {/* Showcase Tab Contents */}
          <div className="p-6 sm:p-10">
            {/* TAB 1: VOICE ORB */}
            {activeShowcaseTab === 'orb' && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 space-y-4 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                    <Headphones className="w-3.5 h-3.5" />
                    <span>OpenAI Realtime Voice</span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight my-0">
                    Talk to Rowan with zero latency.
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed my-0">
                    Click the state controls below to test how Rowan’s visual orb responds dynamically as it listens, queries live web sources, and streams voice responses back.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => triggerOrbAction('idle')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        orbState === 'idle'
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      Idle
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerOrbAction('listening')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        orbState === 'listening'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      Listening Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerOrbAction('researching')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        orbState === 'researching'
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      Tavily Search
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerOrbAction('speaking')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        orbState === 'speaking'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      Speaking
                    </button>
                  </div>
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => navigate('/chat')}
                      className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <span>Try full voice chat workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-3xl text-white relative overflow-hidden shadow-inner min-h-[260px]">
                  <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 to-transparent pointer-events-none" />
                  <div className="relative mb-6">
                    <RowanLogo
                      size={120}
                      variant="orb"
                      isProcessing={orbState === 'listening' || orbState === 'researching'}
                    />
                    {orbState === 'speaking' && (
                      <div className="absolute -inset-4 rounded-full border border-indigo-400/40 animate-ping pointer-events-none" />
                    )}
                  </div>
                  <div className="text-center relative z-10">
                    <p className="text-xs font-black text-white uppercase tracking-wider mb-1">
                      Status: {orbState}
                    </p>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      {orbState === 'idle' && 'Ready for audio stream or text input.'}
                      {orbState === 'listening' && 'Listening via browser WebRTC microphone...'}
                      {orbState === 'researching' && 'Fetching verified live web citations via Tavily...'}
                      {orbState === 'speaking' && 'Streaming dual-channel neural audio response...'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: NEURAL IMAGE GENERATION ENGINE */}
            {activeShowcaseTab === 'image' && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-left">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>OpenAI ChatGPT Image & Flux.1 Engine</span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight my-0">
                    High-Definition Image Generation.
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed my-0">
                    Rowan translates prompts into crisp visual artwork with custom aspect ratio selection (`1:1`, `16:9`, `9:16`), exact engine labeling, and failover resilience.
                  </p>

                  {/* Aspect Ratio Selector Controls */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-zinc-500 block">Select Aspect Ratio:</label>
                    <div className="flex gap-2">
                      {(['1:1', '16:9', '9:16'] as const).map((aspect) => (
                        <button
                          key={aspect}
                          type="button"
                          onClick={() => setPreviewAspect(aspect)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            previewAspect === aspect
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {aspect}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSimulateImageGen}
                      disabled={isGeneratingPreview}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      {isGeneratingPreview ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Rendering Image...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                          <span>Generate Sample Artwork</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-sm">
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-slate-950 shadow-md">
                    <img
                      src={previewImage}
                      alt="Neural Image Preview"
                      className="w-full h-auto object-cover transition-opacity duration-300"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-black text-blue-400 border border-blue-500/35 uppercase">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>ChatGPT Image / Flux.1</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: GROUNDED WEB RESEARCH */}
            {activeShowcaseTab === 'chat' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-zinc-900">Tavily Web Search Grounding</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Launch Live Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Chat Preview Bubble */}
                <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200/70">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
                      You
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-sm text-xs text-zinc-800 shadow-xs border border-zinc-200/50">
                      Search the web for the latest artificial intelligence breakthroughs this week and give me sources.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-sm text-xs text-zinc-800 shadow-xs border border-zinc-200/50 space-y-2.5 flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold">
                        <Globe className="w-3 h-3" />
                        <span>Searched 5 verified sources via Tavily Web API</span>
                      </div>
                      <p className="leading-relaxed my-0">
                        Here are the top breakthroughs verified across live sources today:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-zinc-700 my-0">
                        <li><strong>Deep Research & Autonomous Agents:</strong> Accelerated reasoning models now browse live multi-step sources independently.</li>
                        <li><strong>Ultra-Low Latency Voice:</strong> Real-time streaming token audio enables sub-500ms conversational turnarounds.</li>
                      </ul>
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">
                          arxiv.org
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">
                          technologyreview.com
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">
                          nature.com
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SMS CELLULAR GATEWAY */}
            {activeShowcaseTab === 'devices' && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-left">
                <div className="flex-1 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Universal Twilio SMS Gateway</span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight my-0">
                    Text Rowan from any cellular phone.
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed my-0">
                    No app store install required. Text your dedicated Rowan phone number to get instant answers, catalog lookup, or execute reminders on the go.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/devices')}
                      className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer"
                    >
                      Manage Connected Devices
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full max-w-sm p-4 bg-zinc-100 rounded-3xl border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-500 px-2">
                    <span>Messages • Rowan Gateway</span>
                    <span>5G Active</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-zinc-200/80 text-xs space-y-2">
                    <p className="text-zinc-500 text-[10px] text-right font-medium my-0">Delivered SMS</p>
                    <p className="bg-blue-600 text-white p-2.5 rounded-xl rounded-br-xs text-right font-medium my-0">
                      What screws do we have in stock for heavy drywall anchors?
                    </p>
                    <p className="bg-zinc-100 text-zinc-800 p-2.5 rounded-xl rounded-bl-xs text-left font-medium my-0">
                      Rowan: Heavy-Duty Zinc Wall Anchors (#8 x 1-1/4") in stock ($14.99/pack of 50). Reply 1 to reserve.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: STOREFRONT CATALOG */}
            {activeShowcaseTab === 'store' && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-left">
                <div className="flex-1 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Autonomous Catalog Assistant</span>
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 tracking-tight my-0">
                    Turn your catalog into an AI storefront.
                  </h3>
                  <p className="text-sm text-zinc-600 leading-relaxed my-0">
                    Rowan reads your live product inventory, answers complex technical questions, matches screws and drill bits to customer specs, and creates orders automatically.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/demo')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                    >
                      Explore Demo Storefront
                    </button>
                  </div>
                </div>
                <div className="flex-1 w-full max-w-sm p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <span className="text-xs font-bold text-zinc-800">Hardware Catalog Query</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">In Stock</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl space-y-1 border border-zinc-100">
                    <p className="text-xs font-bold text-zinc-900 my-0">Grade 8 Structural Steel Hex Bolts</p>
                    <p className="text-[11px] text-zinc-500 my-0">1/2"-13 x 2" • Yellow Zinc Plated • 150,000 PSI</p>
                    <p className="text-xs font-extrabold text-blue-600 my-0 pt-1">$28.50 / Box of 25</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/demo')}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                  >
                    View Product in Demo Store
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURAL FEATURES GRID */}
      <section className="relative z-10 py-16 bg-white border-y border-zinc-200" id="features">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Complete Intelligence Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight mt-2">
              Engineered for versatility, speed, and privacy.
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 mt-3 leading-relaxed">
              Every component in Rowan is crafted to give you instant answers and reliable automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-zinc-50/70 border border-zinc-200/80 hover:border-blue-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight my-0">
                Low-Latency WebRTC Voice
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed my-0">
                Natural back-and-forth speech without awkward buffering pauses. Speak freely and listen as Rowan responds in high-fidelity audio.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-zinc-50/70 border border-zinc-200/80 hover:border-blue-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                <Wand2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight my-0">
                Dual Neural Image Pipeline
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed my-0">
                Generate crisp visual media via OpenAI ChatGPT Image with graceful, automatic failover to Flux.1 when quota events occur.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-zinc-50/70 border border-zinc-200/80 hover:border-blue-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight my-0">
                Autonomous Tavily Web Research
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed my-0">
                Get real-time answers with verified citations and website links. Rowan crawls live data so you are never left with outdated training knowledge.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-zinc-50/70 border border-zinc-200/80 hover:border-blue-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight my-0">
                Cellular SMS & Twilio Gateway
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed my-0">
                Sync with mobile numbers without needing a mobile app. Text questions, get stock alerts, and trigger automations right through SMS.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-zinc-50/70 border border-zinc-200/80 hover:border-blue-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight my-0">
                E-Commerce Catalog Intelligence
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed my-0">
                Connect your products and inventory specs. Rowan assists shoppers with technical dimensions, pricing tiers, and checkout options.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-zinc-50/70 border border-zinc-200/80 hover:border-blue-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight my-0">
                Multi-Tenant Sandboxed Security
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed my-0">
                Enterprise-grade security where API secrets never reach the browser. All sessions and memories are cryptographically segregated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto" id="faq">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight mt-2">
            Everything you need to know about Rowan.
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = expandedFaq === idx
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-zinc-200 bg-white overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left font-bold text-sm sm:text-base text-zinc-900 hover:bg-zinc-50/80 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>

      {/* 7. CALL TO ACTION BANNER */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto" id="landing-cta">
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-900 text-white text-center relative overflow-hidden shadow-2xl border border-zinc-800">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white my-0">
              Meet Rowan today.
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed my-0">
              Experience the next evolution of personal AI. Accessible everywhere through modern voice, chat, neural image generation, cellular SMS, and connected web services.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/chat')}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Start Chatting Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-md transition-all cursor-pointer"
              >
                Open Control Center
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="relative z-10 border-t border-zinc-200 bg-white py-10 px-4 sm:px-6 lg:px-8" id="landing-footer">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900">
              rowan<span className="text-blue-600">.ai</span>
            </span>
            <span className="text-xs text-zinc-400">
              • Unified Personal & Enterprise Intelligence
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-500 font-medium">
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-zinc-500 font-medium"
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-zinc-500 font-medium"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-zinc-500 font-medium"
            >
              Demo Store
            </button>
            <button
              type="button"
              onClick={() => navigate('/devices')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-zinc-500 font-medium"
            >
              Devices
            </button>
            <button
              type="button"
              onClick={() => navigate('/websites')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-zinc-500 font-medium"
            >
              Websites
            </button>
            <button
              type="button"
              onClick={() => navigate('/faq')}
              className="hover:text-zinc-900 transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs text-zinc-500 font-medium"
            >
              FAQ
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
