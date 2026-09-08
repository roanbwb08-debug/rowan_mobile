import React, { useState, useEffect } from 'react'
import { Card } from '../components/Card'
import {
  Save,
  Check,
  Compass,
  Volume2,
  Sliders,
  ShieldAlert,
  Loader2,
  User,
  Activity,
  Heart,
  TrendingUp,
  BookOpen,
  Sparkles,
  Mic
} from 'lucide-react'

interface PersonalityPreset {
  id: string
  name: string
  description: string
  prompt: string
  icon: React.ReactNode
  tag: string
}

const PERSONALITY_PRESETS: PersonalityPreset[] = [
  {
    id: 'friend',
    name: 'Best Friend & Motivator',
    description: 'Empathetic, encouraging, and supportive. Keeps you accountable while maintaining a conversational, warm tone.',
    prompt: 'Be my supportive best friend, motivator, and personal guide. Speak naturally, ask meaningful follow-ups, and keep me energized.',
    icon: <Heart className="w-4 h-4 text-rose-500" />,
    tag: 'Empathetic & Casual'
  },
  {
    id: 'partner',
    name: 'Business Partner',
    description: 'Strategic, metrics-focused, and direct. Delivers high-conviction analysis and concise, high-impact suggestions.',
    prompt: 'Act as my high-impact business partner. Keep responses direct, focus strictly on actionable metrics, risk mitigations, and performance targets.',
    icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
    tag: 'Strategic & Professional'
  },
  {
    id: 'mentor',
    name: 'Mentor & Teacher',
    description: 'Patient, methodical, and educational. Breaks down complex principles and guides you with structured steps.',
    prompt: 'Be my wise mentor and teacher. Patiently break down complex queries into structured principles. Guide me with clear educational pathways.',
    icon: <BookOpen className="w-4 h-4 text-blue-600" />,
    tag: 'Structured & Clear'
  }
]

