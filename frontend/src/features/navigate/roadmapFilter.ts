/**
 * roadmapFilter.ts
 * ----------------
 * 1. Detects device class (mobile-ios, mobile-samsung, mobile-android,
 *    laptop-windows, laptop-macos, laptop-other) from brand + model strings.
 * 2. Builds step-level filter (priority / recommended / skipped / unsafe).
 * 3. Builds sub-item filter — hides sub-steps whose `platforms` tag doesn't
 *    match the detected device class.
 */

import type {
  DeviceFormData, AssessmentResult, FilterResult,
  ReasoningChip, SubPlatform,
} from '@/types'

// ── Device class detection ───────────────────────────────────────

type DeviceClass =
  | 'mobile-ios'
  | 'mobile-samsung'
  | 'mobile-android'
  | 'laptop-windows'
  | 'laptop-macos'
  | 'laptop-other'
  | 'unknown'

/** Keywords that identify each device class from the brand/model string */
const CLASS_RULES: Array<{ cls: DeviceClass; keywords: string[] }> = [
  // iOS first — "apple" can match before "macbook"
  { cls: 'mobile-ios',     keywords: ['iphone', 'ipad'] },
  { cls: 'mobile-samsung', keywords: ['samsung', 'galaxy'] },
  { cls: 'mobile-android', keywords: ['android', 'pixel', 'xiaomi', 'redmi', 'oppo', 'realme', 'vivo', 'infinix', 'tecno', 'nokia', 'oneplus', 'motorola', 'huawei', 'honor'] },
  { cls: 'laptop-macos',   keywords: ['macbook', 'mac book', 'apple mac', 'm1', 'm2', 'm3', 'm4'] },
  { cls: 'laptop-windows', keywords: ['lenovo', 'thinkpad', 'ideapad', 'hp ', 'hp-', 'dell', 'asus', 'acer', 'msi ', 'razer', 'toshiba', 'fujitsu', 'surface', 'framework', 'gigabyte aero', 'lg gram'] },
  { cls: 'laptop-other',   keywords: ['laptop', 'notebook', 'chromebook'] },
]

export function detectDeviceClass(brand: string, model: string): DeviceClass {
  const haystack = `${brand} ${model}`.toLowerCase()
  for (const { cls, keywords } of CLASS_RULES) {
    if (keywords.some(kw => haystack.includes(kw))) return cls
  }
  return 'unknown'
}

/**
 * Given a device class, return the set of SubPlatform tags that should be
 * VISIBLE. Sub-items tagged with a platform NOT in this set are hidden.
 * Sub-items tagged 'all' or with no platforms are always visible.
 */
function visiblePlatforms(cls: DeviceClass): Set<SubPlatform> {
  const base: SubPlatform[] = ['all']
  switch (cls) {
    case 'mobile-ios':
      return new Set([...base, 'mobile', 'ios'])
    case 'mobile-samsung':
      return new Set([...base, 'mobile', 'android', 'samsung'])
    case 'mobile-android':
      return new Set([...base, 'mobile', 'android'])
    case 'laptop-windows':
      return new Set([...base, 'laptop', 'windows'])
    case 'laptop-macos':
      return new Set([...base, 'laptop', 'macos'])
    case 'laptop-other':
      return new Set([...base, 'laptop'])
    default:
      // Unknown device — show everything so nothing is accidentally hidden
      return new Set(['all', 'mobile', 'laptop', 'ios', 'android', 'samsung', 'windows', 'macos'])
  }
}

