import { supabase } from './supabaseClient'

interface QueryResult<T> {
  data: T | null
  error: any
}

interface UserProfile {
  id: string
  full_name: string | null
  role: string
  created_at: string
  updated_at: string
}

interface Device {
  id: string
  brand: string
  model: string
  device_type: string
  release_date: string | null
  repairability_index: number | null
  typical_lifespan_months: number | null
}

interface Assessment {
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

interface RepairScore {
  id: string
  assessment_id: string
  direction: string
  score: number
  confidence: string | null
  probability: number | null
  feature_vector: any
  feature_importances: any
  ml_model_id: string | null
}

interface CostEstimate {
  id: string
  assessment_id: string
  min_cost: number | null
  max_cost: number | null
  currency: string
}

interface Shop {
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

type AssessmentCreate = Omit<Assessment, 'id' | 'created_at'>
type RepairScoreCreate = Omit<RepairScore, 'id'>
type CostEstimateCreate = Omit<CostEstimate, 'id'>

export const db = {
  users: {
    getProfile: async (userId: string): Promise<QueryResult<UserProfile>> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single<UserProfile>()

      return { data, error }
    },

    updateProfile: async (userId: string, updates: Partial<UserProfile>): Promise<QueryResult<null>> => {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      return { data, error }
    },
  },

  devices: {
    getAll: async (): Promise<QueryResult<Device[]>> => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')

      return { data, error }
    },

    getById: async (deviceId: string): Promise<QueryResult<Device>> => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', deviceId)
        .single<Device>()

      return { data, error }
    },

    search: async (query: string): Promise<QueryResult<Device[]>> => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .or(`brand.ilike.%${query}%,model.ilike.%${query}%`)

      return { data, error }
    },
  },

  assessments: {
    create: async (assessmentData: AssessmentCreate): Promise<QueryResult<Assessment>> => {
      const { data, error } = await supabase
        .from('assessments')
        .insert(assessmentData)
        .select()
        .single<Assessment>()

      return { data, error }
    },

    getById: async (assessmentId: string): Promise<QueryResult<Assessment>> => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single<Assessment>()

      return { data, error }
    },

    getByUserId: async (userId: string): Promise<QueryResult<Assessment[]>> => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return { data, error }
    },
  },

  repairScores: {
    create: async (scoreData: RepairScoreCreate): Promise<QueryResult<RepairScore>> => {
      const { data, error } = await supabase
        .from('repair_scores')
        .insert(scoreData)
        .select()
        .single<RepairScore>()

      return { data, error }
    },

    getByAssessmentId: async (assessmentId: string): Promise<QueryResult<RepairScore>> => {
      const { data, error } = await supabase
        .from('repair_scores')
        .select('*')
        .eq('assessment_id', assessmentId)
        .single<RepairScore>()

      return { data, error }
    },
  },

  costEstimates: {
    create: async (estimateData: CostEstimateCreate): Promise<QueryResult<CostEstimate>> => {
      const { data, error } = await supabase
        .from('cost_estimates')
        .insert(estimateData)
        .select()
        .single<CostEstimate>()

      return { data, error }
    },

    getByAssessmentId: async (assessmentId: string): Promise<QueryResult<CostEstimate>> => {
      const { data, error } = await supabase
        .from('cost_estimates')
        .select('*')
        .eq('assessment_id', assessmentId)
        .single<CostEstimate>()

      return { data, error }
    },
  },

  directory: {
    getNearby: async (latitude: number, longitude: number, radiusKm: number = 10, type: string | null = null): Promise<QueryResult<Shop[]>> => {
      let query = supabase
        .from('shops')
        .select('*')
        .eq('is_verified', true)

      if (type) {
        query = query.eq('type', type)
      }

      const { data, error } = await query

      if (data && latitude && longitude) {
        const earthRadiusKm = 6371
        const filtered = data.filter((shop: Shop) => {
          if (!shop.latitude || !shop.longitude) return false

          const dLat = ((shop.latitude - latitude) * Math.PI) / 180
          const dLon = ((shop.longitude - longitude) * Math.PI) / 180

          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((latitude * Math.PI) / 180) *
              Math.cos((shop.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const distance = earthRadiusKm * c

          return distance <= radiusKm
        })

        return { data: filtered, error }
      }

      return { data, error }
    },

    getById: async (id: string, type: string = 'shop'): Promise<QueryResult<Shop>> => {
      const table = type === 'shop' ? 'shops' : 'facilities'
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single<Shop>()

      return { data, error }
    },
  },
}

export default db