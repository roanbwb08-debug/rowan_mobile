import { useEffect, useState } from 'react'
import Landing from './Landing'
import Chat from './Chat'
import { AppShell } from './components/AppShell'
import { CodingWorkspace } from './views/CodingWorkspace'
import { Dashboard } from './views/Dashboard'
import { ConversationsView } from './views/ConversationsView'
import { Connect } from './views/Connect'
import { Catalog } from './views/Catalog'
import { Assistant } from './views/Assistant'
import { Integrations } from './views/Integrations'
import { Analytics } from './views/Analytics'
import { Settings } from './views/Settings'
import { Trading } from './views/Trading'
import { Devices } from './views/Devices'
import { ConnectPhone } from './views/ConnectPhone'
import { DemoStore } from './views/DemoStore'
import { Auth } from './views/Auth'
import { Onboarding } from './views/Onboarding'
import { FAQ } from './views/FAQ'
import { rowanAuth } from './lib/supabase'
import type { SandboxUser } from './lib/supabase'
import { Loader2 } from 'lucide-react'

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [user, setUser] = useState<SandboxUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    // Listen to Supabase/Sandbox Auth state changes
    const { data: { subscription } } = rowanAuth.onAuthStateChange((currentUser) => {
      setUser(currentUser)
      setAuthChecked(true)
    })

    const handlePopState = () => {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      subscription?.unsubscribe()
    }
  }, [])

  const navigate = (to: string) => {
    window.history.pushState({}, '', to)
    setPath(to)
  }

  // Display initial loading spinner during auth initialization to prevent layout flashes
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="text-xs font-bold text-zinc-500">Initializing Rowan Security Shield...</span>
      </div>
    )
  }

  // Public/Unprotected Routes
  if (path === '/') {
    return <Landing navigate={navigate} />
  }

  if (path === '/chat') {
    return <Chat navigate={navigate} />
  }

  if (path === '/demo') {
    return <DemoStore />
  }

  // Auth pages (Redirect to dashboard if already logged in)
  if (path === '/login' || path === '/signup') {
    if (user) {
      // Defer redirect to next tick
      setTimeout(() => navigate('/dashboard'), 0)
      return null
    }
    return <Auth navigate={navigate} initialMode={path === '/login' ? 'login' : 'signup'} />
  }

  if (path === '/onboarding') {
    if (!user) {
      setTimeout(() => navigate('/login'), 0)
      return null
    }
    return <Onboarding navigate={navigate} />
  }

  // Protected Dashboard / Workspace Shell Routes
  if (!user) {
    // Attempted to access protected content while logged out -> Redirect
    setTimeout(() => navigate('/login'), 0)
    return null
  }

  const renderShellContent = () => {
    switch (path) {
      case '/dashboard':
        return <Dashboard navigate={navigate} />
      case '/conversations':
        return <ConversationsView navigate={navigate} />
      case '/coding':
        return <CodingWorkspace />
      case '/connect':
      case '/connect/websites':
      case '/websites':
        return <Connect />
      case '/connect/phone':
        return <ConnectPhone navigate={navigate} />
      case '/catalog':
        return <Catalog />
      case '/assistant':
        return <Assistant />
      case '/integrations':
        return <Integrations />
      case '/analytics':
        return <Analytics />
      case '/settings':
      case '/you':
        return <Settings />
      case '/trading':
        return <Trading />
      case '/devices':
        return <Devices />
      case '/faq':
        return <FAQ />
      default:
        return <Dashboard navigate={navigate} />
    }
  }

  return (
    <AppShell currentPath={path} navigate={navigate}>
      {renderShellContent()}
    </AppShell>
  )
}
