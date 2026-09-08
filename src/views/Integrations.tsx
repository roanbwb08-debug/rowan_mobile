import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Mail, 
  MessageSquare, 
  Calendar, 
  FileText, 
  CreditCard, 
  Database, 
  Code, 
  TrendingUp, 
  Loader2,
  Sparkles
} from 'lucide-react'

interface IntegrationItem {
  id: string
  name: string
  desc: string
  category: 'Communication' | 'Productivity' | 'Business' | 'Storage' | 'Development' | 'Trading'
  status: 'Connected' | 'Not Connected' | 'Coming Soon'
  icon: React.ReactNode
}

export const Integrations: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'email',
      name: 'Email Hub',
      desc: 'Link Gmail or Outlook so Rowan can analyze and reply to important message threads.',
      category: 'Communication',
      status: 'Connected',
      icon: <Mail className="w-5 h-5" />
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      desc: 'Let Rowan orchestrate responsive SMS alerts and customer chats on WhatsApp.',
      category: 'Communication',
      status: 'Not Connected',
      icon: <MessageSquare className="w-5 h-5" />
    },
    {
      id: 'calendar',
      name: 'Google Calendar',
      desc: 'Sync team calendars to let Rowan auto-schedule sales appointments and follow-ups.',
      category: 'Productivity',
      status: 'Connected',
      icon: <Calendar className="w-5 h-5" />
    },
    {
      id: 'documents',
      name: 'Google Docs',
      desc: 'Sync documentation or guides to feed Rowan\'s deep knowledge core instantly.',
      category: 'Productivity',
      status: 'Not Connected',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'stripe',
      name: 'Stripe Payments',
      desc: 'Analyze payments history or generate custom invoices using secure Stripe APIs.',
      category: 'Business',
      status: 'Coming Soon',
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      id: 'drive',
      name: 'Google Drive',
      desc: 'Import files, spreadsheets, or folders to give Rowan complete catalog context.',
      category: 'Storage',
      status: 'Not Connected',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'github',
      name: 'GitHub Repository',
      desc: 'Let Rowan scan repositories or track deployment triggers and project milestones.',
      category: 'Development',
      status: 'Coming Soon',
      icon: <Code className="w-5 h-5" />
    },
    {
      id: 'trading',
      name: 'Market Data Feeds',
      desc: 'Synchronize live trading context to keep Rowan informed of catalog pricing and trends.',
      category: 'Trading',
      status: 'Connected',
      icon: <TrendingUp className="w-5 h-5" />
    }
  ])

  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    const fetchCloudIntegrations = async () => {
      try {
        const res = await fetch('/api/tenant/integrations')
        const data = await res.json()
        if (data.success && data.integrations) {
          setIntegrations(prev =>
            prev.map(item => {
              const cloudInt = data.integrations.find((c: { provider: string }) => c.provider === item.id)
              return cloudInt ? { ...item, status: cloudInt.enabled ? 'Connected' : 'Not Connected' } : item
            })
          )
        }
      } catch (err) {
        console.warn('Utilizing sandbox states for Integrations.', err)
      }
    }
    fetchCloudIntegrations()
  }, [])

  const handleToggle = async (id: string, currentStatus: string) => {
    if (currentStatus === 'Coming Soon') return
    setToggling(id)
    try {
      await fetch('/api/tenant/integrations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id })
      })

      setIntegrations(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, status: item.status === 'Connected' ? 'Not Connected' : 'Connected' }
            : item
        )
      )
    } catch (err) {
      console.error(err)
      // Fallback toggler
      setIntegrations(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, status: item.status === 'Connected' ? 'Not Connected' : 'Connected' }
            : item
        )
      )
    } finally {
      setToggling(null)
    }
  }

  const categories = ['Communication', 'Productivity', 'Business', 'Storage', 'Development', 'Trading'] as const

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-4 text-zinc-850">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>Companion Ecosystem</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 my-0">
            Connect Rowan to the tools you use.
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed my-0 font-medium">
            Link and authorize third-party services to give Rowan secure contextual access to calendar schedules, document databases, or messaging alerts.
          </p>
        </div>
      </div>

      {/* Categorized Integrations Lists */}
      <div className="space-y-10">
        {categories.map((cat) => {
          const items = integrations.filter((item) => item.category === cat)
          if (items.length === 0) return null

          return (
            <div key={cat} className="space-y-4">
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-zinc-400 my-0">
                {cat}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-xs transition-all flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-2.5 rounded-xl border ${
                          item.status === 'Connected'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-zinc-50 text-zinc-400 border-zinc-200'
                        }`}>
                          {item.icon}
                        </div>
                        
                        {item.status === 'Connected' && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Connected
                          </span>
                        )}
                        {item.status === 'Not Connected' && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-zinc-50 text-zinc-500 border border-zinc-200">
                            Available
                          </span>
                        )}
                        {item.status === 'Coming Soon' && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-blue-50/40 text-blue-500 border border-blue-100/40">
                            Coming Soon
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-zinc-950 my-0">
                          {item.name}
                        </h3>
                        <p className="text-xs text-zinc-500 leading-relaxed my-0 font-medium">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(item.id, item.status)}
                      disabled={toggling === item.id || item.status === 'Coming Soon'}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border-0 ${
                        item.status === 'Connected'
                          ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                          : item.status === 'Not Connected'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-zinc-50 text-zinc-400 border border-transparent cursor-not-allowed opacity-60'
                      }`}
                    >
                      {toggling === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-650" />
                      ) : item.status === 'Connected' ? (
                        <span>Disconnect</span>
                      ) : item.status === 'Not Connected' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>Connect</span>
                        </>
                      ) : (
                        <span>Locked</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
