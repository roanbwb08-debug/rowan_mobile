import React, { useState } from 'react'
import { 
  ArrowLeft, 
  Check, 
  Shield, 
  ExternalLink,
  Loader2,
  Sparkles,
  ShieldCheck,
  ToggleLeft,
  Key
} from 'lucide-react'
import type { RowanApp } from '../../data/apps'

interface AppSetupFlowProps {
  app: RowanApp
  onBack: () => void
  onConnect: (permissions: Record<string, boolean>, role: string, instructions: string) => void
}

const ROLES = [
  { id: 'developer', label: 'Developer', placeholder: 'Review my repository, draft code suggestions, and explain pull request modifications.' },
  { id: 'company', label: 'Company Partner', placeholder: 'Automate internal workspace summaries, answer partner queries, and analyze business sheets.' },
  { id: 'student', label: 'Academic Assistant', placeholder: 'Summarize academic references, parse dynamic CSV data, and organize course syllabus folders.' },
  { id: 'trader', label: 'Trading spec', placeholder: 'Calculate technical risk matrices, read price tickers, and propose sandbox trade plans.' },
  { id: 'personal', label: 'Personal Assistant', placeholder: 'Draft message alerts, search connected document knowledge, and outline creative ideas.' },
  { id: 'custom', label: 'Custom configuration', placeholder: 'Tell Rowan exactly what specific automated tasks it should handle in this workspace...' }
]

export const AppSetupFlow: React.FC<AppSetupFlowProps> = ({ app, onBack, onConnect }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // Step 1 states
  const [selectedRole, setSelectedRole] = useState('custom')
  const [instructions, setInstructions] = useState('')

  // Step 2 states
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>(
    app.capabilities?.reduce((acc, cap) => ({ ...acc, [cap]: true }), {}) || {}
  )
  const [granularPermissions, setGranularPermissions] = useState({
    readAccess: true,
    writeAccess: false,
    executionAccess: false
  })

  // Step 3 API key state
  const [apiKey, setApiKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRoleSelect = (roleId: string, placeholder: string) => {
    setSelectedRole(roleId)
    setInstructions(placeholder)
  }

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      if (app.authType === 'api_key') {
        setStep(3)
      } else {
        handleConnect()
      }
    }
  }

  const handlePrevStep = () => {
    if (step === 2) setStep(1)
    if (step === 3) setStep(2)
  }

  const handleConnect = () => {
    setIsSubmitting(true)
    // Combine selected checkboxes, roles, instructions into final setup callback
    onConnect({
      ...selectedPermissions,
      ...granularPermissions,
      apiKeySaved: !!apiKey
    }, selectedRole, instructions || 'Help coordinate connected service inputs.')
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-[2.5rem] overflow-hidden shadow-xl max-w-2xl mx-auto w-full transition-all duration-300">
      {/* Header */}
      <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={step === 1 ? onBack : handlePrevStep}
            className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-zinc-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
              {app.icon}
            </div>
            <div>
              <h3 className="font-bold text-zinc-950 leading-tight">Connect {app.name}</h3>
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                Step {step} of {app.authType === 'api_key' ? 3 : 2} — {step === 1 ? 'Configure Purpose' : step === 2 ? 'Authorize Capabilities' : 'Verify Credentials'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* STEP 1: DEFINE PURPOSE */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                What should Rowan do with this?
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Choose an optimized workflow preset or define a specific instruction. Rowan will configure its cognitive tools to match this configuration.
              </p>
            </div>

            {/* Shortcut Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ROLES.map(role => (
                <button
                  type="button"
                  key={role.id}
                  onClick={() => handleRoleSelect(role.label, role.placeholder)}
                  className={`px-4 py-3.5 rounded-2xl text-xs font-bold border transition-all text-left flex flex-col gap-1 cursor-pointer ${
                    selectedRole === role.label
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                      : 'bg-white text-zinc-700 border-zinc-250 hover:bg-zinc-50'
                  }`}
                >
                  <span className="block truncate">{role.label}</span>
                </button>
              ))}
            </div>

            {/* Instruction Prompt */}
            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Custom Instructions for Rowan</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Tell Rowan exactly what you want it to do in this workspace..."
                rows={4}
                className="w-full text-xs rounded-2xl border border-zinc-200 p-4 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-zinc-800 font-bold placeholder-zinc-400 resize-none leading-relaxed"
              />
            </div>

            {/* Next Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Configure Capabilities & Permissions</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONFIGURE CONTEXT, CAPABILITIES & PERMISSIONS */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Capabilities & Context Authorization
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Specify what data contexts Rowan has permission to query or execute using the connected environment tools.
              </p>
            </div>

            {/* Dynamic Capabilities */}
            <div className="space-y-3">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Available Tool Capabilities</label>
              <div className="grid grid-cols-1 gap-2.5">
                {app.capabilities?.map(cap => (
                  <label 
                    key={cap}
                    className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-2xl hover:border-zinc-350 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        selectedPermissions[cap] ? 'bg-zinc-950 border-zinc-950' : 'border-zinc-300 bg-white'
                      }`}>
                        {selectedPermissions[cap] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold text-zinc-700">{cap}</span>
                    </div>
                    <input 
                      type="checkbox"
                      className="hidden"
                      checked={selectedPermissions[cap]}
                      onChange={() => setSelectedPermissions(prev => ({ ...prev, [cap]: !prev[cap] }))}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Granular Permissions Section */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">Granular Authorization Levels</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGranularPermissions(prev => ({ ...prev, readAccess: !prev.readAccess }))}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    granularPermissions.readAccess ? 'border-emerald-250 bg-emerald-50/20' : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900">Read</span>
                    <ToggleLeft className={`w-5 h-5 ${granularPermissions.readAccess ? 'text-emerald-500 fill-emerald-500' : 'text-zinc-300'}`} />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Allow reading data and files</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGranularPermissions(prev => ({ ...prev, writeAccess: !prev.writeAccess }))}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    granularPermissions.writeAccess ? 'border-amber-250 bg-amber-50/20' : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900">Write</span>
                    <ToggleLeft className={`w-5 h-5 ${granularPermissions.writeAccess ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'}`} />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Allow editing files & summaries</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGranularPermissions(prev => ({ ...prev, executionAccess: !prev.executionAccess }))}
                  className={`p-4 rounded-2xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    granularPermissions.executionAccess ? 'border-blue-250 bg-blue-50/20' : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900">Action</span>
                    <ToggleLeft className={`w-5 h-5 ${granularPermissions.executionAccess ? 'text-blue-500 fill-blue-500' : 'text-zinc-300'}`} />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium">Requires explicit turn triggers</span>
                </button>
              </div>
            </div>

            {/* Setup Progress */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>{app.authType === 'api_key' ? 'Next: Enter Credentials' : 'Authorize & Launch Handshake'}</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: API KEY / SECURE TOKEN ENTRY */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                Workspace Token Authentication
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                Provide the required client token or secret phrase to authorize Rowan tools. Credentials are encrypted and kept hidden on our servers.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest block">{app.name} API Key / Private Token</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your encrypted ${app.name} token...`}
                className="w-full text-xs rounded-2xl border border-zinc-200 p-4 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-zinc-800 font-bold"
              />
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-blue-900 mb-0.5">Secure Vault Storage</p>
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium m-0">
                  This key remains bound to the Rowan Core API layer only. Under strict boundaries, Rowan is blocked from sharing this key with other client frames or connected domains.
                </p>
              </div>
            </div>

            {/* Final Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isSubmitting || !apiKey.trim()}
                className="w-full py-4 bg-zinc-950 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40 disabled:scale-100"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Authorize with {app.name}</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
