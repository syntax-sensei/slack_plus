"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Hash, Plus } from "lucide-react"
import { MembersPanel } from "@/components/members-panel"
import { InviteManager } from "@/components/invite-manager"
import { ProfileModal } from "@/components/profile/profile-modal"

interface Channel {
  id: string
  name: string
  description: string | null
}

interface SidebarProps {
  selectedChannelId: string | null
  onChannelSelect: (channelId: string) => void
  currentUser: any
}

export function Sidebar({ selectedChannelId, onChannelSelect, currentUser }: SidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [newChannelName, setNewChannelName] = useState("")
  const [newChannelDescription, setNewChannelDescription] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    const { data } = await supabase.from("channels").select("*").order("created_at", { ascending: true })

    if (data) setChannels(data)
  }

  const createChannel = async () => {
    if (!newChannelName.trim()) return

    console.log("Creating channel with user:", currentUser)

    const { data, error } = await supabase
      .from("channels")
      .insert({
        name: newChannelName.toLowerCase().replace(/\s+/g, "-"),
        description: newChannelDescription || null,
        created_by: currentUser.id,
      })
      .select()

    if (error) {
      console.error("Error creating channel:", error)
      alert("Failed to create channel. Please try again.")
      return
    }

    if (data) {
      setChannels([...channels, data[0]])
      setNewChannelName("")
      setNewChannelDescription("")
      setIsCreateDialogOpen(false)
      onChannelSelect(data[0].id)
    }
  }

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center font-bold">S</div>
          <span className="font-semibold">Slack Clone</span>
        </div>
        <div className="flex items-center gap-1 mt-2 text-sm text-gray-300">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {currentUser.username}
        </div>
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300 flex items-center gap-1">
              <Hash className="w-4 h-4" />
              Channels
            </span>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>Create a channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="e.g. marketing"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Input
                      value={newChannelDescription}
                      onChange={(e) => setNewChannelDescription(e.target.value)}
                      placeholder="What's this channel about?"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <Button onClick={createChannel} className="w-full">
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 hover:bg-gray-700 ${
                  selectedChannelId === channel.id ? "bg-blue-600 text-white" : "text-gray-300"
                }`}
              >
                <Hash className="w-4 h-4" />
                {channel.name}
              </button>
            ))}
          </div>

          {/* Workspace Tools Section */}
          <div className="mt-6 space-y-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Workspace</h3>
            <MembersPanel currentUser={currentUser} />
            <InviteManager currentUser={currentUser} />
            <ProfileModal />
          </div>
        </div>
      </div>
    </div>
  )
}
