"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Sidebar } from "@/components/sidebar"
import { ChatArea } from "@/components/chat-area"
import { ThreadPanel } from "@/components/thread-panel"
import { AuthForm } from "@/components/auth/auth-form"
import { useAuth } from "@/lib/auth-context"

export default function SlackClone() {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const { user, userProfile, loading } = useAuth()

  useEffect(() => {
    // Auto-select first channel on load
    const loadFirstChannel = async () => {
      if (user) {
        const { data: channels } = await supabase.from("channels").select("id").limit(1)

        if (channels && channels.length > 0) {
          setSelectedChannelId(channels[0].id)
        }
      }
    }

    loadFirstChannel()
  }, [user])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !userProfile) {
    return <AuthForm />
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar selectedChannelId={selectedChannelId} onChannelSelect={setSelectedChannelId} currentUser={userProfile} />

      <div className="flex flex-1">
        <ChatArea channelId={selectedChannelId} currentUser={userProfile} onThreadSelect={setSelectedThreadId} />

        {selectedThreadId && (
          <ThreadPanel
            messageId={selectedThreadId}
            currentUser={userProfile}
            onClose={() => setSelectedThreadId(null)}
          />
        )}
      </div>
    </div>
  )
}
