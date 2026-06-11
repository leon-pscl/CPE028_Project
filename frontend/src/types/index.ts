export type AssessmentDirection = 'REPAIR' | 'RECYCLE'

export interface MarketPriceQuote {
  source: 'Shopee' | 'Lazada'
  title: string
  price: number
  currency: string
  url: string
}

export interface MlDamageAssessment {
  input: string
  predictedLabel: string
  confidence: number
}

export interface MlRepairabilityAssessment {
  deviceText: string
  score: number
  isRepairable: boolean
  recommendation: string
}

export interface MlCostAnalysis {
  estimatedRepairCost: number
  partsCost: number
  laborCost: number
  deviceValue: number
  repairRatio: number
  recommendation: string
}

export interface AssessmentResult {
  score: number
  direction: AssessmentDirection
  rationale: string
  confidence: 'high' | 'medium' | 'low'
  costEstimate?: { min: number; max: number }
  modelLabel?: string
  modelProbability?: number
  marketPrices?: MarketPriceQuote[]
  mlDamage?: MlDamageAssessment
  mlRepairability?: MlRepairabilityAssessment
  mlCostAnalysis?: MlCostAnalysis
  mlRecommendation?: string
  fromMl?: boolean
}

export interface DeviceFormData {
  brand: string
  model: string
  ageMonths: number
  damageDescription: string
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
