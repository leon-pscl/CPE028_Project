export type AssessmentDirection = 'REPAIR' | 'RECYCLE'

export interface MarketPriceQuote {
  source: 'Shopee' | 'Lazada'
  title: string
  price: number
  currency: string
  url: string
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
}

export interface DeviceFormData {
  brand: string
  model: string
  ageMonths: number
  issue: string
  severity: string
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
  /** kept for backward compat with old NavigatePage */
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
  // enriched fields used by the new NavigatePage
  icon?: string
  diy?: DiyLevel
  isConnect?: boolean
  connectFilter?: string
  refLabel?: string
  refUrl?: string
  /** if true, DIY attempt is dangerous regardless of skill level */
  unsafeDiy?: boolean
  /** populated by the filter engine */
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
  /** controls colour: 'age' | 'damage' | 'danger' | 'score' | 'brand' */
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
