import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          created_at?: string
        }
      }
      channels: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          channel_id: string | null
          user_id: string | null
          parent_message_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          channel_id?: string | null
          user_id?: string | null
          parent_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          channel_id?: string | null
          user_id?: string | null
          parent_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          message_id: string | null
          user_id: string | null
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id?: string | null
          user_id?: string | null
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string | null
          user_id?: string | null
          emoji?: string
          created_at?: string
        }
      }
    }
  }
}
