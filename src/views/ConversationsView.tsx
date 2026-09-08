import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Send,
  Loader2,
  Calendar,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  User,
  Bot
} from 'lucide-react'
import { rowanAuth, rowanConversations } from '../lib/supabase'
import type { SupabaseConversation, SupabaseMessage, SandboxUser } from '../lib/supabase'

interface ConversationsViewProps {
  navigate?: (to: string) => void
  initialConversationId?: string | null
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  navigate,
  initialConversationId
}) => {
  const [user, setUser] = useState<SandboxUser | null>(null)
  const [conversations, setConversations] = useState<SupabaseConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<SupabaseConversation | null>(null)
  const [messages, setMessages] = useState<SupabaseMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [showMobileDetail, setShowMobileDetail] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSelectConversation = useCallback(async (conv: SupabaseConversation) => {
    setSelectedConversation(conv)
    setShowMobileDetail(true)
    setLoadingMessages(true)
    try {
      const msgs = await rowanConversations.getMessages(conv.id)
      setMessages(msgs)
    } catch (err) {
      console.error('[ConversationsView] Error loading messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  const loadConversations = useCallback(async (activeUserId: string) => {
    try {
      const list = await rowanConversations.getConversations(activeUserId)
      setConversations(list)

      if (initialConversationId) {
        const matching = list.find((c) => c.id === initialConversationId)
        if (matching) {
          handleSelectConversation(matching)
          return
        }
      }

      if (list.length > 0 && !selectedConversation) {
        handleSelectConversation(list[0])
      }
    } catch (err) {
      console.error('[ConversationsView] Error loading conversations:', err)
    } finally {
      setLoading(false)
    }
  }, [handleSelectConversation, initialConversationId, selectedConversation])

  useEffect(() => {
    const init = async () => {
      const currentUser = await rowanAuth.getSessionUser()
      if (!currentUser) {
        if (navigate) navigate('/login')
        return
      }
      setUser(currentUser)
      await loadConversations(currentUser.id)
    }
    init()
  }, [loadConversations, navigate])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleCreateNew = async () => {
    if (!user || creatingNew) return
    setCreatingNew(true)
    try {
      const title = `Dialogue Session #${Date.now().toString().slice(-4)}`
      const newConv = await rowanConversations.createConversation(user.id, title)
      if (newConv) {
        setConversations((prev) => [newConv, ...prev])
        await handleSelectConversation(newConv)
      }
    } catch (err) {
      console.error('[ConversationsView] Failed to create conversation:', err)
    } finally {
      setCreatingNew(false)
    }
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this persistent conversation?')) return

    try {
      await rowanConversations.deleteConversation(convId)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (selectedConversation?.id === convId) {
        setSelectedConversation(null)
        setMessages([])
        setShowMobileDetail(false)
      }
    } catch (err) {
      console.error('[ConversationsView] Error deleting conversation:', err)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !selectedConversation || !user || isSending) return

    const text = inputMessage.trim()
    setInputMessage('')
    setIsSending(true)

    const userMsg: SupabaseMessage = {
      id: crypto.randomUUID(),
      conversation_id: selectedConversation.id,
      role: 'user',
      text,
      products: [],
      timestamp: new Date().toISOString()
    }

    setMessages((prev) => [...prev, userMsg])
    await rowanConversations.saveMessage(selectedConversation.id, 'user', text, [])

    try {
      const token = await rowanAuth.getSessionToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          sessionId: selectedConversation.id
        })
      })

      const data = await res.json()
      if (data.success) {
        const assistantMsg: SupabaseMessage = {
          id: crypto.randomUUID(),
          conversation_id: selectedConversation.id,
          role: 'assistant',
          text: data.message,
          products: data.products || [],
          timestamp: new Date().toISOString()
        }
        setMessages((prev) => [...prev, assistantMsg])
        await rowanConversations.saveMessage(selectedConversation.id, 'assistant', data.message, data.products || [])
      } else {
        throw new Error(data.message || 'Rowan could not generate response.')
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Connection interrupted'
      const errorMsg: SupabaseMessage = {
        id: crypto.randomUUID(),
        conversation_id: selectedConversation.id,
        role: 'assistant',
        text: `⚠️ Error: ${errorText}`,
        products: [],
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <p className="text-xs text-zinc-400">Loading conversation history...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in" id="conversations-view-root">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 my-0 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-teal-400" />
            <span>Conversations</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Persistent dialogue history synchronized with Rowan Core.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          disabled={creatingNew}
          className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-teal-900/20 transition-colors cursor-pointer"
        >
          {creatingNew ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>New Conversation</span>
        </button>
      </div>

      {/* Main Dual-Pane Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[600px] h-[calc(100vh-240px)]">
        {/* Left Column: Conversation List */}
        <div
          className={`md:col-span-1 bg-[#10161f] border border-zinc-800 rounded-3xl p-4 flex flex-col ${
            showMobileDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0a0e14] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation?.id === conv.id
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-teal-500/15 border border-teal-500/30 text-teal-100'
                        : 'bg-[#0a0e14]/40 hover:bg-[#0a0e14] border border-transparent hover:border-zinc-800/80 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate min-w-0 pr-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-teal-500 text-black' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold truncate my-0 leading-tight">
                          {conv.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 mt-0.5 block flex items-center gap-1">
                          <Calendar className="w-3 h-3 inline" />
                          {formatTimestamp(conv.updated_at || conv.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-rose-400 text-zinc-500 transition-opacity"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <MessageSquare className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">No conversations found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Thread */}
        <div
          className={`md:col-span-2 bg-[#10161f] border border-zinc-800 rounded-3xl flex flex-col overflow-hidden ${
            showMobileDetail ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#0e141c]">
                <div className="flex items-center gap-3 truncate">
                  <button
                    onClick={() => setShowMobileDetail(false)}
                    className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="truncate">
                    <h2 className="text-sm font-bold text-zinc-100 truncate my-0">
                      {selectedConversation.title}
                    </h2>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      One Rowan Core Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteConversation(selectedConversation.id, e)}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-teal-600 text-white rounded-br-none'
                              : 'bg-[#0a0e14] border border-zinc-800 text-zinc-200 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap my-0">{msg.text}</p>
                        </div>
                        {isUser && (
                          <div className="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Sparkles className="w-8 h-8 text-teal-500/40 mb-2" />
                    <p className="text-xs text-zinc-400">
                      This conversation has no messages yet. Send a query to Rowan below.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-[#0e141c]">
                <div className="flex items-center gap-2 bg-[#090d12] border border-zinc-800 rounded-2xl px-3 py-1.5 focus-within:border-teal-500/50">
                  <input
                    type="text"
                    placeholder="Message Rowan..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSending}
                    className="flex-1 bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none py-1.5"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isSending}
                    className="p-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 text-white disabled:text-zinc-600 transition-colors cursor-pointer"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <MessageSquare className="w-12 h-12 text-zinc-800 mb-3" />
              <p className="text-sm font-semibold text-zinc-400 my-0">
                Select a conversation
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Choose a dialogue from the left list or create a new conversation to talk with Rowan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
