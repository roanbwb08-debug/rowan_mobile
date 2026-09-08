import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Trash2, 
  Plus, 
  ChevronRight,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { rowanConversations } from '../lib/supabase'
import type { SupabaseConversation, SupabaseMessage } from '../lib/supabase'

interface ConversationsSidebarProps {
  userId: string
  token: string | null
  onConversationChange?: () => void
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({ 
  userId, 
  token,
  onConversationChange 
}) => {
  const [conversations, setConversations] = useState<SupabaseConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<SupabaseConversation | null>(null)
  const [messages, setMessages] = useState<SupabaseMessage[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [replyInput, setReplyInput] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const list = await rowanConversations.getConversations(userId)
        const sorted = [...list].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        if (active) {
          setConversations(sorted)
        }
      } catch (err) {
        console.error('[SIDEBAR] Failed to fetch conversations:', err)
      } finally {
        if (active) {
          setIsLoadingList(false)
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [userId, refreshTrigger])

  // Scroll to bottom of message panel
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handle switching to a conversation
  const handleSelectConversation = async (conv: SupabaseConversation) => {
    setSelectedConversation(conv)
    setIsLoadingMessages(true)
    setErrorMsg('')
    try {
      const msgs = await rowanConversations.getMessages(conv.id)
      setMessages(msgs)
    } catch (err) {
      console.error('[SIDEBAR] Failed to fetch conversation messages:', err)
      setErrorMsg('Could not load chat history. Please try again.')
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Handle creating a new conversation
  const handleCreateNewConversation = async () => {
    setIsCreatingNew(true)
    setErrorMsg('')
    try {
      const title = `Store Chat Session #${Date.now().toString().slice(-4)}`
      const newConv = await rowanConversations.createConversation(userId, title)
      if (newConv) {
        triggerRefresh()
        // Automatically switch to it
        await handleSelectConversation(newConv)
        if (onConversationChange) onConversationChange()
      }
    } catch (err) {
      console.error('[SIDEBAR] Failed to create new conversation:', err)
      setErrorMsg('Could not create a new session.')
    } finally {
      setIsCreatingNew(false)
    }
  }

  // Handle deleting a conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent selection trigger
    if (!confirm('Are you sure you want to delete this conversation? This action is irreversible.')) {
      return
    }

    try {
      // Call Supabase/API or local sandbox handler to delete the conversation
      await rowanConversations.deleteConversation(convId)

      setConversations(prev => prev.filter(c => c.id !== convId))
      if (selectedConversation?.id === convId) {
        setSelectedConversation(null)
        setMessages([])
      }
      
      if (onConversationChange) onConversationChange()
      triggerRefresh()
    } catch (err) {
      console.error('[SIDEBAR] Error deleting conversation:', err)
    }
  }

  // Handle sending a message in the selected conversation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyInput.trim() || !selectedConversation || isSending) return

    const text = replyInput.trim()
    setReplyInput('')
    setIsSending(true)
    setErrorMsg('')

    // Save user message in Supabase
    const userMsg: SupabaseMessage = {
      id: crypto.randomUUID(),
      conversation_id: selectedConversation.id,
      role: 'user',
      text,
      products: [],
      timestamp: new Date().toISOString()
    }

    // Append message immediately for instant local UI feedback
    setMessages(prev => [...prev, userMsg])
    await rowanConversations.saveMessage(selectedConversation.id, 'user', text, [])

    try {
      // Set up auth headers
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // Submit message to our backend endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          sessionId: selectedConversation.id
        })
      })

      const data = await response.json()
      if (data.success) {
        const responseProducts = data.products || []
        
        // Save assistant response
        const assistantMsg: SupabaseMessage = {
          id: crypto.randomUUID(),
          conversation_id: selectedConversation.id,
          role: 'assistant',
          text: data.message,
          products: responseProducts,
          timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, assistantMsg])
        await rowanConversations.saveMessage(selectedConversation.id, 'assistant', data.message, responseProducts)
        
