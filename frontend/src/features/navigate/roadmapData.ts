/**
 * roadmapData.ts
 * --------------
 * Full repair + recycle roadmap trees.
 * Each step carries icon, diy level, optional referral, and sub-steps.
 * The filter engine (roadmapFilter.ts) stamps `status` and `skipReason`
 * onto each step at runtime; this file is pure data.
 */
import type { RoadmapPhase } from '@/types'

// ── REPAIR TREE ──────────────────────────────────────────────────
export const REPAIR_PHASES: RoadmapPhase[] = [
  {
    phase: 'Phase 1 — Before You Open Anything',
    steps: [
      {
        id: 'backup_data',
        icon: '💾',
        title: 'Back Up Your Data',
        description: 'Secure all personal files before any repair — data loss is irreversible.',
        type: 'action',
        diy: 'safe',
        completed: false,
        recommended: true,
        refLabel: 'iFixit Community Repair Checklist',
        refUrl: 'https://www.ifixit.com/Wiki/Community_Repair_Checklist',
        subItems: [
          { id: 'bu_cloud_mobile', title: 'Mobile: Enable full cloud backup', description: 'Google One (Android) or iCloud (iOS) — photos, contacts, WhatsApp.', type: 'action', completed: false },
          { id: 'bu_cloud_laptop', title: 'Laptop: Back up to external drive or cloud', description: 'Windows Backup / Time Machine; or Google Drive / OneDrive.', type: 'action', completed: false },
          { id: 'bu_apps', title: 'Export app-specific data (WhatsApp, 2FA, banking)', description: 'WhatsApp: Settings → Chats → Backup. Google Authenticator: Transfer accounts.', type: 'download', completed: false },
        ],
      },
      {
        id: 'check_warranty',
        icon: '🛡️',
        title: 'Check Warranty & Coverage',
        description: 'If under warranty, the manufacturer repairs for free or low cost.',
        type: 'info',
        diy: 'info',
        completed: false,
        refLabel: 'Apple Warranty Check',
        refUrl: 'https://checkcoverage.apple.com',
        subItems: [
          { id: 'wt_manuf', title: 'Check manufacturer warranty status', description: 'Apple, Samsung, Lenovo, HP, ASUS — check respective support portal.', type: 'info', completed: false },
          { id: 'wt_retail', title: 'Check retailer extended warranty', description: 'SM Cyberzone, Beyond the Box, Villman, Abenson — check your receipt.', type: 'info', completed: false },
          { id: 'wt_action', title: 'Under warranty? Go directly to an authorized service center', description: 'Bring device + proof of purchase + warranty card. Skip DIY steps.', type: 'referral', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 2 — Diagnose the Issue',
    steps: [
      {
        id: 'software_diagnostics',
        icon: '🔍',
        title: 'Run Software Diagnostics',
        description: 'Many issues are software-level and fixable without opening the device.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'iFixit Troubleshooting Wiki',
        refUrl: 'https://www.ifixit.com/Wiki/Troubleshoot',
        subItems: [
          { id: 'sd_restart', title: 'Force restart the device first', description: 'Resolves freezes, slowdowns, minor glitches without data loss.', type: 'action', completed: false },
          { id: 'sw_update', title: 'Check for OS and driver updates', description: 'Outdated drivers cause charging, display, and audio issues.', type: 'download', completed: false },
          { id: 'sd_bat_mob', title: 'Mobile: Check battery health', description: 'iOS: Settings → Battery Health. Android: AccuBattery app or *#0228#.', type: 'action', completed: false },
          { id: 'sd_bat_lap', title: 'Laptop: Run battery report', description: 'Windows: powercfg /batteryreport in CMD. macOS: coconutBattery app.', type: 'action', completed: false },
          { id: 'sd_storage', title: 'Laptop: Check storage health', description: 'Windows: CrystalDiskInfo (free). macOS: Disk Utility → First Aid.', type: 'action', completed: false },
        ],
      },
      {
        id: 'battery_check',
        icon: '🔋',
        title: 'Battery Health Check',
        description: 'Battery is the most common failure point — inspect before replacing anything else.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'iFixit Battery Repairability',
        refUrl: 'https://www.ifixit.com/repairability',
        subItems: [
          { id: 'bc_cycle', title: 'Check cycle count vs. design capacity', description: 'Mobile >500 cycles = replace. Laptop >300 cycles or <80% health = replace.', type: 'action', completed: false },
          { id: 'bc_swell', title: '⚠ Inspect for physical swelling — STOP if found', description: 'Bulging back (mobile) or raised trackpad (laptop) = fire hazard. Do not charge.', type: 'action', completed: false },
          { id: 'bc_heat', title: 'Note if battery gets unusually warm at idle', description: 'Warm during standby or light use = cell failure even if capacity looks normal.', type: 'action', completed: false },
        ],
      },
      {
        id: 'screen_check',
        icon: '🖥️',
        title: 'Screen Inspection',
        description: 'Diagnose the display before deciding if replacement is needed.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'HP DIY Screen Repair Guide',
        refUrl: 'https://www.hp.com/us-en/shop/tech-takes/diy-laptop-screen-repair',
        subItems: [
          { id: 'sc_pixel', title: 'Run a dead-pixel / stuck-pixel test', description: 'Visit jscreenfix.com — cycles through colors to reveal stuck pixels.', type: 'action', completed: false },
          { id: 'sc_back', title: 'Test for backlight failure with a flashlight', description: 'Shine torch at screen in dark room. Faint image = backlight failed, not panel.', type: 'action', completed: false },
          { id: 'sc_touch', title: 'Mobile: Test touch responsiveness in all zones', description: 'Samsung: *#*#2664#*#*. Other Android: free touch test app on Play Store.', type: 'action', completed: false },
          { id: 'sc_crack', title: 'Assess physical crack depth', description: 'Surface crack: functional. Ink bleeding or black patches: panel needs replacement.', type: 'info', completed: false },
        ],
      },
      {
        id: 'charging_port_check',
        icon: '🔌',
        title: 'Charging Port Test',
        description: 'A dirty or loose port often mimics a dead battery — diagnose before replacing parts.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'iFixit Charging Troubleshooting',
        refUrl: 'https://www.ifixit.com/Troubleshooting/Phone',
        subItems: [
          { id: 'cp_clean', title: 'Clean port with dry toothpick and compressed air', description: 'Lint compaction is the #1 cause of charging failures. Free fix, 5 minutes.', type: 'action', completed: false },
          { id: 'cp_cable', title: 'Test with a different cable AND a different charger', description: 'Cables fail more often than ports. Try at least 2 different cables.', type: 'action', completed: false },
          { id: 'cp_meter', title: 'Use a USB-C meter to verify actual delivered wattage', description: 'PortaPow or WITRN meter (~₱500 on Shopee). Compares delivered watts to rated output.', type: 'action', completed: false },
          { id: 'cp_pins', title: 'Inspect port for bent pins or corrosion with flashlight', description: 'Green residue = liquid corrosion. Bent pins = port replacement needed.', type: 'action', completed: false },
        ],
      },
      {
        id: 'overheating_check',
        icon: '🌡️',
        title: 'Overheating Diagnosis',
        description: 'For laptops: thermal issues are usually just dust. Check before assuming hardware failure.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'iFixit: Laptop Overheating',
        refUrl: 'https://www.ifixit.com/Troubleshooting/Acer_Laptop/Overheating/614752',
        subItems: [
          { id: 'ot_temp', title: 'Check CPU/GPU temperatures under load', description: 'Windows: HWMonitor (free). macOS: iStat Menus. Safe: <85°C. Throttle: >95°C.', type: 'action', completed: false },
          { id: 'ot_clean', title: 'Clean vents with compressed air (no disassembly)', description: 'Short bursts from 10–15cm into exhaust vents. Expect a 10–20°C improvement.', type: 'action', completed: false },
          { id: 'ot_pad', title: 'Use a laptop cooling pad', description: 'Immediate fix for airflow issues. Search "laptop cooling pad" on Shopee, ~₱350–900.', type: 'action', completed: false },
          { id: 'ot_paste', title: 'Thermal paste reapplication (shop, or DIY with tools)', description: 'Most effective fix for persistent overheating. Requires full disassembly.', type: 'action', completed: false },
        ],
      },
      {
        id: 'software_fix',
        icon: '⚙️',
        title: 'Software Issue Fix',
        description: 'Software problems are fully DIY-safe — try these before any hardware intervention.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'iFixit: After-repair troubleshooting',
        refUrl: 'https://www.ifixit.com/Wiki/Troubleshooting_Problems_After_a_Repair',
        subItems: [
          { id: 'sw_update2', title: 'Install all pending OS and app updates', description: 'Most charging, performance, and display bugs are patched in updates.', type: 'download', completed: false },
          { id: 'sw_malware', title: 'Run a malware scan (Malwarebytes free)', description: 'Malware causes battery drain, overheating, and random shutdowns.', type: 'action', completed: false },
          { id: 'sw_reset', title: 'Last resort: Factory Reset (data must be backed up first)', description: 'Resolves 90% of software issues. Only after backup from Phase 1 is confirmed.', type: 'action', completed: false },
        ],
      },
      {
        id: 'liquid_damage_first_aid',
        icon: '💧',
        title: 'Liquid Damage First Aid',
        description: 'Time-critical — every minute the device stays wet worsens corrosion damage.',
        type: 'action',
        diy: 'caution',
        completed: false,
        refLabel: 'iFixit iPhone Liquid Damage Repair',
        refUrl: 'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',
        subItems: [
          { id: 'ld_off', title: '⚠ Power off immediately — do NOT charge', description: 'Charging a wet device short-circuits the board. Even if it looks fine — power off now.', type: 'action', completed: false },
          { id: 'ld_remove', title: 'Remove SIM, SD card, case, and back cover', description: 'Maximize airflow. Remove all accessories and films.', type: 'action', completed: false },
          { id: 'ld_dry', title: 'Use silica gel for 24–48 hours — NOT rice', description: 'iFixit official: rice is ineffective. Silica gel packets from shoe boxes work properly.', type: 'action', completed: false },
          { id: 'ld_shop', title: 'Take to shop after drying for board cleaning', description: 'Professional cleaning with 99% isopropyl alcohol is almost always required.', type: 'referral', completed: false },
        ],
      },
      {
        id: 'motherboard_check',
        icon: '⚡',
        title: 'No Power / Motherboard',
        description: 'If the device shows no life at all — this is the most complex scenario.',
        type: 'action',
        diy: 'shop',
        completed: false,
        refLabel: 'iFixit: PC Laptop Repair',
        refUrl: 'https://www.ifixit.com/Device/PC_Laptop',
        subItems: [
          { id: 'mb_drain', title: 'Hard reset: hold power 30 seconds to drain capacitors', description: 'Restores boot on many Lenovo, HP, Dell laptops that appear dead.', type: 'action', completed: false },
          { id: 'mb_led', title: 'Check if any LED or charging indicator responds', description: 'Any LED response = board has partial power. Not fully dead.', type: 'info', completed: false },
          { id: 'mb_shop', title: '→ Escalate to certified shop for board-level diagnosis', description: 'Motherboard repair requires microsoldering. Shop only.', type: 'referral', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 3 — DIY or Shop?',
    steps: [
      {
        id: 'diy_feasibility',
        icon: '🔧',
        title: 'DIY Feasibility Check',
        description: "Use iFixit's repairability score and your tools/skills to decide the right path.",
        type: 'info',
        diy: 'info',
        completed: false,
        refLabel: 'iFixit Repairability Scores',
        refUrl: 'https://www.ifixit.com/repairability',
        subItems: [
          { id: 'df_score', title: "Look up your device's iFixit repairability score", description: 'ifixit.com/repairability — score ≥7 = DIY-friendly. Score ≤4 = shop recommended.', type: 'info', completed: false },
          { id: 'df_tools', title: 'Check if you have the right tools', description: 'iFixit Essential Toolkit covers 95% of phone/laptop repairs. Available on Shopee PH ~₱250–600.', type: 'action', completed: false },
          { id: 'df_decide', title: 'Decision guide: match your issue type to approach', description: 'DIY-safe: software, SSD/RAM upgrade. Shop: screen, battery (glued), motherboard.', type: 'info', completed: false },
        ],
      },
      {
        id: 'battery_diy_replace',
        icon: '⚠️',
        title: 'Battery Self-Replacement',
        description: 'Only attempt on devices with iFixit score ≥7. Screwed batteries only — never glued.',
        type: 'action',
        diy: 'caution',
        completed: false,
        unsafeDiy: true,
        refLabel: 'iFixit Battery Replacement Guides',
        refUrl: 'https://www.ifixit.com/Device/Phone',
        subItems: [],
      },
    ],
  },
  {
    phase: 'Phase 4 — Get It Fixed',
    steps: [
      {
        id: 'find_repair_shop',
        icon: '🏪',
        title: 'Find a Certified Repair Shop',
        description: 'Use Connect to locate verified shops. Authorized centers use genuine parts and honor warranty.',
        type: 'referral',
        diy: 'shop',
        completed: false,
        isConnect: true,
        connectFilter: 'repair',
        refLabel: 'iFixit: Choosing a Repair Shop',
        refUrl: 'https://www.ifixit.com/Wiki/Choose_a_Phone_Repair_Shop',
        subItems: [
          { id: 'rs_auth', title: 'Prefer authorized service centers for warranty work', description: 'Apple AASP · Samsung Service Center · Lenovo ASC · HP Care Center', type: 'referral', completed: false },
          { id: 'rs_quote', title: 'Always get a written repair quote before leaving device', description: 'Quote: parts cost + labor cost + turnaround. Do not leave device without written quote.', type: 'action', completed: false },
          { id: 'rs_warranty', title: 'Ask about the repair warranty period', description: 'Standard: 30–90 days on parts and labor. Get it in writing.', type: 'info', completed: false },
          { id: 'rs_receipt', title: 'Keep all receipts and documentation', description: 'Needed for warranty claims and insurance. Photograph and store digitally.', type: 'action', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 5 — After Repair',
    steps: [
      {
        id: 'verify_repair',
        icon: '✅',
        title: 'Verify the Repair',
        description: 'Test everything before you leave the shop — issues found later are harder to claim.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'iFixit: Troubleshooting after repair',
        refUrl: 'https://www.ifixit.com/Wiki/Troubleshooting_Problems_After_a_Repair',
        subItems: [
          { id: 'vr_test', title: 'Test the repaired component at the shop', description: 'Screen: all touch zones + dead pixels. Battery: health %. Port: test charging.', type: 'action', completed: false },
          { id: 'vr_48h', title: 'Recheck after 48 hours of normal use', description: 'Some issues only appear under real-world conditions, not quick bench tests.', type: 'action', completed: false },
          { id: 'vr_recur', title: 'Issue recurs in warranty period? Return to shop immediately', description: 'Bring your receipt. A quality shop honors the repair warranty without question.', type: 'referral', completed: false },
        ],
      },
    ],
  },
]

// ── RECYCLE TREE ─────────────────────────────────────────────────
export const RECYCLE_PHASES: RoadmapPhase[] = [
  {
    phase: 'Phase 1 — Save What You Can',
    steps: [
      {
        id: 'backup_data',
        icon: '💾',
        title: 'Final Data Backup',
        description: 'One last backup before permanently wiping. This cannot be undone.',
        type: 'action',
        diy: 'safe',
        completed: false,
        recommended: true,
        refLabel: 'iFixit Community Repair Checklist',
        refUrl: 'https://www.ifixit.com/Wiki/Community_Repair_Checklist',
        subItems: [
          { id: 'rbu_photos', title: 'Transfer all photos and videos', description: 'Google Photos (Android) or iCloud (iOS). Or USB transfer to PC.', type: 'action', completed: false },
          { id: 'rbu_contacts', title: 'Export contacts, calendar, and notes', description: 'Android: Google Contacts sync. iOS: iCloud sync. Export .vcf file as backup.', type: 'action', completed: false },
          { id: 'rbu_apps', title: 'Export: WhatsApp, banking apps, Google Authenticator', description: 'WhatsApp: Settings → Chats → Backup. Authenticator: Transfer accounts.', type: 'download', completed: false },
          { id: 'rbu_laptop', title: 'Laptop: Back up documents, downloads, browser data', description: 'Copy Desktop, Documents, Downloads to external drive. Export browser bookmarks.', type: 'action', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 2 — Wipe Your Data (Mandatory)',
    steps: [
      {
        id: 'wipe_data',
        icon: '🔐',
        title: 'Sign Out of All Accounts',
        description: 'Remove your identity from the device. Required by Data Privacy Act R.A. 10173.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'Data Privacy Act R.A. 10173 PH',
        refUrl: 'https://www.privacy.gov.ph/data-privacy-act/',
        subItems: [
          { id: 'wd_google', title: 'Android: Remove Google Account and disable Find My Device', description: 'Settings → Accounts → Google → Remove. Also disable Find My Device.', type: 'action', completed: false },
          { id: 'wd_apple', title: 'iOS: Sign out of Apple ID — this removes Activation Lock', description: 'Settings → [Your Name] → Sign Out. Critical: without this, no one can use the device.', type: 'action', completed: false },
          { id: 'wd_samsung', title: 'Samsung: Remove Samsung Account', description: 'Settings → Accounts and Backup → Manage Accounts → Samsung Account → Remove.', type: 'action', completed: false },
          { id: 'wd_laptop', title: 'Laptop: Deauthorize Microsoft/Apple ID and apps', description: 'iTunes: Account → Deauthorize. Settings → Accounts → Remove. Deactivate Office 365 license.', type: 'action', completed: false },
        ],
      },
      {
        id: 'factory_reset',
        icon: '🗑️',
        title: 'Full Factory Reset',
        description: 'Simple deletion is NOT enough — deleted files remain recoverable without a full wipe.',
        type: 'action',
        diy: 'safe',
        completed: false,
        refLabel: 'R.A. 10173 Data Privacy Act PH',
        refUrl: 'https://www.privacy.gov.ph/data-privacy-act/',
        subItems: [
          { id: 'fr_ios', title: 'iOS: Settings → General → Transfer or Reset → Erase All Content', description: 'Enter Apple ID password. Device returns to "Hello" setup screen.', type: 'action', completed: false },
          { id: 'fr_android', title: 'Android: Settings → General Management → Reset → Factory Data Reset', description: 'Path varies by brand. Wipes all apps, accounts, and personal files.', type: 'action', completed: false },
          { id: 'fr_windows', title: 'Windows: Settings → Recovery → Reset this PC → Remove Everything', description: "Choose \"Remove everything\" then \"Local reinstall\". Takes 30–60 minutes.", type: 'action', completed: false },
          { id: 'fr_macos', title: 'macOS: System Settings → General → Transfer or Reset → Erase All Content', description: 'Apple Silicon Macs (2020+).', type: 'action', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 3 — Prepare the Device',
    steps: [
      {
        id: 'remove_components',
        icon: '📦',
        title: 'Remove Physical Items',
        description: 'Take out anything that belongs to you before handing the device over.',
        type: 'action',
        diy: 'safe',
        completed: false,
        subItems: [
          { id: 'rc_sim', title: 'Eject SIM card', description: 'Insert SIM tool or paperclip into the tray pinhole.', type: 'action', completed: false },
          { id: 'rc_sd', title: 'Remove SD / microSD card', description: 'Your memory card may contain photos and data not covered by cloud backup.', type: 'action', completed: false },
          { id: 'rc_case', title: 'Remove case, screen protector, and accessories', description: 'The facility only needs the bare device.', type: 'action', completed: false },
          { id: 'rc_charger', title: 'Keep charger unless facility explicitly accepts it', description: 'Some facilities accept chargers and cables separately. Ask first.', type: 'info', completed: false },
        ],
      },
      {
        id: 'assess_trade_in',
        icon: '💱',
        title: 'Check Trade-In Programs First',
        description: 'If the device still powers on, you may get store credit instead of just recycling.',
        type: 'info',
        diy: 'info',
        completed: false,
        refLabel: 'Globe E-Waste Zero; Apple Trade In PH',
        refUrl: 'https://www.globe.com.ph/blog/electronic-waste-disposal',
        subItems: [
          { id: 'ti_apple', title: 'Apple Trade In (apple.com/ph/shop/trade-in)', description: 'Works for damaged devices too. Online estimate, then bring to Apple Store or AASP.', type: 'referral', completed: false },
          { id: 'ti_samsung', title: 'Samsung Trade-Up (samsung.com/ph)', description: 'Available at Samsung Experience Stores. Accepted for most Galaxy models.', type: 'referral', completed: false },
          { id: 'ti_lazada', title: 'Lazada / Shopee device trade-in partners', description: 'Search "trade-in" on either platform. Certified partners offer drop-off or pickup.', type: 'referral', completed: false },
          { id: 'ti_globe', title: 'Globe E-Waste Zero — drop off at any Globe Store', description: 'Free, nationwide, no receipt needed. Accepts phones, chargers, cables, earphones.', type: 'referral', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 4 — Responsible Disposal',
    steps: [
      {
        id: 'find_recycling_facility',
        icon: '♻️',
        title: 'Find a DENR-Accredited Facility',
        description: 'Use Connect to locate verified e-waste drop-off points near you.',
        type: 'referral',
        diy: 'info',
        completed: false,
        isConnect: true,
        connectFilter: 'recycling',
        refLabel: 'DENR-EMB: E-Waste Philippines',
        refUrl: 'https://emb.gov.ph/solid-waste-management/ewaste/',
        subItems: [
          { id: 'rf_denr', title: 'DENR-EMB-accredited TSD facilities', description: 'Treatment, Storage & Disposal facilities — legal standard under R.A. 9003.', type: 'info', completed: false },
          { id: 'rf_globe', title: 'Globe E-Waste Zero — any Globe Store branch', description: 'Free, nationwide. Accepts phones, chargers, cables, earphones, power banks.', type: 'referral', completed: false },
          { id: 'rf_brand', title: 'Manufacturer take-back programs', description: 'Apple Stores · Samsung Service Centers · HP Planet Partners · Lenovo PH take-back.', type: 'referral', completed: false },
          { id: 'rf_lgu', title: 'LGU e-waste drives (barangay / city)', description: 'Quarterly DENR-partnership events. Check your city/barangay Facebook page.', type: 'info', completed: false },
        ],
      },
    ],
  },
  {
    phase: 'Phase 5 — Confirm & Close',
    steps: [
      {
        id: 'get_disposal_cert',
        icon: '📄',
        title: 'Get a Drop-Off Receipt',
        description: 'Written confirmation of disposal protects you under R.A. 9003.',
        type: 'action',
        diy: 'info',
        completed: false,
        refLabel: 'DENR R.A. 9003',
        refUrl: 'https://emb.gov.ph/ra-9003/',
        subItems: [
          { id: 'dc_receipt', title: 'Request a signed drop-off receipt or acknowledgment slip', description: 'Date, device description, facility name, staff signature/stamp.', type: 'action', completed: false },
          { id: 'dc_cert', title: 'Accredited facilities issue Certificate of Data Destruction', description: 'Crown Workspace PH and others provide chain-of-custody documentation.', type: 'info', completed: false },
          { id: 'dc_law', title: 'Keep records for at least 1 year', description: 'Protects you under R.A. 10173 (Data Privacy Act) from data liability.', type: 'info', completed: false },
        ],
      },
    ],
  },
]

export function getRoadmapPhases(direction: 'REPAIR' | 'RECYCLE'): RoadmapPhase[] {
  // Deep clone so filter engine mutations don't persist across renders
  const source = direction === 'REPAIR' ? REPAIR_PHASES : RECYCLE_PHASES
  return JSON.parse(JSON.stringify(source)) as RoadmapPhase[]
}
