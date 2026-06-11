/**
 * roadmapFilter.ts
 * ----------------
 * Converts AssessPage form data (brand, model, ageMonths, issue, severity)
 * into a FilterResult that the NavigatePage uses to colour-code and
 * dim/skip irrelevant steps.
 *
 * No mock data lives here — inputs come straight from AssessPage state
 * passed via React Router location.state.
 *
 * Logic sources:
 *  · iFixit Repairability Scores (ifixit.com/repairability, techrt.com 2026)
 *  · Repair vs Replace age thresholds (RecycleOldTech 2025, technology.org 2026)
 *  · Damage-to-step mappings derived from iFixit repair guides
 */

import type { DeviceFormData, AssessmentResult, FilterResult, ReasoningChip } from '@/types'

// ── Repairability score lookup ───────────────────────────────────
// Source: iFixit teardown scores as of 2024–2025
const REPAIR_SCORES: Record<string, number> = {
  // Apple
  'iphone 16': 7, 'iphone 16 pro': 6, 'iphone 16 plus': 7, 'iphone 16 pro max': 6,
  'iphone 15': 7, 'iphone 15 pro': 6, 'iphone 15 plus': 7, 'iphone 15 pro max': 6,
  'iphone 14': 4, 'iphone 14 pro': 4, 'iphone 14 plus': 4, 'iphone 14 pro max': 4,
  'iphone 13': 4, 'iphone 13 pro': 4, 'iphone 13 mini': 4, 'iphone 12': 4,
  'iphone 11': 6, 'iphone se': 5,
  // Samsung Galaxy S-series: consistently 4/10
  'galaxy s25': 4, 'galaxy s24': 4, 'galaxy s23': 4, 'galaxy s22': 4, 'galaxy s21': 4,
  'galaxy s24 ultra': 4, 'galaxy s23 ultra': 4, 'galaxy s22 ultra': 4,
  // Samsung Galaxy A-series: 5-6/10 (mid-range, more screws)
  'galaxy a55': 6, 'galaxy a54': 6, 'galaxy a53': 5, 'galaxy a35': 6, 'galaxy a34': 5,
  'galaxy a25': 5, 'galaxy a15': 5, 'galaxy a05': 5,
  // Google Pixel
  'pixel 9': 5, 'pixel 9 pro': 5, 'pixel 8': 5, 'pixel 8 pro': 5,
  'pixel 7': 5, 'pixel 7 pro': 5, 'pixel 6': 5,
  // Xiaomi / Redmi
  'xiaomi 14': 4, 'xiaomi 13': 5, 'redmi note 13': 6, 'redmi note 12': 6, 'redmi 13c': 6,
  // OPPO / Realme
  'oppo reno 11': 5, 'oppo a98': 5, 'realme 12': 5, 'realme c55': 6,
  // Laptops
  'framework': 10, 'framework 13': 10, 'framework 16': 10,
  'dell xps 13': 3, 'dell xps 15': 3, 'dell inspiron': 6, 'dell latitude': 7,
  'lenovo thinkpad': 8, 'lenovo ideapad': 6, 'lenovo yoga': 5,
  'hp elitebook': 7, 'hp probook': 6, 'hp pavilion': 5, 'hp spectre': 3, 'hp envy': 4,
  'asus rog': 5, 'asus zenbook': 4, 'asus vivobook': 6, 'asus tuf': 5,
  'macbook pro': 3, 'macbook air': 4, 'macbook': 4,
  'acer aspire': 6, 'acer swift': 4, 'acer nitro': 6,
  'microsoft surface': 1,
}

function getRepairabilityScore(brand: string, model: string): number | null {
  const haystack = `${brand} ${model}`.toLowerCase()
  for (const [key, score] of Object.entries(REPAIR_SCORES)) {
    if (haystack.includes(key)) return score
  }
  return null
}

// ── Issue → affected steps mapping ──────────────────────────────
// Maps AssessPage issue strings to step IDs that should be
// highlighted (priority/recommended) and those that can be skipped.
interface IssueMap {
  priorityStepIds: string[]
  recommendedStepIds: string[]
  skipStepIds: string[]
  unsafeStepIds?: string[]
  skipReasons: Record<string, string>
}

