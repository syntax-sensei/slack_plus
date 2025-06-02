"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Pin, X, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface PinnedMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  users: {
    username: string
    avatar_url: string
  }
}

interface PinnedMessagesProps {
  channelId: string | null
  currentUser: any
  onMessageUpdate: () => void
}

export function PinnedMessages({ channelId, currentUser, onMessageUpdate }: PinnedMessagesProps) {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (channelId) {
      loadPinnedMessages()
    }
  }, [channelId])

  const loadPinnedMessages = async () => {
    if (!channelId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
        *,
        users (username, avatar_url)
      `)
        .eq("channel_id", channelId)
        .eq("is_pinned", true)
        .order("created_at", { ascending: false })

      console.log("Pinned messages query result:", { data, error, channelId })

      if (error) {
        console.error("Error loading pinned messages:", error)
      } else {
        console.log("Setting pinned messages:", data)
        setPinnedMessages(data || [])
      }
    } catch (err) {
      console.error("Exception loading pinned messages:", err)
    } finally {
      setLoading(false)
    }
  }

  const unpinMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").update({ is_pinned: false }).eq("id", messageId)

    if (error) {
      console.error("Error unpinning message:", error)
      alert("Failed to unpin message")
      return
    }

    // Remove from local state
    setPinnedMessages(pinnedMessages.filter((msg) => msg.id !== messageId))
    onMessageUpdate()
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  // Don't render if no pinned messages
  if (pinnedMessages.length === 0) {
    console.log("No pinned messages to show, count:", pinnedMessages.length)
    return null
  }

  console.log("Rendering pinned messages section with:", pinnedMessages.length, "messages")

  return (
    <Card className="bg-yellow-900/20 border-yellow-600/30 mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto text-yellow-200 hover:text-yellow-100 hover:bg-yellow-900/30"
          >
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4" />
              <span className="font-medium">
                {pinnedMessages.length} pinned message{pinnedMessages.length !== 1 ? "s" : ""}
              </span>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mx-auto"></div>
              </div>
            ) : (
              pinnedMessages.map((message) => (
                <div key={message.id} className="flex gap-3 p-3 bg-gray-800/50 rounded group">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={message.users?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="text-xs">
                      {(message.users?.username || "U")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-yellow-200">{message.users?.username}</span>
                      <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
                    </div>
                    <div className="text-sm text-gray-200">{message.content}</div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unpinMessage(message.id)}
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
