"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

interface User {
  id: string
  username: string
  avatar_url: string | null
}

interface MessageInputProps {
  onSendMessage: (content: string) => void
  channelName: string
  placeholder?: string
  initialMessage?: string
  onMessageChange?: (message: string) => void
}

export function MessageInput({ 
  onSendMessage, 
  channelName, 
  placeholder,
  initialMessage = "",
  onMessageChange 
}: MessageInputProps) {
  const [message, setMessage] = useState(initialMessage)
  const [mentionSearch, setMentionSearch] = useState("")
  const [showMentions, setShowMentions] = useState(false)
  const [mentionPosition, setMentionPosition] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [toneAnalysis, setToneAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const mentionsRef = useRef<HTMLDivElement>(null)
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update message when initialMessage changes
  useEffect(() => {
    setMessage(initialMessage)
    setToneAnalysis(null) // Clear analysis when initial message changes (e.g., selecting a suggestion)
  }, [initialMessage])

  // Load users for mentions
  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from("users").select("id, username, avatar_url").order("username")
      if (data) {
        setUsers(data)
      }
    }

    loadUsers()
  }, [])

  // Handle click outside to close mentions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionsRef.current && !mentionsRef.current.contains(event.target as Node)) {
        setShowMentions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter users when mention search changes
  useEffect(() => {
    if (mentionSearch) {
      const filtered = users
        .filter((user) => user.username.toLowerCase().includes(mentionSearch.toLowerCase()))
        .slice(0, 5) // Limit to 5 results

      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users.slice(0, 5))
    }
  }, [mentionSearch, users])

  // Analyze tone when message changes
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current)
    }

    if (message.trim().length === 0) {
      setToneAnalysis(null)
      setIsAnalyzing(false)
      return
    }

    setIsAnalyzing(true)
    analysisTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/ai/analyze-tone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageContent: message }),
        })

        if (!response.ok) {
          throw new Error("Failed to analyze tone")
        }

        const data = await response.json()
        setToneAnalysis(data.analysis)
      } catch (error) {
        console.error("Tone analysis error:", error)
        setToneAnalysis("Could not analyze tone.")
      } finally {
        setIsAnalyzing(false)
      }
    }, 700) // Analyze after 700ms of inactivity

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current)
      }
    }
  }, [message])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)
    if (onMessageChange) {
      onMessageChange(value)
    }

    // Check for @ symbol to trigger mentions
    const lastAtSymbol = value.lastIndexOf("@")

    if (lastAtSymbol !== -1) {
      const textAfterAt = value.substring(lastAtSymbol + 1)
      const hasSpaceAfterAt = textAfterAt.includes(" ")

      if (!hasSpaceAfterAt) {
        setMentionSearch(textAfterAt)
        setMentionPosition(lastAtSymbol)
        setShowMentions(true)
        return
      }
    }

    setShowMentions(false)
  }

  const insertMention = (username: string) => {
    const beforeMention = message.substring(0, mentionPosition)
    const afterMention = message.substring(mentionPosition + mentionSearch.length + 1)
    const newMessage = `${beforeMention}@${username} ${afterMention}`

    setMessage(newMessage)
    setShowMentions(false)

    // Focus back on input and place cursor at the end of the inserted mention
    if (inputRef.current) {
      inputRef.current.focus()
      const cursorPosition = beforeMention.length + username.length + 2 // +2 for @ and space
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
      setToneAnalysis(null) // Clear analysis after sending message
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close mentions dropdown on escape
    if (e.key === "Escape" && showMentions) {
      setShowMentions(false)
      e.preventDefault()
    }
  }

  // Determine color class based on tone analysis
  const getToneColorClass = (analysis: string | null) => {
    if (!analysis) return ""
    const lowerAnalysis = analysis.toLowerCase()
    if (lowerAnalysis.includes("aggressive") || lowerAnalysis.includes("negative")) {
      return "bg-red-500/20 text-red-300 border-red-500/30"
    } else if (lowerAnalysis.includes("high-impact") || lowerAnalysis.includes("positive")) {
      return "bg-green-500/20 text-green-300 border-green-500/30"
    } else if (lowerAnalysis.includes("weak") || lowerAnalysis.includes("low-impact") || lowerAnalysis.includes("confusing")) {
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    } else if (lowerAnalysis.includes("neutral")) {
      return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
    return "bg-gray-500/20 text-gray-300 border-gray-500/30" // Default color
  }

  const toneColorClass = getToneColorClass(toneAnalysis);

  return (
    <div className="border-t border-gray-700 p-4 relative">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex gap-2 items-start relative">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || `Message #${channelName}`}
              className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 pr-10"
            />

            {/* Tone Analysis Indicator (Spinner) */}
            {isAnalyzing && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-blue-400" />
            )}

            {/* Mentions dropdown */}
            {showMentions && (
              <div
                ref={mentionsRef}
                className="absolute bottom-full left-0 mb-1 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10"
              >
                {filteredUsers.length > 0 ? (
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => insertMention(user.username)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs overflow-hidden">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url || "/placeholder.svg"}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.username[0].toUpperCase()
                          )}
                        </div>
                        <span className="text-white">{user.username}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-gray-400">No users found</div>
                )}
              </div>
            )}
          </div>

          <Button type="submit" disabled={!message.trim() || isAnalyzing}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Tone Analysis Display (Tag) */}
        {toneAnalysis && !showMentions && !isAnalyzing && (
          <div className={cn(
            "text-xs px-2 py-1 rounded-md border self-start",
            toneColorClass
          )}>
            Tone: {toneAnalysis}
          </div>
        )}
      </form>
    </div>
  )
}