// ── Repairability score lookup ───────────────────────────────────
const REPAIR_SCORES: Record<string, number> = {
  'iphone 16': 7, 'iphone 16 pro': 6, 'iphone 16 plus': 7, 'iphone 16 pro max': 6,
  'iphone 15': 7, 'iphone 15 pro': 6, 'iphone 15 plus': 7, 'iphone 15 pro max': 6,
  'iphone 14': 4, 'iphone 14 pro': 4, 'iphone 14 plus': 4, 'iphone 14 pro max': 4,
  'iphone 13': 4, 'iphone 13 pro': 4, 'iphone 13 mini': 4, 'iphone 12': 4,
  'iphone 11': 6, 'iphone se': 5,
  'galaxy s25': 4, 'galaxy s24': 4, 'galaxy s23': 4, 'galaxy s22': 4, 'galaxy s21': 4,
  'galaxy s24 ultra': 4, 'galaxy s23 ultra': 4,
  'galaxy a55': 6, 'galaxy a54': 6, 'galaxy a53': 5, 'galaxy a35': 6, 'galaxy a34': 5,
  'galaxy a25': 5, 'galaxy a15': 5, 'galaxy a05': 5,
  'pixel 9': 5, 'pixel 9 pro': 5, 'pixel 8': 5, 'pixel 8 pro': 5,
  'pixel 7': 5, 'pixel 7 pro': 5, 'pixel 6': 5,
  'xiaomi 14': 4, 'xiaomi 13': 5, 'redmi note 13': 6, 'redmi note 12': 6, 'redmi 13c': 6,
  'oppo reno 11': 5, 'oppo a98': 5, 'realme 12': 5, 'realme c55': 6,
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

// ── Issue → step filter map ──────────────────────────────────────
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

// ── Main export ──────────────────────────────────────────────────
export function buildFilterResult(
  form: DeviceFormData,
  assessmentResult: AssessmentResult,
): FilterResult {
  const chips: ReasoningChip[] = []
  const ageYrs      = form.ageMonths / 12
  const repairScore = getRepairabilityScore(form.brand, form.model)
  const deviceClass = detectDeviceClass(form.brand, form.model)
  const visible     = visiblePlatforms(deviceClass)

  // ── Age chip ────────────────────────────────────────────────
  if (form.ageMonths > 0) {
    if (ageYrs < 2)      chips.push({ label: `Age: ${form.ageMonths}mo — repair recommended`, cls: 'age' })
    else if (ageYrs < 4) chips.push({ label: `Age: ${form.ageMonths}mo — borderline`, cls: 'age' })
    else if (ageYrs < 6) chips.push({ label: `Age: ${form.ageMonths}mo — lean toward recycle`, cls: 'age' })
    else                 chips.push({ label: `Age: ${form.ageMonths}mo — recycle recommended`, cls: 'danger' })
  }

  // ── Device class chip ───────────────────────────────────────
  const classLabels: Record<DeviceClass, string> = {
    'mobile-ios':      '📱 iPhone / iPad',
    'mobile-samsung':  '📱 Samsung Galaxy',
    'mobile-android':  '📱 Android phone',
    'laptop-windows':  '💻 Windows laptop',
    'laptop-macos':    '💻 Mac laptop',
    'laptop-other':    '💻 Laptop',
    'unknown':         '📱 Device',
  }
  chips.push({ label: classLabels[deviceClass], cls: 'brand' })

  // ── iFixit score chip ───────────────────────────────────────
  if (repairScore !== null) {
    if (repairScore >= 8)      chips.push({ label: `iFixit ${repairScore}/10 — highly DIY-friendly`, cls: 'score' })
    else if (repairScore >= 6) chips.push({ label: `iFixit ${repairScore}/10 — moderately repairable`, cls: 'score' })
    else if (repairScore >= 4) chips.push({ label: `iFixit ${repairScore}/10 — shop recommended`, cls: 'brand' })
    else                       chips.push({ label: `iFixit ${repairScore}/10 — difficult to repair`, cls: 'danger' })
  }

  // ── Issue chip ──────────────────────────────────────────────
  if (form.issue) {
    const sevLabel = form.severity === 'severe' ? ' — severe' : form.severity === 'moderate' ? ' — moderate' : ''
    chips.push({ label: `${form.issue}${sevLabel}`, cls: form.severity === 'severe' ? 'danger' : 'damage' })
  }

  // ── ML screen chip ──────────────────────────────────────────
  if (assessmentResult.modelLabel) {
    chips.push({
      label: `Screen: ${assessmentResult.modelLabel} (${((assessmentResult.modelProbability ?? 0) * 100).toFixed(0)}%)`,
      cls: assessmentResult.modelLabel.toLowerCase().includes('crack') ? 'danger' : 'score',
    })
  }

  // ── Sub-item filter ─────────────────────────────────────────
  // Collect all sub-item IDs whose platform tags are NOT in the visible set.
  // A sub-item with platforms=['all'] or no platforms is always visible.
  // A sub-item with platforms=['ios','android'] is visible if either tag is visible.
  // We import the raw data here just to scan IDs — NavigatePage will apply the
  // actual filtering to the cloned tree it works with.
  //
  // We can't import the phases here without a circular dep, so we embed the
  // sub-ID → platform mapping as a flat record derived from roadmapData.ts.
  // This map is maintained alongside roadmapData.ts.

  const SUB_PLATFORMS: Record<string, SubPlatform[]> = {
    // backup_data
    bu_cloud_mobile: ['mobile'], bu_cloud_android: ['android'], bu_cloud_ios: ['ios'],
    bu_cloud_laptop: ['laptop'], bu_cloud_windows: ['windows'], bu_cloud_macos: ['macos'],
    bu_apps: ['mobile'], bu_apps_samsung: ['samsung'],
    // check_warranty
    wt_manuf: ['all'], wt_manuf_apple: ['ios'], wt_manuf_samsung: ['samsung'],
    wt_manuf_laptop: ['laptop'], wt_retail: ['all'], wt_action: ['all'],
    // software_diagnostics
    sd_restart: ['all'], sd_restart_iphone: ['ios'], sd_restart_samsung: ['samsung'],
    sd_restart_android: ['android'], sd_restart_laptop: ['laptop'],
    sw_update: ['all'], sw_update_android: ['android'], sw_update_ios: ['ios'],
    sw_update_windows: ['windows'], sw_update_macos: ['macos'],
    sd_bat_mob: ['mobile'], sd_bat_ios: ['ios'], sd_bat_samsung: ['samsung'],
    sd_bat_android: ['android'], sd_bat_lap: ['laptop'],
    sd_bat_windows: ['windows'], sd_bat_macos: ['macos'],
    sd_storage: ['laptop'], sd_storage_windows: ['windows'], sd_storage_macos: ['macos'],
    // battery_check
    bc_cycle: ['all'], bc_cycle_ios: ['ios'], bc_cycle_android: ['android'],
    bc_cycle_windows: ['windows'], bc_cycle_macos: ['macos'],
    bc_swell: ['all'], bc_swell_mobile: ['mobile'], bc_swell_laptop: ['laptop'],
    bc_heat: ['all'],
    // screen_check
    sc_pixel: ['all'], sc_back: ['laptop'], sc_touch: ['mobile'],
    sc_touch_samsung: ['samsung'], sc_touch_android: ['android'], sc_touch_ios: ['ios'],
    sc_crack: ['all'], sc_external: ['laptop'],
    // charging_port_check
    cp_clean: ['all'], cp_cable: ['all'], cp_meter: ['mobile'],
    cp_pins: ['all'], cp_pins_ios: ['ios'], cp_magsafe: ['macos'],
    // overheating_check
    ot_temp: ['laptop'], ot_temp_windows: ['windows'], ot_temp_macos: ['macos'],
    ot_temp_mobile: ['mobile'], ot_clean: ['laptop'], ot_pad: ['laptop'],
    ot_paste: ['laptop'], ot_mobile_apps: ['mobile'],
    ot_mobile_apps_ios: ['ios'], ot_mobile_apps_android: ['android'],
    // software_fix
    sw_update2: ['all'], sw_malware: ['all'], sw_malware_windows: ['windows'],
    sw_malware_android: ['android'], sw_malware_ios: ['ios'],
    sw_reset: ['all'], sw_reset_android: ['android'], sw_reset_ios: ['ios'],
    sw_reset_windows: ['windows'], sw_reset_macos: ['macos'],
    // liquid_damage_first_aid
    ld_off: ['all'], ld_off_samsung: ['samsung'], ld_remove: ['mobile'],
    ld_remove_laptop: ['laptop'], ld_dry: ['all'], ld_shop: ['all'],
    // motherboard_check
    mb_drain: ['laptop'], mb_drain_mobile: ['mobile'], mb_led: ['all'], mb_shop: ['all'],
    // diy_feasibility
    df_score: ['all'], df_tools: ['all'], df_decide: ['all'],
    // find_repair_shop
    rs_auth: ['all'], rs_auth_apple: ['ios'], rs_auth_samsung: ['samsung'],
    rs_auth_laptop: ['laptop'], rs_quote: ['all'], rs_warranty: ['all'], rs_receipt: ['all'],
    // verify_repair
    vr_test: ['all'], vr_test_screen: ['all'], vr_test_battery: ['mobile'],
    vr_test_battery_laptop: ['laptop'], vr_48h: ['all'], vr_recur: ['all'],
    // recycle — backup
    rbu_photos: ['all'], rbu_photos_android: ['android'], rbu_photos_ios: ['ios'],
    rbu_contacts: ['mobile'], rbu_contacts_android: ['android'], rbu_contacts_ios: ['ios'],
    rbu_apps: ['mobile'], rbu_laptop: ['laptop'],
    rbu_laptop_windows: ['windows'], rbu_laptop_macos: ['macos'],
    // recycle — wipe
    wd_google: ['android'], wd_apple: ['ios'], wd_samsung: ['samsung'],
    wd_laptop_windows: ['windows'], wd_laptop_macos: ['macos'],
    // recycle — factory reset
    fr_ios: ['ios'], fr_android: ['android'], fr_samsung: ['samsung'],
    fr_windows: ['windows'], fr_macos: ['macos'],
    // recycle — remove
    rc_sim: ['mobile'], rc_sd: ['mobile'], rc_case: ['all'], rc_charger: ['all'],
    // recycle — trade-in
    ti_apple: ['ios'], ti_samsung: ['samsung'], ti_lazada: ['all'], ti_globe: ['all'],
    // recycle — disposal
    rf_denr: ['all'], rf_globe: ['all'], rf_brand: ['all'], rf_lgu: ['all'],
    // recycle — cert
    dc_receipt: ['all'], dc_cert: ['all'], dc_law: ['all'],
  }

  const skippedSubIds: string[] = []
  for (const [subId, platforms] of Object.entries(SUB_PLATFORMS)) {
    if (platforms.includes('all')) continue
    const isVisible = platforms.some(p => visible.has(p as SubPlatform))
    if (!isVisible) skippedSubIds.push(subId)
  }

  // ── Step-level filter ───────────────────────────────────────
  const direction = assessmentResult.direction

  if (direction === 'RECYCLE') {
    return {
      direction, score: assessmentResult.score, reasoningChips: chips,
      priorityStepIds: ['backup_data', 'wipe_data', 'factory_reset'],
      recommendedStepIds: ['remove_components', 'find_recycling_facility', 'get_disposal_cert'],
      skippedStepIds: [], unsafeStepIds: [], skipReasons: {},
      skippedSubIds, deviceClass,
    }
  }

  const issueMap = ISSUE_MAP[form.issue] ?? ISSUE_MAP['Other']
  const priorityStepIds    = [...issueMap.priorityStepIds]
  const recommendedStepIds = [...issueMap.recommendedStepIds]
  let   skipStepIds        = [...issueMap.skipStepIds]
  const unsafeStepIds      = [...(issueMap.unsafeStepIds ?? [])]
  const skipReasons        = { ...issueMap.skipReasons }

  // battery_diy_replace: unsafe unless iFixit score ≥ 7
  if (!unsafeStepIds.includes('battery_diy_replace')) {
    if (repairScore === null || repairScore < 7) unsafeStepIds.push('battery_diy_replace')
  }

  // Severe severity: skip DIY feasibility, go straight to shop
  if (form.severity === 'severe') {
    if (!skipStepIds.includes('diy_feasibility')) {
      skipStepIds.push('diy_feasibility')
      skipReasons['diy_feasibility'] = 'Severe damage — shop repair recommended directly'
    }
    if (!priorityStepIds.includes('find_repair_shop')) priorityStepIds.push('find_repair_shop')
  }

  // backup_data and check_warranty are never skipped
  skipStepIds = skipStepIds.filter(id => id !== 'backup_data' && id !== 'check_warranty')

  return {
    direction, score: assessmentResult.score, reasoningChips: chips,
    priorityStepIds, recommendedStepIds,
    skippedStepIds: skipStepIds, unsafeStepIds, skipReasons,
    skippedSubIds, deviceClass,
  }
}