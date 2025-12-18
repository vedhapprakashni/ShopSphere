'use client'

import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { Search, Send } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"

export default function ChatPage() {
  const [chats, setChats] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [currentNegotiation, setCurrentNegotiation] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const searchParams = useSearchParams()
  const initialNegotiationId = searchParams.get('negotiation')
  const supabase = createClient()

  // 1. Fetch User & Chats
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // Redirect to login handled by middleware ideally

      setCurrentUser(session.user)

      // Fetch negotiations (chats) involved in
      const { data: negotiations } = await supabase
        .from('negotiations')
        .select(`
            *,
            products(title, images),
            buyer:profiles!negotiations_buyer_id_fkey(full_name),
            seller:profiles!negotiations_seller_id_fkey(full_name)
        `)
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })

      if (negotiations) {
        setChats(negotiations)
        
        // If query param exists, select that chat immediately
        if (initialNegotiationId) {
            const found = negotiations.find(n => n.id === initialNegotiationId)
            if (found) selectChat(found)
        }
      }
      setLoading(false)
    }
    init()
  }, [initialNegotiationId])

  // 2. Real-time Subscription for Messages
  useEffect(() => {
    if (!currentNegotiation) return

    // Fetch initial messages
    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('negotiation_id', currentNegotiation.id)
            .order('created_at', { ascending: true })
        
        if (data) setMessages(data)
    }
    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
        .channel(`chat:${currentNegotiation.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `negotiation_id=eq.${currentNegotiation.id}`
        }, (payload) => {
            setMessages(prev => {
              if (prev.some((m) => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
        })
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
  }, [currentNegotiation])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const selectChat = (negotiation: any) => {
    setCurrentNegotiation(negotiation)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUser || !currentNegotiation) return

    const receiverId = currentUser.id === currentNegotiation.buyer_id 
        ? currentNegotiation.seller_id 
        : currentNegotiation.buyer_id

    const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
            negotiation_id: currentNegotiation.id,
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content: newMessage
        })
        .select()
        .single()

    if (!error && inserted) {
        setMessages(prev => [...prev, inserted])
        setNewMessage("")
    }
  }

  const getOtherPartyName = (chat: any) => {
      if (!currentUser) return 'Loading...'
      return currentUser.id === chat.buyer_id ? chat.seller?.full_name : chat.buyer?.full_name
  }

  return (
    <main className="min-h-screen bg-[var(--color-pastel-bg)] flex flex-col">
      <Navbar />
      
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl h-[calc(100vh-64px)]">
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--color-pastel-border)] overflow-hidden flex h-full">
          
          {/* Chat List Sidebar */}
          <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-xl font-bold mb-4 text-[var(--color-pastel-text)]">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search chats..." 
                    className="w-full h-10 pl-10 pr-4 rounded-full bg-white border border-gray-200 focus:ring-1 focus:ring-[var(--color-pastel-primary)] focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                  <div className="p-4 text-center text-gray-400">Loading chats...</div>
              ) : chats.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">No conversations yet.</div>
              ) : (
                chats.map((chat) => (
                    <div 
                        key={chat.id} 
                        onClick={() => selectChat(chat)}
                        className={`p-4 hover:bg-white cursor-pointer transition-colors border-b border-gray-50 ${currentNegotiation?.id === chat.id ? 'bg-white border-l-4 border-l-[var(--color-pastel-primary)]' : ''}`}
                    >
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-gray-900">{getOtherPartyName(chat)}</span>
                        <span className="text-xs text-gray-500">
                            {new Date(chat.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {chat.products?.images?.[0] && (
                            <img src={chat.products.images[0]} className="w-8 h-8 rounded object-cover" />
                        )}
                        <p className="text-sm text-gray-600 truncate font-medium">{chat.products?.title}</p>
                    </div>
                    </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col bg-white">
            {currentNegotiation ? (
                <>
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                        <div>
                            <h3 className="font-bold text-lg">{getOtherPartyName(currentNegotiation)}</h3>
                            <p className="text-sm text-gray-500">
                                Negotiating on <span className="font-medium text-[var(--color-pastel-primary)]">{currentNegotiation.products?.title}</span>
                            </p>
                        </div>
                        <div className="bg-[var(--color-pastel-bg)] px-3 py-1 rounded-full border border-[var(--color-pastel-border)]">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Pitch</span>
                            <span className="ml-2 font-bold text-gray-800">${currentNegotiation.pitch_price}</span>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--color-pastel-bg)]/30">
                        {messages.map((msg) => {
                            const isMe = msg.sender_id === currentUser?.id
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                                        isMe 
                                        ? 'bg-[var(--color-pastel-primary)] text-white rounded-br-none' 
                                        : 'bg-white border border-gray-100 rounded-bl-none text-gray-800'
                                    }`}>
                                        <p>{msg.content}</p>
                                        <span className={`text-[10px] mt-1 block ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..." 
                                className="flex-1 h-12 px-4 rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)]"
                            />
                            <Button type="submit" size="icon" className="h-12 w-12 rounded-full shadow-md">
                                <Send className="h-5 w-5" />
                            </Button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30">
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-medium text-gray-600">Select a conversation</h3>
                        <p>Choose a chat from the left to start messaging</p>
                    </div>
                </div>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