        // Touch list timestamp and refresh sorting
        triggerRefresh()
        if (onConversationChange) onConversationChange()
      } else {
        throw new Error(data.message || 'Rowan could not generate a response.')
      }
    } catch (err: unknown) {
      console.error('[SIDEBAR] Failed to get response from Rowan:', err)
      const errorMsgText = err instanceof Error ? err.message : 'Failed to connect. Please verify your connection status.'
      
      const fallbackErrorMsg: SupabaseMessage = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation.id,
        role: 'assistant',
        text: `⚠️ Error: ${errorMsgText}`,
        products: [],
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, fallbackErrorMsg])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4" id="conversations-sidebar-wrapper">
      {/* Sidebar Header Panel with Quick Controls */}
      <div className="flex items-center justify-between" id="sidebar-header-row">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 my-0">
            Secure Chat Telemetry
          </h3>
          <p className="text-[10px] text-zinc-400 mt-0.5">Stored inside client-context</p>
        </div>
        <button
          onClick={handleCreateNewConversation}
          disabled={isCreatingNew}
          className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-100/30 dark:border-purple-900/10 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-xs font-bold"
          id="btn-new-chat-session"
          title="Create a new conversation"
        >
          {isCreatingNew ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>New Session</span>
            </>
          )}
        </button>
      </div>

      {/* Conversations Scrollable List */}
      <div 
        className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1" 
        id="sidebar-conversations-list-container"
      >
        {isLoadingList ? (
          <div className="flex items-center justify-center py-8 text-zinc-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            <span className="text-xs font-medium">Querying database sessions...</span>
          </div>
        ) : conversations.length > 0 ? (
          conversations.map((conv) => {
            const isSelected = selectedConversation?.id === conv.id
            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`group p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-purple-50/75 dark:bg-purple-950/15 border-purple-200 dark:border-purple-900/30 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/40 hover:border-zinc-250 dark:hover:border-zinc-800'
                }`}
                id={`conversation-item-${conv.id}`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-purple-600 rounded-r-lg"></span>
                )}
                <div className="space-y-1 truncate flex-grow">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`} />
                    <span className={`font-semibold truncate block ${isSelected ? 'text-purple-900 dark:text-purple-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                      {conv.title || 'Untitled Session'}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block pl-5">
                    {new Date(conv.updated_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 font-semibold text-zinc-500 uppercase tracking-wider group-hover:hidden">
                    SAVED
                  </span>
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="p-1 rounded bg-transparent text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-0 cursor-pointer hidden group-hover:inline-flex transition-all"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-8 text-zinc-400 space-y-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900" id="no-conversations-placeholder">
            <MessageSquare className="w-6 h-6 text-zinc-300 mx-auto" />
            <p className="text-xs font-semibold my-0">No saved sessions yet.</p>
            <p className="text-[10px] text-zinc-500 my-0 max-w-[180px] mx-auto leading-relaxed">
              Create a new conversation or ask the floating assistant to synchronize!
            </p>
          </div>
        )}
      </div>

      {/* Slide-over Conversation Viewer Panel */}
      <AnimatePresence>
        {selectedConversation && (
          <>
            {/* Modal backdrop for mobile/tablet focus */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedConversation(null)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />

            {/* Conversational sliding drawer side-panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col h-screen"
              id="selected-conversation-drawer"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-850 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-100/40 dark:border-purple-900/10 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate my-0">
                      {selectedConversation.title}
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5 truncate flex items-center gap-1 leading-none">
                      <Calendar className="w-3 h-3" />
                      Session Active · Syncing live with Supabase
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors border-0 cursor-pointer"
                  title="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Message Thread Feed */}
              <div 
                className="flex-grow overflow-y-auto p-5 space-y-4 bg-zinc-50/30 dark:bg-zinc-950/20"
                id="drawer-message-stream"
              >
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {isLoadingMessages ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    <span className="text-xs text-zinc-400 font-medium">Retrieving historic telemetry...</span>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg, idx) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                            isUser
                              ? 'bg-purple-600 text-white rounded-tr-none'
                              : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-750 rounded-tl-none'
                          }`}
                        >
                          <div className="font-semibold text-[10px] opacity-75 mb-0.5 uppercase tracking-wide">
                            {isUser ? 'Merchant Admin' : 'Rowan AI'}
                          </div>
                          <p className="whitespace-pre-wrap my-0 leading-relaxed text-xs">
                            {msg.text}
                          </p>

                          {/* Render product recommendation chips if present */}
                          {msg.products && msg.products.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-700/50 space-y-1.5">
                              <span className="text-[9px] uppercase tracking-wider font-semibold text-purple-600 dark:text-purple-400 block">
                                Recommended Inventory:
                              </span>
                              {msg.products.map((p) => (
                                <div
                                  key={p.id || p.name}
                                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-700/50 text-[11px] text-zinc-900 dark:text-zinc-100"
                                >
                                  <div>
                                    <span className="font-semibold block">{p.name}</span>
                                    <span className="text-[10px] text-zinc-500">${p.price}</span>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-medium">
                                    {p.category || 'General'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-zinc-400 space-y-1">
                    <MessageSquare className="w-5 h-5 mx-auto text-zinc-300" />
                    <p className="text-xs">No messages in this conversation yet.</p>
                  </div>
                )}
                
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-100 dark:border-zinc-750 rounded-xl rounded-tl-none px-3.5 py-2 text-xs flex items-center gap-2 shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                      <span>Rowan is formulating response...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Drawer Reply Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
                id="drawer-reply-form"
              >
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="Type a reply to Rowan..."
                  disabled={isSending || isLoadingMessages}
                  className="flex-grow bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750/70 focus:bg-white dark:focus:bg-zinc-900 text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all disabled:opacity-55"
                />
                <button
                  type="submit"
                  disabled={isSending || isLoadingMessages || !replyInput.trim()}
                  className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all shadow-sm cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
