/**
 * roadmapFilter.ts  — v3
 * ──────────────────────
 * Converts DeviceFormData + AssessmentResult into a FilterResult
 * that NavigatePage uses to colour-code, skip, and slash-through steps.
 *
 * Signal priority (highest → lowest):
 *   1. mlRecommendation   "NOT REPAIRABLE" hard-overrides
 *   2. mlDamage category  primary damage map
 *   3. mlCrackDetection   screen step elevation
 *   4. mlCorrosionLevel   liquid-damage pathway
 *   5. mlDamagedComponents  per-component augmentation
 *   6. mlRepairability.score  DIY gate
 *   7. mlCostAnalysis.repairRatio  cost gate
 *   8. mlAgeWarning / form.ageMonths  age gate
 *   9. form.severity      severity gate
 *  10. iFixit score       battery DIY gate
 *  11. form.issue         fallback when no ML available
 *  12. form.brand/model   brand-specific sub-item slashing
 *  13. form.deviceType    device-type sub-item slashing
 *
 * Sub-item slashing (struck-through, not hidden):
 *   • OS-specific resets (iOS/Android/Windows/macOS) → brand/deviceType
 *   • Mobile-only vs laptop-only diagnostics → deviceType
 *   • Brand-specific repair shops → brand
 *   • DIY subs when not repairable → mlRecommendation
 *   • Age-sensitive battery subs → ageMonths
 */

import type { DeviceFormData, AssessmentResult, FilterResult, ReasoningChip } from '@/types'
import { ISSUE_PARTS_AVAILABILITY, ISSUE_COST_RATIO } from '../assess/scoring'

// ================================================================
// IFIXIT REPAIRABILITY DATABASE
// ================================================================
const IFIXIT_SCORES: Record<string, number> = {
  // Apple phones
  'iphone 16': 7, 'iphone 16 pro': 6, 'iphone 16 plus': 7, 'iphone 16 pro max': 6,
  'iphone 15': 7, 'iphone 15 pro': 6, 'iphone 15 plus': 7, 'iphone 15 pro max': 6,
  'iphone 14': 4, 'iphone 14 pro': 4, 'iphone 14 plus': 4, 'iphone 14 pro max': 4,
  'iphone 13': 4, 'iphone 13 pro': 4, 'iphone 13 mini': 4, 'iphone 12': 4,
  'iphone 11': 6, 'iphone xs': 5, 'iphone xr': 6, 'iphone x': 5, 'iphone se': 5,
  // Samsung Galaxy S (glued flagships)
  'galaxy s25': 4, 'galaxy s24': 4, 'galaxy s23': 4, 'galaxy s22': 4, 'galaxy s21': 4,
  'galaxy s20': 3, 'galaxy s24 ultra': 4, 'galaxy s23 ultra': 4, 'galaxy s22 ultra': 4,
  // Samsung Galaxy A (screwed mid-range — easier)
  'galaxy a55': 6, 'galaxy a54': 6, 'galaxy a53': 5, 'galaxy a35': 6, 'galaxy a34': 5,
  'galaxy a25': 5, 'galaxy a15': 5, 'galaxy a05': 5, 'galaxy a14': 5, 'galaxy a13': 5,
  // Google Pixel
  'pixel 9': 5, 'pixel 9 pro': 5, 'pixel 8': 5, 'pixel 8 pro': 5,
  'pixel 7': 5, 'pixel 7 pro': 5, 'pixel 6': 5, 'pixel 6a': 6,
  // Xiaomi / Redmi
  'xiaomi 14': 4, 'xiaomi 13': 5, 'xiaomi 12': 5,
  'redmi note 13': 6, 'redmi note 12': 6, 'redmi note 11': 6,
  'redmi 13c': 6, 'redmi 12c': 6,
  // OPPO / Realme
  'oppo reno 11': 5, 'oppo reno 10': 5, 'oppo a98': 5, 'oppo a78': 5,
  'realme 12': 5, 'realme 11': 5, 'realme c55': 6, 'realme c35': 6,
  // Laptops — easy
  'framework': 10, 'framework 13': 10, 'framework 16': 10,
  'lenovo thinkpad': 8, 'dell latitude': 7, 'hp elitebook': 7, 'hp probook': 6,
  'dell inspiron': 6, 'lenovo ideapad': 6, 'asus vivobook': 6,
  'acer aspire': 6, 'acer nitro': 6, 'asus tuf': 5, 'asus rog': 5,
  // Laptops — hard
  'macbook pro': 3, 'macbook air': 4, 'macbook': 4,
  'dell xps 13': 3, 'dell xps 15': 3,
  'hp spectre': 3, 'hp envy': 4, 'hp pavilion': 5,
  'lenovo yoga': 5, 'acer swift': 4,
  'asus zenbook': 4, 'microsoft surface': 1,
}

function getIfixitScore(brand: string, model: string): number | null {
  const hay = `${brand} ${model}`.toLowerCase()
  // Longest match wins (more specific)
  let best: { score: number; len: number } | null = null
  for (const [key, score] of Object.entries(IFIXIT_SCORES)) {
    if (hay.includes(key) && (!best || key.length > best.len)) {
      best = { score, len: key.length }
    }
  }
  return best?.score ?? null
}

// ================================================================
// DEVICE CLASSIFICATION HELPERS
// ================================================================
const isApple   = (f: DeviceFormData) =>
  /apple|iphone|ipad|macbook|imac/i.test(`${f.brand} ${f.model}`)

const isSamsung = (f: DeviceFormData) =>
  /samsung|galaxy/i.test(`${f.brand} ${f.model}`)

const isAndroid = (f: DeviceFormData) =>
  !isApple(f) && /android|samsung|galaxy|xiaomi|redmi|oppo|realme|vivo|huawei|oneplus|google|pixel|poco|infinix|tecno/i.test(`${f.brand} ${f.model}`)

const isLaptop  = (f: DeviceFormData) =>
  f.deviceType === 'Laptop' ||
  /laptop|notebook|macbook|thinkpad|ideapad|vivobook|zenbook|spectre|pavilion|inspiron|latitude|elitebook|aspire|swift|nitro|rog|tuf|surface|framework|loq/i.test(`${f.brand} ${f.model}`)

