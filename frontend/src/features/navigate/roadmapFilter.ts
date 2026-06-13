/**
 * roadmapFilter.ts
 * ----------------
 * Converts AssessPage outputs (form data + AssessmentResult) into a
 * FilterResult that NavigatePage uses to colour-code and skip steps.
 *
 * Fully aligned with predict_unified.py pipeline outputs:
 *
 *  ML signal                         → roadmap effect
 *  ─────────────────────────────────────────────────────────────────
 *  mlDamage.predictedLabel           → primary damage category lookup
 *  mlRepairability.score (0-100)     → DIY gate + chip
 *  mlCrackDetection = "cracked"      → screen_check priority
 *  mlCorrosionLevel >= 7             → liquid_damage_first_aid priority
 *                                       battery_diy_replace unsafe
 *  mlAgeWarning (age >= 10yr)        → all repair steps skipped,
 *                                       recycle path forced
 *  mlCostAnalysis.repairRatio > 0.7  → chip + find_repair_shop priority
 *  mlRecommendation = "NOT REPAIRABLE"→ diy_feasibility + battery_diy
 *                                       skipped, shop forced
 *  mlDamagedComponents               → component-specific step priorities
 *  form.severity = "severe"          → diy_feasibility skipped
 *  iFixit repairability score        → battery_diy_replace unsafe gate
 *
 * Damage category mapping
 * ───────────────────────
 * ML DAMAGE_CATEGORIES (from predict_unified.py):
 *   "Battery degradation" → battery issues
 *   "Cracked screen"      → screen issues
 *   "Water damage"        → liquid damage
 *   "Hardware failure"    → motherboard / hardware
 *   "Software issues"     → software
 *   "Physical damage"     → general physical (screen + port + battery)
 *
 * ML LAPTOP_COMPONENTS (image classifier):
 *   Battery, LCDScreen, Keyboard, Hinge, Motherboard,
 *   HardDiskDrive, RAM, Processor, WebCam, TouchPad
 */

import type { DeviceFormData, AssessmentResult, FilterResult, ReasoningChip } from '@/types'

