import { createClient } from '@supabase/supabase-js'

// Load Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if we are in placeholder/offline simulation mode
export const isSandboxMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')

// Initialize Supabase Client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Types for Supabase schema mapping
export interface UserProfile {
  id: string
  email: string
  use_cases: string[]
  selected_plan: string | null
  created_at: string
  updated_at: string
}

export interface SupabaseConversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ProductReference {
  id: string
  name: string
  price: number
  category?: string
  imageUrl?: string
}

export interface RowanConnection {
  id: string
  user_id: string
  type: 'website' | 'phone' | 'device' | 'app' | 'trading'
  name: string
  url?: string
  instructions?: string
  role?: string
  personality?: string
  additional_instructions?: string
  permissions?: Record<string, boolean>
  metadata?: Record<string, string | number | boolean | null | undefined>
  status: 'connected' | 'disconnected' | 'pending' | 'revoked' | 'error' | 'awaiting_verification'
  created_at: string
  updated_at: string
}

export interface ResearchSourceItem {
  title: string
  url: string
  snippet?: string
}

export interface ResearchData {
  query?: string
  summary?: string
  sources?: ResearchSourceItem[]
  provider?: string
}

export interface SupabaseMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  products: ProductReference[]
  research?: ResearchData
  timestamp: string
}

export interface SandboxUser {
  id: string
  email: string
  createdAt?: string
  password?: string
}

// Sandbox LocalStorage Keys
const KEYS = {
  SESSION: 'rowan_sandbox_session',
  USERS: 'rowan_sandbox_users',
  PROFILES: 'rowan_sandbox_profiles',
  CONVERSATIONS: 'rowan_sandbox_conversations',
  MESSAGES: 'rowan_sandbox_messages',
  CONNECTIONS: 'rowan_sandbox_connections'
}

/**
 * Authentication Wrapper with transparent Sandbox mode
 */
export const rowanAuth = {
  isSandbox: () => isSandboxMode,

  async signUp(email: string, password: string) {
    if (isSandboxMode) {
      const users: SandboxUser[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]')
      if (users.some((u) => u.email === email)) {
        return { data: { user: null }, error: { message: 'User already exists.' } }
      }
      const newUser: SandboxUser = { id: crypto.randomUUID(), email, createdAt: new Date().toISOString() }
      users.push({ ...newUser, password })
      localStorage.setItem(KEYS.USERS, JSON.stringify(users))

      const session = { user: newUser, token: 'sandbox_token_' + btoa(newUser.email) }
      localStorage.setItem(KEYS.SESSION, JSON.stringify(session))
      this.triggerAuthChange(newUser, session.token)
      return { data: { user: newUser }, error: null }
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { data: null, error }
    if (data.user) {
      // Create profile automatically
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email!,
        use_cases: [],
        selected_plan: null,
        updated_at: new Date().toISOString()
      })
    }
    return { data, error: null }
  },

  async signIn(email: string, password: string) {
    if (isSandboxMode) {
      const users: SandboxUser[] = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]')
      const user = users.find((u) => u.email === email && u.password === password)
      if (!user) {
        return { data: { user: null }, error: { message: 'Invalid login credentials.' } }
      }
      const sessionUser: SandboxUser = { id: user.id, email: user.email, createdAt: user.createdAt }
      const session = { user: sessionUser, token: 'sandbox_token_' + btoa(user.email) }
      localStorage.setItem(KEYS.SESSION, JSON.stringify(session))
      this.triggerAuthChange(sessionUser, session.token)
      return { data: { user: sessionUser, session }, error: null }
    }

    return await supabase.auth.signInWithPassword({ email, password })
  },

  async signOut() {
    if (isSandboxMode) {
      localStorage.removeItem(KEYS.SESSION)
      this.triggerAuthChange(null, null)
      return { error: null }
    }
    return await supabase.auth.signOut()
  },

  async getSession(): Promise<{ access_token: string; user: SandboxUser | null } | null> {
    if (isSandboxMode) {
      const sessionStr = localStorage.getItem(KEYS.SESSION)
      if (!sessionStr) return null
      try {
        const session = JSON.parse(sessionStr)
        return {
          access_token: session.token || 'sandbox_token',
          user: session.user || null
        }
      } catch {
        return null
      }
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return {
      access_token: session.access_token,
      user: session.user as unknown as SandboxUser
    }
  },

  async getSessionUser(): Promise<SandboxUser | null> {
    if (isSandboxMode) {
      const sessionStr = localStorage.getItem(KEYS.SESSION)
      if (!sessionStr) return null
      try {
        const session = JSON.parse(sessionStr)
        return session.user
      } catch {
        return null
      }
    }
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user || null
  },

  async getSessionToken(): Promise<string | null> {
    if (isSandboxMode) {
      const sessionStr = localStorage.getItem(KEYS.SESSION)
      if (!sessionStr) return null
      try {
        const session = JSON.parse(sessionStr)
        return session.token
      } catch {
        return null
      }
    }
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  },

  async getAccessToken(): Promise<string | null> {
    return this.getSessionToken()
  },

  listeners: [] as Array<(user: SandboxUser | null, token: string | null) => void>,
  onAuthStateChange(callback: (user: SandboxUser | null, token: string | null) => void) {
    if (isSandboxMode) {
      this.listeners.push(callback)
      // Call immediately
      this.getSessionUser().then(user => {
        this.getSessionToken().then(token => {
          callback(user, token)
        })
      })
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.listeners = this.listeners.filter(l => l !== callback)
            }
          }
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null, session?.access_token || null)
    })
    return { data: { subscription } }
  },

  triggerAuthChange(user: SandboxUser | null, token: string | null) {
    this.listeners.forEach(l => l(user, token))
  }
}