const ISSUE_MAP: Record<string, IssueMap> = {
  'Cracked screen': {
    priorityStepIds: ['screen_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['overheating_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'software_fix'],
    skipReasons: {
      overheating_check: 'Not related to screen damage',
      charging_port_check: 'Not related to screen damage',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power — no motherboard issue',
      software_fix: 'Screen crack is physical, not software',
    },
  },
  'Battery degradation': {
    priorityStepIds: ['battery_check'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'software_diagnostics', 'diy_feasibility', 'find_repair_shop', 'verify_repair'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      charging_port_check: 'Battery degradation is not a port issue',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
    },
  },
  'Charging port issue': {
    priorityStepIds: ['charging_port_check', 'battery_check'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'software_diagnostics', 'diy_feasibility', 'find_repair_shop', 'verify_repair'],
    skipStepIds: ['screen_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
      overheating_check: 'Charging issue is not a thermal problem',
    },
  },
  'Speaker problem': {
    priorityStepIds: ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['screen_check', 'battery_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      battery_check: 'Speaker issue is not battery-related',
      charging_port_check: 'Not related to speaker',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
      overheating_check: 'Not related to speaker',
    },
  },
  'Camera malfunction': {
    priorityStepIds: ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['screen_check', 'battery_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      battery_check: 'Camera issue is not battery-related',
      charging_port_check: 'Not related to camera',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
      overheating_check: 'Not related to camera',
    },
  },
  'Software issue': {
    priorityStepIds: ['software_diagnostics', 'software_fix'],
    recommendedStepIds: ['backup_data'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check', 'battery_check', 'diy_feasibility', 'find_repair_shop'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      charging_port_check: 'Software issue is not a hardware problem',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
      overheating_check: "Software issues don't require thermal diagnosis first",
      battery_check: 'Software issue is not a battery hardware problem',
      diy_feasibility: "Software fixes don't require hardware tools",
      find_repair_shop: 'Try software fixes first — shop only if those fail',
    },
  },
  'Overheating': {
    priorityStepIds: ['overheating_check', 'battery_check'],
    recommendedStepIds: ['backup_data', 'software_diagnostics', 'diy_feasibility', 'find_repair_shop', 'verify_repair'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      charging_port_check: 'Overheating is not a charging port issue',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
    },
  },
  'Motherboard failure': {
    priorityStepIds: ['motherboard_check'],
    recommendedStepIds: ['charging_port_check', 'battery_check', 'find_repair_shop'],
    skipStepIds: ['screen_check', 'liquid_damage_first_aid', 'overheating_check', 'software_fix', 'software_diagnostics', 'diy_feasibility'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check: 'Device has no power — cannot diagnose screen',
      liquid_damage_first_aid: 'No liquid damage reported',
      overheating_check: 'Device has no power',
      software_fix: 'Cannot run software checks without power',
      software_diagnostics: 'Cannot run diagnostics without power',
      diy_feasibility: 'No-power diagnosis requires professional tools',
    },
  },
  'Water/Liquid damage': {
    priorityStepIds: ['liquid_damage_first_aid', 'charging_port_check'],
    recommendedStepIds: ['backup_data', 'battery_check', 'find_repair_shop'],
    skipStepIds: ['screen_check', 'overheating_check', 'motherboard_check', 'software_fix', 'diy_feasibility'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      overheating_check: 'Water damage requires immediate first aid, not thermal diagnosis',
      motherboard_check: 'Board-level issues will be assessed by the shop after drying',
      software_fix: 'Device must not be powered on until fully dry',
      diy_feasibility: 'Water damage repair requires professional board cleaning',
    },
  },
  'Storage failure': {
    priorityStepIds: ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check', 'battery_check'],
    skipReasons: {
      screen_check: 'No screen damage reported',
      charging_port_check: 'Storage failure is not a port issue',
      liquid_damage_first_aid: 'No liquid damage reported',
      motherboard_check: 'Device has power',
      overheating_check: 'Not directly related to storage failure',
      battery_check: 'Not related to storage',
    },
  },
  'Other': {
    priorityStepIds: ['software_diagnostics'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'find_repair_shop'],
    skipStepIds: [],
    skipReasons: {},
  },
}