const isTablet  = (f: DeviceFormData) =>
  f.deviceType === 'Tablet' ||
  /ipad|tab |tab$|galaxy tab|mediapad|matebook/i.test(`${f.brand} ${f.model}`)

const isMobile  = (f: DeviceFormData) => !isLaptop(f) && !isTablet(f)

const isMac     = (f: DeviceFormData) =>
  /macbook|imac|mac mini|mac pro/i.test(`${f.brand} ${f.model}`)

const isVeryOld = (f: DeviceFormData) => f.ageMonths > 120   // >10 yr

const notRepairable = (_: DeviceFormData, r: AssessmentResult) =>
  !!(r.mlRecommendation?.toLowerCase().includes('not repairable') ||
     r.mlRecommendation?.toLowerCase().includes('not recommended'))

// ================================================================
// ISSUE → STEP MAP  (used for both ML categories + form issues)
// ================================================================
interface IssueMap {
  priorityStepIds:   string[]
  recommendedStepIds: string[]
  skipStepIds:       string[]
  unsafeStepIds?:    string[]
  skipReasons:       Record<string, string>
}

// ── ML Damage Categories (from predict_unified.py DAMAGE_CATEGORIES) ──
const ML_DAMAGE_MAP: Record<string, IssueMap> = {
  'battery degradation': {
    priorityStepIds:    ['battery_check', 'software_diagnostics'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'find_repair_shop', 'verify_repair', 'overheating_check'],
    // Note: overheating co-occurs with battery degradation — keep visible as recommended
    skipStepIds:  ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'software_fix'],
    skipReasons: {
      screen_check:           'No screen damage detected by ML',
      charging_port_check:    'Battery degradation is not a port issue',
      liquid_damage_first_aid:'No liquid damage detected',
      motherboard_check:      'Device has power — no board failure indicated',
      software_fix:           'Battery degradation is hardware, not software',
    },
  },

  'cracked screen': {
    priorityStepIds:    ['screen_check', 'backup_data', 'find_repair_shop'],
    recommendedStepIds: ['check_warranty', 'diy_feasibility', 'verify_repair', 'software_diagnostics'],
    skipStepIds:  ['overheating_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'software_fix', 'battery_check'],
    skipReasons: {
      overheating_check:      'Not related to screen damage',
      charging_port_check:    'Not related to screen damage',
      liquid_damage_first_aid:'No liquid damage detected',
      motherboard_check:      'Device has power — no board failure indicated',
      software_fix:           'Screen crack is physical, not software',
      battery_check:          'No battery issue reported',
    },
  },

  'water/liquid damage': {
    priorityStepIds:    ['liquid_damage_first_aid', 'backup_data'],
    recommendedStepIds: ['charging_port_check', 'battery_check', 'find_repair_shop'],
    skipStepIds:  ['screen_check', 'overheating_check', 'motherboard_check', 'software_fix',
                   'diy_feasibility', 'battery_diy_replace', 'software_diagnostics'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check:           'Defer screen test until device is confirmed dry',
      overheating_check:      'Liquid first-aid takes precedence',
      motherboard_check:      'Board assessment after professional cleaning',
      software_fix:           'Do NOT power on until fully dry',
      diy_feasibility:        'Water damage requires professional board cleaning',
    },
  },

  'hardware issue': {
    priorityStepIds:    ['motherboard_check', 'backup_data', 'find_repair_shop'],
    recommendedStepIds: ['check_warranty', 'battery_check', 'charging_port_check'],
    skipStepIds:  ['screen_check', 'liquid_damage_first_aid', 'overheating_check',
                   'software_fix', 'diy_feasibility', 'software_diagnostics'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check:           'Device may have no power',
      liquid_damage_first_aid:'No liquid damage detected',
      overheating_check:      'Hardware failure not a thermal issue',
      software_fix:           'Cannot run software checks without stable power',
      software_diagnostics:   'Cannot run diagnostics without stable power',
      diy_feasibility:        'Board-level repair requires professional tools',
    },
  },

  'software issue': {
    priorityStepIds:    ['software_diagnostics', 'software_fix'],
    recommendedStepIds: ['backup_data'],
    // Don't skip overheating — software can cause it (cryptomining malware, runaway process)
    skipStepIds:  ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check', 'battery_check', 'diy_feasibility'],
    skipReasons: {
      screen_check:           'No physical screen damage detected',
      charging_port_check:    'Software issue — not a port problem',
      liquid_damage_first_aid:'No liquid damage detected',
      motherboard_check:      'Device has power',
      battery_check:          'Software issue — not a battery hardware problem',
      diy_feasibility:        'Software fixes need no hardware tools',
    },
  },

  'physical damage': {
    // Catch-all: covers screen, port, casing, hinge, keyboard
    priorityStepIds:    ['screen_check', 'charging_port_check', 'backup_data', 'find_repair_shop'],
    recommendedStepIds: ['check_warranty', 'diy_feasibility', 'battery_check', 'verify_repair', 'software_diagnostics'],
    skipStepIds:  ['liquid_damage_first_aid', 'motherboard_check', 'software_fix', 'overheating_check'],
    skipReasons: {
      liquid_damage_first_aid:'No liquid damage detected',
      motherboard_check:      'Device has power',
      software_fix:           'Physical damage is not a software issue',
      overheating_check:      'Not related to physical damage',
    },
  },
}

