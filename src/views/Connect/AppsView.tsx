import React, { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  Lock,
  Plus
} from 'lucide-react'
import { SUPPORTED_APPS } from '../../data/apps'
import type { RowanApp } from '../../data/apps'
import type { RowanConnection } from '../../lib/supabase'

interface AppsViewProps {
  connections: RowanConnection[]
  onConnect: (app: RowanApp) => void
  onManage: (connection: RowanConnection) => void
  apps?: RowanApp[]
}

const CATEGORIES = [
  'All',
  'Productivity',
  'Development',
  'Business',
  'Communication',
  'Storage',
  'Marketing',
  'Finance',
  'Shopping',
  'Media',
  'Automation',
  'Other'
]

export const AppsView: React.FC<AppsViewProps> = ({ connections, onConnect, onManage, apps }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filteredApps = useMemo(() => {
    const list = apps || SUPPORTED_APPS
    return list.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           app.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = activeCategory === 'All' || app.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, activeCategory, apps])

  const getAppConnection = (appId: string) => {
    return connections.find(c => c.type === 'app' && c.metadata?.service === appId)
  }

  return (
    <div className="space-y-8">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search apps and services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {CATEGORIES.slice(0, 6).map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category 
                  ? 'bg-zinc-900 text-white shadow-md' 
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map(app => {
          const connection = getAppConnection(app.id)
          const isConnected = !!connection
          const isComingSoon = app.status === 'coming_soon'

          return (
            <motion.div
              layout
              key={app.id}
              className={`group bg-white border rounded-3xl p-6 transition-all relative overflow-hidden ${
                isComingSoon ? 'border-zinc-100 opacity-80' : 'border-zinc-200 hover:border-zinc-400 hover:shadow-xl'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-600 group-hover:bg-zinc-100'}`}>
                  {app.icon}
                </div>
                {isConnected ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Connected
                  </div>
                ) : isComingSoon ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-50 text-zinc-500 rounded-full text-xs font-semibold">
                    <Clock className="w-3 h-3" />
                    Coming Soon
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900">{app.name}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                  {app.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                  {app.category}
                </span>
                
                {isConnected ? (
                  <button 
                    onClick={() => onManage(connection)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-900 rounded-xl text-sm font-semibold hover:bg-zinc-100 transition-colors"
                  >
                    Manage
                  </button>
                ) : isComingSoon ? (
                  <button 
                    disabled
                    className="px-4 py-2 bg-transparent text-zinc-300 rounded-xl text-sm font-semibold cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                ) : (
                  <button 
                    onClick={() => onConnect(app)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    Connect
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}

        {filteredApps.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-zinc-300" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">No integrations found</h3>
            <p className="text-zinc-500 max-w-sm mb-8">
              "This integration isn't available yet."
            </p>
            <button className="px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:shadow-lg transition-all">
              Request Integration
            </button>
          </div>
        )}
      </div>

      {/* Security Footer */}
      <div className="pt-12 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900">Enterprise-Grade Security</h4>
            <p className="text-xs text-zinc-500">Rowan uses official OAuth2 flows and scoped permissions. We never store your login credentials.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-zinc-500">All systems operational</span>
        </div>
      </div>
    </div>
  )
}
