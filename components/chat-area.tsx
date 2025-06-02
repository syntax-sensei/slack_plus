"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { MessageList } from "@/components/message-list"
import { MessageInput } from "@/components/message-input"
import { PinnedMessages } from "@/components/pinned-messages"
import { Hash } from "lucide-react"
import { OrgBrainModal } from "@/components/org-brain-modal"
import { Button } from "@/components/ui/button"

interface ChatAreaProps {
  channelId: string | null
  currentUser: any
  onThreadSelect: (messageId: string) => void
}

interface Channel {
  id: string
  name: string
  description: string | null
}

export function ChatArea({ channelId, currentUser, onThreadSelect }: ChatAreaProps) {
  const [channel, setChannel] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [suggestedMessage, setSuggestedMessage] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (channelId) {
      loadChannel()
      loadMessages()
      const unsubscribe = subscribeToMessages()
      return unsubscribe
    }
  }, [channelId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadChannel = async () => {
    if (!channelId) return

    const { data } = await supabase.from("channels").select("*").eq("id", channelId).single()

    if (data) setChannel(data)
  }

  const loadMessages = async () => {
    if (!channelId) return

    console.log("Starting to load messages for channel:", channelId)

    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        users:user_id (username, avatar_url),
        reactions (id, emoji, user_id)
      `)
      .eq("channel_id", channelId)
      .is("parent_message_id", null)
      .order("created_at", { ascending: true })

    console.log("Messages query result:", { data, error })
    console.log("Number of messages loaded:", data?.length || 0)

    if (error) {
      console.error("Error loading messages:", error)
    } else if (data) {
      console.log("Setting messages in state:", data)
      setMessages(data)
    }
  }

  const subscribeToMessages = () => {
    if (!channelId) return () => {}

    console.log("Setting up subscriptions for channel:", channelId)

    // Subscribe to message changes
    const messageSubscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("Message change detected:", payload)
          loadMessages()
        },
      )
      .subscribe()

    // Subscribe to reaction changes (separate channel)
    const reactionSubscription = supabase
      .channel(`reactions:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        (payload) => {
          console.log("Reaction change detected:", payload)
          loadMessages()
        },
      )
      .subscribe()

    return () => {
      console.log("Unsubscribing from channels")
      messageSubscription.unsubscribe()
      reactionSubscription.unsubscribe()
    }
  }

  const sendMessage = async (content: string) => {
    if (!channelId || !content.trim()) return

    console.log("Sending message:", { content, channelId, userId: currentUser.id })

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          content,
          channel_id: channelId,
          user_id: currentUser.id,
        })
        .select()

      console.log("Message sent:", data)
      console.log("Send error:", error)

      if (error) {
        console.error("Error sending message:", error)
      } else {
        // Force reload messages after sending
        setTimeout(() => loadMessages(), 100)
      }
    } catch (err) {
      console.error("Exception sending message:", err)
    }
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setSuggestedMessage(suggestion)
  }

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">Select a channel to start messaging</div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          <span className="font-semibold">{channel?.name}</span>
        </div>
        {channel?.description && <p className="text-sm text-gray-400 mt-1">{channel.description}</p>}

        {/* Org Brain Button */}
        <OrgBrainModal />

      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Pinned Messages */}
        <PinnedMessages channelId={channelId} currentUser={currentUser} onMessageUpdate={loadMessages} />

        {/* Regular Messages */}
        <MessageList
          messages={messages}
          currentUser={currentUser}
          onThreadSelect={onThreadSelect}
          onMessageUpdate={loadMessages}
          channelId={channelId}
          onSuggestionSelect={handleSuggestionSelect}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendMessage}
        channelName={channel?.name || ""}
        initialMessage={suggestedMessage}
        onMessageChange={setSuggestedMessage}
      />
    </div>
  )
}