// ── Image classifier components (from predict_unified.py LAPTOP_COMPONENTS) ──
const ML_COMPONENT_MAP: Record<string, Partial<IssueMap>> = {
  'battery': {
    priorityStepIds:    ['battery_check'],
    recommendedStepIds: ['diy_feasibility', 'find_repair_shop'],
  },
  'lcdscreen': {
    priorityStepIds:    ['screen_check', 'find_repair_shop'],
    recommendedStepIds: ['backup_data'],
  },
  'keyboard': {
    priorityStepIds:    ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['diy_feasibility'],
    skipStepIds:  ['battery_check', 'screen_check', 'charging_port_check',
                   'liquid_damage_first_aid', 'overheating_check'],
    skipReasons: {
      battery_check:          'Keyboard issue is not battery-related',
      screen_check:           'No screen damage detected',
      charging_port_check:    'Not related to keyboard',
      liquid_damage_first_aid:'No liquid damage detected',
      overheating_check:      'Not related to keyboard',
    },
  },
  'hinge': {
    priorityStepIds:    ['find_repair_shop'],
    recommendedStepIds: ['backup_data', 'screen_check', 'diy_feasibility'],
    skipStepIds:  ['battery_check', 'charging_port_check', 'liquid_damage_first_aid',
                   'software_fix', 'overheating_check', 'motherboard_check'],
    skipReasons: {
      battery_check:          'Hinge damage is not battery-related',
      charging_port_check:    'Not related to hinge',
      liquid_damage_first_aid:'No liquid damage detected',
      software_fix:           'Hinge is physical, not software',
      overheating_check:      'Not related to hinge',
      motherboard_check:      'Device has power',
    },
  },
  'motherboard': {
    priorityStepIds:    ['motherboard_check', 'backup_data', 'find_repair_shop'],
    recommendedStepIds: ['check_warranty'],
    skipStepIds:  ['screen_check', 'liquid_damage_first_aid', 'overheating_check',
                   'software_fix', 'diy_feasibility', 'charging_port_check', 'software_diagnostics'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check:           'Cannot diagnose screen without stable power',
      liquid_damage_first_aid:'No liquid damage detected',
      overheating_check:      'Motherboard failure not a thermal issue',
      software_fix:           'Cannot run software checks without power',
      software_diagnostics:   'Cannot run diagnostics without power',
      diy_feasibility:        'Motherboard repair requires microsoldering',
      charging_port_check:    'Power issue is board-level, not port-level',
    },
  },
  'harddiskdrive': {
    priorityStepIds:    ['software_diagnostics', 'backup_data'],
    recommendedStepIds: ['check_warranty', 'diy_feasibility', 'find_repair_shop', 'verify_repair'],
    skipStepIds:  ['screen_check', 'charging_port_check', 'liquid_damage_first_aid',
                   'motherboard_check', 'overheating_check', 'battery_check', 'software_fix'],
    skipReasons: {
      screen_check:           'No screen damage detected',
      charging_port_check:    'Storage failure is not a port issue',
      liquid_damage_first_aid:'No liquid damage detected',
      motherboard_check:      'Device has power',
      overheating_check:      'Not directly caused by storage',
      battery_check:          'Not related to storage',
      software_fix:           'Storage failure is hardware, not software config',
    },
  },
  'ram': {
    priorityStepIds:    ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'diy_feasibility', 'verify_repair'],
    skipStepIds:  ['screen_check', 'charging_port_check', 'liquid_damage_first_aid',
                   'overheating_check', 'battery_check', 'software_fix'],
    skipReasons: {
      screen_check:           'No screen damage detected',
      charging_port_check:    'RAM issue is not a port problem',
      liquid_damage_first_aid:'No liquid damage detected',
      overheating_check:      'Not directly caused by RAM',
      battery_check:          'Not related to RAM',
      software_fix:           'RAM failure is hardware',
    },
  },
  'processor': {
    priorityStepIds:    ['overheating_check', 'software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data'],
    skipStepIds:  ['screen_check', 'charging_port_check', 'liquid_damage_first_aid',
                   'battery_check', 'software_fix'],
    unsafeStepIds: ['battery_diy_replace'],
    skipReasons: {
      screen_check:           'No screen damage detected',
      charging_port_check:    'CPU issue is not a port problem',
      liquid_damage_first_aid:'No liquid damage detected',
      battery_check:          'CPU issue is not battery-related',
      software_fix:           'CPU failure requires hardware intervention',
    },
  },
  'webcam': {
    priorityStepIds:    ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['diy_feasibility'],
    skipStepIds:  ['battery_check', 'screen_check', 'charging_port_check',
                   'liquid_damage_first_aid', 'overheating_check', 'motherboard_check', 'software_fix'],
    skipReasons: {
      battery_check:          'Webcam issue is not battery-related',
      screen_check:           'No screen damage detected',
      charging_port_check:    'Not related to webcam',
      liquid_damage_first_aid:'No liquid damage detected',
      overheating_check:      'Not related to webcam',
      motherboard_check:      'Device has power',
      software_fix:           'Try driver reinstall via software_diagnostics first',
    },
  },
  'touchpad': {
    priorityStepIds:    ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['diy_feasibility'],
    skipStepIds:  ['battery_check', 'screen_check', 'charging_port_check',
                   'liquid_damage_first_aid', 'overheating_check', 'motherboard_check', 'software_fix'],
    skipReasons: {
      battery_check:          'Touchpad issue is not battery-related',
      screen_check:           'No screen damage detected',
      charging_port_check:    'Not related to touchpad',
      liquid_damage_first_aid:'No liquid damage detected',
      overheating_check:      'Not related to touchpad',
      motherboard_check:      'Device has power',
      software_fix:           'Try driver reinstall via software_diagnostics first',
    },
  },
}

