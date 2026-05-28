/**
 * types/database.ts
 *
 * Auto-generated types from your Supabase schema.
 * To regenerate after schema changes, run:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * The stub below covers the tables used by the auth module.
 * Expand as you add more features.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'consumer' | 'technician' | 'admin'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'consumer' | 'technician' | 'admin'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'consumer' | 'technician' | 'admin'
          avatar_url?: string | null
          updated_at?: string
        }
      }
      assessments: {
        Row: {
          id: string
          user_id: string | null
          device_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          device_id?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string | null
          device_id?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      create_assessment_tx: {
        Args: Record<string, unknown>
        Returns: string
      }
    }
    Enums: {
      user_role: 'consumer' | 'technician' | 'admin'
    }
  }
}
