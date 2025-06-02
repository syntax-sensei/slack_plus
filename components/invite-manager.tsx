"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { UserPlus, Copy, Check, RefreshCw } from "lucide-react"

interface InviteManagerProps {
  currentUser: any
}

export function InviteManager({ currentUser }: InviteManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateInvite = useCallback(async () => {
    if (!currentUser?.id) {
      alert("Current user ID is missing")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/invite/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate invite code")
      }

      setInviteCode(data.inviteCode.code)
      setExpiresAt(data.inviteCode.expires_at)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      alert(`Failed to generate invite link: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }, [currentUser?.id])

  const getInviteLink = useCallback(() => {
    if (typeof window === "undefined" || !inviteCode) return ""
    return `${window.location.origin}/invite/${inviteCode}`
  }, [inviteCode])

  const copyInviteLink = useCallback(async () => {
    const link = getInviteLink()
    if (!link) return

    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = link
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [getInviteLink])

  const formatExpiryDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  const resetDialog = useCallback(() => {
    setInviteCode(null)
    setExpiresAt(null)
    setCopied(false)
  }, [])

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          resetDialog()
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite People
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Invite People to Workspace</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!inviteCode ? (
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                Generate an invite link to share with people you want to invite to your workspace.
              </p>
              <Button onClick={handleGenerateInvite} disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Invite Link</label>
                <div className="flex mt-1">
                  <Input value={getInviteLink()} readOnly className="flex-1 bg-gray-700 border-gray-600 text-white" />
                  <Button onClick={copyInviteLink} className="ml-2" variant={copied ? "outline" : "default"}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-400">
                <p>This invite link:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Can be used up to 5 times</li>
                  <li>Expires on {expiresAt ? formatExpiryDate(expiresAt) : "N/A"}</li>
                  <li>Is only valid for this workspace</li>
                </ul>
              </div>

              <div className="pt-2">
                <Button onClick={handleGenerateInvite} variant="outline" className="w-full" disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate New Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