// ── Form issue fallback map (no ML) ─────────────────────────────
// Mirrors ML categories where possible; adds PH-specific issues.
const FORM_ISSUE_MAP: Record<string, IssueMap> = {
  'Battery degradation':  ML_DAMAGE_MAP['battery degradation'],
  'Cracked screen':       ML_DAMAGE_MAP['cracked screen'],
  'Water/Liquid damage':  ML_DAMAGE_MAP['water damage'],
  'Motherboard failure':  {
    ...ML_DAMAGE_MAP['hardware failure'],
    priorityStepIds: ['motherboard_check', 'backup_data', 'find_repair_shop'],
    skipStepIds: ['screen_check', 'liquid_damage_first_aid', 'overheating_check',
                  'software_fix', 'diy_feasibility', 'software_diagnostics'],
    skipReasons: {
      ...ML_DAMAGE_MAP['hardware failure'].skipReasons,
      software_diagnostics: 'Cannot run diagnostics without stable power',
    },
  },
  'Software issue':       ML_DAMAGE_MAP['software issues'],
  'Storage failure':      ML_COMPONENT_MAP['harddiskdrive'] as IssueMap,
  'Charging port issue': {
    priorityStepIds:    ['charging_port_check', 'battery_check'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'software_diagnostics',
                         'diy_feasibility', 'find_repair_shop', 'verify_repair'],
    skipStepIds:  ['screen_check', 'liquid_damage_first_aid', 'motherboard_check', 'overheating_check', 'software_fix'],
    skipReasons: {
      screen_check:           'No screen damage reported',
      liquid_damage_first_aid:'No liquid damage reported',
      motherboard_check:      'Device has power',
      overheating_check:      'Charging issue is not a thermal problem',
      software_fix:           'Charging issues are hardware-level',
    },
  },
  'Speaker problem': {
    priorityStepIds:    ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds:  ['screen_check', 'battery_check', 'charging_port_check',
                   'liquid_damage_first_aid', 'motherboard_check', 'overheating_check'],
    skipReasons: {
      screen_check:           'No screen damage reported',
      battery_check:          'Speaker issue is not battery-related',
      charging_port_check:    'Not related to speaker',
      liquid_damage_first_aid:'No liquid damage reported',
      motherboard_check:      'Device has power',
      overheating_check:      'Not related to speaker',
    },
  },
  'Camera malfunction': {
    priorityStepIds:    ['software_diagnostics', 'find_repair_shop'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'diy_feasibility', 'verify_repair'],
    skipStepIds:  ['screen_check', 'battery_check', 'charging_port_check',
                   'liquid_damage_first_aid', 'motherboard_check', 'overheating_check'],
    skipReasons: {
      screen_check:           'No screen damage reported',
      battery_check:          'Camera issue is not battery-related',
      charging_port_check:    'Not related to camera',
      liquid_damage_first_aid:'No liquid damage reported',
      motherboard_check:      'Device has power',
      overheating_check:      'Not related to camera',
    },
  },
  'Overheating': {
    priorityStepIds:    ['overheating_check', 'software_diagnostics'],
    recommendedStepIds: ['backup_data', 'battery_check', 'diy_feasibility',
                         'find_repair_shop', 'verify_repair'],
    skipStepIds:  ['screen_check', 'charging_port_check', 'liquid_damage_first_aid', 'motherboard_check'],
    skipReasons: {
      screen_check:           'No screen damage reported',
      charging_port_check:    'Overheating is not a port issue',
      liquid_damage_first_aid:'No liquid damage reported',
      motherboard_check:      'Device has power',
    },
  },
  'Other': {
    priorityStepIds:    ['software_diagnostics'],
    recommendedStepIds: ['backup_data', 'check_warranty', 'battery_check', 'find_repair_shop'],
    skipStepIds:  [],
    skipReasons: {},
  },
}

// ================================================================
// MERGE HELPER
// ================================================================
function mergeInto(
  ctx: {
    priority:    Set<string>
    recommended: Set<string>
    skip:        Set<string>
    unsafe:      Set<string>
    skipReasons: Record<string, string>
  },
  source: Partial<IssueMap>,
) {
  // Priority wins — remove from skip AND recommended if elevated
  source.priorityStepIds?.forEach(id => {
    ctx.priority.add(id)
    ctx.skip.delete(id)
    ctx.recommended.delete(id)   // can't be both
  })
  // Recommended wins over skip but not priority
  source.recommendedStepIds?.forEach(id => {
    if (!ctx.priority.has(id)) {
      ctx.recommended.add(id)
      ctx.skip.delete(id)
    }
  })
  // Skip only if not already prioritised or recommended
  source.skipStepIds?.forEach(id => {
    if (!ctx.priority.has(id) && !ctx.recommended.has(id)) {
      ctx.skip.add(id)
    }
  })
  source.unsafeStepIds?.forEach(id => ctx.unsafe.add(id))
  Object.assign(ctx.skipReasons, source.skipReasons ?? {})
}

// ================================================================
// LABEL PARSERS
// ================================================================
function parseMlCategory(label: string): string {
  return label.split(' - ')[0].trim().toLowerCase()
}

function parseMlComponent(label: string): string | null {
  const parts = label.split(' - ')
  return parts.length >= 2 ? parts[1].trim().toLowerCase() : null
}

