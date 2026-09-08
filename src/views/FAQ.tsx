import React, { useState } from 'react'
import { Search, BookOpen, Smartphone, Globe, Blocks, Mic, ShieldAlert, TrendingUp, CreditCard, Sparkles, HelpCircle } from 'lucide-react'

interface FAQItem {
  q: string
  a: string
  category: string
}

export const FAQ: React.FC = () => {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = [
    { id: 'All', name: 'All Topics', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'getting-started', name: 'Getting Started', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'device', name: 'Connecting Your Device', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'websites', name: 'Connecting Websites', icon: <Globe className="w-4 h-4" /> },
    { id: 'apps', name: 'Apps & Services', icon: <Blocks className="w-4 h-4" /> },
    { id: 'voice', name: 'Voice Mode', icon: <Mic className="w-4 h-4" /> },
    { id: 'security', name: 'Privacy & Security', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'trading', name: 'Trading Capabilities', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'plans', name: 'Account & Plans', icon: <CreditCard className="w-4 h-4" /> },
  ]

  const faqs: FAQItem[] = [
    {
      category: 'getting-started',
      q: 'What is Rowan.AI?',
      a: 'Rowan is a premium, personal AI companion designed to accompany you across your devices, websites, business tasks, and everyday life. Think of this website as Rowan\'s Control Center where you customize its personality and manage its active integrations.'
    },
    {
      category: 'getting-started',
      q: 'How do I start talking to Rowan?',
      a: 'Simply tap the glowing orange Rowan orb in the bottom-right corner of any page. It opens a text-chat interface or lets you transition immediately to high-responsiveness Voice Mode.'
    },
    {
      category: 'device',
      q: 'How does My Device work?',
      a: 'Connecting your device lets Rowan assist you with platform actions, voice recognition, and notifications. Currently, Rowan supports deep platform sandboxing and biometric prompts across iOS, Android, macOS, and Windows.'
    },
    {
      category: 'websites',
      q: 'Can I connect Rowan to any type of website?',
      a: 'Yes! Rowan is built to integrate with schools, churches, online stores, SaaS platforms, restaurants, SaaS docs, or personal blogs. You supply the core URL and background details, and Rowan is primed to assist your site visitors instantly.'
    },
    {
      category: 'apps',
      q: 'Which tools and integrations are supported?',
      a: 'Rowan connects to popular services across Email & Messaging, Productivity calendars, CRM billing systems, secure cloud storage folders, and development services like GitHub.'
    },
    {
      category: 'voice',
      q: 'How do I trigger Rowan\'s Voice Mode?',
      a: 'Click the microphone icon inside the floating assistant interface or say "Rowan" when voice features are active. You will see a glowing, beautifully animated orange voice orb that pulses as you talk.'
    },
    {
      category: 'security',
      q: 'Is my data secure with Rowan?',
      a: 'Absolutely. Rowan uses fully sandboxed device APIs, cryptographically signed JSON Web Tokens (JWTs) through Supabase authentication, and never exposes Gemini or OpenAI keys to the browser. Your privacy remains zero-trust guaranteed.'
    },
    {
      category: 'trading',
      q: 'Does Rowan support trading actions?',
      a: 'Rowan acts as an analysis advisor. By connecting to market-data and trading feeds, Rowan suggests risk-managed actions and charts trends, keeping you firmly in control without executing trades unilaterally.'
    },
    {
      category: 'plans',
      q: 'What plans are available?',
      a: 'Rowan offers flexible monthly and yearly tiers. Both include server-side Gemini intelligence, unlimited companion app access, and multi-website widget deployment.'
    }
  ]

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.q.toLowerCase().includes(search.toLowerCase()) || faq.a.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const openFloatingAssistant = () => {
    const trigger = document.getElementById('floating-assistant-trigger') as HTMLButtonElement | null
    if (trigger) {
      trigger.click()
    }
  }

  return (
    <div className="space-y-10 max-w-4xl mx-auto py-4 text-zinc-800">
      {/* Header section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>Support Center</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950 my-0">
          How can we help?
        </h1>
        <p className="text-sm text-zinc-500 max-w-xl mx-auto my-0">
          Search the Rowan Companion knowledge base or launch direct assistance below.
        </p>

        {/* Search Input */}
        <div className="max-w-md mx-auto relative pt-4">
          <Search className="absolute left-3.5 top-[27px] w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Rowan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-xs bg-white border border-zinc-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 font-bold"
          />
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm border border-transparent'
                : 'bg-white text-zinc-650 hover:bg-zinc-50 border border-zinc-200'
            }`}
          >
            <span className={selectedCategory === cat.id ? 'text-white' : 'text-zinc-500'}>
              {cat.icon}
            </span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* FAQ items grid */}
      <div className="space-y-4">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-xs hover:border-zinc-300 transition-all space-y-2"
            >
              <h3 className="text-base font-bold text-zinc-950 my-0">
                {faq.q}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed my-0 font-medium">
                {faq.a}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-zinc-400 text-xs font-bold uppercase tracking-wider">
            No help articles matched your query. Try browsing other categories.
          </div>
        )}
      </div>

      {/* Launcher banner */}
      <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center justify-center sm:justify-start gap-2 my-0">
            <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
            Still looking for answers?
          </h3>
          <p className="text-xs text-zinc-500 mt-1 my-0 font-medium leading-relaxed">
            Talk directly to your AI companion. Rowan is ready to help you navigate setup and connections.
          </p>
        </div>
        <button
          onClick={openFloatingAssistant}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer self-center sm:self-auto border-0"
        >
          Ask Rowan
        </button>
      </div>
    </div>
  )
}
