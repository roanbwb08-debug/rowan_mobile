import React, { useEffect, useState } from 'react'
import { Sparkles, Code, Clipboard, ShoppingBag, ArrowRight, Star, Layers, ShieldCheck, Heart } from 'lucide-react'

export const DemoStore: React.FC = () => {
  const [copied, setCopied] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [sessionId] = useState(() => {
    const cached = localStorage.getItem('rowan_widget_session_id')
    if (cached) return cached
    const generated = `demo-${Math.random().toString(36).substring(2, 11)}`
    localStorage.setItem('rowan_widget_session_id', generated)
    return generated
  })

  const trackDemoEvent = async (type: string, data: Record<string, unknown>) => {
    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type,
          data
        })
      })
    } catch (e) {
      console.warn('[DEMO TELEMETRY ERROR]:', e)
    }
  }

  const handleAddToCart = (productId: string, productName: string, price: number) => {
    setCartCount(c => c + 1)
    trackDemoEvent('conversion', { productId, productName, value: price })
  }

  const handleProductView = (productId: string, productName: string) => {
    trackDemoEvent('product_interest', { productId, productName })
  }

  // Dynamically load our compiled embeddable widget to float over the fake store
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/rowan-widget.js'
    script.setAttribute('data-store-id', 'demo-store-001')
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup script and widget nodes on component unmount
      document.body.removeChild(script)
      const host = document.getElementById('rowan-widget-host')
      if (host) host.remove()
      // Remove loaded flag to allow re-initialization
      delete (window as unknown as Record<string, unknown>).__RowanWidgetLoaded__
    }
  }, [])

  const copySnippet = () => {
    navigator.clipboard.writeText(
      `<script src="${window.location.origin}/rowan-widget.js" data-store-id="demo-store-001"></script>`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const products = [
    { id: 'coffee-001', name: 'Ceremonial Matcha Premium', price: 42, rating: 4.9, image: '🍵' },
    { id: 'coffee-002', name: 'Ethiopia Yirgacheffe (Whole Bean)', price: 18, rating: 4.8, image: '🫘' },
    { id: 'coffee-003', name: 'Double-Walled Travel Tumbler', price: 34, rating: 4.7, image: '🥤' },
    { id: 'coffee-004', name: 'Artisanal Cold Brew Pack (6-pack)', price: 28, rating: 4.9, image: '🥫' }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Merchant Admin Instruction Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-neutral-950 text-white px-4 py-4 shadow-md border-b border-indigo-550">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide flex flex-wrap items-center gap-1.5 leading-none">
                Rowan Embeddable Assistant Demo
                <span className="text-[10px] uppercase font-bold bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">Active</span>
                <span className="text-[10px] uppercase font-bold bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20">Voice Mode Ready</span>
              </h1>
              <p className="text-xs text-neutral-300 mt-1">This page represents a merchant's website. Open Rowan and click the <strong className="text-amber-400">Microphone</strong> button (or toggle <strong className="text-amber-400">Continuous wake-word</strong> and say <strong className="text-white">"Rowan"</strong>) to try the Orange-Style Voice Assistant!</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <button
              onClick={copySnippet}
              className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 px-3 py-2 rounded-lg font-medium transition-colors border border-white/10 w-full md:w-auto justify-center"
            >
              {copied ? (
                <>
                  <Clipboard className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Integration Script!</span>
                </>
              ) : (
                <>
                  <Code className="w-3.5 h-3.5" />
                  <span>Copy Embed HTML Snippet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Store Shell */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Fake Merchant Header */}
        <header className="flex items-center justify-between py-6 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-widest">
              A
            </div>
            <span className="font-bold tracking-wider text-lg uppercase text-neutral-900">The Artisanal Blend</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-500">
            <a href="#shop" className="text-neutral-900 hover:text-indigo-600 transition-colors">Shop</a>
            <a href="#about" className="hover:text-indigo-600 transition-colors">Our Story</a>
            <a href="#sustainability" className="hover:text-indigo-600 transition-colors">Sustainability</a>
          </nav>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCartCount(c => c + 1)}
              className="flex items-center gap-2 border border-neutral-200 hover:border-neutral-300 bg-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors relative"
            >
              <ShoppingBag className="w-4 h-4 text-neutral-700" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="mt-10 bg-neutral-900 rounded-3xl overflow-hidden relative shadow-lg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_45%)]"></div>
          <div className="relative px-8 py-20 md:py-24 max-w-2xl">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-900/40">
              Premium Roast Coffee & Gear
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mt-6 leading-tight">
              Elevate Your Daily Ritual.
            </h2>
            <p className="text-neutral-300 text-base mt-4 leading-relaxed">
              Meticulously sourced, single-origin roasts and ceremonial matcha curated to perfection. Experience unparalleled taste.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#shop"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-indigo-500/10"
              >
                <span>Shop the Collection</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => {
                  // Direct trigger of Rowan widget inside shadow DOM
                  const widgetHost = document.getElementById('rowan-widget-host');
                  if (widgetHost && widgetHost.shadowRoot) {
                    const launcher = widgetHost.shadowRoot.querySelector('.rowan-launcher') as HTMLElement;
                    if (launcher) launcher.click();
                  }
                }}
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
              >
                <span>Ask Rowan operations advice</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>
        </section>

        {/* Core Products Grid */}
        <section id="shop" className="mt-16">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-8">
            <div>
              <h3 className="text-xl font-bold text-neutral-900">Featured Curations</h3>
              <p className="text-xs text-neutral-500 mt-1">Sourced responsibly from sustainable organic farms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div 
                key={p.id} 
                className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm group hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleProductView(p.id, p.name)}
              >
                <div className="h-48 bg-neutral-100 flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-300">
                  {p.image}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Limited Supply</span>
                    <div className="flex items-center text-amber-500 text-xs font-semibold gap-1">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <span>{p.rating}</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-neutral-900 mt-2 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                    {p.name}
                  </h4>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-extrabold text-neutral-900 text-sm">${p.price}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddToCart(p.id, p.name, p.price)
                      }}
                      className="text-xs font-bold bg-neutral-900 hover:bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg transition-colors"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="mt-20 border-t border-neutral-200 pt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-sm">Carbon Negative Shipping</h4>
              <p className="text-xs text-neutral-500 leading-relaxed mt-1">We offset 100% of all delivery emissions with sustainable clean-energy investments.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-sm">30-Day Pure Satisfaction</h4>
              <p className="text-xs text-neutral-500 leading-relaxed mt-1">Not satisfied? Return any open or used blends for a complete, hassle-free refund.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-sm">Direct Farm Philanthropy</h4>
              <p className="text-xs text-neutral-500 leading-relaxed mt-1">A significant percentage of every bag sold goes straight back to coffee farming cooperatives.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
