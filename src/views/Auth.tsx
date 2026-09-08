import React, { useState } from 'react'
import { rowanAuth } from '../lib/supabase'
import { Sparkles, Mail, Lock, Loader2, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'

interface AuthProps {
  navigate: (to: string) => void
  initialMode?: 'login' | 'signup'
}

export const Auth: React.FC<AuthProps> = ({ navigate, initialMode = 'login' }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const isSandbox = rowanAuth.isSandbox()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please fill out all fields.')
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }

    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await rowanAuth.signIn(email, password)
        if (error) {
          setErrorMsg(error.message || 'Failed to sign in. Please verify your details.')
        } else if (data) {
          // Success! Check if profile already exists or onboarding completed
          setSuccessMsg('Successfully signed in!')
          setTimeout(() => {
            navigate('/dashboard')
          }, 800)
        }
      } else {
        const { data, error } = await rowanAuth.signUp(email, password)
        if (error) {
          setErrorMsg(error.message || 'Failed to create account. Please try again.')
        } else if (data) {
          setSuccessMsg('Account created successfully! Let\'s set up your Rowan assistant.')
          setTimeout(() => {
            navigate('/onboarding')
          }, 1200)
        }
      }
    } catch (err: unknown) {
      console.error('[AUTH ERROR]:', err)
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col md:flex-row font-sans" id="auth-page">
      {/* Brand Side Panel */}
      <div className="md:w-5/12 bg-zinc-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden" id="auth-brand-panel">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/25 via-zinc-950 to-zinc-950 z-0"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl z-0"></div>
        
        <div className="relative z-10 flex items-center gap-2" id="auth-brand">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            rowan<span className="text-blue-500 font-bold">.ai</span>
          </span>
        </div>

        <div className="relative z-10 my-auto py-12 md:py-0 space-y-6" id="auth-promo">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold border border-blue-500/20">
            <Sparkles className="w-3 h-3" /> Version 2.4 Active
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight my-0">
            The intelligent salesperson for <em className="text-blue-400 not-italic font-bold">modern stores.</em>
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm my-0 font-medium">
            Rowan syncs with your systems, understands buyer intents, handles questions, and drives operations around the clock.
          </p>

          <div className="space-y-3 pt-4 text-xs text-zinc-300" id="auth-benefits">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">Real-time telemetry and order operations</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">Secure, customer-owned data & sandboxing</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold">Versioned configuration and safeguards</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] text-zinc-500 uppercase font-extrabold tracking-wider" id="auth-footer">
          &copy; 2026 Rowan AI. Enterprise customer intelligence.
        </div>
      </div>

      {/* Interactive Form Panel */}
      <div className="md:w-7/12 flex items-center justify-center p-6 md:p-12 bg-white" id="auth-form-panel">
        <div className="w-full max-w-md space-y-8" id="auth-form-container">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 my-0">
              {isLogin ? 'Welcome back to Rowan' : 'Get started with Rowan'}
            </h2>
            <p className="text-sm text-zinc-500 font-medium my-0">
              {isLogin ? 'Enter your details to manage your store AI' : 'Create an account to deploy your floating assistant'}
            </p>
          </div>

          {/* Sandbox Indicator Banner */}
          {isSandbox && (
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3" id="auth-sandbox-banner">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-650 leading-relaxed font-semibold">
                <span className="font-bold text-zinc-900 block">Using Sandbox Simulation Mode</span>
                No Supabase URL is configured. You can sign up or log in using any email/password credentials to fully preview Rowan's platform features.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600 font-bold" id="auth-error">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-xs text-emerald-600 font-bold" id="auth-success">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
            <div className="space-y-1.5" id="field-email">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Business Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5" id="field-password">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold"
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-medium my-0">Must be at least 6 characters.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0 shadow-sm"
              id="auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{isLogin ? 'Authenticating...' : 'Creating Profile...'}</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Login' : 'Create Business Profile'}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-xs" id="auth-toggle-link">
            <span className="text-zinc-500 font-medium">
              {isLogin ? "New to Rowan? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setErrorMsg('')
                setSuccessMsg('')
              }}
              className="font-bold text-blue-600 hover:underline bg-transparent border-0 cursor-pointer p-0"
            >
              {isLogin ? 'Register Store' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
