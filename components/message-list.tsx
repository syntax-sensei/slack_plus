"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, MoreHorizontal, Smile, Trash2, Pin, PinOff, Sparkles } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AIReplySuggestions } from "@/components/ai-reply-suggestions"

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  is_pinned?: boolean
  users: {
    username: string
    avatar_url: string
  }
  reactions: Array<{
    id: string
    emoji: string
    user_id: string
  }>
}

interface MessageListProps {
  messages: Message[]
  currentUser: any
  onThreadSelect: (messageId: string) => void
  onMessageUpdate: () => void
  channelId: string | null
  onSuggestionSelect?: (suggestion: string) => void
  isThreadView?: boolean
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "👏", "🎉", "🔥", "💯", "👀", "🚀"]

export function MessageList({
  messages,
  currentUser,
  onThreadSelect,
  onMessageUpdate,
  channelId,
  onSuggestionSelect,
  isThreadView = false
}: MessageListProps) {
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [pendingReactions, setPendingReactions] = useState<Set<string>>(new Set())
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState<string | null>(null)
  const [workspaceUsers, setWorkspaceUsers] = useState<{ [key: string]: boolean }>({})
  const [selectedMessageForAI, setSelectedMessageForAI] = useState<string | null>(null)

  // Load all workspace usernames for mention highlighting
  useEffect(() => {
    const loadWorkspaceUsers = async () => {
      const { data } = await supabase.from("users").select("username")
      if (data) {
        const usernameMap = data.reduce(
          (acc, user) => {
            acc[user.username.toLowerCase()] = true
            return acc
          },
          {} as { [key: string]: boolean },
        )
        setWorkspaceUsers(usernameMap)
      }
    }

    loadWorkspaceUsers()
  }, [])

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete message via API');
      }

      console.log(`Message ${messageId} and replies deleted successfully.`);
      onMessageUpdate(); // Refresh message list after deletion

    } catch (error) {
      console.error("Error deleting message and replies:", error);
      alert(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const togglePinMessage = async (messageId: string, currentlyPinned: boolean) => {
    const { error } = await supabase.from("messages").update({ is_pinned: !currentlyPinned }).eq("id", messageId)

    if (error) {
      console.error("Error toggling pin:", error)
      alert("Failed to update pin status")
      return
    }

    onMessageUpdate()
  }

  const addReaction = async (messageId: string, emoji: string) => {
    // Close the emoji popover
    setEmojiPopoverOpen(null)

    // Prevent multiple clicks
    const reactionKey = `${messageId}:${emoji}`
    if (pendingReactions.has(reactionKey)) return

    try {
      setPendingReactions((prev) => new Set(prev).add(reactionKey))

      // Check if user already reacted with this emoji
      const { data: existingReactions, error: fetchError } = await supabase
        .from("reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", currentUser.id)
        .eq("emoji", emoji)

      if (fetchError) {
        console.error("Error fetching existing reaction:", fetchError)
        return
      }

      if (existingReactions && existingReactions.length > 0) {
        // Remove reaction if it exists
        const { error: deleteError } = await supabase.from("reactions").delete().eq("id", existingReactions[0].id)

        if (deleteError) {
          console.error("Error removing reaction:", deleteError)
        }
      } else {
        // Add new reaction
        const { error: insertError } = await supabase
          .from("reactions")
          .insert({
            message_id: messageId,
            user_id: currentUser.id,
            emoji,
          })
          .select()

        if (insertError) {
          console.error("Error adding reaction:", insertError)
        }
      }

      // Force update the message list
      onMessageUpdate()
    } finally {
      // Remove from pending set after operation completes
      setTimeout(() => {
        setPendingReactions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(reactionKey)
          return newSet
        })
      }, 500)
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const groupReactions = (reactions: any[]) => {
    if (!reactions || !Array.isArray(reactions)) return []

    const grouped = reactions.reduce((acc, reaction) => {
      if (!reaction) return acc

      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = []
      }
      acc[reaction.emoji].push(reaction.user_id)
      return acc
    }, {})

    return Object.entries(grouped).map(([emoji, userIds]) => ({
      emoji,
      count: (userIds as string[]).length,
      hasUserReacted: (userIds as string[]).includes(currentUser.id),
    }))
  }

  // Format message content to highlight mentions
  const formatMessageContent = (content: string) => {
    if (!content) return ""

    // Split by potential mentions (words starting with @)
    const parts = content.split(/(\s@\w+)/g)

    return parts.map((part, index) => {
      // Check if this part is a mention
      const mentionMatch = part.trim().match(/^@(\w+)$/)

      if (mentionMatch) {
        const username = mentionMatch[1].toLowerCase()
        // Check if this is a valid username in our workspace
        if (workspaceUsers[username]) {
          return (
            <span key={index} className="bg-blue-900/30 text-blue-300 px-1 rounded">
              {part}
            </span>
          )
        }
      }

      return <span key={index}>{part}</span>
    })
  }

  const handleAISuggestionSelect = (suggestion: string) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    }
    setSelectedMessageForAI(null)
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No messages yet. Be the first to send a message!</div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className="group hover:bg-gray-800/50 p-2 rounded relative"
            onMouseEnter={() => setHoveredMessage(message.id)}
            onMouseLeave={() => {
              if (openDropdown !== message.id) {
                setHoveredMessage(null)
              }
            }}
          >
            {/* Pin indicator */}
            {message.is_pinned && (
              <div className="absolute -top-1 -right-1">
                <Pin className="w-4 h-4 text-yellow-500 fill-current" />
              </div>
            )}

            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={message.users?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{(message.users?.username || "U")[0].toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{message.users?.username || "Unknown User"}</span>
                  <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
                  {message.is_pinned && (
                    <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded text-yellow-100">Pinned</span>
                  )}
                </div>

                <div className="text-sm text-gray-100 mb-2">{formatMessageContent(message.content)}</div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {groupReactions(message.reactions).map(({ emoji, count, hasUserReacted }) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(message.id, emoji)}
                        disabled={pendingReactions.has(`${message.id}:${emoji}`)}
                        className={`px-2 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                          hasUserReacted
                            ? "bg-blue-600/20 border-blue-600 text-blue-400"
                            : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                        } ${pendingReactions.has(`${message.id}:${emoji}`) ? "opacity-50" : ""}`}
                      >
                        {emoji} {count}
                      </button>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {(hoveredMessage === message.id || openDropdown === message.id) && (
                  <div className="flex items-center gap-1 mt-1">
                    {/* Emoji Reaction Popover */}
                    <Popover
                      open={emojiPopoverOpen === message.id}
                      onOpenChange={(open) => setEmojiPopoverOpen(open ? message.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 bg-gray-800 border-gray-700" side="top">
                        <div className="grid grid-cols-6 gap-1">
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => addReaction(message.id, emoji)}
                              disabled={pendingReactions.has(`${message.id}:${emoji}`)}
                              className={`p-2 hover:bg-gray-700 rounded text-lg transition-colors ${
                                pendingReactions.has(`${message.id}:${emoji}`) ? "opacity-50" : ""
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Thread Button */}
                    {!isThreadView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                        onClick={() => onThreadSelect(message.id)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}

                    {/* AI Reply Suggestions */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      onClick={() => setSelectedMessageForAI(message.id)}
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>

                    {/* More Options Dropdown */}
                    <DropdownMenu
                      open={openDropdown === message.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setOpenDropdown(message.id)
                          setHoveredMessage(message.id)
                        } else {
                          setOpenDropdown(null)
                          setHoveredMessage(null)
                        }
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700" align="end">
                        <DropdownMenuItem
                          onClick={() => togglePinMessage(message.id, message.is_pinned || false)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                        >
                          {message.is_pinned ? (
                            <>
                              <PinOff className="w-4 h-4 mr-2" />
                              Unpin from channel
                            </>
                          ) : (
                            <>
                              <Pin className="w-4 h-4 mr-2" />
                              Pin to channel
                            </>
                          )}
                        </DropdownMenuItem>

                        {message.user_id === currentUser.id && (
                          <DropdownMenuItem
                            onClick={() => deleteMessage(message.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete message
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* AI Suggestions Panel */}
                {selectedMessageForAI === message.id && (
                  <div className="mt-2 p-2 bg-gray-800/50 rounded">
                    <AIReplySuggestions
                      messageContent={message.content}
                      threadContext={messages
                        .filter(m => m.id !== message.id)
                        .map(m => `${m.users?.username}: ${m.content}`)}
                      onSuggestionSelect={handleAISuggestionSelect}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