// ── Main filter function ─────────────────────────────────────────
export function buildFilterResult(
  form: DeviceFormData,
  assessmentResult: AssessmentResult,
): FilterResult {
  const chips: ReasoningChip[] = []
  const ageYrs = form.ageMonths / 12
  const repairScore = getRepairabilityScore(form.brand, form.model)

  // ── 1. Age chip ──────────────────────────────────────────────
  if (form.ageMonths > 0) {
    if (ageYrs < 2)      chips.push({ label: `Age: ${form.ageMonths}mo — repair recommended`, cls: 'age' })
    else if (ageYrs < 4) chips.push({ label: `Age: ${form.ageMonths}mo — borderline`, cls: 'age' })
    else if (ageYrs < 6) chips.push({ label: `Age: ${form.ageMonths}mo — lean toward recycle`, cls: 'age' })
    else                 chips.push({ label: `Age: ${form.ageMonths}mo — recycle recommended`, cls: 'danger' })
  }

  // ── 2. iFixit repairability chip ─────────────────────────────
  if (repairScore !== null) {
    if (repairScore >= 8)      chips.push({ label: `iFixit score ${repairScore}/10 — highly DIY-friendly`, cls: 'score' })
    else if (repairScore >= 6) chips.push({ label: `iFixit score ${repairScore}/10 — moderately repairable`, cls: 'score' })
    else if (repairScore >= 4) chips.push({ label: `iFixit score ${repairScore}/10 — shop recommended`, cls: 'brand' })
    else                       chips.push({ label: `iFixit score ${repairScore}/10 — difficult to repair`, cls: 'danger' })
  }

  // ── 3. Issue + severity chip ─────────────────────────────────
  if (form.issue) {
    const sevLabel = form.severity === 'severe' ? ' — severe' : form.severity === 'moderate' ? ' — moderate' : ''
    chips.push({ label: `${form.issue}${sevLabel}`, cls: form.severity === 'severe' ? 'danger' : 'damage' })
  }

  // ── 4. ML model screen label chip ───────────────────────────
  if (assessmentResult.modelLabel) {
    chips.push({
      label: `Screen: ${assessmentResult.modelLabel} (${((assessmentResult.modelProbability ?? 0) * 100).toFixed(0)}%)`,
      cls: assessmentResult.modelLabel.toLowerCase().includes('crack') ? 'danger' : 'score',
    })
  }

  // ── 5. Build step sets ───────────────────────────────────────
  const direction = assessmentResult.direction

  if (direction === 'RECYCLE') {
    // Recycle path — show all recycle steps unfiltered
    return {
      direction,
      score: assessmentResult.score,
      reasoningChips: chips,
      priorityStepIds: ['backup_data', 'wipe_data', 'factory_reset'],
      recommendedStepIds: ['remove_components', 'find_recycling_facility', 'get_disposal_cert'],
      skippedStepIds: [],
      unsafeStepIds: [],
      skipReasons: {},
    }
  }

  // Repair path — use issue map
  const issueMap = ISSUE_MAP[form.issue] ?? ISSUE_MAP['Other']

  const priorityStepIds  = [...issueMap.priorityStepIds]
  const recommendedStepIds = [...issueMap.recommendedStepIds]
  let   skipStepIds      = [...issueMap.skipStepIds]
  const unsafeStepIds    = [...(issueMap.unsafeStepIds ?? [])]
  const skipReasons      = { ...issueMap.skipReasons }

  // battery_diy_replace: unsafe unless device iFixit score ≥ 7
  if (!unsafeStepIds.includes('battery_diy_replace')) {
    if (repairScore === null || repairScore < 7) {
      unsafeStepIds.push('battery_diy_replace')
    }
  }

  // Severe severity: also skip DIY feasibility — go straight to shop
  if (form.severity === 'severe') {
    if (!skipStepIds.includes('diy_feasibility')) {
      skipStepIds.push('diy_feasibility')
      skipReasons['diy_feasibility'] = 'Severe damage — shop repair recommended directly'
    }
    if (!priorityStepIds.includes('find_repair_shop')) {
      priorityStepIds.push('find_repair_shop')
    }
  }

  // backup_data and check_warranty are never skipped
  skipStepIds = skipStepIds.filter(id => id !== 'backup_data' && id !== 'check_warranty')

  return {
    direction,
    score: assessmentResult.score,
    reasoningChips: chips,
    priorityStepIds,
    recommendedStepIds,
    skippedStepIds: skipStepIds,
    unsafeStepIds,
    skipReasons,
  }
}
