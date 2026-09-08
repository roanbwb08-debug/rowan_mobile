import React from 'react'
import { motion } from 'motion/react'
import { ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react'

export interface ResearchSourceItem {
  title: string
  url: string
  snippet?: string
  image?: string
}

interface RowanResearchViewProps {
  sources: ResearchSourceItem[]
  onOpenWebsite: (url: string, title?: string) => void
  theme?: 'dark' | 'light'
}

export const RowanResearchView: React.FC<RowanResearchViewProps> = ({
  sources,
  onOpenWebsite,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark'

  if (!sources || sources.length === 0) return null

  // Extract domain name
  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return parsed.hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  // Favicon generator
  const getFavicon = (url: string) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`
    } catch {
      return null
    }
  }

  const featured = sources[0]
  const remainingSources = sources.slice(1)

  return (
    <div className="my-3 space-y-3 select-none">
      {/* 1. VERIFIED SOURCES HEADER & CHIPS */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            isDark ? 'text-zinc-300' : 'text-zinc-700'
          }`}>
            Verified Sources
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold">
            {sources.length}
          </span>
        </div>

        {/* Sources chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
          {sources.slice(0, 4).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenWebsite(s.url, s.title)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer flex-shrink-0 ${
                isDark
                  ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
              }`}
            >
              <img
                src={getFavicon(s.url) || ''}
                alt=""
                className="w-3 h-3 rounded-full"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
              />
              <span className="truncate max-w-[90px]">{getDomain(s.url)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. FEATURED HERO SOURCE CARD (IF IMAGE OR TOP SOURCE) */}
      {featured && (
        <motion.div
          whileHover={{ y: -1 }}
          onClick={() => onOpenWebsite(featured.url, featured.title)}
          className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer ${
            isDark
              ? 'bg-[#111724] hover:bg-[#161e30] border-slate-800 hover:border-blue-500/40 shadow-lg'
              : 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-blue-300 shadow-sm'
          }`}
        >
          {featured.image && (
            <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-950">
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            </div>
          )}

          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-500">
                <img
                  src={getFavicon(featured.url) || ''}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none'
                  }}
                />
                <span>{getDomain(featured.url)}</span>
              </div>

              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open inside Rowan</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <h4
              className={`text-xs sm:text-sm font-bold line-clamp-2 ${
                isDark ? 'text-zinc-100' : 'text-zinc-900'
              }`}
            >
              {featured.title}
            </h4>

            {featured.snippet && (
              <p
                className={`text-[11px] line-clamp-2 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {featured.snippet}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* 3. ADDITIONAL SOURCE CARDS */}
      {remainingSources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {remainingSources.slice(0, 4).map((source, idx) => (
            <div
              key={idx}
              onClick={() => onOpenWebsite(source.url, source.title)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                isDark
                  ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-zinc-50 hover:bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                  <div className="flex items-center gap-1">
                    <img
                      src={getFavicon(source.url) || ''}
                      alt=""
                      className="w-3 h-3 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                    <span className="font-semibold text-blue-500">{getDomain(source.url)}</span>
                  </div>
                  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                </div>

                <p
                  className={`text-xs font-semibold line-clamp-2 ${
                    isDark ? 'text-zinc-200 group-hover:text-blue-400' : 'text-zinc-800 group-hover:text-blue-600'
                  }`}
                >
                  {source.title}
                </p>
              </div>

              {source.snippet && (
                <p className={`text-[10px] line-clamp-1 mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {source.snippet}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
