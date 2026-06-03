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
          role: 'consumer' | 'moderator' | 'admin'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'consumer' | 'moderator' | 'admin'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'consumer' | 'moderator' | 'admin'
          avatar_url?: string | null
          updated_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          brand: string
          model: string
          device_type: string
          release_date: string | null
          repairability_index: number | null
          typical_lifespan_months: number | null
        }
        Insert: {
          id?: string
          brand: string
          model: string
          device_type: string
          release_date?: string | null
          repairability_index?: number | null
          typical_lifespan_months?: number | null
        }
        Update: {
          brand?: string
          model?: string
          device_type?: string
          release_date?: string | null
          repairability_index?: number | null
          typical_lifespan_months?: number | null
        }
      }
      assessments: {
        Row: {
          id: string
          user_id: string | null
          device_id: string | null
          device_age_months: number
          issue_severity: number
          parts_availability: number
          repairability_idx: number
          cost_ratio: number
          manufacturer_support: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          device_id?: string | null
          device_age_months: number
          issue_severity: number
          parts_availability: number
          repairability_idx: number
          cost_ratio: number
          manufacturer_support: boolean
          created_at?: string
        }
        Update: {
          user_id?: string | null
          device_id?: string | null
          device_age_months?: number
          issue_severity?: number
          parts_availability?: number
          repairability_idx?: number
          cost_ratio?: number
          manufacturer_support?: boolean
        }
      }
      repair_scores: {
        Row: {
          id: string
          assessment_id: string
          direction: string
          score: number
          confidence: string | null
          probability: number | null
          feature_vector: Json | null
          feature_importances: Json | null
          ml_model_id: string | null
        }
        Insert: {
          id?: string
          assessment_id: string
          direction: string
          score: number
          confidence?: string | null
          probability?: number | null
          feature_vector?: Json | null
          feature_importances?: Json | null
          ml_model_id?: string | null
        }
        Update: {
          assessment_id?: string
          direction?: string
          score?: number
          confidence?: string | null
          probability?: number | null
          feature_vector?: Json | null
          feature_importances?: Json | null
          ml_model_id?: string | null
        }
      }
      cost_estimates: {
        Row: {
          id: string
          assessment_id: string
          min_cost: number | null
          max_cost: number | null
          currency: string
        }
        Insert: {
          id?: string
          assessment_id: string
          min_cost?: number | null
          max_cost?: number | null
          currency?: string
        }
        Update: {
          assessment_id?: string
          min_cost?: number | null
          max_cost?: number | null
          currency?: string
        }
      }
      shops: {
        Row: {
          id: string
          name: string
          address: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          website: string | null
          hours: string | null
          brands_serviced: string[] | null
          type: string
          is_verified: boolean
        }
        Insert: {
          id?: string
          name: string
          address: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          website?: string | null
          hours?: string | null
          brands_serviced?: string[] | null
          type: string
          is_verified?: boolean
        }
        Update: {
          name?: string
          address?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          website?: string | null
          hours?: string | null
          brands_serviced?: string[] | null
          type?: string
          is_verified?: boolean
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      create_assessment_tx: {
        Args: {
          p_device_id?: string
          p_device_age_months?: number
          p_issue_severity?: number
          p_parts_availability?: number
          p_repairability_idx?: number
          p_cost_ratio?: number
          p_manufacturer_support?: boolean
        }
        Returns: string
      }
    }
    Enums: {
      user_role: 'consumer' | 'moderator' | 'admin'
    }
  }
}
