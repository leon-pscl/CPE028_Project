export type AssessmentDirection = 'REPAIR' | 'RECYCLE'

export interface AssessmentResult {
  score: number
  direction: AssessmentDirection
  rationale: string
  confidence: 'high' | 'medium' | 'low'
  costEstimate?: { min: number; max: number }
}

export interface DeviceFormData {
  brand: string
  model: string
  ageMonths: number
  issue: string
  severity: string
}

export interface RoadmapSubItem {
  id: string
  title: string
  description: string
  type: 'action' | 'info' | 'download' | 'referral'
  completed: boolean
  branch: 'left' | 'right'
}

export interface RoadmapStep {
  id: string
  title: string
  description: string
  type: 'action' | 'info' | 'download' | 'referral'
  completed: boolean
  recommended?: boolean
  subItems?: RoadmapSubItem[]
}

export interface ShopPin {
  id: string
  name: string
  address: string
  type: 'repair' | 'recycling'
  lat: number
  lng: number
  distance?: string
}
