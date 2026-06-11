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

/**
 * Platform tags control which sub-items are shown for a given device.
 * 'all'     = always shown
 * 'mobile'  = phones only (any brand)
 * 'laptop'  = laptops only
 * 'ios'     = Apple iPhone / iPad
 * 'android' = any Android phone
 * 'samsung' = Samsung specifically (USSD codes, Samsung Account, etc.)
 * 'windows' = Windows laptops
 * 'macos'   = Mac laptops
 */
export type SubPlatform =
  | 'all'
  | 'mobile'
  | 'laptop'
  | 'ios'
  | 'android'
  | 'samsung'
  | 'windows'
  | 'macos'

export interface RoadmapSubItem {
  id: string
  title: string
  description: string
  type: 'action' | 'info' | 'download' | 'referral'
  completed: boolean
  /** Which device platforms this sub-item applies to. Omit = 'all'. */
  platforms?: SubPlatform[]
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
  /** Sub-item IDs to hide because they don't apply to this device class */
  skippedSubIds: string[]
  /** Detected device class for display */
  deviceClass: 'mobile-ios' | 'mobile-android' | 'mobile-samsung' | 'laptop-windows' | 'laptop-macos' | 'laptop-other' | 'unknown'
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