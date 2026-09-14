import React, { useState, useEffect } from 'react'
import { 
  Smartphone, Mic, Image as ImageIcon, ArrowUp, 
  MessageSquare, User, LogOut, Check, ArrowRight, Network,
  Globe, CheckCircle2
} from 'lucide-react'

export const MobileSimulator: React.FC = () => {
  const [screen, setScreen] = useState<'splash' | 'auth' | 'onboarding' | 'main'>('splash')
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [activeTab, setActiveTab] = useState<'home' | 'conversations' | 'connect' | 'you'>('home')
  
  // Customization state matching Flutter
  const [accentColor, setAccentColor] = useState('#1E6091')
  const [avatarStyle, setAvatarStyle] = useState('Rowan Classic')
  const [customLogo, setCustomLogo] = useState('Default Rowan Core')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  // Chat message state inside mock phone
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
    { role: 'assistant', text: 'Hello! I am Rowan. How can I help you today?' }
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Connections state
  const [connections, setConnections] = useState<Record<string, boolean>>({
    'Phone': false,
    'Tablet': false,
    'Computer': false,
    'Personal websites': false,
    'Ecommerce websites': false,
    'Business websites': false,
    'GitHub': false,
    'Documents': false,
  })

  // Connection Workflow in simulator
  const [currentConnectingItem, setCurrentConnectingItem] = useState<string | null>(null)
  const [connectStep, setConnectStep] = useState(1)

  // Voice mode state
  const [isVoiceActive, setIsVoiceActive] = useState(false)

  // Splash Screen automatic redirect
  useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        setScreen('auth')
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [screen])

  const handleSendMessage = () => {
    if (!inputText.trim()) return
    const userMsg = inputText
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setInputText('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: `I am Rowan, executing this command using our unified core. Current Accent preference is set to ${accentColor}. Let me know if you would like me to trigger any of your authorized connected tools!` 
        }
      ])
    }, 1500)
  }

  // Multi-step connection handshake simulation
  const startConnectionWorkflow = (item: string) => {
    setCurrentConnectingItem(item)
    setConnectStep(1)
  }

  const handleNextConnectStep = () => {
    if (connectStep < 6) {
      setConnectStep(prev => prev + 1)
    } else {
      if (currentConnectingItem) {
        setConnections(prev => ({ ...prev, [currentConnectingItem]: true }))
      }
      setCurrentConnectingItem(null)
    }
  }

  const handleDisconnect = (item: string) => {
    setConnections(prev => ({ ...prev, [item]: false }))
  }

  return (
    <div className="flex flex-col items-center select-none">
      <div className="text-center mb-4">
        <span className="px-3 py-1 rounded-full bg-blue-100/60 border border-blue-200 text-blue-700 text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5" />
          Live Interactive Phone Emulator
        </span>
        <h3 className="text-sm font-bold text-zinc-700 mt-1.5">Try the designed Flutter App right now!</h3>
      </div>

      {/* External Phone Frame */}
      <div className="relative w-[340px] h-[670px] bg-zinc-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-zinc-800 ring-12 ring-zinc-900/10">
        
        {/* Notch / Speaker */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-950 rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-zinc-800 rounded-full mb-1"></div>
          <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full mb-1 ml-4 border border-zinc-800"></div>
        </div>

        {/* Volume & Power Button Indicators */}
        <div className="absolute -left-1.5 top-28 w-1 h-12 bg-zinc-700 rounded-r-md"></div>
        <div className="absolute -left-1.5 top-44 w-1 h-12 bg-zinc-700 rounded-r-md"></div>
        <div className="absolute -right-1.5 top-36 w-1 h-16 bg-zinc-700 rounded-l-md"></div>

        {/* Screen Area */}
        <div className={`w-full h-full rounded-[30px] overflow-hidden relative flex flex-col ${themeMode === 'dark' ? 'bg-zinc-950 text-white' : 'bg-[#fafafa] text-zinc-900'}`}>
          
          {/* Status Bar */}
          <div className="h-10 px-6 pt-2 flex items-center justify-between text-[11px] font-semibold z-40">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-current rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* SCREEN CONTENT */}
          <div className="flex-1 flex flex-col relative overflow-hidden">
            
            {/* SCREEN 1: SPLASH */}
            {screen === 'splash' && (
              <div className="absolute inset-0 bg-white text-zinc-900 flex flex-col items-center justify-center p-6 text-center animate-fade-in z-50">
                <div className="relative flex flex-col items-center">
                  {/* Mascot Avatar Pulse */}
                  <div className="w-24 h-24 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-md animate-pulse">
                    <span className="text-4xl">🐱</span>
                  </div>
                  <h1 className="text-xl font-black tracking-tight mt-6 text-zinc-950">ROWAN</h1>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-2">
                    ONE INTELLIGENCE. EVERYWHERE.
                  </p>
                </div>
              </div>
            )}

            {/* SCREEN 2: AUTH */}
            {screen === 'auth' && (
              <div className="absolute inset-0 bg-white text-zinc-900 flex flex-col justify-between p-6 animate-fade-in z-50">
                <div className="pt-8 text-center space-y-4">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200/50 px-2.5 py-1 rounded-full uppercase">
                    Authorized Handshake
                  </span>
                  <h2 className="text-2xl font-black text-zinc-900 leading-tight">
                    Welcome to Rowan Companion
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Sign in with your active Supabase Web credentials to coordinate Rowan Core tools.
                  </p>
                </div>

                {/* Form fields */}
                <div className="space-y-3 my-auto">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                    <input 
                      type="text" 
                      value="rowanai425@gmail.com" 
                      disabled
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Security Access Key</label>
                    <input 
                      type="password" 
                      value="••••••••••••••••" 
                      disabled
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-2 pb-4">
                  <button
                    onClick={() => setScreen('onboarding')}
                    className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Authenticate Session</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[9px] text-zinc-400 text-center font-medium">
                    Protected by Rowan Unified Cryptographic Identity.
                  </p>
                </div>
              </div>
            )}

            {/* SCREEN 3: ONBOARDING */}
            {screen === 'onboarding' && (
              <div className="absolute inset-0 bg-white text-zinc-900 flex flex-col justify-between p-6 animate-fade-in z-50">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>ONBOARDING</span>
                  <span>{onboardingStep + 1} of 5</span>
                </div>

                {/* Onboarding page renderer */}
                <div className="flex-1 flex flex-col justify-center text-center space-y-4 my-auto">
                  {onboardingStep === 0 && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto text-3xl">
                        💻
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">Rowan on Websites</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Rowan floats natively over authorized eCommerce store layouts, providing immediate client-side assistance.
                      </p>
                      <div className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50 text-left space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-800">🍵 Ceremonial Matcha Premium</span>
                          <span className="text-[10px] font-black text-zinc-900">$42.00</span>
                        </div>
                        <button className="w-full bg-indigo-600 text-white font-bold py-1.5 rounded text-[9px]">
                          Ask Rowan operations advice
                        </button>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 1 && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto text-3xl">
                        📈
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">Rowan for Trading</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Authorize Rowan to track custom stock balances, evaluate market metrics, and execute transactions safely.
                      </p>
                      <div className="h-16 bg-zinc-900 rounded-xl flex items-end justify-between p-3">
                        <div className="w-4 h-6 bg-emerald-500 rounded-xs"></div>
                        <div className="w-4 h-10 bg-emerald-500 rounded-xs"></div>
                        <div className="w-4 h-4 bg-rose-500 rounded-xs"></div>
                        <div className="w-4 h-12 bg-emerald-500 rounded-xs"></div>
                        <div className="w-4 h-8 bg-emerald-500 rounded-xs"></div>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 2 && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto text-3xl">
                        📱
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">Connected to Your Phone</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Experience Rowan Core as a dynamic, persistent floating visual companion directly on your phone home-screen.
                      </p>
                      <div className="flex items-center gap-3 justify-center">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs">🐱</div>
                        <span className="text-xs font-black text-zinc-800">Unified core active.</span>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 3 && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto text-3xl">
                        ⚙️
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">Authorized Environments</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Run scripts inside custom terminal scopes, synchronize documents, and unify applications across devices.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 border border-zinc-100 rounded-lg text-[9px] font-bold">💻 Computer</div>
                        <div className="p-2 border border-zinc-100 rounded-lg text-[9px] font-bold">📱 Tablet</div>
                        <div className="p-2 border border-zinc-100 rounded-lg text-[9px] font-bold">🧑‍💻 Terminal</div>
                        <div className="p-2 border border-zinc-100 rounded-lg text-[9px] font-bold">📦 Apps & APIs</div>
                      </div>
                    </div>
                  )}

                  {onboardingStep === 4 && (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto text-3xl">
                        ✨
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">Authorize Rowan Core</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        By completing this configuration, you bind your Companion App to the active Rowan Web database securely.
                      </p>
                    </div>
                  )}
                </div>

                {/* Onboarding buttons */}
                <div className="space-y-3 pb-4">
                  <div className="flex items-center justify-center gap-1.5">
                    {[0, 1, 2, 3, 4].map(idx => (
                      <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all ${idx === onboardingStep ? 'w-4' : 'w-1.5 bg-zinc-200'}`}
                        style={{ backgroundColor: idx === onboardingStep ? accentColor : undefined }}
                      ></div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (onboardingStep < 4) {
                        setOnboardingStep(prev => prev + 1)
                      } else {
                        setScreen('main')
                      }
                    }}
                    className="w-full py-3.5 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: accentColor }}
                  >
                    <span>{onboardingStep === 4 ? 'Connect Rowan Companion' : 'Continue'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN 4: MAIN TABS HUB */}
            {screen === 'main' && (
              <div className="flex-1 flex flex-col h-full relative">
                
                {/* ACTIVE TAB: HOME (Rowan Interactive Chat) */}
                {activeTab === 'home' && (
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Dynamic header */}
                    <div className="px-4 py-2 border-b border-zinc-150 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Interactive Avatar */}
                        <div 
                          className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-xs cursor-pointer animate-pulse shrink-0"
                          onClick={() => setIsVoiceActive(true)}
                        >
                          <span className="text-xl">🐱</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-black my-0" style={{ color: accentColor }}>Rowan Core</h4>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span className="text-[9px] text-zinc-400 font-medium">Active Context</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setIsVoiceActive(true)}
                        className="px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        <Mic className="w-3 h-3" />
                        <span>Live Voice</span>
                      </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
                      {messages.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`p-3 rounded-2xl max-w-[85%] ${
                              msg.role === 'user' 
                                ? 'text-white rounded-br-none' 
                                : 'bg-zinc-100 text-zinc-800 rounded-bl-none'
                            }`}
                            style={{ backgroundColor: msg.role === 'user' ? accentColor : undefined }}
                          >
                            <p className="my-0 leading-relaxed font-medium">{msg.text}</p>
                          </div>
                        </div>
                      ))}

                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-zinc-100 p-3 rounded-2xl rounded-bl-none flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Composer Footer */}
                    <div className="p-2 border-t border-zinc-150 flex items-center gap-2">
                      <button className="p-2 text-zinc-400 hover:text-zinc-600">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input 
                        type="text" 
                        placeholder="Talk to Rowan..." 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="p-2 rounded-full text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ACTIVE TAB: CONVERSATIONS */}
                {activeTab === 'conversations' && (
                  <div className="flex-1 flex flex-col">
                    <div className="px-4 py-3 border-b border-zinc-150 flex items-center justify-between">
                      <h4 className="text-xs font-black tracking-wider text-zinc-500">CONVERSATIONS</h4>
                      <button 
                        onClick={() => {
                          setMessages([{ role: 'assistant', text: 'Hello! I am Rowan. Let’s start a fresh context.' }]);
                          setActiveTab('home');
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        + New
                      </button>
                    </div>

                    <div className="flex-1 p-3 space-y-2">
                      <div 
                        onClick={() => {
                          setMessages([
                            { role: 'user', text: 'How do I connect Rowan to Shopify?' },
                            { role: 'assistant', text: 'You can connect me via the Connect Tab under Ecommerce Websites. I will synchronize with your product inventory and shipping policies to assist customers natively.' }
                          ]);
                          setActiveTab('home');
                        }}
                        className="p-3 bg-white border border-zinc-150 rounded-xl hover:border-zinc-300 cursor-pointer space-y-1 text-left"
                      >
                        <h5 className="text-xs font-bold text-zinc-800 my-0">E-commerce Integration Strategy</h5>
                        <p className="text-[10px] text-zinc-400 my-0 font-medium">Yesterday</p>
                      </div>

                      <div 
                        onClick={() => {
                          setMessages([
                            { role: 'user', text: 'Can you help review code changes?' },
                            { role: 'assistant', text: 'Absolutely! With Developer Environment permissions, I can review repository changes, suggest optimizations, and draft clear commits.' }
                          ]);
                          setActiveTab('home');
                        }}
                        className="p-3 bg-white border border-zinc-150 rounded-xl hover:border-zinc-300 cursor-pointer space-y-1 text-left"
                      >
                        <h5 className="text-xs font-bold text-zinc-800 my-0">Automating Git Commits</h5>
                        <p className="text-[10px] text-zinc-400 my-0 font-medium">2 days ago</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTIVE TAB: CONNECT (HANDSHAKE CONTROL) */}
                {activeTab === 'connect' && (
                  <div className="flex-1 flex flex-col overflow-y-auto">
                    <div className="px-4 py-3 border-b border-zinc-150">
                      <h4 className="text-xs font-black tracking-wider text-zinc-500">CONNECT ROWAN</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-normal">
                        Control credential bindings and authorized cognitive capabilities.
                      </p>
                    </div>

                    <div className="p-3 space-y-3 text-left">
                      {/* Connection Category 1 */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Smartphone className="w-3 h-3" style={{ color: accentColor }} />
                          Devices
                        </span>
                        {['Phone', 'Tablet', 'Computer'].map(item => {
                          const active = connections[item] || false
                          return (
                            <div key={item} className="p-3 bg-white border border-zinc-150 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">{item}</span>
                              <button 
                                onClick={() => active ? handleDisconnect(item) : startConnectionWorkflow(item)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${
                                  active 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                }`}
                              >
                                {active ? 'Connected' : 'Connect'}
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      {/* Connection Category 2 */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Globe className="w-3 h-3" style={{ color: accentColor }} />
                          Websites
                        </span>
                        {['Personal websites', 'Ecommerce websites', 'Business websites'].map(item => {
                          const active = connections[item] || false
                          return (
                            <div key={item} className="p-3 bg-white border border-zinc-150 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">{item}</span>
                              <button 
                                onClick={() => active ? handleDisconnect(item) : startConnectionWorkflow(item)}
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${
                                  active 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                                }`}
                              >
                                {active ? 'Connected' : 'Connect'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Step-by-step handshake modal trigger inside Simulator */}
                    {currentConnectingItem && (
                      <div className="absolute inset-x-0 bottom-0 bg-white border-t border-zinc-200 p-4 shadow-xl text-left z-50 space-y-3 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-zinc-900">Handshake: {currentConnectingItem}</h5>
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Step {connectStep}/6</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${(connectStep/6)*100}%` }}></div>
                        </div>

                        {connectStep === 1 && (
                          <p className="text-[11px] text-zinc-500">
                            <strong>1. Connect Rowan</strong>: Establish secure token endpoints to access {currentConnectingItem}.
                          </p>
                        )}
                        {connectStep === 2 && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-zinc-500"><strong>2. Authentication</strong>: Verify merchant / credentials.</p>
                            <input type="password" placeholder="Key Endpoint/OAuth Token" className="w-full text-[10px] p-2 border rounded" disabled />
                          </div>
                        )}
                        {connectStep === 3 && (
                          <p className="text-[11px] text-zinc-500">
                            <strong>3. What should Rowan do?</strong>: Describe task scope. e.g. "Handle matcha customer support."
                          </p>
                        )}
                        {connectStep === 4 && (
                          <p className="text-[11px] text-zinc-500">
                            <strong>4. Context & Permissions</strong>: Grant access to inventory database, products, and analytics.
                          </p>
                        )}
                        {connectStep === 5 && (
                          <p className="text-[11px] text-zinc-500">
                            <strong>5. Capabilities & Tools</strong>: Register dynamic cognitive APIs (invent_look, stripe_cart).
                          </p>
                        )}
                        {connectStep === 6 && (
                          <div className="text-center space-y-1">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <p className="text-[11px] text-zinc-800 font-bold">Secure connection established successfully!</p>
                          </div>
                        )}

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button 
                            onClick={() => setCurrentConnectingItem(null)}
                            className="px-2.5 py-1 text-[10px] text-zinc-500 hover:bg-zinc-100 rounded"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleNextConnectStep}
                            className="px-3.5 py-1 text-[10px] text-white rounded bg-zinc-900 hover:bg-zinc-800 font-bold"
                          >
                            {connectStep === 6 ? 'Authorize' : 'Continue'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ACTIVE TAB: YOU (Appearance Customize) */}
                {activeTab === 'you' && (
                  <div className="flex-1 flex flex-col overflow-y-auto text-left">
                    <div className="px-4 py-3 border-b border-zinc-150">
                      <h4 className="text-xs font-black tracking-wider text-zinc-500">CUSTOMIZE COMPANION</h4>
                    </div>

                    <div className="p-4 space-y-4 text-xs font-semibold">
                      {/* Avatar Picker */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Avatar Style</label>
                        <select 
                          value={avatarStyle}
                          onChange={e => setAvatarStyle(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 bg-white"
                        >
                          <option>Rowan Classic</option>
                          <option>Quantum Sphere</option>
                          <option>Cybernetic Node</option>
                          <option>Minimalist Pulse</option>
                        </select>
                      </div>

                      {/* Theme Mode Picker */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Theme Mode</label>
                        <select 
                          value={themeMode}
                          onChange={e => setThemeMode(e.target.value as 'light' | 'dark')}
                          className="w-full text-xs p-2 rounded-lg border border-zinc-200 bg-white"
                        >
                          <option value="light">Light Mode</option>
                          <option value="dark">Dark Mode</option>
                        </select>
                      </div>

                      {/* Accent Picker */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Accent Color</label>
                        <div className="flex items-center justify-between gap-1">
                          {[
                            { label: 'Blue', color: '#1E6091' },
                            { label: 'Purple', color: '#6366f1' },
                            { label: 'Teal', color: '#14b8a6' },
                            { label: 'Emerald', color: '#10b981' },
                            { label: 'Amber', color: '#f59e0b' }
                          ].map(color => (
                            <button
                              key={color.label}
                              onClick={() => setAccentColor(color.color)}
                              className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center`}
                              style={{ 
                                backgroundColor: color.color,
                                borderColor: accentColor === color.color ? '#000000' : 'transparent'
                              }}
                            >
                              {accentColor === color.color && <Check className="w-3 h-3 text-white" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Upload mockup */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Rowan Logo branding</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setCustomLogo('Brand Uploader.png')}
                            className="flex-1 p-2 border border-dashed border-zinc-300 rounded-lg text-center text-[10px] font-bold text-zinc-600 hover:border-zinc-400"
                          >
                            Upload Custom
                          </button>
                          <button 
                            onClick={() => setCustomLogo('Default Rowan Core')}
                            className="flex-1 p-2 border border-zinc-200 bg-zinc-50 rounded-lg text-center text-[10px] font-bold text-zinc-600 hover:bg-zinc-100"
                          >
                            Reset
                          </button>
                        </div>
                        {customLogo !== 'Default Rowan Core' && (
                          <span className="text-[9px] text-zinc-400 italic block">Active: {customLogo}</span>
                        )}
                      </div>

                      {/* Preview console */}
                      <div className="p-3 bg-zinc-50 border rounded-xl space-y-1 text-center">
                        <span className="text-[9px] text-zinc-400 tracking-wider font-extrabold uppercase block">LIVE PREVIEW</span>
                        <div className="w-12 h-12 bg-white rounded-full border shadow-xs flex items-center justify-center mx-auto text-xl">
                          🐱
                        </div>
                        <h5 className="text-[11px] font-bold my-0" style={{ color: accentColor }}>Rowan ({avatarStyle})</h5>
                        <p className="text-[9px] text-zinc-400 italic leading-normal font-medium">"Hello. Ready for customized instructions."</p>
                      </div>

                      {/* Log out */}
                      <button 
                        onClick={() => setScreen('auth')}
                        className="w-full py-2 bg-rose-50 text-rose-600 border border-rose-200/50 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out of Rowan</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VOICE OVERLAY SCREEN */}
                {isVoiceActive && (
                  <div className="absolute inset-0 bg-zinc-950/98 text-white flex flex-col justify-between p-6 z-50 animate-fade-in">
                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={() => setIsVoiceActive(false)}
                        className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full"
                      >
                        Close
                      </button>
                    </div>

                    <div className="space-y-6 text-center my-auto">
                      {/* Pulsating Orb */}
                      <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-amber-500 to-indigo-500 animate-pulse flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
                        <span className="text-5xl animate-bounce">🐱</span>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-base font-black my-0 tracking-tight">Rowan Active Speech</h3>
                        <p className="text-[10px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                          Speak clearly. Rowan is synchronized with websites, developer databases, and file permissions.
                        </p>
                      </div>

                      {/* Sound Wave simulator */}
                      <div className="flex items-center justify-center gap-1.5 h-8">
                        <div className="w-1 h-4 bg-amber-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                        <div className="w-1 h-7 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                        <div className="w-1 h-5 bg-teal-400 rounded-full animate-bounce [animation-delay:0.5s]"></div>
                        <div className="w-1 h-8 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>

                    <div className="text-center pb-4">
                      <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
                        Listening... Say "Stop" to end
                      </span>
                    </div>
                  </div>
                )}

                {/* Bottom Navigation Tabs bar */}
                <div className="h-14 border-t border-zinc-150 flex items-center justify-around bg-white shrink-0">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className="flex flex-col items-center gap-1 text-[9px] font-bold"
                    style={{ color: activeTab === 'home' ? accentColor : '#9ca3af' }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Home</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('conversations')}
                    className="flex flex-col items-center gap-1 text-[9px] font-bold"
                    style={{ color: activeTab === 'conversations' ? accentColor : '#9ca3af' }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chats</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('connect')}
                    className="flex flex-col items-center gap-1 text-[9px] font-bold"
                    style={{ color: activeTab === 'connect' ? accentColor : '#9ca3af' }}
                  >
                    <Network className="w-4 h-4" />
                    <span>Connect</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('you')}
                    className="flex flex-col items-center gap-1 text-[9px] font-bold"
                    style={{ color: activeTab === 'you' ? accentColor : '#9ca3af' }}
                  >
                    <User className="w-4 h-4" />
                    <span>You</span>
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* Home Indicator bar */}
          <div className="h-6 w-full flex items-center justify-center bg-transparent z-40">
            <div className="w-32 h-1 bg-zinc-300 rounded-full"></div>
          </div>

        </div>

      </div>
    </div>
  )
}
