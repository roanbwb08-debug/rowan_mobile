import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { rowanAuth, rowanProfile } from '../lib/supabase'
import type { SandboxUser } from '../lib/supabase'
import { ArrowRight, ArrowLeft, Check, Loader2, Smartphone, Globe, BarChart4, Compass, Sparkles } from 'lucide-react'

export const Onboarding: React.FC<{ navigate: (to: string) => void }> = ({ navigate }) => {
  const [user, setUser] = useState<SandboxUser | null>(null)
  const [step, setStep] = useState(1)
  const [selectedUses, setSelectedUses] = useState<string[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    rowanAuth.getSessionUser().then((u) => {
      if (!u) {
        navigate('/login')
      } else {
        setUser(u)
      }
    })
  }, [navigate])

  const usageOptions = [
    { id: 'device', name: 'My Device', desc: 'Interact with and automate physical devices or microcontrollers.', icon: <Smartphone className="w-5 h-5 text-blue-600" /> },
    { id: 'website', name: 'My Website', desc: 'Embed a customer sales assistant directly onto an e-commerce storefront.', icon: <Globe className="w-5 h-5 text-blue-600" /> },
    { id: 'trading', name: 'Trading', desc: 'Connect trading pipelines to auto-purchase and replenish supplying inventory.', icon: <BarChart4 className="w-5 h-5 text-blue-600" /> },
    { id: 'assistant', name: 'Personal Assistant', desc: 'Standard co-pilot for logistics, schedules, & business operations.', icon: <Compass className="w-5 h-5 text-blue-600" /> }
  ]

  const toggleUse = (id: string) => {
    if (selectedUses.includes(id)) {
      setSelectedUses(selectedUses.filter(u => u !== id))
    } else {
      setSelectedUses([...selectedUses, id])
    }
  }

  const handleNextStep = () => {
    setStep(2)
  }

  const handleBackStep = () => {
    setStep(1)
  }

  const handleSaveOnboarding = async (planValue: string | null) => {
    if (!user) return
    setSaving(true)
    setSelectedPlan(planValue)

    try {
      const ok = await rowanProfile.saveOnboarding(
        user.id,
        user.email,
        selectedUses,
        planValue
      )
      if (ok) {
        setTimeout(() => {
          navigate('/dashboard')
        }, 800)
      } else {
        alert('Failed to save profile. Proceeding to Dashboard...')
        navigate('/dashboard')
      }
    } catch (err) {
      console.error(err)
      navigate('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-800 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-zinc-200 bg-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-tight text-zinc-950">
            rowan<span className="text-blue-600 font-semibold">.ai</span>
          </span>
        </div>
        <div className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
          Step {step} of 2 &bull; Onboarding Control
        </div>
      </header>

      {/* Core Wizard */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl p-8 shadow-sm">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-600">Personalization Wizard</span>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">
                    What do you want to use Rowan for?
                  </h1>
                  <p className="text-sm text-zinc-500 font-medium my-0">
                    Select all use cases that match your business flow. We'll fine-tune Rowan's base capabilities.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {usageOptions.map((opt) => {
                    const active = selectedUses.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggleUse(opt.id)}
                        className={`text-left p-4 rounded-xl border transition-all relative flex flex-col justify-between h-36 hover:scale-[1.01] cursor-pointer ${
                          active
                            ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/10'
                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-150">
                            {opt.icon}
                          </div>
                          {active && (
                            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-sm text-zinc-900 block">
                            {opt.name}
                          </span>
                          <span className="text-xs text-zinc-500 block mt-1 leading-snug font-medium">
                            {opt.desc}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-zinc-150 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedUses([])
                      setStep(2)
                    }}
                    className="text-xs font-bold text-zinc-450 hover:text-zinc-700 bg-transparent border-none cursor-pointer uppercase tracking-wider"
                  >
                    Skip for now
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 flex items-center gap-2 cursor-pointer transition-all border-0 shadow-sm"
                  >
                    <span>Next: Select Plan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-600">Transparent Platform Plans</span>
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">
                    Choose a Rowan subscription plan
                  </h1>
                  <p className="text-sm text-zinc-500 font-medium my-0">
                    Deploy Rowan on your custom storefront. Try either plan free during Sandbox, no card required.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Monthly Plan */}
                  <div className="bg-white border border-zinc-200 hover:border-blue-500 p-5 rounded-2xl flex flex-col justify-between h-64 relative transition-all">
                    <div>
                      <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">GROWING STORE</span>
                      <h3 className="text-base font-bold text-zinc-950 mt-1 my-0">Monthly Subscription</h3>
                      <p className="text-xs text-zinc-500 mt-1 leading-snug font-medium">
                        Ideal for growing e-commerce stores looking for reliable round-the-clock operations and intelligence.
                      </p>
                    </div>
                    <div className="my-3">
                      <span className="text-2xl font-black text-zinc-950">$99</span>
                      <span className="text-xs text-zinc-500 font-bold"> / month</span>
                    </div>
                    <button
                      onClick={() => handleSaveOnboarding('monthly')}
                      disabled={saving}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center justify-center gap-2 border-0"
                    >
                      {saving && selectedPlan === 'monthly' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Choose Monthly</span>
                      )}
                    </button>
                  </div>

                  {/* Yearly Plan */}
                  <div className="bg-white border border-blue-500/40 p-5 rounded-2xl flex flex-col justify-between h-64 relative transition-all shadow-xs">
                    <span className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full border border-blue-400 shadow-sm">
                      Save 20%
                    </span>
                    <div>
                      <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">ENTERPRISE SCALE</span>
                      <h3 className="text-base font-bold text-zinc-950 mt-1 my-0">Yearly Subscription</h3>
                      <p className="text-xs text-zinc-500 mt-1 leading-snug font-medium">
                        Our best plan for high-volume stores looking to unlock multi-agent systems and dedicated analytics pipelines.
                      </p>
                    </div>
                    <div className="my-3">
                      <span className="text-2xl font-black text-zinc-950">$990</span>
                      <span className="text-xs text-zinc-500 font-bold"> / year</span>
                    </div>
                    <button
                      onClick={() => handleSaveOnboarding('yearly')}
                      disabled={saving}
                      className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2 border-0 shadow-sm"
                    >
                      {saving && selectedPlan === 'yearly' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>Choose Yearly</span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-150 flex items-center justify-between">
                  <button
                    onClick={handleBackStep}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-450 hover:text-zinc-700 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer uppercase tracking-wider"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Go Back</span>
                  </button>
                  <button
                    onClick={() => handleSaveOnboarding(null)}
                    disabled={saving}
                    className="text-xs font-bold text-zinc-450 hover:text-zinc-700 bg-transparent border-none cursor-pointer uppercase tracking-wider"
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="px-6 py-4 text-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider border-t border-zinc-200 bg-white">
        Secured by Supabase Row Level Security. All business configurations remain isolated.
      </footer>
    </div>
  )
}