// ── iFixit repairability score DB ───────────────────────────────
const REPAIR_SCORES: Record<string, number> = {
  // Apple
  'iphone 16': 7, 'iphone 16 pro': 6, 'iphone 16 plus': 7, 'iphone 16 pro max': 6,
  'iphone 15': 7, 'iphone 15 pro': 6, 'iphone 15 plus': 7, 'iphone 15 pro max': 6,
  'iphone 14': 4, 'iphone 14 pro': 4, 'iphone 14 plus': 4, 'iphone 14 pro max': 4,
  'iphone 13': 4, 'iphone 13 pro': 4, 'iphone 13 mini': 4, 'iphone 12': 4,
  'iphone 11': 6, 'iphone se': 5,
  // Samsung Galaxy S
  'galaxy s25': 4, 'galaxy s24': 4, 'galaxy s23': 4, 'galaxy s22': 4, 'galaxy s21': 4,
  'galaxy s24 ultra': 4, 'galaxy s23 ultra': 4, 'galaxy s22 ultra': 4,
  // Samsung Galaxy A (more screws, less glue)
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

// ── ML damage category → step ID map ────────────────────────────
// Covers all 6 DAMAGE_CATEGORIES from predict_unified.py plus
// the 10 LAPTOP_COMPONENTS the image classifier can return.

interface IssueMap {
  priorityStepIds: string[]
  recommendedStepIds: string[]
  skipStepIds: string[]
  unsafeStepIds?: string[]
  skipReasons: Record<string, string>
}

const ML_DAMAGE_MAP: Record<string, IssueMap> = {
  // ── DAMAGE_CATEGORIES ─────────────────────────────────────────
  'battery degradation': {
    priorityStepIds: ['battery_check', 'software_diagnostics'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'find_repair_shop', 'verify_repair'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check'],
    skipReasons: {
      screen_check: 'No screen damage detected',
      charging_port_check: 'Battery degradation is not a port issue',
      liquid_damage_first_aid: 'No liquid damage detected',
      motherboard_check: 'Device has power — no board failure indicated',
    },
  },
  'cracked screen': {
    priorityStepIds: ['screen_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['overheating_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'software_fix'],
    skipReasons: {
      overheating_check: 'Not related to screen damage',
      charging_port_check: 'Not related to screen damage',
      liquid_damage_first_aid: 'No liquid damage detected',
      motherboard_check: 'Device has power — no board failure indicated',
      software_fix: 'Screen crack is physical damage, not software',
    },
  },
  'water damage': {
    priorityStepIds: ['liquid_damage_first_aid', 'charging_port_check'],
    recommendedStepIds: ['backup_data', 'battery_check', 'find_repair_shop'],
    skipStepIds: ['screen_check', 'overheating_check', 'motherboard_check', 'software_fix', 'diy_feasibility'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check: 'Screen diagnosis deferred until device is dry',
      overheating_check: 'Water damage requires first-aid before thermal diagnosis',
      motherboard_check: 'Board-level issues assessed by shop after drying',
      software_fix: 'Device must NOT be powered on until fully dry',
      diy_feasibility: 'Water damage repair requires professional board cleaning',
    },
  },
  'hardware failure': {
    priorityStepIds: ['motherboard_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'battery_check', 'charging_port_check'],
    skipStepIds: ['screen_check', 'liquid_damage_first_aid', 'overheating_check', 'software_fix', 'diy_feasibility'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check: 'Device may have no power — cannot diagnose screen',
      liquid_damage_first_aid: 'No liquid damage detected',
      overheating_check: 'Hardware failure is not a thermal issue',
      software_fix: 'Cannot run software checks without reliable power',
      diy_feasibility: 'Board-level hardware failures require professional tools',
    },
  },
  'software issues': {
    priorityStepIds: ['software_diagnostics', 'software_fix'],
    recommendedStepIds: ['backup_data'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check', 'battery_check', 'diy_feasibility', 'find_repair_shop'],
    skipReasons: {
      screen_check: 'No physical screen damage detected',
      charging_port_check: 'Software issue — not a hardware port problem',
      liquid_damage_first_aid: 'No liquid damage detected',
      motherboard_check: 'Device has power',
      overheating_check: 'Software issues do not require thermal diagnosis first',
      battery_check: 'Software issue — not a battery hardware problem',
      diy_feasibility: 'Software fixes require no hardware tools',
      find_repair_shop: 'Try software fixes first — shop only if those fail',
    },
  },
  'physical damage': {
    // Catch-all: covers screen, port, casing, hinge
    priorityStepIds: ['screen_check', 'charging_port_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'battery_check', 'verify_repair'],
    skipStepIds: ['liquid_damage_first_aid', 'motherboard_check', 'software_fix'],
    skipReasons: {
      liquid_damage_first_aid: 'No liquid damage detected',
      motherboard_check: 'Device has power',
      software_fix: 'Physical damage is not a software issue',
    },
  },
}

// ── LAPTOP_COMPONENTS image-classifier → step map ──────────────
// Augments the damage category map when image analysis identifies
// a specific component.
const ML_COMPONENT_MAP: Record<string, Partial<IssueMap>> = {
  'battery': {
    priorityStepIds: ['battery_check'],
    recommendedStepIds: ['diy_feasibility'],
  },
  'lcdscreen': {
    priorityStepIds: ['screen_check'],
    recommendedStepIds: ['find_repair_shop'],
  },
  'keyboard': {
    priorityStepIds: ['software_diagnostics'],
    recommendedStepIds: ['find_repair_shop', 'diy_feasibility'],
    skipStepIds: ['battery_check', 'screen_check', 'charging_port_check', 'liquid_damage_first_aid'],
    skipReasons: {
      battery_check: 'Keyboard issue is not battery-related',
      screen_check: 'No screen damage detected',
      charging_port_check: 'Not related to keyboard',
      liquid_damage_first_aid: 'No liquid damage detected',
    },
  },
  'hinge': {
    priorityStepIds: ['find_repair_shop'],
    recommendedStepIds: ['backup_data', 'screen_check'],
    skipStepIds: ['battery_check', 'charging_port_check', 'liquid_damage_first_aid', 'software_fix', 'overheating_check'],
    skipReasons: {
      battery_check: 'Hinge damage is not battery-related',
      charging_port_check: 'Not related to hinge',
      liquid_damage_first_aid: 'No liquid damage detected',
      software_fix: 'Hinge is physical — not a software issue',
      overheating_check: 'Not related to hinge',
    },
  },
  'motherboard': {
    priorityStepIds: ['motherboard_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data'],
    skipStepIds: ['screen_check', 'liquid_damage_first_aid', 'overheating_check', 'software_fix', 'diy_feasibility'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check: 'Cannot diagnose screen without stable power',
      liquid_damage_first_aid: 'No liquid damage detected',
      overheating_check: 'Motherboard failure not a thermal issue',
      software_fix: 'Cannot run software checks without power',
      diy_feasibility: 'Motherboard repair requires microsoldering',
    },
  },
  'harddiskdrive': {
    priorityStepIds: ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check', 'battery_check'],
    skipReasons: {
      screen_check: 'No screen damage detected',
      charging_port_check: 'Storage failure is not a port issue',
      liquid_damage_first_aid: 'No liquid damage detected',
      motherboard_check: 'Device has power',
      overheating_check: 'Not directly related to storage',
      battery_check: 'Not related to storage',
    },
  },
  'ram': {
    priorityStepIds: ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'diy_feasibility', 'verify_repair'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'overheating_check', 'battery_check'],
    skipReasons: {
      screen_check: 'No screen damage detected',
      charging_port_check: 'RAM issue is not a port problem',
      liquid_damage_first_aid: 'No liquid damage detected',
      overheating_check: 'Not directly related to RAM',
      battery_check: 'Not related to RAM',
    },
  },
  'processor': {
    priorityStepIds: ['overheating_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'software_diagnostics'],
    skipStepIds: ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'battery_check', 'software_fix'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check: 'No screen damage detected',
      charging_port_check: 'CPU issue is not a port problem',
      liquid_damage_first_aid: 'No liquid damage detected',
      battery_check: 'CPU issue is not battery-related',
      software_fix: 'CPU failure requires hardware intervention',
    },
  },
  'webcam': {
    priorityStepIds: ['software_diagnostics'],
    recommendedStepIds: ['find_repair_shop', 'diy_feasibility'],
    skipStepIds: ['battery_check', 'screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'overheating_check', 'motherboard_check'],
    skipReasons: {
      battery_check: 'Webcam issue is not battery-related',
      screen_check: 'No screen damage detected',
      charging_port_check: 'Not related to webcam',
      liquid_damage_first_aid: 'No liquid damage detected',
      overheating_check: 'Not related to webcam',
      motherboard_check: 'Device has power',
    },
  },
  'touchpad': {
    priorityStepIds: ['software_diagnostics'],
    recommendedStepIds: ['find_repair_shop', 'diy_feasibility'],
    skipStepIds: ['battery_check', 'screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'overheating_check', 'motherboard_check'],
    skipReasons: {
      battery_check: 'Touchpad issue is not battery-related',
      screen_check: 'No screen damage detected',
      charging_port_check: 'Not related to touchpad',
      liquid_damage_first_aid: 'No liquid damage detected',
      overheating_check: 'Not related to touchpad',
      motherboard_check: 'Device has power',
    },
  },
}

// ── Legacy form issue map (fallback when no ML output) ──────────
const FORM_ISSUE_MAP: Record<string, IssueMap> = {
  'Cracked screen': ML_DAMAGE_MAP['cracked screen'],
  'Battery degradation': ML_DAMAGE_MAP['battery degradation'],
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
  'Software issue': ML_DAMAGE_MAP['software issues'],
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
  'Water/Liquid damage': ML_DAMAGE_MAP['water damage'],
  'Storage failure': ML_DAMAGE_MAP['harddiskdrive'],
  'Other': {
    priorityStepIds: ['software_diagnostics'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'find_repair_shop'],
    skipStepIds: [],
    skipReasons: {},
  },
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Parse the ML composite label like "Battery degradation - LCDScreen - Cracked"
 * and return the primary damage category (first token) normalised.
 */
function parseMlDamageCategory(label: string): string {
  const primary = label.split(' - ')[0].trim().toLowerCase()
  return primary
}

/**
 * Parse the ML composite label and return the image-detected component
 * (second token if present), normalised.
 */
function parseMlComponent(label: string): string | null {
  const parts = label.split(' - ')
  if (parts.length >= 2) return parts[1].trim().toLowerCase()
  return null
}

function mergeInto(
  target: { priority: Set<string>; recommended: Set<string>; skip: Set<string>; unsafe: Set<string>; skipReasons: Record<string, string> },
  source: Partial<IssueMap>,
) {
  source.priorityStepIds?.forEach(id => { target.priority.add(id); target.skip.delete(id) })
  source.recommendedStepIds?.forEach(id => { target.recommended.add(id); target.skip.delete(id) })
  source.skipStepIds?.forEach(id => { if (!target.priority.has(id) && !target.recommended.has(id)) target.skip.add(id) })
  source.unsafeStepIds?.forEach(id => target.unsafe.add(id))
  Object.assign(target.skipReasons, source.skipReasons ?? {})
}

// ── Main export ──────────────────────────────────────────────────
export function buildFilterResult(
  form: DeviceFormData,
  result: AssessmentResult,
): FilterResult {
  const chips: ReasoningChip[] = []
  const ageYrs    = form.ageMonths / 12
  const ifixit    = getRepairabilityScore(form.brand, form.model)
  const direction = result.direction

  // Working sets
  const priority:    Set<string> = new Set()
  const recommended: Set<string> = new Set()
  const skip:        Set<string> = new Set()
  const unsafe:      Set<string> = new Set()
  const skipReasons: Record<string, string> = {}
  const ctx = { priority, recommended, skip, unsafe, skipReasons }

  // ── Chip: device age ─────────────────────────────────────────
  if (form.ageMonths > 0) {
    if (ageYrs < 2)       chips.push({ label: `Age: ${form.ageMonths}mo — repair recommended`, cls: 'age' })
    else if (ageYrs < 4)  chips.push({ label: `Age: ${form.ageMonths}mo — borderline`, cls: 'age' })
    else if (ageYrs < 6)  chips.push({ label: `Age: ${form.ageMonths}mo — lean toward recycle`, cls: 'age' })
    else if (ageYrs < 10) chips.push({ label: `Age: ${form.ageMonths}mo — recycle recommended`, cls: 'danger' })
    else                  chips.push({ label: `Age: ${form.ageMonths}mo — parts likely unavailable (≥10yr)`, cls: 'danger' })
  }

  // ── Chip: iFixit score ───────────────────────────────────────
  if (ifixit !== null) {
    if (ifixit >= 8)      chips.push({ label: `iFixit ${ifixit}/10 — highly DIY-friendly`, cls: 'score' })
    else if (ifixit >= 6) chips.push({ label: `iFixit ${ifixit}/10 — moderately repairable`, cls: 'score' })
    else if (ifixit >= 4) chips.push({ label: `iFixit ${ifixit}/10 — shop recommended`, cls: 'brand' })
    else                  chips.push({ label: `iFixit ${ifixit}/10 — difficult to repair`, cls: 'danger' })
  }

  // ── Chip: ML damage label ────────────────────────────────────
  if (result.mlDamage) {
    chips.push({
      label: `ML damage: ${result.mlDamage.predictedLabel} (${(result.mlDamage.confidence * 100).toFixed(0)}%)`,
      cls: result.mlDamage.predictedLabel.toLowerCase().includes('water') ||
           result.mlDamage.predictedLabel.toLowerCase().includes('hardware') ? 'danger' : 'damage',
    })
  } else if (form.issue) {
    const sevLabel = form.severity === 'severe' ? ' — severe' : form.severity === 'moderate' ? ' — moderate' : ''
    chips.push({ label: `${form.issue}${sevLabel}`, cls: form.severity === 'severe' ? 'danger' : 'damage' })
  }

  // ── Chip: ML repairability index ─────────────────────────────
  if (result.mlRepairability) {
    const idx = result.mlRepairability.score   // 0–100
    if (idx >= 70)       chips.push({ label: `Repairability: ${idx.toFixed(0)}/100 — easy`, cls: 'score' })
    else if (idx >= 40)  chips.push({ label: `Repairability: ${idx.toFixed(0)}/100 — moderate`, cls: 'brand' })
    else                 chips.push({ label: `Repairability: ${idx.toFixed(0)}/100 — difficult`, cls: 'danger' })
  }

  // ── Chip: ML crack detection ─────────────────────────────────
  if (result.mlCrackDetection === 'cracked') {
    chips.push({ label: 'Image: cracks detected', cls: 'danger' })
  }

  // ── Chip: ML corrosion level ─────────────────────────────────
  if (result.mlCorrosionLevel != null) {
    const lvl = result.mlCorrosionLevel
    const desc = lvl <= 5 ? 'low' : lvl <= 6 ? 'moderate' : lvl <= 7 ? 'significant' : lvl <= 8 ? 'high' : 'severe'
    chips.push({ label: `Corrosion level ${lvl}/9 — ${desc}`, cls: lvl >= 7 ? 'danger' : 'damage' })
  }

  // ── Chip: repair cost ratio ──────────────────────────────────
  if (result.mlCostAnalysis) {
    const ratio = result.mlCostAnalysis.repairRatio
    if (ratio > 0.7)
      chips.push({ label: `Repair cost ${(ratio * 100).toFixed(0)}% of device value — consider replacement`, cls: 'danger' })
    else if (ratio > 0.5)
      chips.push({ label: `Repair cost ${(ratio * 100).toFixed(0)}% of device value — marginal`, cls: 'damage' })
    else if (ratio > 0)
      chips.push({ label: `Repair cost ${(ratio * 100).toFixed(0)}% of device value — reasonable`, cls: 'score' })
  }

  // ── Chip: ML age warning (≥10 years) ─────────────────────────
  if (result.mlAgeWarning) {
    chips.push({ label: '⚠ Parts likely unavailable — device ≥10 years old', cls: 'danger' })
  }

  // ════════════════════════════════════════════════════════════════
  // RECYCLE PATH
  // ════════════════════════════════════════════════════════════════
  if (direction === 'RECYCLE') {
    priority.add('backup_data')
    priority.add('wipe_data')
    priority.add('factory_reset')
    recommended.add('remove_components')
    recommended.add('find_recycling_facility')
    recommended.add('get_disposal_cert')

    // mlAgeWarning: further emphasise that disposal cert is needed
    if (result.mlAgeWarning) {
      priority.add('get_disposal_cert')
      priority.add('find_recycling_facility')
    }

    return {
      direction,
      score: result.score,
      reasoningChips: chips,
      priorityStepIds:   [...priority],
      recommendedStepIds: [...recommended],
      skippedStepIds:    [...skip],
      unsafeStepIds:     [...unsafe],
      skipReasons,
    }
  }

  // ════════════════════════════════════════════════════════════════
  // REPAIR PATH
  // ════════════════════════════════════════════════════════════════

  // ── Step 1: Base map from ML damage category ─────────────────
  let baseMap: IssueMap | null = null

  if (result.mlDamage?.predictedLabel) {
    const category = parseMlDamageCategory(result.mlDamage.predictedLabel)
    baseMap = ML_DAMAGE_MAP[category] ?? null
  }

  // Fallback to form.issue when no ML damage is available
  if (!baseMap && form.issue) {
    baseMap = FORM_ISSUE_MAP[form.issue] ?? FORM_ISSUE_MAP['Other']
  }

  if (!baseMap) baseMap = FORM_ISSUE_MAP['Other']
  mergeInto(ctx, baseMap)

  // ── Step 2: Augment with ML image component ──────────────────
  if (result.mlDamage?.predictedLabel) {
    const component = parseMlComponent(result.mlDamage.predictedLabel)
    if (component) {
      const compMap = ML_COMPONENT_MAP[component]
      if (compMap) mergeInto(ctx, compMap)
    }
  }

  // Augment from mlDamagedComponents list too (e.g. ["screen","battery"])
  if (result.mlDamagedComponents?.length) {
    for (const comp of result.mlDamagedComponents) {
      const compMap = ML_COMPONENT_MAP[comp.toLowerCase().replace(/\s+/g, '')]
      if (compMap) mergeInto(ctx, compMap)
    }
  }

  // ── Step 3: ML crack detection ───────────────────────────────
  if (result.mlCrackDetection === 'cracked') {
    priority.add('screen_check')
    skip.delete('screen_check')
    recommended.add('find_repair_shop')
  }

  // ── Step 4: ML corrosion level ───────────────────────────────
  if (result.mlCorrosionLevel != null && result.mlCorrosionLevel >= 7) {
    // Significant → severe corrosion: treat like water damage
    priority.add('liquid_damage_first_aid')
    priority.add('charging_port_check')
    skip.delete('liquid_damage_first_aid')
    skip.delete('charging_port_check')
    unsafe.add('battery_diy_replace')
    skipReasons['diy_feasibility'] = 'Significant corrosion — professional board cleaning required'
    skip.add('diy_feasibility')
    priority.delete('diy_feasibility')
  } else if (result.mlCorrosionLevel != null && result.mlCorrosionLevel >= 5) {
    // Low-moderate corrosion: note port check
    recommended.add('charging_port_check')
    skip.delete('charging_port_check')
  }

  // ── Step 5: ML age warning (≥10 years) ───────────────────────
  // Model says parts are unavailable → strongly push toward shop/recycle
  if (result.mlAgeWarning) {
    ;['diy_feasibility', 'battery_diy_replace', 'software_fix'].forEach(id => {
      skip.add(id)
      priority.delete(id)
      recommended.delete(id)
    })
    skipReasons['diy_feasibility']    = 'Device ≥10 years old — parts likely unavailable'
    skipReasons['battery_diy_replace'] = 'Parts not in stock for devices this old'
    skipReasons['software_fix']        = 'Hardware age is the root cause — software fixes unlikely to help'
    priority.add('find_repair_shop')
    recommended.add('check_warranty')
  }

  // ── Step 6: ML repairability index gate ──────────────────────
  if (result.mlRepairability) {
    const idx = result.mlRepairability.score  // 0–100
    if (idx < 30) {
      // Very low — mark DIY as unsafe
      unsafe.add('battery_diy_replace')
      skip.add('diy_feasibility')
      skipReasons['diy_feasibility'] = `Repairability index ${idx.toFixed(0)}/100 — professional repair only`
      priority.add('find_repair_shop')
    } else if (idx < 50) {
      // Moderate-low — flag DIY with caution
      if (!skip.has('diy_feasibility')) recommended.add('diy_feasibility')
    } else if (idx >= 70) {
      // Good repairability — encourage DIY check
      if (!skip.has('diy_feasibility')) priority.add('diy_feasibility')
    }
  }

  // ── Step 7: ML final_recommendation override ─────────────────
  if (result.mlRecommendation) {
    const rec = result.mlRecommendation.toLowerCase()
    if (rec.includes('not repairable') || rec.includes('not recommended')) {
      ;['diy_feasibility', 'battery_diy_replace', 'software_fix'].forEach(id => {
        skip.add(id)
        priority.delete(id)
        recommended.delete(id)
        skipReasons[id] = 'ML assessment: not recommended for repair'
      })
      priority.add('find_repair_shop')
    } else if (rec.includes('consider replacement') || rec.includes('marginal')) {
      recommended.add('find_repair_shop')
      if (!skip.has('diy_feasibility')) recommended.add('diy_feasibility')
    }
  }

  // ── Step 8: Repair cost ratio ────────────────────────────────
  if (result.mlCostAnalysis) {
    const ratio = result.mlCostAnalysis.repairRatio
    if (ratio > 0.7) {
      priority.add('find_repair_shop')
      recommended.add('check_warranty')
    }
  }

  // ── Step 9: iFixit score → battery DIY gate ──────────────────
  if (!unsafe.has('battery_diy_replace')) {
    if (ifixit === null || ifixit < 7) {
      unsafe.add('battery_diy_replace')
    }
  }

  // ── Step 10: Severity overrides ──────────────────────────────
  if (form.severity === 'severe') {
    if (!skip.has('diy_feasibility')) {
      skip.add('diy_feasibility')
      skipReasons['diy_feasibility'] = 'Severe damage — shop repair recommended directly'
    }
    priority.add('find_repair_shop')
  }

  // ── Step 11: Protected steps — never skipped ─────────────────
  ;['backup_data', 'check_warranty'].forEach(id => skip.delete(id))

  // ── Chip: legacy modelLabel (image screen classifier) ────────
  if (result.modelLabel) {
    chips.push({
      label: `Screen scan: ${result.modelLabel} (${((result.modelProbability ?? 0) * 100).toFixed(0)}%)`,
      cls: result.modelLabel.toLowerCase().includes('crack') ? 'danger' : 'score',
    })
  }

  return {
    direction,
    score: result.score,
    reasoningChips: chips,
    priorityStepIds:    [...priority],
    recommendedStepIds: [...recommended],
    skippedStepIds:     [...skip],
    unsafeStepIds:      [...unsafe],
    skipReasons,
  }
}