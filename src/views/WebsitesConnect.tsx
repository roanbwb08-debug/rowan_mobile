import React, { useState, useEffect } from 'react'
import {
  Globe,
  Plus,
  Sparkles,
  ExternalLink,
  Check,
  Copy,
  Trash2,
  Settings as SettingsIcon,
  BookOpen,
  Play,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  X,
  Code2,
  CheckCircle2
} from 'lucide-react'

export interface WebsiteItem {
  id: string
  userId: string
  organizationId: string
  domain: string
  url: string
  name: string
  instructions: string
  personality: string
  welcomeMessage: string
  language: string
  categories: string[]
  thingsToKnow: string
  thingsNotToSay: string
  status: 'connected' | 'pending' | 'disconnected'
  verificationStatus: 'verified' | 'unverified' | 'failed'
  lastVerifiedAt?: string
  lastCrawledAt?: string
  pagesCrawled?: number
  createdAt: string
  updatedAt: string
}

export interface KnowledgeItem {
  id: string
  siteId: string
  title: string
  content: string
  snippet: string
  url?: string
  createdAt: string
}

export const WebsitesConnect: React.FC = () => {
  const [websites, setWebsites] = useState<WebsiteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Modals & Wizards
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1)
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newInstructions, setNewInstructions] = useState('')
  const [newPersonality, setNewPersonality] = useState('Warm & Professional')
  const [newWelcomeMessage, setNewWelcomeMessage] = useState("How can I help you today?")
  const [newLanguage, setNewLanguage] = useState('en')
  const [newCategory, setNewCategory] = useState('General')
  const [newThingsToKnow, setNewThingsToKnow] = useState('')
  const [newThingsNotToSay, setNewThingsNotToSay] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [createdWebsite, setCreatedWebsite] = useState<WebsiteItem | null>(null)

  // Configure Modal
  const [editWebsite, setEditWebsite] = useState<WebsiteItem | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Installation Modal
  const [installModalWebsite, setInstallModalWebsite] = useState<WebsiteItem | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [installGuideTab, setInstallGuideTab] = useState<'html' | 'wordpress' | 'shopify' | 'wix' | 'webflow'>('html')

  // Verification State
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verificationFeedback, setVerificationFeedback] = useState<{ siteId: string; success: boolean; message: string } | null>(null)

  // Knowledge Manager Modal
  const [knowledgeModalWebsite, setKnowledgeModalWebsite] = useState<WebsiteItem | null>(null)
  const [knowledgeList, setKnowledgeList] = useState<KnowledgeItem[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  const [crawlingId, setCrawlingId] = useState<string | null>(null)
  const [newKnowledgeTitle, setNewKnowledgeTitle] = useState('')
  const [newKnowledgeContent, setNewKnowledgeContent] = useState('')
  const [addingKnowledge, setAddingKnowledge] = useState(false)

  const loadWebsites = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true)
      const res = await fetch('/api/websites')
      const data = await res.json()
      if (data.success && Array.isArray(data.websites)) {
        setWebsites(data.websites)
      }
    } catch (err) {
      console.error('Failed to fetch websites:', err)
    } finally {
      setLoading(false)
      if (isManualRefresh) setRefreshing(false)
    }
  }

  useEffect(() => {
    let mounted = true
    fetch('/api/websites')
      .then(res => res.json())
      .then(data => {
        if (mounted && data.success && Array.isArray(data.websites)) {
          setWebsites(data.websites)
        }
      })
      .catch(err => console.error('Failed to fetch websites:', err))
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // 1. Add Website Wizard Handlers
  const handleOpenAddModal = () => {
    setAddStep(1)
    setNewUrl('')
    setNewName('')
    setNewInstructions('')
    setNewPersonality('Warm & Professional')
    setNewWelcomeMessage("How can I help you today?")
    setNewLanguage('en')
    setNewCategory('General')
    setNewThingsToKnow('')
    setNewThingsNotToSay('')
    setCreatedWebsite(null)
    setVerificationFeedback(null)
    setIsAddModalOpen(true)
  }

  const handleStep1Next = () => {
    if (!newUrl.trim()) return
    let cleaned = newUrl.trim()
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = 'https://' + cleaned
      setNewUrl(cleaned)
    }
    try {
      const parsed = new URL(cleaned)
      if (!newName.trim()) {
        const domain = parsed.hostname.toLowerCase().replace(/^www\./, '')
        const baseName = domain.split('.')[0] || 'My Website'
        const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1)
        setNewName(formatted)
      }
      setAddStep(2)
    } catch {
      alert('Please enter a valid website URL (e.g. https://example.com)')
    }
  }

  const handleCreateWebsiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingNew(true)
    try {
      const res = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          name: newName,
          instructions: newInstructions,
          personality: newPersonality,
          welcomeMessage: newWelcomeMessage,
          language: newLanguage,
          categories: [newCategory],
          thingsToKnow: newThingsToKnow,
          thingsNotToSay: newThingsNotToSay,
          crawlOnCreate: true
        })
      })
      const data = await res.json()
      if (data.success && data.website) {
        setCreatedWebsite(data.website)
        setWebsites(prev => [data.website, ...prev.filter(w => w.id !== data.website.id)])
        setAddStep(3)
      } else {
        alert(data.message || 'Failed to connect website.')
      }
    } catch (err) {
      console.error(err)
      alert('Error connecting website. Please check server connection.')
    } finally {
      setSavingNew(false)
    }
  }

  // 2. Configure / Edit Website
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWebsite) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/websites/${editWebsite.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editWebsite.name,
          instructions: editWebsite.instructions,
          personality: editWebsite.personality,
          welcomeMessage: editWebsite.welcomeMessage,
          language: editWebsite.language,
          categories: editWebsite.categories,
          thingsToKnow: editWebsite.thingsToKnow,
          thingsNotToSay: editWebsite.thingsNotToSay,
          status: editWebsite.status
        })
      })
      const data = await res.json()
      if (data.success && data.website) {
        setWebsites(prev => prev.map(w => w.id === data.website.id ? data.website : w))
        setEditWebsite(null)
      } else {
        alert(data.message || 'Failed to update website.')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to update website configuration.')
    } finally {
      setSavingEdit(false)
    }
  }

  // 3. Disconnect Website
  const handleDeleteWebsite = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${name}? This will remove Rowan widget access and all indexed knowledge for this website.`)) {
      return
    }
    try {
      const res = await fetch(`/api/websites/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setWebsites(prev => prev.filter(w => w.id !== id))
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // 4. Verify Installation
  const handleVerify = async (site: WebsiteItem) => {
    setVerifyingId(site.id)
    setVerificationFeedback(null)
    try {
      const res = await fetch(`/api/websites/${site.id}/verify`, { method: 'POST' })
      const data = await res.json()
      if (data.success && data.result) {
        setVerificationFeedback({
          siteId: site.id,
          success: data.result.verified,
          message: data.result.message
        })
        if (data.result.verified) {
          setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, verificationStatus: 'verified', status: 'connected', lastVerifiedAt: new Date().toISOString() } : w))
        } else {
          setWebsites(prev => prev.map(w => w.id === site.id ? { ...w, verificationStatus: 'failed', lastVerifiedAt: new Date().toISOString() } : w))
        }
      } else {
        setVerificationFeedback({
          siteId: site.id,
          success: false,
          message: data.message || 'Verification failed.'
        })
      }
    } catch (err) {
      console.error('Verify error:', err)
      setVerificationFeedback({
        siteId: site.id,
        success: false,
        message: 'Could not connect to verify. Check network status.'
      })
    } finally {
      setVerifyingId(null)
    }
  }

  // 5. Knowledge Management
  const handleOpenKnowledgeModal = async (site: WebsiteItem) => {
    setKnowledgeModalWebsite(site)
    setKnowledgeList([])
    setLoadingKnowledge(true)
    try {
      const res = await fetch(`/api/websites/${site.id}/knowledge`)
      const data = await res.json()
      if (data.success && Array.isArray(data.knowledge)) {
        setKnowledgeList(data.knowledge)
      }
    } catch (err) {
      console.error('Fetch knowledge error:', err)
    } finally {
      setLoadingKnowledge(false)
    }
  }

  const handleCrawlWebsite = async (siteId: string) => {
    setCrawlingId(siteId)
    try {
      const res = await fetch(`/api/websites/${siteId}/crawl`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(data.result?.message || 'Crawl completed!')
        // Refresh knowledge list if modal open
        if (knowledgeModalWebsite && knowledgeModalWebsite.id === siteId) {
          const kRes = await fetch(`/api/websites/${siteId}/knowledge`)
          const kData = await kRes.json()
          if (kData.success) setKnowledgeList(kData.knowledge)
        }
        loadWebsites()
      } else {
        alert(data.message || 'Crawl failed.')
      }
    } catch (err) {
      console.error(err)
      alert('Error triggering crawl.')
    } finally {
      setCrawlingId(null)
    }
  }

  const handleAddKnowledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!knowledgeModalWebsite || !newKnowledgeTitle.trim() || !newKnowledgeContent.trim()) return
    setAddingKnowledge(true)
    try {
      const res = await fetch(`/api/websites/${knowledgeModalWebsite.id}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newKnowledgeTitle,
          content: newKnowledgeContent
        })
      })
      const data = await res.json()
      if (data.success && data.item) {
        setKnowledgeList(prev => [data.item, ...prev])
        setNewKnowledgeTitle('')
        setNewKnowledgeContent('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAddingKnowledge(false)
    }
  }

  const handleDeleteKnowledgeItem = async (kId: string) => {
    if (!knowledgeModalWebsite) return
    try {
      const res = await fetch(`/api/websites/${knowledgeModalWebsite.id}/knowledge/${kId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setKnowledgeList(prev => prev.filter(k => k.id !== kId))
      }
    } catch (err) {
      console.error(err)
    }
  }
  const getWidgetCode = (siteId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rowan.ai'
    return `<!-- Rowan AI Assistant Widget -->\n<script\n  src="${origin}/widget.js"\n  data-rowan-site="${siteId}"\n  async>\n</script>`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2 text-zinc-800">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
              Live Multi-Tenant Widget
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 my-0">
            Connect Rowan to your website
          </h1>
          <p className="text-sm text-zinc-500 max-w-2xl mt-1.5 leading-relaxed my-0">
            Give your website an AI assistant that understands your content, honors your instructions, and helps your visitors 24/7.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadWebsites(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Refresh websites"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm cursor-pointer hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Website</span>
          </button>
        </div>
      </div>

      {/* 2. Content Body: Loading, Empty, or Website Cards */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-xs font-semibold text-zinc-500">Loading your connected websites...</p>
        </div>
      ) : websites.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
            <Globe className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-zinc-950">No websites connected yet</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              Connect your first website to generate a personalized Rowan assistant widget. Rowan will crawl your public pages, index your knowledge, and assist your visitors in real time.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all shadow-md cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Your First Website</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-zinc-100 text-left">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-150">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide block">1. Connect</span>
              <p className="text-[11px] text-zinc-600 mt-0.5">Enter URL and teach Rowan your policies & tone.</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-150">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide block">2. Ingest</span>
              <p className="text-[11px] text-zinc-600 mt-0.5">Rowan crawls & indexes pages into structured chunks.</p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-150">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide block">3. Embed</span>
              <p className="text-[11px] text-zinc-600 mt-0.5">Paste 1-line script tag and verify instantly.</p>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Websites Grid */
        <div className="grid grid-cols-1 gap-6">
          {websites.map(site => (
            <div
              key={site.id}
              className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 shadow-sm transition-all space-y-5"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-700">
                    <Globe className="w-5 h-5 text-sky-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-bold text-zinc-950 my-0">{site.name}</h3>
                      
                      {/* Status Badges */}
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        site.status === 'connected'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${site.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {site.status === 'connected' ? 'Active' : 'Paused'}
                      </span>

                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        site.verificationStatus === 'verified'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : site.verificationStatus === 'failed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}>
                        {site.verificationStatus === 'verified' && <Check className="w-3 h-3 text-sky-600" />}
                        {site.verificationStatus === 'failed' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                        <span>
                          {site.verificationStatus === 'verified' ? 'Installation Verified' : site.verificationStatus === 'failed' ? 'Not Detected' : 'Pending Verification'}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-zinc-500">
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>{site.domain}</span>
                        <ExternalLink className="w-3 h-3 text-blue-400" />
                      </a>
                      <span className="text-zinc-300">•</span>
                      <span className="font-mono text-[11px] text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-150">
                        {site.id}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span>Connected {new Date(site.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Quick Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setInstallModalWebsite(site)}
                    className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold rounded-lg border border-zinc-200 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Installation</span>
                  </button>
                </div>
              </div>

              {/* Card Meta & Knowledge Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instructions & Personality Summary */}
                <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-150 space-y-1 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                      Rowan Instructions & Personality
                    </span>
                    <span className="text-[11px] font-semibold text-blue-600">
                      {site.personality || 'Warm & Professional'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 line-clamp-2 leading-relaxed my-0">
                    {site.instructions ? site.instructions : <span className="text-zinc-450 italic">Default general assistant behavior (No custom instructions specified).</span>}
                  </p>
                </div>

                {/* Knowledge Base Telemetry */}
                <div className="p-3.5 bg-zinc-50/80 rounded-xl border border-zinc-150 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-450">
                      Website Knowledge
                    </span>
                    <span className="text-[11px] font-bold text-zinc-700">
                      {site.pagesCrawled ?? 0} Pages Indexed
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-zinc-500">
                      {site.lastCrawledAt ? `Crawled ${new Date(site.lastCrawledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not crawled yet'}
                    </span>
                    <button
                      onClick={() => handleOpenKnowledgeModal(site)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Manage</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Feedback Banner if active for this site */}
              {verificationFeedback && verificationFeedback.siteId === site.id && (
                <div className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
                  verificationFeedback.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  {verificationFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold my-0">{verificationFeedback.message}</p>
                  </div>
                  <button
                    onClick={() => setVerificationFeedback(null)}
                    className="text-zinc-400 hover:text-zinc-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Bottom Action Toolbar */}
              <div className="flex items-center justify-between pt-2 text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditWebsite(site)}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold rounded-lg border border-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Configure</span>
                  </button>

                  <button
                    onClick={() => handleOpenKnowledgeModal(site)}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold rounded-lg border border-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Knowledge Base</span>
                  </button>

                  <button
                    onClick={() => handleVerify(site)}
                    disabled={verifyingId === site.id}
                    className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 font-semibold rounded-lg border border-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    {verifyingId === site.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span>Verify Installation</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Site</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleDeleteWebsite(site.id, site.name)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Disconnect website"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD WEBSITE MULTI-STEP WIZARD                                    */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 my-0">
                    {addStep === 1 && "Step 1: What's your website?"}
                    {addStep === 2 && 'Step 2: Teach Rowan how to help on this website'}
                    {addStep === 3 && 'Step 3: Install Rowan widget'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 my-0">
                    {addStep === 1 && 'Enter your website URL to register a unique connection.'}
                    {addStep === 2 && 'Provide instructions, personality, and operational boundaries.'}
                    {addStep === 3 && 'Copy your embed script and verify the connection.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="px-6 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${addStep >= 1 ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>1</span>
                <span className={`text-[11px] font-bold ${addStep === 1 ? 'text-blue-600' : 'text-zinc-500'}`}>Website URL</span>
              </div>
              <div className="h-px bg-zinc-200 flex-1 mx-3" />
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${addStep >= 2 ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>2</span>
                <span className={`text-[11px] font-bold ${addStep === 2 ? 'text-blue-600' : 'text-zinc-500'}`}>Configuration</span>
              </div>
              <div className="h-px bg-zinc-200 flex-1 mx-3" />
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${addStep >= 3 ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>3</span>
                <span className={`text-[11px] font-bold ${addStep === 3 ? 'text-blue-600' : 'text-zinc-500'}`}>Install & Verify</span>
              </div>
            </div>

            {/* STEP 1: URL INPUT */}
            {addStep === 1 && (
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Website URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStep1Next()}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-medium outline-none transition-all"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Enter the domain where you will install the Rowan widget.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Website Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corporation, Northstar Store"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-medium outline-none transition-all"
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    onClick={handleStep1Next}
                    disabled={!newUrl.trim()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <span>Configure Rowan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: TEACH ROWAN CONFIGURATION */}
            {addStep === 2 && (
              <form onSubmit={handleCreateWebsiteSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    What should Rowan do on this website?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Help visitors understand our services, answer customer questions, recommend our products, and help visitors find what they are looking for."
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                  />
                  <p className="text-[10px] text-zinc-450">
                    Leave empty to use Rowan&apos;s default versatile assistant behavior without forced sales persona.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                      Personality & Tone
                    </label>
                    <select
                      value={newPersonality}
                      onChange={(e) => setNewPersonality(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                    >
                      <option value="Warm & Professional">Warm & Professional</option>
                      <option value="Technical & Precise">Technical & Precise</option>
                      <option value="Casual & Friendly">Casual & Friendly</option>
                      <option value="Executive & Formal">Executive & Formal</option>
                      <option value="Enthusiastic & Modern">Enthusiastic & Modern</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                      Industry / Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                    >
                      <option value="SaaS & Software">SaaS & Software</option>
                      <option value="E-commerce & Retail">E-commerce & Retail</option>
                      <option value="Professional Services">Professional Services</option>
                      <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                      <option value="Education & Non-profit">Education & Non-profit</option>
                      <option value="General">General Business</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Welcome Message
                  </label>
                  <input
                    type="text"
                    value={newWelcomeMessage}
                    onChange={(e) => setNewWelcomeMessage(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Things Rowan Should Know (Key Facts, Policies, Hours, Pricing)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="We offer 24/7 emergency support. Free returns within 30 days. Located in Austin, TX."
                    value={newThingsToKnow}
                    onChange={(e) => setNewThingsToKnow(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                    Strict Boundaries & Things NOT to Say
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Do not offer unauthorized discounts. Do not discuss competitors. Escalate custom enterprise contracts to sales@domain.com."
                    value={newThingsNotToSay}
                    onChange={(e) => setNewThingsNotToSay(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-zinc-150">
                  <button
                    type="button"
                    onClick={() => setAddStep(1)}
                    className="px-4 py-2 text-zinc-600 hover:text-zinc-900 text-xs font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingNew}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {savingNew ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>Generate Website Connection</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: INSTALL & VERIFY */}
            {addStep === 3 && createdWebsite && (
              <div className="p-6 space-y-5">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold my-0">Website Connection Created!</p>
                    <p className="text-[11px] text-emerald-700 my-0 mt-0.5">
                      Unique Connection ID: <span className="font-mono font-bold">{createdWebsite.id}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                      Copy & Paste Embed Snippet
                    </label>
                    <button
                      onClick={() => copyToClipboard(getWidgetCode(createdWebsite.id))}
                      className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <pre className="bg-slate-950 text-sky-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 selection:bg-sky-900">
                    {getWidgetCode(createdWebsite.id)}
                  </pre>
                  <p className="text-[11px] text-zinc-500">
                    Place this script in your website&apos;s <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700 font-mono">&lt;head&gt;</code> or before the closing <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700 font-mono">&lt;/body&gt;</code> tag.
                  </p>
                </div>

                {/* Verification Action */}
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 block">Verify Installation</span>
                      <p className="text-[11px] text-zinc-500 my-0">
                        Check if Rowan widget is live on {createdWebsite.domain}
                      </p>
                    </div>
                    <button
                      onClick={() => handleVerify(createdWebsite)}
                      disabled={verifyingId === createdWebsite.id}
                      className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold rounded-lg border border-zinc-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      {verifyingId === createdWebsite.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>Check Connection</span>
                    </button>
                  </div>

                  {verificationFeedback && verificationFeedback.siteId === createdWebsite.id && (
                    <div className={`p-3 rounded-lg text-xs ${
                      verificationFeedback.success ? 'bg-emerald-100/60 text-emerald-800' : 'bg-rose-100/60 text-rose-800'
                    }`}>
                      {verificationFeedback.message}
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-zinc-150">
                  <button
                    onClick={() => handleOpenTestModal(createdWebsite)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                    <span>Test Rowan Simulator</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAddModalOpen(false)
                      loadWebsites()
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm"
                  >
                    <span>Done / Go to Dashboard</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIGURE / EDIT WEBSITE                                         */}
      {/* ========================================================================= */}
      {editWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 my-0">Configure Rowan for {editWebsite.name}</h3>
                  <p className="text-[11px] text-zinc-500 my-0">{editWebsite.domain}</p>
                </div>
              </div>
              <button
                onClick={() => setEditWebsite(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">Website Name</label>
                  <input
                    type="text"
                    value={editWebsite.name}
                    onChange={(e) => setEditWebsite({ ...editWebsite, name: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">Assistant Status</label>
                  <select
                    value={editWebsite.status}
                    onChange={(e) => setEditWebsite({ ...editWebsite, status: e.target.value as 'connected' | 'disconnected' })}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                  >
                    <option value="connected">Active (Accepting Visitor Chats)</option>
                    <option value="disconnected">Paused (Temporarily Muted)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                  What should Rowan do on this website?
                </label>
                <textarea
                  rows={3}
                  value={editWebsite.instructions || ''}
                  onChange={(e) => setEditWebsite({ ...editWebsite, instructions: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">Personality & Tone</label>
                  <select
                    value={editWebsite.personality || 'Warm & Professional'}
                    onChange={(e) => setEditWebsite({ ...editWebsite, personality: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                  >
                    <option value="Warm & Professional">Warm & Professional</option>
                    <option value="Technical & Precise">Technical & Precise</option>
                    <option value="Casual & Friendly">Casual & Friendly</option>
                    <option value="Executive & Formal">Executive & Formal</option>
                    <option value="Enthusiastic & Modern">Enthusiastic & Modern</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">Welcome Message</label>
                  <input
                    type="text"
                    value={editWebsite.welcomeMessage || ''}
                    onChange={(e) => setEditWebsite({ ...editWebsite, welcomeMessage: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                  Things Rowan Should Know (Key Facts, Policies, Hours, Pricing)
                </label>
                <textarea
                  rows={2}
                  value={editWebsite.thingsToKnow || ''}
                  onChange={(e) => setEditWebsite({ ...editWebsite, thingsToKnow: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                  Strict Boundaries & Things NOT to Say
                </label>
                <textarea
                  rows={2}
                  value={editWebsite.thingsNotToSay || ''}
                  onChange={(e) => setEditWebsite({ ...editWebsite, thingsNotToSay: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-xl p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setEditWebsite(null)}
                  className="px-4 py-2 text-zinc-600 hover:text-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INSTALLATION & CMS GUIDES                                       */}
      {/* ========================================================================= */}
      {installModalWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-900 text-white">
                  <Code2 className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 my-0">Install Rowan on {installModalWebsite.name}</h3>
                  <p className="text-[11px] text-zinc-500 my-0">Site ID: <span className="font-mono">{installModalWebsite.id}</span></p>
                </div>
              </div>
              <button
                onClick={() => setInstallModalWebsite(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Embed snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                    JavaScript Embed Snippet
                  </span>
                  <button
                    onClick={() => copyToClipboard(getWidgetCode(installModalWebsite.id))}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-blue-200"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                    <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                  </button>
                </div>

                <pre className="bg-slate-950 text-sky-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {getWidgetCode(installModalWebsite.id)}
                </pre>
              </div>

              {/* CMS Tab Guides */}
              <div className="space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600 block">
                  Installation Guides by Platform
                </span>

                <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 pb-2">
                  {(['html', 'wordpress', 'shopify', 'wix', 'webflow'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setInstallGuideTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        installGuideTab === tab
                          ? 'bg-slate-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {tab === 'html' && 'Custom HTML'}
                      {tab === 'wordpress' && 'WordPress'}
                      {tab === 'shopify' && 'Shopify'}
                      {tab === 'wix' && 'Wix'}
                      {tab === 'webflow' && 'Webflow'}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-150 text-xs text-zinc-700 leading-relaxed space-y-2">
                  {installGuideTab === 'html' && (
                    <>
                      <p className="font-bold text-zinc-900 my-0">Custom HTML / Next.js / React Sites:</p>
                      <p className="my-0">Paste the snippet right before the closing <code className="bg-zinc-200 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag in your <code className="bg-zinc-200 px-1 py-0.5 rounded">index.html</code> or layout component.</p>
                    </>
                  )}
                  {installGuideTab === 'wordpress' && (
                    <>
                      <p className="font-bold text-zinc-900 my-0">WordPress:</p>
                      <ol className="list-decimal pl-4 space-y-1 my-0">
                        <li>Install the free <strong>WPCode (Insert Headers and Footers)</strong> plugin.</li>
                        <li>Navigate to <strong>Code Snippets &rarr; Header & Footer</strong>.</li>
                        <li>Paste the Rowan embed code into the <strong>Footer</strong> box and click <strong>Save Changes</strong>.</li>
                      </ol>
                    </>
                  )}
                  {installGuideTab === 'shopify' && (
                    <>
                      <p className="font-bold text-zinc-900 my-0">Shopify:</p>
                      <ol className="list-decimal pl-4 space-y-1 my-0">
                        <li>Go to <strong>Online Store &rarr; Themes &rarr; Edit code</strong>.</li>
                        <li>Open <code className="bg-zinc-200 px-1 py-0.5 rounded">theme.liquid</code>.</li>
                        <li>Paste the embed snippet just before <code className="bg-zinc-200 px-1 py-0.5 rounded">&lt;/body&gt;</code> and click <strong>Save</strong>.</li>
                      </ol>
                    </>
                  )}
                  {installGuideTab === 'wix' && (
                    <>
                      <p className="font-bold text-zinc-900 my-0">Wix:</p>
                      <ol className="list-decimal pl-4 space-y-1 my-0">
                        <li>Go to <strong>Settings &rarr; Custom Code</strong> in your Wix dashboard.</li>
                        <li>Click <strong>+ Add Custom Code</strong>, paste the snippet, select <strong>Load code on each new page</strong>, and place it in <strong>Body - end</strong>.</li>
                      </ol>
                    </>
                  )}
                  {installGuideTab === 'webflow' && (
                    <>
                      <p className="font-bold text-zinc-900 my-0">Webflow:</p>
                      <ol className="list-decimal pl-4 space-y-1 my-0">
                        <li>Go to <strong>Project Settings &rarr; Custom Code</strong>.</li>
                        <li>Paste the snippet into <strong>Footer Code</strong> and click <strong>Publish</strong>.</li>
                      </ol>
                    </>
                  )}
                </div>
              </div>

              {/* Verify installation button */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Check Live Installation</span>
                  <span className="text-[11px] text-zinc-500">Rowan will scan {installModalWebsite.url}</span>
                </div>
                <button
                  onClick={() => handleVerify(installModalWebsite)}
                  disabled={verifyingId === installModalWebsite.id}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {verifyingId === installModalWebsite.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                  )}
                  <span>Verify Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KNOWLEDGE BASE MANAGER                                          */}
      {/* ========================================================================= */}
      {knowledgeModalWebsite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-zinc-150 flex items-center justify-between bg-zinc-50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 my-0">Knowledge Base • {knowledgeModalWebsite.name}</h3>
                  <p className="text-[11px] text-zinc-500 my-0">Manage crawled content and custom knowledge documents for Rowan.</p>
                </div>
              </div>
              <button
                onClick={() => setKnowledgeModalWebsite(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Crawler Trigger Bar */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">Automatic Website Crawler</span>
                  <p className="text-[11px] text-zinc-500 my-0">
                    Crawl public pages on <span className="font-semibold text-zinc-700">{knowledgeModalWebsite.domain}</span> to update Rowan&apos;s index.
                  </p>
                </div>
                <button
                  onClick={() => handleCrawlWebsite(knowledgeModalWebsite.id)}
                  disabled={crawlingId === knowledgeModalWebsite.id}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 flex-shrink-0 shadow-sm cursor-pointer"
                >
                  {crawlingId === knowledgeModalWebsite.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{crawlingId === knowledgeModalWebsite.id ? 'Crawling Website...' : 'Crawl Website Now'}</span>
                </button>
              </div>

              {/* Add Custom Knowledge */}
              <form onSubmit={handleAddKnowledgeSubmit} className="p-4 bg-white rounded-xl border border-zinc-200 space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-zinc-900 block">Add Custom Knowledge Snippet</span>
                <input
                  type="text"
                  required
                  placeholder="Document Title (e.g. Return Policy, Pricing FAQs, Office Hours)"
                  value={newKnowledgeTitle}
                  onChange={(e) => setNewKnowledgeTitle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-zinc-900 outline-none"
                />
                <textarea
                  required
                  rows={3}
                  placeholder="Paste text, policies, service descriptions, or FAQs..."
                  value={newKnowledgeContent}
                  onChange={(e) => setNewKnowledgeContent(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 rounded-lg p-3 text-xs text-zinc-900 outline-none leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingKnowledge || !newKnowledgeTitle.trim() || !newKnowledgeContent.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-200 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {addingKnowledge && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>+ Add to Knowledge Base</span>
                  </button>
                </div>
              </form>

              {/* Knowledge Chunks List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-600">
                    Indexed Knowledge Documents ({knowledgeList.length})
                  </span>
                </div>

                {loadingKnowledge ? (
                  <div className="py-10 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-xs text-zinc-500">Loading knowledge chunks...</span>
                  </div>
                ) : knowledgeList.length === 0 ? (
                  <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-150 text-xs text-zinc-500">
                    No knowledge documents indexed yet. Click &quot;Crawl Website Now&quot; or add custom knowledge snippets above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {knowledgeList.map(item => (
                      <div
                        key={item.id}
                        className="p-3.5 bg-zinc-50 hover:bg-zinc-100/70 rounded-xl border border-zinc-200 flex items-start justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-900">{item.title}</span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                              >
                                <span>link</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed my-0 line-clamp-3">
                            {item.content}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteKnowledgeItem(item.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0 cursor-pointer"
                          title="Delete knowledge item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
