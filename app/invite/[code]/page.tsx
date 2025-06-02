"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function InvitePage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [inviteData, setInviteData] = useState<any>(null)

  useEffect(() => {
    async function checkInviteCode() {
      try {
        console.log("Validating invite code:", params.code)

        // Get the invite code
        const { data: inviteCodeData, error: inviteError } = await supabase
          .from("invite_codes")
          .select("*")
          .eq("code", params.code)
          .eq("is_active", true)
          .gt("uses_remaining", 0)
          .gt("expires_at", new Date().toISOString())
          .single()

        console.log("Invite validation result:", { inviteCodeData, inviteError })

        if (inviteError) {
          console.error("Invite validation error:", inviteError)
          if (inviteError.code === "PGRST116") {
            setError("Invite code not found or has expired")
          } else {
            setError(`Validation error: ${inviteError.message}`)
          }
          setIsValid(false)
        } else if (!inviteCodeData) {
          setError("Invalid or expired invite code")
          setIsValid(false)
        } else {
          setInviteData(inviteCodeData)
          setIsValid(true)
        }
      } catch (err) {
        console.error("Exception validating invite code:", err)
        setError("Failed to validate invite code")
        setIsValid(false)
      } finally {
        setIsValidating(false)
      }
    }

    if (params.code) {
      checkInviteCode()
    } else {
      setError("No invite code provided")
      setIsValid(false)
      setIsValidating(false)
    }
  }, [params.code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (!email || !username || !password) {
        setError("All fields are required")
        return
      }

      if (!email.includes("@")) {
        setError("Please enter a valid email address")
        return
      }

      if (username.length < 2) {
        setError("Username must be at least 2 characters long")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }

      console.log("Attempting to join workspace with:", { email, username, inviteCode: params.code })

      // Check if username is available
      const { data: existingUsername, error: usernameError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toLowerCase())
        .single()

      if (usernameError && usernameError.code !== "PGRST116") {
        console.error("Error checking existing username:", usernameError)
        setError("Failed to check username availability")
        return
      }

      if (existingUsername) {
        setError("This username is already taken")
        return
      }

      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      })

      console.log("Auth signup result:", { authData, authError })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError("Failed to create account")
        return
      }

      // Create user profile
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        username: username.toLowerCase().trim(),
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      })

      console.log("Profile creation result:", { profileError })

      if (profileError) {
        console.error("Profile creation error:", profileError)
        setError("Failed to create user profile")
        return
      }

      // Decrement the uses_remaining
      const { error: updateError } = await supabase
        .from("invite_codes")
        .update({ uses_remaining: inviteData.uses_remaining - 1 })
        .eq("id", inviteData.id)

      if (updateError) {
        console.error("Error updating invite code:", updateError)
        // Don't fail the whole process for this
      }

      // Redirect to the main app (auth state will be handled automatically)
      router.push("/")
    } catch (err) {
      console.error("Exception joining workspace:", err)
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Validating invite code...</p>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Invalid Invite</h2>
            <p className="text-gray-400">{error || "This invite link is invalid or has expired."}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-600 rounded flex items-center justify-center font-bold text-2xl mx-auto mb-4">
            S
          </div>
          <h2 className="text-2xl font-bold">Join Slack Clone Workspace</h2>
          <p className="text-gray-400 mt-2">You've been invited to join this workspace</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-gray-700 border-gray-600 text-white w-full"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              required
              className="bg-gray-700 border-gray-600 text-white w-full"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="bg-gray-700 border-gray-600 text-white w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Join Workspace"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <button type="button" onClick={() => router.push("/")} className="text-blue-400 hover:text-blue-300">
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
