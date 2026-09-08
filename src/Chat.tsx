import { RowanConversationalInterface } from './components/RowanConversationalInterface'

export default function Chat({
  navigate,
  onNavigate
}: {
  navigate?: (to: string) => void
  onNavigate?: (view: string) => void
}) {
  const handleNav = (to: string) => {
    if (navigate) {
      navigate(to)
    } else if (onNavigate) {
      onNavigate(to)
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col justify-between relative">
      {/* Soft elegant top neutral background gradient */}
      <div className="absolute top-0 left-0 right-0 h-[400px] pointer-events-none bg-gradient-to-b from-zinc-50/60 to-transparent z-0" />

      {/* Presentation Layer: Clean Conversational Layout, Compact Controls, Floating Composer & Voice Controls */}
      <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
        <RowanConversationalInterface navigate={handleNav} />
      </div>
    </div>
  )
}