// ================================================================
// REASONING CHIP BUILDER
// ================================================================
function buildChips(
  form: DeviceFormData,
  result: AssessmentResult,
  ifixit: number | null,
): ReasoningChip[] {
  const chips: ReasoningChip[] = []
  const ageYrs = form.ageMonths / 12

  // Age
  if (form.ageMonths > 0) {
    if (ageYrs < 2)       chips.push({ label: `Age: ${form.ageMonths}mo — repair recommended`, cls: 'age' })
    else if (ageYrs < 4)  chips.push({ label: `Age: ${form.ageMonths}mo — borderline`, cls: 'age' })
    else if (ageYrs < 6)  chips.push({ label: `Age: ${form.ageMonths}mo — lean toward recycle`, cls: 'age' })
    else if (ageYrs < 10) chips.push({ label: `Age: ${form.ageMonths}mo — recycle recommended`, cls: 'danger' })
    else                  chips.push({ label: `Age: ${form.ageMonths}mo — parts likely unavailable`, cls: 'danger' })
  }

  // iFixit
  if (ifixit !== null) {
    if (ifixit >= 8)      chips.push({ label: `iFixit ${ifixit}/10 — highly DIY-friendly`, cls: 'score' })
    else if (ifixit >= 6) chips.push({ label: `iFixit ${ifixit}/10 — moderately repairable`, cls: 'score' })
    else if (ifixit >= 4) chips.push({ label: `iFixit ${ifixit}/10 — shop recommended`, cls: 'brand' })
    else                  chips.push({ label: `iFixit ${ifixit}/10 — difficult to repair`, cls: 'danger' })
  }

  // ML damage
  if (result.mlDamage) {
    const pct = (result.mlDamage.confidence * 100).toFixed(0)
    const isDanger = /water|hardware|motherboard/i.test(result.mlDamage.predictedLabel)
    chips.push({ label: `ML: ${result.mlDamage.predictedLabel} (${pct}% confidence)`, cls: isDanger ? 'danger' : 'damage' })
  } else if (form.issue) {
    const sev = form.severity === 'severe' ? ' — severe' : form.severity === 'moderate' ? ' — moderate' : ''
    chips.push({ label: `Issue: ${form.issue}${sev}`, cls: form.severity === 'severe' ? 'danger' : 'damage' })
  }

  // ML repairability
  if (result.mlRepairability) {
    // score is 0–10 stored; display and compare on 0–100 scale
    const idx = result.mlRepairability.score * 10
    if (idx >= 70)      chips.push({ label: `Repairability ${idx.toFixed(0)}/100 — easy DIY`, cls: 'score' })
    else if (idx >= 40) chips.push({ label: `Repairability ${idx.toFixed(0)}/100 — moderate`, cls: 'brand' })
    else                chips.push({ label: `Repairability ${idx.toFixed(0)}/100 — difficult`, cls: 'danger' })
  }

  // ML cracks
  if (result.mlCrackDetection === 'cracked') {
    chips.push({ label: 'Image scan: cracks detected', cls: 'danger' })
  }

  // ML corrosion
  if (result.mlCorrosionLevel != null) {
    const lvl = result.mlCorrosionLevel
    const desc = lvl <= 5 ? 'low' : lvl <= 6 ? 'moderate' : lvl <= 7 ? 'significant' : lvl <= 8 ? 'high' : 'severe'
    chips.push({ label: `Corrosion level ${lvl}/9 — ${desc}`, cls: lvl >= 7 ? 'danger' : 'damage' })
  }

  // ML cost ratio
  if (result.mlCostAnalysis) {
    const r = result.mlCostAnalysis.repairRatio
    if (r > 0.7)       chips.push({ label: `Repair cost ${(r * 100).toFixed(0)}% of device value — high`, cls: 'danger' })
    else if (r > 0.5)  chips.push({ label: `Repair cost ${(r * 100).toFixed(0)}% of device value — marginal`, cls: 'damage' })
    else if (r > 0)    chips.push({ label: `Repair cost ${(r * 100).toFixed(0)}% of device value — reasonable`, cls: 'score' })
  } else if (form.issue) {
    // Fall back to scoring.ts cost ratios when no ML
    const ratio = ISSUE_COST_RATIO[form.issue]
    if (ratio !== undefined) {
      if (ratio > 0.6) chips.push({ label: `Est. repair cost ratio: ${(ratio * 100).toFixed(0)}% — high`, cls: 'danger' })
      else if (ratio > 0.4) chips.push({ label: `Est. repair cost ratio: ${(ratio * 100).toFixed(0)}% — moderate`, cls: 'damage' })
    }
  }

  // ML age warning
  if (result.mlAgeWarning) {
    chips.push({ label: '⚠ ML: parts likely unavailable — device ≥10 years old', cls: 'danger' })
  }

  // Parts availability from scoring.ts (non-ML path)
  if (!result.fromMl && form.issue) {
    const parts = ISSUE_PARTS_AVAILABILITY[form.issue]
    if (parts !== undefined && parts < 50) {
      chips.push({ label: `Parts availability: ${parts}% — ${parts < 30 ? 'critical' : 'limited'}`, cls: parts < 30 ? 'danger' : 'damage' })
    }
  }

  // Image screen classifier (legacy)
  if (result.modelLabel) {
    const pct = ((result.modelProbability ?? 0) * 100).toFixed(0)
    chips.push({
      label: `Screen scan: ${result.modelLabel} (${pct}%)`,
      cls: result.modelLabel.toLowerCase().includes('crack') ? 'danger' : 'score',
    })
  }

  // ML final recommendation
  if (result.mlRecommendation) {
    const r = result.mlRecommendation.toLowerCase()
    if (r.includes('not repairable'))
      chips.push({ label: '⛔ ML: Not repairable — professional assessment needed', cls: 'danger' })
    else if (r.includes('marginal'))
      chips.push({ label: '⚠ ML: Marginal repair — consider replacement', cls: 'damage' })
    else if (r.includes('consider replacement'))
      chips.push({ label: '⚠ ML: Consider replacement over repair', cls: 'damage' })
  }

  return chips
}

// ================================================================
// RECYCLE PATH FILTER
// ================================================================
function buildRecycleFilter(
  form: DeviceFormData,
  result: AssessmentResult,
  chips: ReasoningChip[],
): FilterResult {
  const priority:    Set<string> = new Set(['backup_data', 'wipe_data', 'factory_reset'])
  const recommended: Set<string> = new Set(['remove_components', 'find_recycling_facility', 'get_disposal_cert'])
  const skip:        Set<string> = new Set()
  const unsafe:      Set<string> = new Set()
  const skipReasons: Record<string, string> = {}

  // Device still has value → trade-in first
  if (result.score >= 25) {
    priority.add('assess_trade_in')
  } else {
    recommended.add('assess_trade_in')
  }

  // Very old device → emphasise certified disposal
  if (result.mlAgeWarning || isVeryOld(form)) {
    priority.add('get_disposal_cert')
    priority.add('find_recycling_facility')
  }

  // Device powers on → trade-in programs are viable
  const issueIsDeadDevice = form.issue === 'Motherboard failure' ||
    result.mlDamage?.predictedLabel.toLowerCase().includes('hardware failure')
  if (issueIsDeadDevice) {
    skip.add('assess_trade_in')
    skipReasons['assess_trade_in'] = 'Device has no power — trade-in programs require functional device'
    priority.delete('assess_trade_in')
  }

  return {
    direction:         'RECYCLE',
    score:             result.score,
    reasoningChips:    chips,
    priorityStepIds:   [...priority],
    recommendedStepIds:[...recommended],
    skippedStepIds:    [...skip],
    unsafeStepIds:     [...unsafe],
    skipReasons,
    slashedSubIds:     buildSlashedSubIds(form, result),
  }
}

