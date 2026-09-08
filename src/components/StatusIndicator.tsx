import React from 'react'

interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'pending' | 'critical'
  label?: string
  showPulse?: boolean
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  showPulse = true
}) => {
  const configs = {
    active: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-800',
      dot: 'bg-emerald-500'
    },
    inactive: {
      bg: 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800',
      dot: 'bg-zinc-400'
    },
    pending: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/10 dark:text-amber-400 dark:border-amber-800',
      dot: 'bg-amber-500'
    },
    critical: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-800',
      dot: 'bg-rose-500'
    }
  }

  const current = configs[status]

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${current.bg} select-none whitespace-nowrap`}>
      <span className="relative flex h-2 w-2">
        {showPulse && status === 'active' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        {showPulse && status === 'critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`}></span>
      </span>
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