/**
 * Profiles / Onboarding CRUD Wrapper
 */
export const rowanProfile = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (isSandboxMode) {
      const profiles: UserProfile[] = JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]')
      return profiles.find((p) => p.id === userId) || null
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('Error fetching Supabase profile:', error.message)
      return null
    }
    return data
  },

  async saveOnboarding(userId: string, email: string, useCases: string[], plan: string | null): Promise<boolean> {
    if (isSandboxMode) {
      const profiles: UserProfile[] = JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]')
      const index = profiles.findIndex((p) => p.id === userId)
      const profile: UserProfile = {
        id: userId,
        email,
        use_cases: useCases,
        selected_plan: plan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      if (index >= 0) {
        profiles[index] = { ...profiles[index], ...profile, updated_at: new Date().toISOString() }
      } else {
        profiles.push(profile)
      }
      localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles))
      return true
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        use_cases: useCases,
        selected_plan: plan,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving Supabase onboarding:', error.message)
      return false
    }
    return true
  }
}

/**
 * Conversations / Messages CRUD Wrapper
 */
export const rowanConversations = {
  async getConversations(userId: string): Promise<SupabaseConversation[]> {
    if (isSandboxMode) {
      const convs: SupabaseConversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]')
      return convs
        .filter((c) => c.user_id === userId)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching Supabase conversations:', error.message)
      return []
    }
    return data || []
  },

  async createConversation(userId: string, title: string): Promise<SupabaseConversation | null> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newConv: SupabaseConversation = {
      id,
      user_id: userId,
      title,
      created_at: now,
      updated_at: now
    }

    if (isSandboxMode) {
      const convs: SupabaseConversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]')
      convs.push(newConv)
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs))
      return newConv
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(newConv)
      .select()
      .single()

    if (error) {
      console.error('Error creating Supabase conversation:', error.message)
      return null
    }
    return data
  },

  async getMessages(conversationId: string): Promise<SupabaseMessage[]> {
    if (isSandboxMode) {
      const msgs: SupabaseMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]')
      return msgs
        .filter((m) => m.conversation_id === conversationId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Error fetching Supabase messages:', error.message)
      return []
    }
    return data || []
  },

  async saveMessage(conversationId: string, role: 'user' | 'assistant' | 'system', text: string, products: ProductReference[] = []): Promise<SupabaseMessage | null> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newMsg: SupabaseMessage = {
      id,
      conversation_id: conversationId,
      role,
      text,
      products,
      timestamp: now
    }

    if (isSandboxMode) {
      const msgs: SupabaseMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]')
      msgs.push(newMsg)
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify(msgs))

      // Update conversation updated_at
      const convs: SupabaseConversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]')
      const index = convs.findIndex((c) => c.id === conversationId)
      if (index >= 0) {
        convs[index].updated_at = now
        localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs))
      }

      return newMsg
    }

    // Insert message into Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id,
        conversation_id: conversationId,
        role,
        text,
        products,
        timestamp: now
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving Supabase message:', error.message)
      return null
    }

    // Touch conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: now })
      .eq('id', conversationId)

    return data
  },

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (isSandboxMode) {
      const convs: SupabaseConversation[] = JSON.parse(localStorage.getItem(KEYS.CONVERSATIONS) || '[]')
      const filteredConvs = convs.filter((c) => c.id !== conversationId)
      localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(filteredConvs))

      const msgs: SupabaseMessage[] = JSON.parse(localStorage.getItem(KEYS.MESSAGES) || '[]')
      const filteredMsgs = msgs.filter((m) => m.conversation_id !== conversationId)
      localStorage.setItem(KEYS.MESSAGES, JSON.stringify(filteredMsgs))
      return true
    }

    // Delete messages first
    await supabase.from('messages').delete().eq('conversation_id', conversationId)
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId)
    if (error) {
      console.error('Error deleting Supabase conversation:', error.message)
      return false
    }
    return true
  }
}

