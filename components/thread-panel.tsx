"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageInput } from "@/components/message-input"
import { X, Smile, MoreHorizontal, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface ThreadPanelProps {
  messageId: string
  currentUser: any
  onClose: () => void
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "👏", "🎉", "🔥", "💯", "👀", "🚀"]

export function ThreadPanel({ messageId, currentUser, onClose }: ThreadPanelProps) {
  const [parentMessage, setParentMessage] = useState<any>(null)
  const [replies, setReplies] = useState<any[]>([])
  const [workspaceUsers, setWorkspaceUsers] = useState<{ [key: string]: boolean }>({})
  const [hoveredReply, setHoveredReply] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [pendingReactions, setPendingReactions] = useState<Set<string>>(new Set())
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState<string | null>(null)

  useEffect(() => {
    loadThread()
    const unsubscribe = subscribeToReplies()
    loadWorkspaceUsers()
    return unsubscribe
  }, [messageId])

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

  const loadThread = async () => {
    // Load parent message with reactions
    const { data: parent } = await supabase
      .from("messages")
      .select(`
        *,
        users (username, avatar_url),
        reactions (id, emoji, user_id)
      `)
      .eq("id", messageId)
      .single()

    if (parent) setParentMessage(parent)

    // Load replies with reactions
    const { data: threadReplies } = await supabase
      .from("messages")
      .select(`
        *,
        users (username, avatar_url),
        reactions (id, emoji, user_id)
      `)
      .eq("parent_message_id", messageId)
      .order("created_at", { ascending: true })

    if (threadReplies) setReplies(threadReplies)
  }

  const subscribeToReplies = () => {
    // Subscribe to message changes
    const messageSubscription = supabase
      .channel(`thread-messages:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${messageId}`,
        },
        () => {
          loadThread()
        },
      )
      .subscribe()

    // Subscribe to reaction changes
    const reactionSubscription = supabase
      .channel(`thread-reactions:${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reactions",
        },
        () => {
          loadThread()
        },
      )
      .subscribe()

    return () => {
      messageSubscription.unsubscribe()
      reactionSubscription.unsubscribe()
    }
  }

  const sendReply = async (content: string) => {
    if (!content.trim()) return

    await supabase.from("messages").insert({
      content,
      channel_id: parentMessage.channel_id,
      user_id: currentUser.id,
      parent_message_id: messageId,
    })
  }

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId)

    if (error) {
      console.error("Error deleting message:", error)
      alert("Failed to delete message")
      return
    }

    // Reload thread after deletion
    loadThread()
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

      // Force update the thread
      loadThread()
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

  if (!parentMessage) return null

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 p-4 flex items-center justify-between">
        <span className="font-semibold">Thread</span>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Thread content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Parent message */}
        <div className="mb-4 pb-4 border-b border-gray-700">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={parentMessage.users.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{parentMessage.users.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{parentMessage.users.username}</span>
                <span className="text-xs text-gray-400">{formatTime(parentMessage.created_at)}</span>
              </div>
              <div className="text-sm text-gray-100 mb-2">{formatMessageContent(parentMessage.content)}</div>

              {/* Parent message reactions */}
              {parentMessage.reactions && parentMessage.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {groupReactions(parentMessage.reactions).map(({ emoji, count, hasUserReacted }) => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(parentMessage.id, emoji)}
                      disabled={pendingReactions.has(`${parentMessage.id}:${emoji}`)}
                      className={`px-2 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                        hasUserReacted
                          ? "bg-blue-600/20 border-blue-600 text-blue-400"
                          : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                      } ${pendingReactions.has(`${parentMessage.id}:${emoji}`) ? "opacity-50" : ""}`}
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-3">
          {replies.map((reply) => (
            <div
              key={reply.id}
              className="group hover:bg-gray-700/50 p-2 rounded"
              onMouseEnter={() => setHoveredReply(reply.id)}
              onMouseLeave={() => {
                if (openDropdown !== reply.id) {
                  setHoveredReply(null)
                }
              }}
            >
              <div className="flex gap-3">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={reply.users.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{reply.users.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs">{reply.users.username}</span>
                    <span className="text-xs text-gray-400">{formatTime(reply.created_at)}</span>
                  </div>
                  <div className="text-sm text-gray-100 mb-2">{formatMessageContent(reply.content)}</div>

                  {/* Reply reactions */}
                  {reply.reactions && reply.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {groupReactions(reply.reactions).map(({ emoji, count, hasUserReacted }) => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(reply.id, emoji)}
                          disabled={pendingReactions.has(`${reply.id}:${emoji}`)}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 border transition-colors ${
                            hasUserReacted
                              ? "bg-blue-600/20 border-blue-600 text-blue-400"
                              : "bg-gray-700 border-gray-600 hover:bg-gray-600"
                          } ${pendingReactions.has(`${reply.id}:${emoji}`) ? "opacity-50" : ""}`}
                        >
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reply action buttons */}
                  {(hoveredReply === reply.id || openDropdown === reply.id) && (
                    <div className="flex items-center gap-1 mt-1">
                      {/* Emoji Reaction Popover */}
                      <Popover
                        open={emojiPopoverOpen === reply.id}
                        onOpenChange={(open) => setEmojiPopoverOpen(open ? reply.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-gray-400 hover:text-white hover:bg-gray-600"
                          >
                            <Smile className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 bg-gray-800 border-gray-700" side="top">
                          <div className="grid grid-cols-6 gap-1">
                            {EMOJI_OPTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(reply.id, emoji)}
                                disabled={pendingReactions.has(`${reply.id}:${emoji}`)}
                                className={`p-2 hover:bg-gray-700 rounded text-lg transition-colors ${
                                  pendingReactions.has(`${reply.id}:${emoji}`) ? "opacity-50" : ""
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      {/* More Options Dropdown */}
                      <DropdownMenu
                        open={openDropdown === reply.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenDropdown(reply.id)
                            setHoveredReply(reply.id)
                          } else {
                            setOpenDropdown(null)
                            setHoveredReply(null)
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-gray-400 hover:text-white hover:bg-gray-600"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-gray-700" align="end">
                          {reply.user_id === currentUser.id && (
                            <DropdownMenuItem
                              onClick={() => deleteMessage(reply.id)}
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
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reply input */}
      <MessageInput onSendMessage={sendReply} channelName="thread" placeholder="Reply..." />
    </div>
  )
}
