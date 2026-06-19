export type AssessmentDirection = 'REPAIR' | 'RECYCLE'

export interface MarketPriceQuote {
  source: 'Shopee' | 'Lazada'
  title: string
  price: number
  currency: string
  url: string
  component?: string
}

// ── ML model output shapes (from predict_unified.py) ────────────
// damage_analysis.combined
export interface MlDamageResult {
  /** Raw combined label e.g. "Battery degradation - Battery - Cracked" */
  input: string
  predictedLabel: string
  confidence: number          // 0.0–1.0 combined_confidence
}

// repairability block → mapped to score ÷ 10 for 0–10 display
export interface MlRepairabilityResult {
  deviceText: string
  /** repairability_index (0–100) */
  score: number
  isRepairable: boolean
  recommendation: string
}

// pricing block
export interface MlCostAnalysisResult {
  estimatedRepairCost: number   // total_repair_cost_php
  partsCost: number             // estimated_parts_cost_php
  laborCost: number             // labor_fee_php (fixed ₱600)
  deviceValue: number           // original_device_price_php
  repairRatio: number           // 0.0–1.0+
  recommendation: string        // price_recommendation
}

// crack detector output
export type MlCrackClassification = 'cracked' | 'not_cracked' | 'unknown'

export interface AssessmentResult {
  id?: string
  score: number
  direction: AssessmentDirection
  rationale: string
  confidence: 'high' | 'medium' | 'low'
  costEstimate?: { min: number; max: number }

  // ── Image-model (MobileNetV3 / legacy) ──────────────────────
  modelLabel?: string
  modelProbability?: number

  // ── Marketplace prices ───────────────────────────────────────
  marketPrices?: MarketPriceQuote[]

  // ── Unified ML pipeline outputs (predict_unified.py) ────────
  /** NLP + image combined damage label */
  mlDamage?: MlDamageResult
  /** Repairability regressor result */
  mlRepairability?: MlRepairabilityResult
  /** Pricing block */
  mlCostAnalysis?: MlCostAnalysisResult
  /** final_recommendation.decision string */
  mlRecommendation?: string
  /** damage_analysis.cracks.classification */
  mlCrackDetection?: MlCrackClassification
  /** damage_analysis.corrosion.corrosion_level (5–9) or null */
  mlCorrosionLevel?: number | null
  /** repairability.age_warning — true when device ≥ 10 years */
  mlAgeWarning?: boolean
  /** damage_analysis.damaged_components list e.g. ["screen","battery"] */
  mlDamagedComponents?: string[]

  /** Whether the result came from the ML pipeline */
  fromMl?: boolean

  // ── Form carry-through ───────────────────────────────────────
  issue?: string
  severity?: 'low' | 'moderate' | 'severe'
}

export interface DeviceFormData {
  brand: string
  model: string
  ageMonths: number
  damageDescription: string
  issue?: string
  severity?: 'low' | 'moderate' | 'severe'
  /** "Smartphone" | "Laptop" | "Tablet" — maps to predict_unified device_type */
  deviceType?: string
  /** Original device purchase price in PHP — used for repair_ratio */
  pricePhp: number
}

// ── Roadmap types ────────────────────────────────────────────────

export type StepStatus = 'priority' | 'recommended' | 'info' | 'unsafe' | 'skipped' | 'default'
export type DiyLevel   = 'safe' | 'shop' | 'caution' | 'info'

export interface RoadmapSubItem {
  id: string
  title: string
  description: string
  type: 'action' | 'info' | 'download' | 'referral'
  completed: boolean
  branch?: 'left' | 'right'
}

export interface RoadmapStep {
  id: string
  title: string
  description: string
  type: 'action' | 'info' | 'download' | 'referral'
  completed: boolean
  recommended?: boolean
  subItems?: RoadmapSubItem[]
  icon?: string
  diy?: DiyLevel
  isConnect?: boolean
  connectFilter?: string
  refLabel?: string
  refUrl?: string
  unsafeDiy?: boolean
  status?: StepStatus
  skipReason?: string
  subOpen?: boolean
}

export interface RoadmapPhase {
  phase: string
  steps: RoadmapStep[]
}

// ── Filter engine output ─────────────────────────────────────────

export interface ReasoningChip {
  label: string
  cls: string
}

export interface FilterResult {
  direction: AssessmentDirection
  score: number
  reasoningChips: ReasoningChip[]
  priorityStepIds: string[]
  recommendedStepIds: string[]
  skippedStepIds: string[]
  unsafeStepIds: string[]
  skipReasons: Record<string, string>
  /** Sub-item IDs that are irrelevant for this user — rendered struck-through */
  slashedSubIds: string[]
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
