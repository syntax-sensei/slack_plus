"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, X } from "lucide-react"
import { MessageList } from "@/components/message-list"
import { MessageInput } from "@/components/message-input"

interface ThreadViewProps {
  messageId: string
  currentUser: any
  onClose: () => void
}

export function ThreadView({ messageId, currentUser, onClose }: ThreadViewProps) {
  const [parentMessage, setParentMessage] = useState<any>(null)
  const [replies, setReplies] = useState<any[]>([])
  const [suggestedMessage, setSuggestedMessage] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messageId) {
      loadParentMessage()
      loadReplies()
      const unsubscribe = subscribeToReplies()
      return unsubscribe
    }
  }, [messageId])

  useEffect(() => {
    scrollToBottom()
  }, [replies])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadParentMessage = async () => {
    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        users:user_id (username, avatar_url),
        reactions (id, emoji, user_id)
      `)
      .eq("id", messageId)
      .single()

    if (data) setParentMessage(data)
  }

  const loadReplies = async () => {
    const { data } = await supabase
      .from("messages")
      .select(`
        *,
        users:user_id (username, avatar_url)
      `)
      .eq("parent_message_id", messageId)
      .order("created_at", { ascending: true })

    if (data) setReplies(data)
  }

  const subscribeToReplies = () => {
    const subscription = supabase
      .channel(`replies:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${messageId}`,
        },
        () => {
          loadReplies()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const sendReply = async (content: string) => {
    if (!content.trim()) return

    const { error } = await supabase.from("messages").insert({
      content,
      parent_message_id: messageId,
      channel_id: parentMessage?.channel_id,
      user_id: currentUser.id,
    })

    if (error) {
      console.error("Error sending reply:", error)
    } else {
      setSuggestedMessage("")
    }
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setSuggestedMessage(suggestion)
  }

  return (
    <div className="flex-1 flex flex-col border-l border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold">Thread</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {parentMessage && (
          <div className="mb-4">
            <MessageList
              messages={[parentMessage]}
              currentUser={currentUser}
              onThreadSelect={() => {}}
              onMessageUpdate={loadReplies}
              channelId={parentMessage.channel_id}
              onSuggestionSelect={handleSuggestionSelect}
              isThreadView={true}
            />
          </div>
        )}

        <div className="space-y-4">
          <MessageList
            messages={replies}
            currentUser={currentUser}
            onThreadSelect={() => {}}
            onMessageUpdate={loadReplies}
            channelId={parentMessage?.channel_id}
            onSuggestionSelect={handleSuggestionSelect}
            isThreadView={true}
          />
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={sendReply}
        channelName="thread"
        placeholder="Reply to thread..."
        initialMessage={suggestedMessage}
        onMessageChange={setSuggestedMessage}
      />
    </div>
  )
} 