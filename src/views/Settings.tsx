import React, { useState, useEffect, useRef } from 'react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import {
  Check,
  Sparkles,
  Loader2,
  Compass,
  Send,
  Fingerprint,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldCheck
} from 'lucide-react'
import { rowanAuth } from '../lib/supabase'
import {
  INTERRUPTION_WORDS_100,
  INTERRUPTION_SENTENCES_100
} from '../lib/interruptionVocabulary'

export const Settings: React.FC = () => {
  // Config state
  const [brandName, setBrandName] = useState('Rowan')
  const [customPrompt, setCustomPrompt] = useState(
    'You are Rowan, a highly knowledgeable and supportive operations companion. You help merchant owners coordinate catalogs, answer retail user inquiries, and guide automated trades with safe boundaries.'
  )
  const [tone, setTone] = useState('Warm & Friendly')
  const [commStyle, setCommStyle] = useState('concise')
  const [greeting, setGreeting] = useState('Hello! I am Rowan. How can I assist you with your operations today?')
  const [modelType, setModelType] = useState('gemini-flash-latest')
  const [rateLimit, setRateLimit] = useState(40)
  const [interruptionWord, setInterruptionWord] = useState(() => {
    try {
      return localStorage.getItem('rowan_interruption_word') || 'stop'
    } catch {
      return 'stop'
    }
  })
  const [preferredVoice, setPreferredVoice] = useState(() => {
    try {
      return localStorage.getItem('rowan_preferred_voice_id') || 'nova'
    } catch {
      return 'nova'
    }
  })
  
  // Interruption whitelist viewer states
  const [showInterruptionWhitelist, setShowInterruptionWhitelist] = useState(false)
  const [whitelistTab, setWhitelistTab] = useState<'words' | 'sentences'>('words')
  const [whitelistSearch, setWhitelistSearch] = useState('')

  // Simulated preference settings
  const [language, setLanguage] = useState('en-US')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const privacyMode = 'Strict (Zero-Retention)'
  
  // Capabilities states
  const [catalogSearchEnabled, setCatalogSearchEnabled] = useState(true)
  const [smsTriggersEnabled, setSmsTriggersEnabled] = useState(true)
  const [tradingEnabled, setTradingEnabled] = useState(false)

  // Status/Lifecycle states
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeVersion, setActiveVersion] = useState(1)
  const [loading, setLoading] = useState(true)

  // Interactive Live Chat preview states
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hi! I am Rowan. Feel free to adjust my configurations on the left, save them, and send me a message to preview how I respond!' }
  ])
  const previewChatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/tenant/settings')
        const data = await res.json()
        if (isMounted && data.success && data.settings) {
          const s = data.settings
          setBrandName(s.brandName || 'Rowan')
          setCustomPrompt(s.persona || '')
          setTone(s.tone || 'Warm & Friendly')
          setCommStyle(s.communicationStyle || 'concise')
          setGreeting(s.greeting || 'Hello! I am Rowan. How can I assist you with your operations today?')
          setModelType(s.voice || 'gemini-flash-latest')
          setRateLimit(s.rateLimit || 40)
          setActiveVersion(s.activeVersion || 1)
        }
      } catch (err) {
        console.error('Failed to load cloud assistant settings:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchSettings()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (previewChatEndRef.current) {
      previewChatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        brandName,
        persona: customPrompt,
        tone,
        communicationStyle: commStyle,
        greeting,
        voice: modelType,
        rateLimit,
        theme: 'light'
      }

      const res = await fetch('/api/tenant/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        setSaved(true)
        if (data.version) {
          setActiveVersion(data.version)
        }
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (err) {
      console.error('Failed to submit assistant settings to database:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSendPreviewMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userText = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userText }])
    setChatLoading(true)

    try {
      const token = await rowanAuth.getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userText,
          sessionId: 'settings-playground-preview'
        })
      })

      const data = await res.json()
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', text: data.message }])
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', text: data.message || 'Rowan failed to respond. Verify that API keys are set.' }])
      }
    } catch (err) {
      console.error(err)
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Network connection error. Ensure the server is online.' }])
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-zinc-500 font-extrabold tracking-wider uppercase">Loading settings database...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-zinc-800" id="settings-view-root">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-150 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-600">
              SETTINGS & ROWAN PERSONALITY
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 my-0">
            Personality Control Center
          </h1>
          <p className="text-sm text-zinc-500 mt-1 my-0">
            Define who Rowan is, write system prompt directives, adjust conversational tone parameters, and live-test Rowan’s behaviors.
          </p>
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Fingerprint className="w-3.5 h-3.5" /> Config Version v{activeVersion}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings (7 cols) */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Character & System Directives */}
          <Card title="Character & System Directives" id="settings-card-directives">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Character Name</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Rowan"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">System Instruction Directives</label>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase">Injected into LLM system space</span>
                </div>
                <textarea
                  rows={5}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Tell Rowan how you want it to behave, specify limits, brand standards, or specific logic to follow."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-mono leading-relaxed"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Conversational Settings */}
          <Card title="Conversational Settings" id="settings-card-conversation">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Tone Profile</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-700 font-bold cursor-pointer"
                >
                  <option value="Warm & Friendly">Warm & Friendly</option>
                  <option value="Professional & Analytical">Professional & Analytical</option>
                  <option value="Snappy & Energetic">Snappy & Energetic</option>
                  <option value="Ultra-concise & Direct">Ultra-concise & Direct</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-455 uppercase tracking-wider block">Response Length & Style</label>
                <select
                  value={commStyle}
                  onChange={(e) => setCommStyle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-700 font-bold cursor-pointer"
                >
                  <option value="concise">Concise (Under 3 sentences)</option>
                  <option value="detailed">Detailed (Exploratory / descriptive)</option>
                  <option value="technical">Technical Specs Oriented</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Default Introductory Greeting</label>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Greeting when chat session starts"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Preferred AI Voice & Gender</label>
                <select
                  value={preferredVoice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPreferredVoice(val);
                    try {
                      localStorage.setItem('rowan_preferred_voice_id', val);
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-700 font-bold cursor-pointer"
                >
                  <option value="nova">Woman - Nova (Recommended: Energetic & Warm)</option>
                  <option value="shimmer">Woman - Shimmer (Recommended: Soft & Empathetic)</option>
                  <option value="alloy">Neutral - Alloy (Default)</option>
                  <option value="fable">Neutral - Fable (Narrative & Balanced)</option>
                  <option value="onyx">Man - Onyx (Deep & Professional)</option>
                  <option value="echo">Man - Echo (Crisp & Conversational)</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-normal my-0 font-medium">
                  Select Rowan's primary vocal tone and gender for both Chat mode read-aloud and Live Voice mode.
                </p>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Preferred Voice Interruption Keyword</label>
                <select
                  value={interruptionWord}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInterruptionWord(val);
                    try {
                      localStorage.setItem('rowan_interruption_word', val);
                    } catch (err) {
                      console.warn(err);
                    }
                  }}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-700 font-bold cursor-pointer"
                >
                  <option value="stop">Stop (Default)</option>
                  <option value="pause">Pause</option>
                  <option value="wait">Wait</option>
                  <option value="hold on">Hold On</option>
                  <option value="shh">Shh</option>
                  <option value="quiet">Quiet</option>
                  <option value="enough">Enough</option>
                  <option value="stop talking">Stop Talking</option>
                  <option value="hey rowan">Hey Rowan</option>
                  <option value="no">No</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-normal my-0 font-medium">
                  When Rowan is speaking in Live Voice Mode, speaking this specific keyword will immediately override, mute, and pause him.
                </p>

                {/* Whitelist Panel Toggle */}
                <div className="mt-3 pt-3 border-t border-zinc-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-zinc-800">
                        Official Interruption Whitelist (100 Words & 100 Sentences)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInterruptionWhitelist(!showInterruptionWhitelist)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      id="toggle-interruption-whitelist-btn"
                    >
                      {showInterruptionWhitelist ? 'Hide Whitelist' : 'View Whitelist (200 Total)'}
                      {showInterruptionWhitelist ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                    When Roan is speaking or answering, <strong>only</strong> these 100 words and 100 sentences will stop him. If you say <em>&quot;Wait&quot;</em>, <em>&quot;Stop&quot;</em>, <em>&quot;Roan, don&apos;t talk&quot;</em>, or <em>&quot;Roan, I did not say that&quot;</em>, he halts immediately and listens. Unrelated chatter or background noise will not interrupt him.
                  </p>

                  {showInterruptionWhitelist && (
                    <div className="mt-3 bg-zinc-100 border border-zinc-250 rounded-xl p-3 space-y-3" id="interruption-whitelist-details">
                      {/* Search and Tabs */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                        <div className="inline-flex rounded-lg border border-zinc-250 p-0.5 bg-white">
                          <button
                            type="button"
                            onClick={() => setWhitelistTab('words')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                              whitelistTab === 'words'
                                ? 'bg-zinc-900 text-white shadow-sm'
                                : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                            id="whitelist-tab-words"
                          >
                            100 Words ({INTERRUPTION_WORDS_100.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setWhitelistTab('sentences')}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                              whitelistTab === 'sentences'
                                ? 'bg-zinc-900 text-white shadow-sm'
                                : 'text-zinc-600 hover:text-zinc-900'
                            }`}
                            id="whitelist-tab-sentences"
                          >
                            100 Sentences ({INTERRUPTION_SENTENCES_100.length})
                          </button>
                        </div>

                        <div className="relative flex-1 sm:max-w-xs">
                          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={whitelistSearch}
                            onChange={(e) => setWhitelistSearch(e.target.value)}
                            placeholder="Filter words or sentences..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 placeholder-zinc-400 font-medium"
                            id="whitelist-search-input"
                          />
                        </div>
                      </div>

                      {/* Display Items */}
                      <div className="max-h-60 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                        {whitelistTab === 'words' ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {INTERRUPTION_WORDS_100
                              .filter((w) =>
                                w.toLowerCase().includes(whitelistSearch.toLowerCase().trim())
                              )
                              .map((w, idx) => (
                                <div
                                  key={w}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded text-[11px] font-semibold text-zinc-800"
                                >
                                  <span className="text-[10px] text-zinc-400 font-mono w-5">
                                    #{idx + 1}
                                  </span>
                                  <span className="capitalize">{w}</span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {INTERRUPTION_SENTENCES_100
                              .filter((s) =>
                                s.toLowerCase().includes(whitelistSearch.toLowerCase().trim())
                              )
                              .map((s, idx) => (
                                <div
                                  key={s}
                                  className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800"
                                >
                                  <span className="text-[10px] text-zinc-400 font-mono w-6">
                                    #{idx + 1}
                                  </span>
                                  <span>&quot;{s}&quot;</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Connected Agent Capabilities */}
          <Card title="Connected Agent Capabilities" id="settings-card-capabilities">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-xl border border-zinc-150">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 block">Catalog Match Verification</span>
                  <p className="text-[11px] text-zinc-500 my-0 font-medium leading-relaxed">Allow Rowan to search your Firestore product list to suggest items.</p>
                </div>
                <input
                  type="checkbox"
                  checked={catalogSearchEnabled}
                  onChange={(e) => setCatalogSearchEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-zinc-250 bg-white rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-xl border border-zinc-150">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 block">Twilio SMS Webhooks</span>
                  <p className="text-[11px] text-zinc-500 my-0 font-medium leading-relaxed">Let Rowan receive prompts and broadcast catalog lists over cellular text.</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsTriggersEnabled}
                  onChange={(e) => setSmsTriggersEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-zinc-250 bg-white rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-xl border border-zinc-150">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-zinc-900 block">Autonomous Catalog Replenishment</span>
                  <p className="text-[11px] text-zinc-500 my-0 font-medium leading-relaxed">Let Rowan place micro-orders automatically when stock drops below threshold.</p>
                </div>
                <input
                  type="checkbox"
                  checked={tradingEnabled}
                  onChange={(e) => setTradingEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-zinc-250 bg-white rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Section 4: Advanced Safeguards & Preferences */}
          <Card title="System Guard & Preferences" id="settings-card-preferences">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Target Inference AI Engine</label>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-700 font-bold cursor-pointer"
                >
                  <option value="gemini-flash-latest">Gemini Flash Latest (Ultra Fast / Lowest Latency)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (High Speed)</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (High Performance)</option>
                  <option value="openai-gpt-4o">OpenAI GPT-4o (Fallback)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Model Response Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-700 font-bold cursor-pointer"
                >
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Spanish (ES)</option>
                  <option value="fr-FR">French (FR)</option>
                  <option value="de-DE">German (DE)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Security Guard Mode</label>
                <input
                  type="text"
                  readOnly
                  value={privacyMode}
                  className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none text-zinc-450 font-bold cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-zinc-450 uppercase tracking-wider block">Hourly Rate Limit Safeguard</label>
                <input
                  type="number"
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  id="notifs-check"
                  className="w-4 h-4 text-blue-600 border-zinc-250 bg-white rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="notifs-check" className="text-xs text-zinc-500 cursor-pointer select-none font-medium leading-relaxed">
                  Notify me of critical prompt fallback triggering or high-priority SMS escalation logs.
                </label>
              </div>
            </div>
          </Card>

          {/* Action Trigger Buttons */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              type="submit"
              isLoading={saving}
              icon={saved ? <Check className="w-4 h-4 text-white" /> : undefined}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer px-5 py-2.5 rounded-lg"
            >
              {saved ? 'Directives Saved & Versioned' : 'Save & Compile Directives'}
            </Button>
          </div>
        </form>

        {/* Right Column: Active Profile & Test Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Configuration Overview */}
          <Card title="Active Directive Profile" id="settings-card-directive-overview">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-900 my-0">Live Synchronized Agent</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal my-0 font-medium">
                    Rowan reads the active system directives instantly. No container rebuilds or server resets required.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex items-start gap-3">
                <Compass className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-zinc-900 my-0">Zero-Hallucination Safe Mode</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal my-0 font-medium">
                    Model restricts outputs purely to verified catalog databases or pre-coded FAQ vectors to keep answers 100% factual.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Live Test Playground */}
          <Card
            title="Live Personality Playground"
            subtitle="Test how prompt updates affect Rowan in real-time"
            extra={<MessageSquare className="w-4 h-4 text-zinc-400" />}
            id="settings-card-playground"
          >
            <div className="flex flex-col h-[320px] bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden">
              {/* Messages viewport */}
              <div className="flex-grow p-4 space-y-3 overflow-y-auto text-xs leading-relaxed">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 shadow-xs font-medium ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-zinc-200 rounded-lg rounded-tl-none px-3 py-2 text-zinc-400 flex items-center gap-1.5 shadow-xs font-medium">
                      <Loader2 className="w-3 animate-spin text-blue-600" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={previewChatEndRef} />
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendPreviewMessage} className="p-2 bg-white border-t border-zinc-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a test query to Rowan..."
                  disabled={chatLoading}
                  className="flex-grow bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-850 font-medium placeholder-zinc-400"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0 border-0 flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
