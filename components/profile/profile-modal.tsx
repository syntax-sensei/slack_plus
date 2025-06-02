"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function ProfileModal() {
  const { user, userProfile, signOut, updateProfile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(userProfile?.username || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateProfile = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!username.trim()) {
        setError("Username is required")
        return
      }

      const { error } = await updateProfile({ username: username.toLowerCase() })
      if (error) {
        setError(error)
      } else {
        setIsEditing(false)
      }
    } catch (err) {
      setError("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  if (!userProfile) return null

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
          <Avatar className="w-4 h-4 mr-2">
            <AvatarImage src={userProfile.avatar_url || "/placeholder.svg"} />
            <AvatarFallback>{userProfile.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Profile Picture */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={userProfile.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="text-lg">{userProfile.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{userProfile.username}</h3>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded text-sm">{error}</div>
          )}

          {/* Edit Profile */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              {isEditing ? (
                <div className="flex space-x-2">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button onClick={handleUpdateProfile} disabled={loading} size="sm">
                    {loading ? "Saving..." : "Save"}
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-gray-100">{userProfile.username}</span>
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <span className="text-gray-100">{user?.email}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Member Since</label>
              <span className="text-gray-100">
                {new Date(userProfile.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Sign Out */}
          <div className="pt-4 border-t border-gray-700">
            <Button onClick={handleSignOut} variant="destructive" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