// ================================================================
// FALLBACK: keyword inference from raw damage description
// ================================================================
// Mirrors useMlAssessment.ts DAMAGE_LABEL_TO_ISSUE but operates on
// the raw form.damageDescription when ML is offline and form.issue
// was never set. Covers the most common PH repair scenarios.
const DESCRIPTION_KEYWORDS: Array<{ words: string[]; issue: string }> = [
  { words: ['crack', 'cracked', 'shatter', 'broken screen', 'glass', 'display broken', 'screen broken', 'fell', 'drop', 'screen damage'], issue: 'Cracked screen' },
  { words: ['overheat', 'overheating', 'too hot', 'very hot', 'burning', 'thermal', 'hot device'], issue: 'Overheating' },
  { words: ['battery', 'drain', 'drains fast', 'dies fast', 'power off', 'shuts off', 'wont charge', 'swollen', 'not charging'], issue: 'Battery degradation' },
  { words: ['water', 'liquid', 'spill', 'wet', 'submerge', 'moisture', 'rain', 'flood', 'dropped in water'], issue: 'Water/Liquid damage' },
  { words: ['motherboard', 'dead', 'no power', 'wont turn on', 'black screen', 'board failure', 'no display', 'no boot'], issue: 'Motherboard failure' },
  { words: ['charging port', 'usb port', 'port broken', 'charger loose', 'not charging', 'cable fit'], issue: 'Charging port issue' },
  { words: ['storage', 'memory full', 'no space', 'disk full', 'hard drive', 'hdd', 'ssd failure', 'corrupt', 'data lost'], issue: 'Storage failure' },
  { words: ['freeze', 'frozen', 'crash', 'lag', 'slow', 'software', 'boot loop', 'stuck on logo', 'virus', 'malware'], issue: 'Software issue' },
  { words: ['speaker', 'no sound', 'audio', 'volume', 'microphone', 'mic not working', 'earpiece'], issue: 'Speaker problem' },
  { words: ['camera', 'blurry', 'camera not working', 'lens', 'photo', 'rear cam', 'front cam'], issue: 'Camera malfunction' },
]

function inferIssueFromDescription(desc: string): string | null {
  // Score each issue by how many of its keywords appear in the description
  let bestIssue: string | null = null
  let bestScore = 0
  for (const { words, issue } of DESCRIPTION_KEYWORDS) {
    const score = words.filter(w => desc.includes(w)).length
    if (score > bestScore) { bestScore = score; bestIssue = issue }
  }
  return bestScore > 0 ? bestIssue : null
}

