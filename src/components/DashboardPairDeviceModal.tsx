import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Smartphone } from 'lucide-react'
import { PhoneConnectionFlow } from './PhoneConnectionFlow'

interface DashboardPairDeviceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const DashboardPairDeviceModal: React.FC<DashboardPairDeviceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in"
          id="dashboard-pair-device-overlay"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-[#0e141c] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(13,148,136,0.1)] relative my-8"
            id="dashboard-pair-device-modal"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100 my-0">
                    Connect a device
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Connect Rowan to another device so your Rowan experience follows you.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                aria-label="Close pair device modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Real Pairing Flow */}
            <div className="mt-4">
              <PhoneConnectionFlow
                onComplete={() => {
                  if (onSuccess) onSuccess()
                  onClose()
                }}
                onCancel={onClose}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
