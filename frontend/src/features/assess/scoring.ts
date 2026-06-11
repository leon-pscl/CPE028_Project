import type { AssessmentResult, DeviceFormData, AssessmentDirection } from '@/types'

export const SCORING_WEIGHTS = {
  age: 0.25,
  costRatio: 0.30,
  partsAvailability: 0.25,
  manufacturerSupport: 0.20,
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

const DAMAGE_KEYWORDS: Record<string, string[]> = {
  'Battery degradation': ['battery', 'drain', 'charge', 'charging', 'power off', 'shutdown'],
  'Cracked screen': ['crack', 'shatter', 'broken screen', 'glass', 'display', 'fall', 'fell'],
  'Charging port issue': ['port', 'charger', 'cable', 'plug', 'usb'],
  'Speaker problem': ['speaker', 'audio', 'sound', 'volume', 'microphone'],
  'Camera malfunction': ['camera', 'photo', 'lens', 'blurry'],
  'Software issue': ['software', 'bug', 'glitch', 'freeze', 'freeze', 'slow', 'lag', 'update'],
  'Overheating': ['heat', 'overheat', 'hot', 'warm'],
  'Motherboard failure': ['motherboard', 'board', 'circuit', 'chip'],
  'Water/Liquid damage': ['water', 'liquid', 'spill', 'wet', 'submerge', 'moisture'],
  'Storage failure': ['storage', 'memory', 'full', 'space'],
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

function checkHardOverrides(formData: DeviceFormData): AssessmentDirection | null {
  const { ageMonths, damageDescription } = formData
  const issue = guessIssueType(damageDescription)

  if (issue === 'Motherboard failure' && ageMonths > 48) {
    return 'RECYCLE'
  }

  if (issue === 'Water/Liquid damage' && ageMonths > 36) {
    return 'RECYCLE'
  }

  const partsAvail = ISSUE_PARTS_AVAILABILITY[issue] ?? 50
  if (partsAvail < 20) {
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

  const deviceValue = 15000
  const repairCost = Math.round(deviceValue * costRatio)
  const costEstimate = {
    min: Math.round(repairCost * 0.8),
    max: Math.round(repairCost * 1.2),
  }

  return { score, direction, rationale, confidence, costEstimate }
}
