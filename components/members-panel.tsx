"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Users, X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface User {
  id: string
  username: string
  email: string
  avatar_url: string | null
  created_at: string
}

interface MembersPanelProps {
  currentUser: any
}

export function MembersPanel({ currentUser }: MembersPanelProps) {
  const [members, setMembers] = useState<User[]>([])
  const [filteredMembers, setFilteredMembers] = useState<User[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadMembers()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredMembers(
        members.filter(
          (member) => member.username.toLowerCase().includes(query) || member.email.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, members])

  const loadMembers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("users").select("*").order("username", { ascending: true })

      if (error) {
        console.error("Error loading members:", error)
      } else {
        setMembers(data || [])
        setFilteredMembers(data || [])
      }
    } catch (err) {
      console.error("Exception loading members:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatJoinDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (userId: string) => {
    // For demo purposes, randomly assign online/offline status
    // In a real app, you'd track actual user presence
    return userId === currentUser.id ? "bg-green-500" : Math.random() > 0.5 ? "bg-green-500" : "bg-gray-500"
  }

  const getStatusText = (userId: string) => {
    return userId === currentUser.id ? "Online (You)" : Math.random() > 0.5 ? "Online" : "Away"
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
          <Users className="w-4 h-4 mr-2" />
          Members ({members.length || "..."})
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Workspace Members
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            View and search all members in your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {members.length === 0 ? "No members found" : "No members match your search"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{member.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(
                        member.id,
                      )}`}
                    ></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{member.username}</span>
                      {member.id === currentUser.id && (
                        <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{member.email}</div>
                    <div className="text-xs text-gray-500">{getStatusText(member.id)}</div>
                  </div>

                  <div className="text-xs text-gray-500">Joined {formatJoinDate(member.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="text-sm text-gray-400 text-center">
            {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} in workspace
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
