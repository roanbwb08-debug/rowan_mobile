import React from 'react'
import { motion } from 'motion/react'
import { Globe, Compass, Lightbulb, Image as ImageIcon, Zap } from 'lucide-react'
import { RowanExpressiveAvatar } from './RowanExpressiveAvatar'

interface RowanIdleHeroProps {
  onSelectPrompt: (promptText: string) => void
  onStartVoice: () => void
  theme?: 'dark' | 'light'
}

const IDLE_PILLS = [
  {
    icon: Lightbulb,
    label: 'Tell me a joke',
    prompt: 'Tell me a clever, witty joke.'
  },
  {
    icon: Zap,
    label: 'Explain quantum computing',
    prompt: 'Explain quantum computing in simple terms for a beginner.'
  },
  {
    icon: Globe,
    label: 'Latest tech news',
    prompt: 'Search the web for the latest artificial intelligence and tech news today.'
  },
  {
    icon: Compass,
    label: 'Motivate me',
    prompt: 'Give me a strong, inspiring motivational quote and actionable advice to conquer today.'
  },
  {
    icon: ImageIcon,
    label: 'Generate an image',
    prompt: 'Rowan, generate an image of a futuristic floating glass sanctuary in the clouds.'
  }
]

export const RowanIdleHero: React.FC<RowanIdleHeroProps> = ({
  onSelectPrompt,
  onStartVoice,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 text-center select-none max-w-lg mx-auto w-full">
      {/* 1. LARGE EXPRESSIVE ROWAN AVATAR (HERO STATE) */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft background pulse halo */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl scale-125 pointer-events-none" />

        <RowanExpressiveAvatar
          state="idle"
          size={130}
          theme={theme}
          onClick={onStartVoice}
          className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
          showStatusBadge={false}
        />
      </div>

      {/* 2. GREETING HEADINGS MATCHING REFERENCE IMAGE */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="space-y-1 mb-6"
      >
        <h2
          className={`text-xl sm:text-2xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        >
          Hello, I'm <span className="text-blue-500">ROWAN</span>
        </h2>
        <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          Your AI Assistant
        </p>
      </motion.div>

      {/* 3. QUICK ACTION SUGGESTION PILLS MATCHING REFERENCE IMAGE */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="flex flex-wrap items-center justify-center gap-2 max-w-md w-full"
      >
        {IDLE_PILLS.map((pill, idx) => {
          const Icon = pill.icon
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(pill.prompt)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-[#151c28] hover:bg-[#1f293d] text-zinc-200 border border-slate-800/90 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'bg-zinc-100 hover:bg-zinc-200/90 text-zinc-800 border border-zinc-200/80 hover:border-blue-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span>{pill.label}</span>
            </button>
          )
        })}
      </motion.div>
    </div>
  )
}
