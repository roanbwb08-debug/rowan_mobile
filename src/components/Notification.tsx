import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export interface Toast {
  id: string
  message: string
  type?: 'success' | 'warning' | 'error' | 'info'
}

interface NotificationProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export const Notification: React.FC<NotificationProps> = ({ toasts, onRemove }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
    info: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  }

  const borderColors = {
    success: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10',
    error: 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/10',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/10'
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const type = toast.type || 'info'
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 border rounded-xl shadow-lg ${borderColors[type]}`}
            >
              <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50 leading-tight">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className="flex-shrink-0 p-0.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