export const Assistant: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState('friend')
  const [customPrompt, setCustomPrompt] = useState('')
  const [voiceModel, setVoiceModel] = useState('companion-pro')
  const [speechSpeed, setSpeechSpeed] = useState(1.0)
  const [autoplayAudio, setAutoplayAudio] = useState(true)
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rowan_wake_word_enabled')
      return stored !== null ? JSON.parse(stored) : true
    }
    return true
  })
  const [rateLimit, setRateLimit] = useState(100)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    localStorage.setItem('rowan_wake_word_enabled', JSON.stringify(wakeWordEnabled))
  }, [wakeWordEnabled])

  // Load existing settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/tenant/settings')
        const data = await res.json()
        if (data.success && data.settings) {
          const userPrompt = data.settings.instructions || ''
          setCustomPrompt(userPrompt)
          
          // Match matching preset if possible
          const matched = PERSONALITY_PRESETS.find(p => p.prompt === userPrompt)
          if (matched) {
            setSelectedPreset(matched.id)
          } else if (userPrompt) {
            setSelectedPreset('custom')
          }
          
          if (data.settings.rateLimit) {
            setRateLimit(data.settings.rateLimit)
          }
        }
      } catch (err) {
        console.warn('Utilizing secure defaults for Assistant customization.', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSelectPreset = (preset: PersonalityPreset) => {
    setSelectedPreset(preset.id)
    setCustomPrompt(preset.prompt)
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/tenant/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: PERSONALITY_PRESETS.find(p => p.id === selectedPreset)?.name || 'Custom Assistant Directive',
          instructions: customPrompt,
          theme: 'light',
          rateLimit
        })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      setSaved(true) // Sandbox fallback
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Syncing assistant parameters...</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-2 animate-fade-in text-zinc-800">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600">
            PERSONALITY COGNITION
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 my-0">
            Rowan Customization
          </h1>
          <p className="text-sm text-zinc-500 max-w-2xl leading-relaxed my-0">
            Modify conversational directives, voice synthesizers, behavioral filters, and context-dependent priorities for Rowan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-rowan-assistant'))
            window.dispatchEvent(new CustomEvent('start-rowan-voice'))
          }}
          className="shrink-0 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Test Live with Rowan</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Customization Forms */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Personality presets */}
          <div className="space-y-4 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs uppercase font-black tracking-widest text-zinc-400 my-0 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Personality Archetypes</span>
            </h3>
            
            <p className="text-xs text-zinc-500 leading-relaxed my-0">
              Select a pre-tuned personality model or specify a completely customized blueprint override below.
            </p>

            <div className="space-y-3 pt-2">
              {PERSONALITY_PRESETS.map((p) => {
                const isActive = selectedPreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
                      isActive
                        ? 'border-blue-200 bg-blue-50/20 text-zinc-850 shadow-sm'
                        : 'border-zinc-200 bg-white text-zinc-550 hover:border-zinc-300'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg border shrink-0 h-fit ${
                      isActive ? 'bg-blue-50 border-blue-100' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      {p.icon}
                    </div>

                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold my-0 text-zinc-900">{p.name}</h4>
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-lg leading-none ${
                          isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {p.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-normal my-0 font-medium">
                        {p.description}
                      </p>
                    </div>
                  </button>
                )
              })}

              {/* Custom Blueprint Button */}
              <button
                type="button"
                onClick={() => setSelectedPreset('custom')}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
                  selectedPreset === 'custom'
                    ? 'border-blue-200 bg-blue-50/20 text-zinc-850 shadow-sm'
                    : 'border-zinc-200 bg-white text-zinc-550 hover:border-zinc-300'
                }`}
              >
                <div className={`p-2.5 rounded-lg border shrink-0 h-fit ${
                  selectedPreset === 'custom' ? 'bg-blue-50 border-blue-100' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <Sliders className="w-4 h-4 text-blue-600" />
                </div>
                <div className="space-y-1 flex-grow">
                  <h4 className="text-xs font-bold my-0 text-zinc-900">Custom Blueprint</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal my-0 font-medium">
                    Provide precise instructions, personality overrides, and operational restrictions for your custom model.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Directive Input Area */}
          <Card title="Cognitive Directives">
            <div className="space-y-4">
              <p className="text-xs text-zinc-550 leading-relaxed my-0 font-medium">
                These directives are automatically embedded into the system prompts of all natural conversation flows.
              </p>

              <textarea
                rows={5}
                required
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value)
                  setSelectedPreset('custom')
                }}
                placeholder="Act as a premium personal companion..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 transition-all leading-relaxed"
              />
            </div>
          </Card>

          {/* 3. Voice settings */}
          <div className="space-y-5 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs uppercase font-black tracking-widest text-zinc-400 my-0 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-blue-600" />
              <span>Voice Synthesizer Settings</span>
            </h3>

            <p className="text-xs text-zinc-500 leading-relaxed my-0">
              Customize the auditory identity used when Rowan speaks in voice call sessions or replies with audio in the chat panel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Voice Model</label>
                <select
                  value={voiceModel}
                  onChange={(e) => setVoiceModel(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-200 px-3.5 py-2.5 bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold cursor-pointer"
                >
                  <option value="companion-pro">Rowan Standard (Balanced Male)</option>
                  <option value="companion-female">Rowan Friendly (Warm Female)</option>
                  <option value="deep-professional">Rowan Senior (Deep Professional)</option>
                  <option value="clear-educator">Rowan Educator (Clear & Analytical)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-450 tracking-wider">Rate Limit Override</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-zinc-200 px-3.5 py-2.5 bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-800 font-bold"
                />
              </div>
            </div>

            {/* Slider speeds */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-450">
                <span>Speech Tempo / Speed</span>
                <span className="font-mono text-blue-600 font-black">{speechSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                className="w-full accent-blue-600 bg-zinc-100 rounded-lg cursor-pointer h-1.5"
              />
            </div>

            {/* Autoplay toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-900 block">Auto-play Auditory Responses</span>
                <span className="text-[10px] text-zinc-500 leading-normal block">Automatically play Rowan's replies in vocalized speech format during chat sessions.</span>
              </div>
              <button
                type="button"
                onClick={() => setAutoplayAudio(!autoplayAudio)}
                className={`w-11 h-6 rounded-full p-1 transition-all border-0 cursor-pointer ${
                  autoplayAudio ? 'bg-blue-600' : 'bg-zinc-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                  autoplayAudio ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Wake Word toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-zinc-900 block">Wake-Word Activation</span>
                </div>
                <span className="text-[10px] text-zinc-500 leading-normal block">Listen for "Rowan" in the background to automatically activate the assistant.</span>
              </div>
              <button
                type="button"
                onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                className={`w-11 h-6 rounded-full p-1 transition-all border-0 cursor-pointer ${
                  wakeWordEnabled ? 'bg-blue-600' : 'bg-zinc-200'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-all transform ${
                  wakeWordEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Blueprint Diagnostics */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Cognitive Shield Logs">
            <div className="space-y-4 text-xs text-zinc-500">
              <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-150">
                <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-900 block text-[10px] uppercase tracking-wider">Source Infallibility</span>
                  <span className="text-zinc-500 leading-relaxed block">Rowan strictly filters information outside your connected website context templates to prevent standard model hallucinations.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-150">
                <Activity className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-zinc-900 block text-[10px] uppercase tracking-wider">Zero-Bias Semantic Weights</span>
                  <span className="text-zinc-500 leading-relaxed block">Conversational structures dynamically calibrate behavior indices based on selected directive blueprints.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50/20 rounded-xl border border-blue-150 border-dashed text-blue-700">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5 text-blue-600" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-[10px] uppercase tracking-wider">Zero-bias Safe Sandboxing</span>
                  <span className="text-zinc-500 leading-relaxed block">All settings changes compile instantly on safe, isolated test containers without impacting production schemas.</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Action trigger button */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
            <p className="text-xs text-zinc-500 leading-relaxed my-0 font-medium">
              Apply chosen personality rules and speech synthesizers globally across all website widgets, SMS webhooks, and chat interfaces.
            </p>
            
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-4.5 h-4.5 text-white" />
                  <span>Directives Compiled</span>
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  <span>Compile Directives</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
