import type { AssessmentResult, DeviceFormData, AssessmentDirection } from '@/types'

// ── Weight rebalance (Fix 1) ────────────────────────────────────────
// Old: age=0.25  costRatio=0.30  parts=0.25  support=0.20
// New: age=0.30  costRatio=0.35  parts=0.25  support=0.10
// Rationale: brand support was inflating scores for Apple/Samsung even
// on decade-old devices. Age and cost-ratio are stronger recycle signals.
export const SCORING_WEIGHTS = {
  age: 0.30,
  costRatio: 0.35,
  partsAvailability: 0.25,
  manufacturerSupport: 0.10,
}

export const ISSUE_PARTS_AVAILABILITY: Record<string, number> = {
  'Battery degradation': 95,
  'Cracked screen': 85,
  'Charging port issue': 90,
  'Speaker problem': 80,
  'Camera malfunction': 75,
  'Software issue': 100,
  'Overheating': 70,
  'Motherboard failure': 15,
  'Water/Liquid damage': 25,
  'Storage failure': 40,
  'Other': 50,
}

export const ISSUE_COST_RATIO: Record<string, number> = {
  'Battery degradation': 0.25,
  'Cracked screen': 0.40,
  'Charging port issue': 0.15,
  'Speaker problem': 0.15,
  'Camera malfunction': 0.30,
  'Software issue': 0.05,
  'Overheating': 0.35,
  'Motherboard failure': 0.85,
  'Water/Liquid damage': 0.70,
  'Storage failure': 0.45,
  'Other': 0.40,
}

// ── Damage keyword detection (Fix 2b) ─────────────────────────────
// Order matters — severe/specific issues are checked before generic ones
// so keywords like 'slow' (Software) don't shadow 'overheating and slow'.
const DAMAGE_KEYWORDS: Record<string, string[]> = {
  'Motherboard failure': ['motherboard', 'board', 'circuit', 'chip', 'no power', 'dead'],
  'Water/Liquid damage': ['water', 'liquid', 'spill', 'wet', 'submerge', 'moisture', 'flood'],
  'Overheating':        ['overheat', 'overheating', 'too hot', 'burning hot'],
  'Battery degradation': ['battery', 'drain', 'power off', 'shutdown', 'swollen'],
  'Cracked screen':     ['crack', 'shatter', 'broken screen', 'glass', 'display', 'fell', 'fall'],
  'Charging port issue': ['port', 'charger', 'cable', 'plug', 'not charging', 'usb'],
  'Storage failure':    ['storage', 'memory full', 'corrupt', 'no space'],
  'Camera malfunction': ['camera', 'photo', 'lens', 'blurry', 'camera not'],
  'Speaker problem':    ['speaker', 'no audio', 'no sound', 'microphone', 'volume'],
  'Software issue':     ['software', 'bug', 'glitch', 'freeze', 'slow', 'lag', 'update', 'reboot loop'],
}

