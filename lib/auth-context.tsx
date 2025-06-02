"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  userProfile: any | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  updateProfile: (updates: any) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadUserProfile(session.user.id)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading user profile:", error)
        return
      }

      if (data) {
        setUserProfile(data)
      }
    } catch (err) {
      console.error("Exception loading user profile:", err)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      return {}
    } catch (err) {
      return { error: "An unexpected error occurred" }
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      // First check if username is available
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.toLowerCase())
        .single()

      if (existingUser) {
        return { error: "Username is already taken" }
      }

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { error: error.message }
      }

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase.from("users").insert({
          id: data.user.id,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        })

        if (profileError) {
          console.error("Error creating user profile:", profileError)
          return { error: "Failed to create user profile" }
        }
      }

      return {}
    } catch (err) {
      return { error: "An unexpected error occurred" }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const updateProfile = async (updates: any) => {
    try {
      if (!user) return { error: "No user logged in" }

      const { error } = await supabase.from("users").update(updates).eq("id", user.id)

      if (error) {
        return { error: error.message }
      }

      // Reload profile
      await loadUserProfile(user.id)
      return {}
    } catch (err) {
      return { error: "An unexpected error occurred" }
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