// ================================================================
// MAIN EXPORT
// ================================================================
export function buildFilterResult(
  form: DeviceFormData,
  result: AssessmentResult,
): FilterResult {
  const ifixit    = getIfixitScore(form.brand, form.model)
  const direction = result.direction
  const chips     = buildChips(form, result, ifixit)

  if (direction === 'RECYCLE') return buildRecycleFilter(form, result, chips)

  // ── REPAIR PATH ─────────────────────────────────────────────

  const priority:    Set<string> = new Set()
  const recommended: Set<string> = new Set()
  const skip:        Set<string> = new Set()
  const unsafe:      Set<string> = new Set()
  const skipReasons: Record<string, string> = {}
  const ctx = { priority, recommended, skip, unsafe, skipReasons }

  // ── 1. Base map: ML damage category ─────────────────────────
  let baseMap: IssueMap | null = null

  if (result.mlDamage?.predictedLabel) {
    const cat = parseMlCategory(result.mlDamage.predictedLabel)
    baseMap = ML_DAMAGE_MAP[cat] ?? null
  }

  // Fallback A: form.issue set by ML inference or explicitly
  if (!baseMap && form.issue) {
    baseMap = FORM_ISSUE_MAP[form.issue] ?? null
  }

  // Fallback B: keyword scan of raw damageDescription when no ML + no form.issue
  // This is the critical path when ML is offline — the user typed free-text damage
  if (!baseMap && form.damageDescription) {
    const desc = form.damageDescription.toLowerCase()
    const inferredIssue = inferIssueFromDescription(desc)
    if (inferredIssue) {
      baseMap = FORM_ISSUE_MAP[inferredIssue] ?? null
    }
  }

  if (!baseMap) baseMap = FORM_ISSUE_MAP['Other']
  mergeInto(ctx, baseMap)

  // ── 2. ML image component augmentation ──────────────────────
  if (result.mlDamage?.predictedLabel) {
    const comp = parseMlComponent(result.mlDamage.predictedLabel)
    if (comp && ML_COMPONENT_MAP[comp]) mergeInto(ctx, ML_COMPONENT_MAP[comp])
  }

  // Supplementary: if issue still not determined, infer from description
  // and merge the additional step map on top (doesn't override existing priority)
  if (!form.issue && !result.mlDamage?.predictedLabel && form.damageDescription) {
    const inferredIssue = inferIssueFromDescription(form.damageDescription.toLowerCase())
    if (inferredIssue && FORM_ISSUE_MAP[inferredIssue]) {
      mergeInto(ctx, FORM_ISSUE_MAP[inferredIssue])
    }
  }

  // mlDamagedComponents list — multi-component awareness
  // Resolve conflicts: if one component wants a step prioritised and another wants
  // it skipped, prioritisation wins (union semantics, priority > skip)
  if (result.mlDamagedComponents?.length) {
    for (const comp of result.mlDamagedComponents) {
      const key = comp.toLowerCase().replace(/\s+/g, '')
      const compMap = ML_COMPONENT_MAP[key]
      if (compMap) mergeInto(ctx, compMap)
    }
  }

  // ── 3. Crack detection ───────────────────────────────────────
  if (result.mlCrackDetection === 'cracked') {
    priority.add('screen_check')
    skip.delete('screen_check')
    recommended.add('find_repair_shop')
    recommended.add('backup_data')
  }

  // ── 4. Corrosion level ───────────────────────────────────────
  if (result.mlCorrosionLevel != null) {
    if (result.mlCorrosionLevel >= 7) {
      // Significant–severe: treat as water damage overlay
      mergeInto(ctx, ML_DAMAGE_MAP['water damage'])
    } else if (result.mlCorrosionLevel >= 5) {
      // Low–moderate: flag port check
      recommended.add('charging_port_check')
      skip.delete('charging_port_check')
    }
  }

  // ── 5. Age warning ───────────────────────────────────────────
  if (result.mlAgeWarning || isVeryOld(form)) {
    const toDrop = ['diy_feasibility', 'battery_diy_replace', 'software_fix']
    toDrop.forEach(id => {
      skip.add(id); priority.delete(id); recommended.delete(id)
    })
    skipReasons['diy_feasibility']     = 'Device ≥10 years old — parts likely unavailable'
    skipReasons['battery_diy_replace'] = 'Replacement parts unavailable for this age'
    skipReasons['software_fix']        = 'Hardware age is root cause — software fixes unlikely to help'
    priority.add('find_repair_shop')
    recommended.add('check_warranty')
  }

  // ── 6. Parts availability gate (scoring.ts data) ────────────
  // Low parts availability → skip DIY, go shop
  if (!result.fromMl && form.issue) {
    const parts = ISSUE_PARTS_AVAILABILITY[form.issue] ?? 100
    if (parts < 30) {
      skip.add('diy_feasibility')
      skip.add('battery_diy_replace')
      priority.delete('diy_feasibility')
      recommended.delete('diy_feasibility')
      skipReasons['diy_feasibility'] = `Parts availability ${parts}% — DIY not practical`
      priority.add('find_repair_shop')
    } else if (parts < 60) {
      // Moderate availability — caution on DIY
      if (!priority.has('diy_feasibility')) recommended.add('diy_feasibility')
    }
  }

  // ── 7. ML repairability index gate ──────────────────────────
  if (result.mlRepairability) {
    // score is stored on 0–10 scale (divided by 10 in useMlAssessment)
    // Normalise to 0–100 for threshold comparisons
    const idx = result.mlRepairability.score * 10
    if (idx < 30) {
      unsafe.add('battery_diy_replace')
      skip.add('diy_feasibility')
      priority.delete('diy_feasibility')
      recommended.delete('diy_feasibility')
      skipReasons['diy_feasibility'] = `Repairability ${idx.toFixed(0)}/100 — professional repair only`
      priority.add('find_repair_shop')
    } else if (idx < 50) {
      if (!skip.has('diy_feasibility')) recommended.add('diy_feasibility')
    } else if (idx >= 70) {
      if (!skip.has('diy_feasibility')) priority.add('diy_feasibility')
    }
  }

  // ── 8. ML final recommendation override ─────────────────────
  if (result.mlRecommendation) {
    const r = result.mlRecommendation.toLowerCase()
    if (r.includes('not repairable') || r.includes('not recommended')) {
      ['diy_feasibility', 'battery_diy_replace', 'software_fix'].forEach(id => {
        skip.add(id); priority.delete(id); recommended.delete(id)
        skipReasons[id] = 'ML assessment: repair not recommended'
      })
      priority.add('find_repair_shop')
    } else if (r.includes('consider replacement') || r.includes('marginal')) {
      recommended.add('find_repair_shop')
      if (!skip.has('diy_feasibility')) recommended.add('diy_feasibility')
    }
  }

  // ── 9. Cost ratio gate ───────────────────────────────────────
  const costRatio = result.mlCostAnalysis?.repairRatio
    ?? (form.issue ? ISSUE_COST_RATIO[form.issue] : undefined)
  if (costRatio !== undefined) {
    if (costRatio > 0.7) {
      priority.add('find_repair_shop')
      recommended.add('check_warranty')
      // High cost → don't bother with DIY feasibility
      if (!priority.has('diy_feasibility')) {
        skip.add('diy_feasibility')
        skipReasons['diy_feasibility'] = `Repair cost ${(costRatio * 100).toFixed(0)}% of device value — shop assessment needed`
      }
    } else if (costRatio > 0.5) {
      recommended.add('find_repair_shop')
    }
  }

  // ── 10. iFixit score → battery DIY gate ─────────────────────
  if (!unsafe.has('battery_diy_replace')) {
    if (ifixit === null || ifixit < 7) {
      unsafe.add('battery_diy_replace')
    }
  }

  // ── 11. Severity gate ────────────────────────────────────────
  if (form.severity === 'severe') {
    if (!skip.has('diy_feasibility')) {
      skip.add('diy_feasibility')
      priority.delete('diy_feasibility')
      skipReasons['diy_feasibility'] = 'Severe damage — go directly to a shop'
    }
    priority.add('find_repair_shop')
    priority.add('backup_data')
  } else if (form.severity === 'low') {
    // Low severity + good repairability → promote DIY
    if (!skip.has('diy_feasibility') && (ifixit ?? 0) >= 6) {
      priority.add('diy_feasibility')
    }
  }

  // ── 12. Overheating always shown for mobile too ─────────────
  // Mobile overheating is real; only sub-items (HWMonitor/cooling pad) are slashed
  // So don't skip overheating_check for mobile — handled by slash engine

  // ── 13. Protected steps — never skipped ─────────────────────
  ;['backup_data', 'check_warranty', 'verify_repair'].forEach(id => {
    skip.delete(id)
    priority.delete(id)    // don't force-priority either — let maps decide
  })
  // backup_data + verify_repair should be at least recommended
  recommended.add('backup_data')
  recommended.add('verify_repair')

  // Re-add check_warranty only if it doesn't bloat priority
  if (!priority.has('check_warranty')) recommended.add('check_warranty')

  // Final dedup: recommended must not contain anything already in priority or skip
  for (const id of [...priority]) recommended.delete(id)
  for (const id of [...skip])     recommended.delete(id)
  // unsafe items should not be in skip (they show as unsafe, not skipped)
  for (const id of [...unsafe])   skip.delete(id)

  return {
    direction:         'REPAIR',
    score:             result.score,
    reasoningChips:    chips,
    priorityStepIds:   [...priority],
    recommendedStepIds:[...recommended],
    skippedStepIds:    [...skip],
    unsafeStepIds:     [...unsafe],
    skipReasons,
    slashedSubIds:     buildSlashedSubIds(form, result),
  }
}