/**
 * Connections CRUD Wrapper for personalized Website & Device configurations
 */
export const rowanConnections = {
  async getConnections(userId: string, type?: string): Promise<RowanConnection[]> {
    if (isSandboxMode) {
      const conns: RowanConnection[] = JSON.parse(localStorage.getItem(KEYS.CONNECTIONS) || '[]')
      return conns
        .filter((c) => c.user_id === userId && (!type || c.type === type))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }

    let query = supabase.from('connections').select('*').eq('user_id', userId)
    if (type) {
      query = query.eq('type', type)
    }
    query = query.order('updated_at', { ascending: false })

    const { data, error } = await query
    if (error) {
      console.warn('Error fetching Supabase connections:', error.message)
      return []
    }
    return data || []
  },

  async getConnection(id: string): Promise<RowanConnection | null> {
    if (isSandboxMode) {
      const conns: RowanConnection[] = JSON.parse(localStorage.getItem(KEYS.CONNECTIONS) || '[]')
      return conns.find((c) => c.id === id) || null
    }

    const { data, error } = await supabase.from('connections').select('*').eq('id', id).single()
    if (error) {
      console.warn('Error fetching connection by id:', error.message)
      return null
    }
    return data
  },

  async saveConnection(connection: Partial<RowanConnection> & { user_id: string; type: RowanConnection['type']; name: string }): Promise<RowanConnection | null> {
    const id = connection.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const record: RowanConnection = {
      id,
      user_id: connection.user_id,
      type: connection.type,
      name: connection.name,
      url: connection.url || '',
      instructions: connection.instructions || '',
      role: connection.role || '',
      personality: connection.personality || '',
      additional_instructions: connection.additional_instructions || '',
      permissions: connection.permissions || {},
      metadata: connection.metadata || {},
      status: connection.status || 'connected',
      created_at: connection.created_at || now,
      updated_at: now
    }

    if (isSandboxMode) {
      const conns: RowanConnection[] = JSON.parse(localStorage.getItem(KEYS.CONNECTIONS) || '[]')
      const index = conns.findIndex((c) => c.id === id)
      if (index >= 0) {
        conns[index] = { ...conns[index], ...record }
      } else {
        conns.push(record)
      }
      localStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(conns))
      return record
    }

    const { data, error } = await supabase
      .from('connections')
      .upsert(record)
      .select()
      .single()

    if (error) {
      console.error('Error saving connection in Supabase:', error.message)
      return null
    }
    return data
  },

  async deleteConnection(id: string): Promise<boolean> {
    if (isSandboxMode) {
      const conns: RowanConnection[] = JSON.parse(localStorage.getItem(KEYS.CONNECTIONS) || '[]')
      const filtered = conns.filter((c) => c.id !== id)
      localStorage.setItem(KEYS.CONNECTIONS, JSON.stringify(filtered))
      return true
    }

    const { error } = await supabase.from('connections').delete().eq('id', id)
    if (error) {
      console.error('Error deleting Supabase connection:', error.message)
      return false
    }
    return true
  }
}

