/* eslint-disable @typescript-eslint/no-explicit-any */

import { StationType } from '../types/station'
import { supabase as typedSupabase } from './supabaseClient'
import { sanitizeForDb } from './sanitize'

const supabase = typedSupabase as any

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
  types: string[] | null
  is_verified: boolean
  submitted_by: string | null
  rejected: boolean
  task_id: string | null
}

type AssessmentCreate = Omit<Assessment, 'id' | 'created_at'>
type RepairScoreCreate = Omit<RepairScore, 'id'>
type CostEstimateCreate = Omit<CostEstimate, 'id'>

export interface TransactionPayload {
  direction?: string
  score?: number
  [key: string]: unknown
}

export interface UserTransaction {
  id: string
  user_id: string
  event_type: string
  payload: TransactionPayload
  created_at: string
}

export interface PendingSubmission {
  id: string
  shop_id: string | null
  facility_id: string | null
  source: string
  place_id: string | null
  status: string
  submitted_by: string | null
  reviewed_by: string | null
  submitted_at: string
  reviewed_at: string | null
  notes: string | null
  shop?: Shop | null
}

export const db = {
  users: {
    getProfile: async (userId: string): Promise<QueryResult<UserProfile>> => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

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
        .single()

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
        .single()

      return { data, error }
    },

    getById: async (assessmentId: string): Promise<QueryResult<Assessment>> => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single()

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
        .single()

      return { data, error }
    },

    getByAssessmentId: async (assessmentId: string): Promise<QueryResult<RepairScore>> => {
      const { data, error } = await supabase
        .from('repair_scores')
        .select('*')
        .eq('id', assessmentId)
        .single()

      return { data, error }
    },
  },

  costEstimates: {
    create: async (estimateData: CostEstimateCreate): Promise<QueryResult<CostEstimate>> => {
      const { data, error } = await supabase
        .from('cost_estimates')
        .insert(estimateData)
        .select()
        .single()

      return { data, error }
    },

    getByAssessmentId: async (assessmentId: string): Promise<QueryResult<CostEstimate>> => {
      const { data, error } = await supabase
        .from('cost_estimates')
        .select('*')
        .eq('id', assessmentId)
        .single()

      return { data, error }
    },
  },

  assessmentResults: {
    create: async (payload: {
      id?: string
      user_id: string
      result_json: Record<string, unknown>
      form_json: Record<string, unknown>
    }): Promise<QueryResult<{ id: string }>> => {
      const { data, error } = await supabase
        .from('assessment_results')
        .insert({
          ...(payload.id ? { id: payload.id } : {}),
          user_id: payload.user_id,
          result_json: payload.result_json,
          form_json: payload.form_json,
        })
        .select('id')
        .single()

      return { data, error }
    },

    getById: async (id: string): Promise<QueryResult<{
      id: string
      user_id: string
      result_json: Record<string, unknown>
      form_json: Record<string, unknown>
      created_at: string
    }>> => {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('id', id)
        .single()

      return { data, error }
    },

    getByUserId: async (userId: string): Promise<QueryResult<Array<{
      id: string
      user_id: string
      result_json: Record<string, unknown>
      form_json: Record<string, unknown>
      created_at: string
    }>>> => {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return { data, error }
    },
  },

  userTransactions: {
    getByUserId: async (userId: string): Promise<QueryResult<UserTransaction[]>> => {
      const { data, error } = await supabase
        .from('user_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('event_type', 'ASSESSMENT_CREATED')
        .order('created_at', { ascending: false })

      return { data, error }
    },
  },

  directory: {
    getNearby: async (latitude: number, longitude: number, radiusKm: number = 10, type: string | null = null, userId: string | null = null, role?: string): Promise<QueryResult<Shop[]>> => {
      let query = supabase
        .from('shops')
        .select(`*, verification_tasks!left(id, status)`)

      if (type) {
        query = query.contains('types', [type])
      }

      const { data, error } = await query

      const isAdmin = role === 'admin' || role === 'moderator'

      if (data && latitude && longitude) {
        const earthRadiusKm = 6371
        let filtered = data

        if (!isAdmin) {
          filtered = data.filter((shop: any) => {
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
        }

        filtered = filtered
          .filter((shop: any) => {
            if (!shop.rejected) return true
            if (isAdmin) return true
            return shop.submitted_by === userId
          })

        const withTaskId = filtered.map((shop: any) => {
          const pendingTask = (shop.verification_tasks || []).find((t: any) => t.status === 'pending')
          return { ...shop, task_id: pendingTask?.id || null }
        })

        return { data: withTaskId, error }
      }

      return { data, error }
    },

    getById: async (id: string, type: string = 'shop'): Promise<QueryResult<Shop>> => {
      const table = type === 'shop' ? 'shops' : 'facilities'
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      return { data, error }
    },

    submitLocation: async (userId: string, data: {
      name: string
      types: StationType[]
      address: string
      latitude: number
      longitude: number
      phone?: string
      website?: string
      hours?: string
      brands_serviced?: string[]
      accepted_items?: string[]
    }): Promise<QueryResult<any>> => {
      const typeStr = data.types.includes('recycle') ? 'recycling' : 'repair'
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .insert({
          name: sanitizeForDb(data.name),
          address: sanitizeForDb(data.address),
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone ? sanitizeForDb(data.phone) : null,
          website: data.website ? sanitizeForDb(data.website) : null,
          hours: data.hours ? sanitizeForDb(data.hours) : null,
          brands_serviced: data.brands_serviced ? data.brands_serviced.map((b) => sanitizeForDb(b)).filter(Boolean) : [],
          type: typeStr,
          types: data.types,
          is_verified: false,
          submitted_by: userId,
        })
        .select()
        .single()

      if (shopError) return { data: null, error: shopError }

      const { data: task, error: taskError } = await supabase
        .from('verification_tasks')
        .insert({
          shop_id: shop.id,
          source: 'manual',
          status: 'pending',
          submitted_by: userId,
        })
        .select('id')
        .single()

      if (taskError) return { data: null, error: taskError }

      return { data: { ...shop, task_id: task.id }, error: null }
    },

    getPendingSubmissions: async (): Promise<QueryResult<PendingSubmission[]>> => {
      const { data, error } = await supabase
        .from('verification_tasks')
        .select('*, shop:shops(*)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })

      return { data, error }
    },

    getReviewedSubmissions: async (): Promise<QueryResult<PendingSubmission[]>> => {
      const { data, error } = await supabase
        .from('verification_tasks')
        .select('*, shop:shops(*)')
        .in('status', ['approved', 'rejected'])
        .order('reviewed_at', { ascending: false })

      return { data, error }
    },

    approveSubmission: async (taskId: string, reviewerId: string): Promise<QueryResult<null>> => {
      const { data: task, error: taskError } = await supabase
        .from('verification_tasks')
        .select('shop_id')
        .eq('id', taskId)
        .single()

      if (taskError) return { data: null, error: taskError }

      const { error: updateError } = await supabase
        .from('verification_tasks')
        .update({
          status: 'approved',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (updateError) return { data: null, error: updateError }

      if (task.shop_id) {
        const { error: shopError } = await supabase
          .from('shops')
          .update({ is_verified: true, rejected: false })
          .eq('id', task.shop_id)

        if (shopError) return { data: null, error: shopError }
      }

      return { data: null, error: null }
    },

    submitTypeSuggestion: async (
      geoapifyPlaceId: string,
      originalTypes: string[],
      suggestedTypes: string[],
      userId: string
    ): Promise<QueryResult<null>> => {
      const { error } = await supabase.from('type_suggestions').insert({
        geoapify_place_id: geoapifyPlaceId,
        original_types: originalTypes,
        suggested_types: suggestedTypes,
        submitted_by: userId,
        status: 'pending',
      })
      return { data: null, error }
    },

    getPendingTypeSuggestions: async (): Promise<QueryResult<any[]>> => {
      const { data, error } = await supabase
        .from('type_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      return { data, error }
    },

    approveTypeSuggestion: async (id: string, reviewerId: string): Promise<QueryResult<null>> => {
      const { data: suggestion, error: fetchError } = await supabase
        .from('type_suggestions')
        .select('geoapify_place_id, suggested_types')
        .eq('id', id)
        .single()
      if (fetchError) return { data: null, error: fetchError }

      const { error: updateError } = await supabase
        .from('type_suggestions')
        .update({
          status: 'approved',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (updateError) return { data: null, error: updateError }

      const { error: upsertError } = await supabase
        .from('type_overrides')
        .upsert({
          geoapify_place_id: suggestion.geoapify_place_id,
          types: suggestion.suggested_types,
          updated_by: reviewerId,
          updated_at: new Date().toISOString(),
        })
      return { data: null, error: upsertError }
    },

    rejectTypeSuggestion: async (id: string, reviewerId: string): Promise<QueryResult<null>> => {
      const { error } = await supabase
        .from('type_suggestions')
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      return { data: null, error }
    },

    getTypeOverrides: async (): Promise<QueryResult<any[]>> => {
      const { data, error } = await supabase.from('type_overrides').select('*')
      return { data, error }
    },

    rejectSubmission: async (taskId: string, reviewerId: string, notes: string): Promise<QueryResult<null>> => {
      const { data: task, error: fetchError } = await supabase
        .from('verification_tasks')
        .select('shop_id')
        .eq('id', taskId)
        .single()

      if (fetchError) return { data: null, error: fetchError }

      const { error: updateError } = await supabase
        .from('verification_tasks')
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          notes,
        })
        .eq('id', taskId)

      if (updateError) return { data: null, error: updateError }

      if (task.shop_id) {
        const { error: shopError } = await supabase
          .from('shops')
          .update({ rejected: true })
          .eq('id', task.shop_id)

        if (shopError) return { data: null, error: shopError }
      }

      return { data: null, error: null }
    },
  },

  roadmapProgress: {
    getByAssessmentId: async (assessmentResultId: string): Promise<QueryResult<{
      id: string
      user_id: string
      assessment_result_id: string
      completed_step_ids: string[]
      completed_sub_ids: string[]
      active_phase_idx: number
      active_step_idx: number
      updated_at: string
    }>> => {
      const { data, error } = await supabase
        .from('roadmap_progress')
        .select('*')
        .eq('assessment_result_id', assessmentResultId)
        .single()
      return { data, error }
    },

    upsert: async (payload: {
      user_id: string
      assessment_result_id: string
      completed_step_ids: string[]
      completed_sub_ids: string[]
      active_phase_idx: number
      active_step_idx: number
    }): Promise<QueryResult<null>> => {
      const { error } = await supabase
        .from('roadmap_progress')
        .upsert(
          {
            user_id:              payload.user_id,
            assessment_result_id: payload.assessment_result_id,
            completed_step_ids:   payload.completed_step_ids,
            completed_sub_ids:    payload.completed_sub_ids,
            active_phase_idx:     payload.active_phase_idx,
            active_step_idx:      payload.active_step_idx,
          },
          { onConflict: 'user_id,assessment_result_id' },
        )
      return { data: null, error }
    },
  },
}

export default db