// ================================================================
// SUB-ITEM SLASH ENGINE
// ================================================================
// Each entry: sub-item ID → condition under which it is slashed
// (rendered struck-through, non-interactive) for this specific user.

type SlashCondition = (form: DeviceFormData, result: AssessmentResult) => boolean

const SUB_SLASH_RULES: Record<string, SlashCondition> = {

  // ── backup_data ───────────────────────────────────────────────
  bu_cloud_laptop: (f) => isMobile(f) || isTablet(f),    // laptop step → slash for mobile/tablet
  bu_cloud_mobile: (f) => isLaptop(f),                   // mobile step → slash for laptop
  bu_apps:         (f) => isLaptop(f),                   // WhatsApp/GCash/2FA irrelevant on laptop

  // ── check_warranty ────────────────────────────────────────────
  // wt_retail: keep for all
  // wt_action: keep for all
  // wt_manuf: keep for all

  // ── software_diagnostics ─────────────────────────────────────
  sd_bat_lap:  (f) => isMobile(f) || isTablet(f),  // powercfg/coconutBattery = laptop only
  sd_storage:  (f) => isMobile(f) || isTablet(f),  // CrystalDiskInfo = laptop only
  sd_bat_mob:  (f) => isLaptop(f),                 // AccuBattery/*#0228# = mobile only

  // ── battery_check ─────────────────────────────────────────────
  bc_cycle:    (f) => isVeryOld(f),   // cycle count irrelevant on decade-old devices

  // ── screen_check ─────────────────────────────────────────────
  sc_touch:    (f) => isLaptop(f),    // Samsung dial code / Play Store = mobile only
  // sc_pixel: keep for all (jscreenfix works on laptop too)
  // sc_back: keep for all (backlight test applies to both)
  // sc_crack: keep for all

  // ── charging_port_check ───────────────────────────────────────
  // cp_clean: keep for all (USB-C ports on laptops too)
  // cp_cable: keep for all
  // cp_meter: keep for all
  // cp_pins:  keep for all

  // ── overheating_check ─────────────────────────────────────────
  ot_temp:  (f) => isMobile(f) || isTablet(f),  // HWMonitor/iStat = laptop tools
  ot_pad:   (f) => isMobile(f) || isTablet(f),  // cooling pad = laptop only
  ot_paste: (f) => isMobile(f) || isTablet(f),  // thermal paste = laptop only
  // ot_clean: keep for all (compressed air applies to tablets/phones too)

  // ── software_fix ──────────────────────────────────────────────
  // sw_update2, sw_malware, sw_reset: keep for all

  // ── liquid_damage_first_aid ───────────────────────────────────
  // ld_off, ld_remove, ld_dry, ld_shop: keep for all

  // ── motherboard_check ─────────────────────────────────────────
  mb_drain: (f) => isMobile(f) || isTablet(f),  // 30s hold = mostly laptop trick
  // mb_led: keep for all
  // mb_shop: keep for all

  // ── diy_feasibility ───────────────────────────────────────────
  df_score:  (_, r) => notRepairable(_, r),
  df_tools:  (_, r) => notRepairable(_, r),
  df_decide: (_, r) => notRepairable(_, r),

  // ── find_repair_shop ─────────────────────────────────────────
  // rs_auth: keep for all (contains multi-brand text)
  // rs_quote, rs_warranty, rs_receipt: keep for all

  // ── verify_repair ─────────────────────────────────────────────
  // vr_test, vr_48h, vr_recur: keep for all

  // ── RECYCLE: backup_data (Phase 1) ───────────────────────────
  rbu_photos:   ()  => false,                              // always keep
  rbu_contacts: (f) => isLaptop(f),                       // contact export = mobile/tablet
  rbu_apps:     (f) => isLaptop(f),                       // WhatsApp/2FA = mobile/tablet
  rbu_laptop:   (f) => isMobile(f) || isTablet(f),        // laptop backup = laptop only

  // ── RECYCLE: wipe_data ────────────────────────────────────────
  wd_google:  (f) => isApple(f) || isLaptop(f),           // Android: slash for Apple + laptop
  wd_apple:   (f) => isAndroid(f) || isSamsung(f) || isLaptop(f),  // iOS: slash for Android + laptop
  wd_samsung: (f) => !isSamsung(f),                        // Samsung acct: slash for non-Samsung
  wd_laptop:  (f) => isMobile(f) || isTablet(f),           // laptop deauth: slash for mobile

  // ── RECYCLE: factory_reset ────────────────────────────────────
  fr_ios:     (f) => !isApple(f) || isLaptop(f),           // iOS reset: Apple mobile only
  fr_android: (f) => isApple(f) || isLaptop(f),            // Android reset: non-Apple mobile
  fr_windows: (f) => isMobile(f) || isTablet(f) || isMac(f), // Windows: PC only
  fr_macos:   (f) => !isApple(f) || isMobile(f) || isTablet(f), // macOS: Mac only

  // ── RECYCLE: remove_components ───────────────────────────────
  rc_sim:     (f) => isLaptop(f),       // SIM tray: mobile/tablet only
  // rc_sd:    keep for all (some laptops have SD slots)
  // rc_case:  keep for all
  // rc_charger: keep for all

  // ── RECYCLE: assess_trade_in ─────────────────────────────────
  ti_apple:   (f) => !isApple(f),       // Apple Trade In: Apple devices only
  ti_samsung: (f) => !isSamsung(f),     // Samsung Trade-Up: Samsung only
  // ti_lazada, ti_globe: keep for all

  // ── RECYCLE: find_recycling_facility ─────────────────────────
  // rf_denr, rf_globe, rf_brand, rf_lgu: keep for all

  // ── RECYCLE: get_disposal_cert ────────────────────────────────
  // dc_receipt, dc_cert, dc_law: keep for all
}

export function buildSlashedSubIds(
  form: DeviceFormData,
  result: AssessmentResult,
): string[] {
  const slashed: string[] = []
  for (const [subId, condition] of Object.entries(SUB_SLASH_RULES)) {
    try {
      if (condition(form, result)) slashed.push(subId)
    } catch {
      // never crash the filter
    }
  }
  return slashed
}