function guessIssueType(description: string): string {
  const lower = description.toLowerCase()
  for (const [issue, keywords] of Object.entries(DAMAGE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return issue
  }
  return 'Other'
}

function getAgeScore(ageMonths: number): number {
  if (ageMonths <= 12) return 95
  if (ageMonths <= 24) return 80
  if (ageMonths <= 36) return 55
  if (ageMonths <= 48) return 30
  return 10
}

function getManufacturerSupport(brand: string): number {
  const highSupport = ['Apple', 'Samsung', 'Lenovo', 'Dell', 'HP', 'ASUS']
  const medSupport = ['Xiaomi', 'OPPO', 'Vivo', 'Huawei', 'Acer']
  const brandLower = brand.toLowerCase()
  if (highSupport.some(b => brandLower.includes(b.toLowerCase()))) return 90
  if (medSupport.some(b => brandLower.includes(b.toLowerCase()))) return 65
  return 40
}

// ── Hard overrides (Fix 2) ──────────────────────────────────────────
// Expanded from 2 conditions to cover all high-risk issue × age combos.
const SEVERE_AGE_THRESHOLD_MONTHS = 36  // 3 years: catastrophic damage
const RECYCLE_AGE_THRESHOLD_MONTHS = 60 // 5 years: general expensive issues
const BATTERY_SAFETY_AGE_MONTHS = 72    // 6 years: old swollen battery = safety risk

function checkHardOverrides(formData: DeviceFormData): AssessmentDirection | null {
  const { ageMonths, damageDescription } = formData
  const issue = guessIssueType(damageDescription)
  const partsAvail = ISSUE_PARTS_AVAILABILITY[issue] ?? 50
  const costRatio = ISSUE_COST_RATIO[issue] ?? 0.40

  // Parts availability so low repair is practically impossible.
  // Skip on very new devices (< 24mo) — may still be under warranty.
  if (partsAvail < 20 && ageMonths >= 24) return 'RECYCLE'

  // Catastrophic damage: recycle if device is 3+ years old
  const severeIssues = ['Motherboard failure', 'Water/Liquid damage']
  if (severeIssues.includes(issue) && ageMonths > SEVERE_AGE_THRESHOLD_MONTHS) {
    return 'RECYCLE'
  }

  // Battery degradation on 6+ year old device is a safety risk
  if (issue === 'Battery degradation' && ageMonths >= BATTERY_SAFETY_AGE_MONTHS) {
    return 'RECYCLE'
  }

  // Any issue with high cost ratio (>= 70%) on a 5+ year old device
  if (costRatio >= 0.70 && ageMonths >= RECYCLE_AGE_THRESHOLD_MONTHS) {
    return 'RECYCLE'
  }

  // Device is 5+ years old AND issue repair cost is not trivially cheap
  // (software issues are free/cheap regardless of age — excluded)
  if (ageMonths >= RECYCLE_AGE_THRESHOLD_MONTHS && issue !== 'Software issue' && costRatio >= 0.30) {
    return 'RECYCLE'
  }

  return null
}

export function computeScore(formData: DeviceFormData): AssessmentResult {
  const override = checkHardOverrides(formData)
  const issue = guessIssueType(formData.damageDescription)

  const ageScore = getAgeScore(formData.ageMonths)
  const costRatio = ISSUE_COST_RATIO[issue] ?? 0.40
  const costScore = Math.round((1 - costRatio) * 100)
  const partsScore = ISSUE_PARTS_AVAILABILITY[issue] ?? 50
  const supportScore = getManufacturerSupport(formData.brand)

  const rawScore = Math.round(
    ageScore * SCORING_WEIGHTS.age +
    costScore * SCORING_WEIGHTS.costRatio +
    partsScore * SCORING_WEIGHTS.partsAvailability +
    supportScore * SCORING_WEIGHTS.manufacturerSupport
  )

  const score = override === 'RECYCLE' ? Math.min(rawScore, 25) : rawScore

  const direction: AssessmentDirection = score >= 50 ? 'REPAIR' : 'RECYCLE'

  const topFactors: string[] = []
  if (formData.ageMonths > 36) topFactors.push('Device age over 3 years')
  if (costRatio > 0.5) topFactors.push('High repair cost ratio')
  if (partsScore < 40) topFactors.push('Limited parts availability')
  if (override) topFactors.push('Hard override condition met')

  const rationale = direction === 'REPAIR'
    ? `Repair is recommended. ${topFactors.length > 0 ? `Key factor: ${topFactors[0]}.` : 'The device is a good candidate for repair.'}`
    : `Recycling is recommended. ${topFactors.length > 0 ? `Key factor: ${topFactors[0]}.` : 'The device has reached end of life.'}`

  const confidence = score > 70 || score < 30 ? 'high' : score > 55 || score < 45 ? 'medium' : 'low'

  const deviceValue = formData.pricePhp ?? 15000
  const repairCost = Math.round(deviceValue * costRatio)
  const costEstimate = {
    min: Math.round(repairCost * 0.8),
    max: Math.round(repairCost * 1.2),
  }

  return { score, direction, rationale, confidence, costEstimate }
}
