import React from 'react'
import { PhoneConnectionFlow } from '../components/PhoneConnectionFlow'
import { MobileSimulator } from '../components/MobileSimulator'
import { Shield, ArrowLeft } from 'lucide-react'

interface ConnectPhoneProps {
  navigate?: (path: string) => void
}

export const ConnectPhone: React.FC<ConnectPhoneProps> = ({ navigate }) => {
  const handleComplete = () => {
    if (navigate) {
      navigate('/devices')
    } else {
      window.location.href = '/devices'
    }
  }

  const handleCancel = () => {
    if (navigate) {
      navigate('/connect')
    } else {
      window.location.href = '/connect'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="space-y-1">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-800 transition-colors mb-2 cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Connection Center</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-extrabold uppercase tracking-widest">
              Rowan Companion Protocol
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 my-0">
            Connect Your Phone
          </h1>
          <p className="text-xs text-zinc-500 max-w-xl my-0 font-medium">
            Pair your iOS or Android mobile device with Rowan using cryptographic one-time authentication.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs text-zinc-600">
          <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-[11px] font-medium">
            Zero permanent credentials in QR code. 5-min session timeout.
          </span>
        </div>
      </div>

      {/* Main Flow Layout: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Pairing Flow Card - 7 Columns */}
        <div className="lg:col-span-7">
          <PhoneConnectionFlow onComplete={handleComplete} onCancel={handleCancel} />
        </div>

        {/* Live Simulator - 5 Columns */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
          <MobileSimulator />
        </div>
      </div>
    </div>
  )
}
