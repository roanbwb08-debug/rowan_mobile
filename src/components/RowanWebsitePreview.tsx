import React, { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ExternalLink, Globe, Lock, RefreshCw, X } from 'lucide-react'

interface RowanWebsitePreviewProps {
  url: string
  title?: string
  onClose: () => void
  onBack: () => void
  theme?: 'dark' | 'light'
}

export const RowanWebsitePreview: React.FC<RowanWebsitePreviewProps> = ({
  url,
  title,
  onClose,
  onBack,
  theme = 'dark'
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeBlocked, setIframeBlocked] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  // Extract clean domain
  const getDomain = () => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return parsed.hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  const domain = getDomain()

  const handleOpenExternal = () => {
    window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer')
  }

  const handleRefresh = () => {
    setIframeLoaded(false)
    setIframeBlocked(false)
    setIframeKey(k => k + 1)
  }

  const isDark = theme === 'dark'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`absolute inset-0 z-30 flex flex-col rounded-2xl overflow-hidden ${
        isDark ? 'bg-[#0f172a] text-white' : 'bg-white text-zinc-900'
      }`}
    >
      {/* 1. PREVIEW HEADER */}
      <div
        className={`px-3.5 py-2.5 flex items-center justify-between border-b gap-2 select-none ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-zinc-100/90 border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Back to Rowan"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* URL / Security Bar */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium truncate max-w-[210px] sm:max-w-xs ${
              isDark ? 'bg-slate-950/70 border border-slate-800 text-slate-300' : 'bg-white border border-zinc-200 text-zinc-700'
            }`}
          >
            <Lock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span className="truncate">{domain}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleOpenExternal}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              isDark
                ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
            }`}
            title="Open in new tab"
          >
            <span>Open</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TITLE BAR */}
      {title && (
        <div
          className={`px-4 py-1.5 text-xs font-medium truncate border-b ${
            isDark ? 'bg-slate-950/40 border-slate-800/80 text-slate-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
          }`}
        >
          {title}
        </div>
      )}

      {/* 3. IFRAME VIEWPORT */}
      <div className="relative flex-grow w-full bg-slate-950 overflow-hidden">
        {/* Loading shimmer */}
        {!iframeLoaded && !iframeBlocked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 z-10 text-slate-300">
            <div className="w-7 h-7 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
            <span className="text-xs font-medium">Loading website preview...</span>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={url.startsWith('http') ? url : `https://${url}`}
          title={title || domain}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeBlocked(true)}
        />

        {/* Embedded restriction fallback banner */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between gap-3 text-xs z-20 backdrop-blur-md border-t ${
            isDark
              ? 'bg-slate-950/90 border-slate-800 text-slate-300'
              : 'bg-white/95 border-zinc-200 text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">Website previewing inside Rowan</span>
          </div>

          <button
            type="button"
            onClick={handleOpenExternal}
            className="flex-shrink-0 px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-semibold transition-colors cursor-pointer text-xs"
          >
            Open Website
          </button>
        </div>
      </div>
    </motion.div>
  )
}
