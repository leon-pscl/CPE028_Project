/**
 * roadmapData.ts — pure data, no logic.
 * Each sub-item now has a `platforms` array so the filter engine can hide
 * sub-steps that don't apply to the user's specific device.
 *
 * Platform tags:
 *  'all'     – always shown (default when omitted)
 *  'mobile'  – any phone
 *  'laptop'  – any laptop
 *  'ios'     – iPhone / iPad only
 *  'android' – any Android phone
 *  'samsung' – Samsung phones specifically
 *  'windows' – Windows laptops
 *  'macos'   – Mac laptops
 */
import type { RoadmapPhase } from '@/types'

export const REPAIR_PHASES: RoadmapPhase[] = [
  // ── Phase 1 ──────────────────────────────────────────────────
  {
    phase: 'Phase 1 — Before You Open Anything',
    steps: [
      {
        id: 'backup_data',
        icon: '💾',
        title: 'Back Up Your Data',
        description: 'Secure all personal files before any repair — data loss is irreversible.',
        type: 'action', diy: 'safe', completed: false, recommended: true,
        refLabel: 'iFixit Community Repair Checklist',
        refUrl: 'https://www.ifixit.com/Wiki/Community_Repair_Checklist',
        subItems: [
          { id: 'bu_cloud_mobile', title: 'Enable full cloud backup', description: 'Google One (Android) or iCloud (iOS) — photos, contacts, WhatsApp.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'bu_cloud_android', title: 'Android: Settings → Google → Backup → Back up now', description: 'Ensure photos, contacts, app data, and call history are all checked.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'bu_cloud_ios', title: 'iOS: Settings → [Name] → iCloud → iCloud Backup → Back Up Now', description: 'Wait for the backup to finish before proceeding. Check iCloud.com to confirm.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'bu_cloud_laptop', title: 'Back up laptop to external drive or cloud', description: 'Windows Backup / Time Machine; or Google Drive / OneDrive.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'bu_cloud_windows', title: 'Windows: Settings → Update & Security → Backup → Add a drive', description: 'Select your external drive and enable "Automatically back up my files".', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'bu_cloud_macos', title: 'macOS: System Settings → General → Time Machine → Add Backup Disk', description: 'Select your external drive and confirm. Time Machine backs up hourly.', type: 'action', completed: false, platforms: ['macos'] },
          { id: 'bu_apps', title: 'Export app-specific data (WhatsApp, 2FA, banking)', description: 'WhatsApp: Settings → Chats → Backup. Google Authenticator: Transfer accounts.', type: 'download', completed: false, platforms: ['mobile'] },
          { id: 'bu_apps_samsung', title: 'Samsung: Use Smart Switch to back up everything', description: 'Smart Switch (PC/Mac app) backs up apps, settings, and data in one go.', type: 'download', completed: false, platforms: ['samsung'] },
        ],
      },
      {
        id: 'check_warranty',
        icon: '🛡️',
        title: 'Check Warranty & Coverage',
        description: 'If under warranty, the manufacturer repairs for free or low cost.',
        type: 'info', diy: 'info', completed: false,
        refLabel: 'Apple Warranty Check',
        refUrl: 'https://checkcoverage.apple.com',
        subItems: [
          { id: 'wt_manuf', title: 'Check manufacturer warranty status', description: 'Check the respective support portal for your brand.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'wt_manuf_apple', title: 'Apple: checkcoverage.apple.com — enter your serial number', description: 'Serial number is in Settings → General → About. Standard warranty: 1 year.', type: 'info', completed: false, platforms: ['ios'] },
          { id: 'wt_manuf_samsung', title: 'Samsung: samsung.com/ph/support or call 1-800-10-726-7864', description: 'Standard warranty: 1 year parts and labor. Bring proof of purchase.', type: 'info', completed: false, platforms: ['samsung'] },
          { id: 'wt_manuf_laptop', title: 'Laptop: check manufacturer PH support portal', description: 'Lenovo: support.lenovo.com · HP: support.hp.com · ASUS: asus.com/ph/support', type: 'info', completed: false, platforms: ['laptop'] },
          { id: 'wt_retail', title: 'Check retailer extended warranty', description: 'SM Cyberzone, Beyond the Box, Villman, Abenson — check your receipt.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'wt_action', title: 'Under warranty? Go directly to an authorized service center', description: 'Bring device + proof of purchase + warranty card. Skip DIY steps entirely.', type: 'referral', completed: false, platforms: ['all'] },
        ],
      },
    ],
  },

  // ── Phase 2 ──────────────────────────────────────────────────
  {
    phase: 'Phase 2 — Diagnose the Issue',
    steps: [
      {
        id: 'software_diagnostics',
        icon: '🔍',
        title: 'Run Software Diagnostics',
        description: 'Many issues are software-level and fixable without opening the device.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'iFixit Troubleshooting Wiki',
        refUrl: 'https://www.ifixit.com/Wiki/Troubleshoot',
        subItems: [
          { id: 'sd_restart', title: 'Force restart the device first', description: 'Resolves freezes, slowdowns, and minor glitches without data loss.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'sd_restart_iphone', title: 'iPhone: Volume Up → Volume Down → hold Side button until Apple logo', description: 'Works on iPhone 8 and later. Releases stuck processes without erasing data.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'sd_restart_samsung', title: 'Samsung: hold Power + Volume Down for 7–10 seconds', description: 'Until the Samsung logo appears. Safe for all Galaxy models.', type: 'action', completed: false, platforms: ['samsung'] },
          { id: 'sd_restart_android', title: 'Android: hold Power button for 10 seconds', description: 'Most non-Samsung Android phones. Release when the manufacturer logo appears.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'sd_restart_laptop', title: 'Laptop: hold Power button for 10 seconds to force off, then restart', description: 'Ensures a clean boot. Wait 30 seconds before pressing power again.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'sw_update', title: 'Check for OS and app updates', description: 'Outdated software causes many charging, display, and audio issues.', type: 'download', completed: false, platforms: ['all'] },
          { id: 'sw_update_android', title: 'Android: Settings → Software Update → Check for updates', description: 'Also: Play Store → Manage apps → Update all.', type: 'download', completed: false, platforms: ['android'] },
          { id: 'sw_update_ios', title: 'iOS: Settings → General → Software Update', description: 'Install any available update. Restart after installing.', type: 'download', completed: false, platforms: ['ios'] },
          { id: 'sw_update_windows', title: 'Windows: Settings → Windows Update → Check for updates', description: 'Also update drivers via Device Manager → right-click → Update driver.', type: 'download', completed: false, platforms: ['windows'] },
          { id: 'sw_update_macos', title: 'macOS: System Settings → General → Software Update', description: 'Also update apps via App Store → Updates tab.', type: 'download', completed: false, platforms: ['macos'] },
          { id: 'sd_bat_mob', title: 'Check battery health', description: 'Check your battery capacity before assuming hardware failure.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'sd_bat_ios', title: 'iOS: Settings → Battery → Battery Health & Charging', description: 'Below 80% capacity = eligible for battery service under Apple policy.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'sd_bat_samsung', title: 'Samsung: dial *#0228# to see battery voltage and temperature', description: 'Tap "Quick Start" — shows real-time voltage, temperature, and capacity.', type: 'action', completed: false, platforms: ['samsung'] },
          { id: 'sd_bat_android', title: 'Android: download AccuBattery (free on Play Store)', description: 'Use the Health tab after a few charge cycles for accurate wear percentage.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'sd_bat_lap', title: 'Laptop: run a battery health report', description: 'Check your battery capacity vs its original design capacity.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'sd_bat_windows', title: 'Windows: open CMD → type: powercfg /batteryreport → open the HTML file', description: 'Look for "Full Charge Capacity" vs "Design Capacity". Below 80% = replace.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'sd_bat_macos', title: 'macOS: hold Option → click Battery icon → check "Condition"', description: 'Or download coconutBattery (free) for cycle count and full health stats.', type: 'action', completed: false, platforms: ['macos'] },
          { id: 'sd_storage', title: 'Check storage health', description: 'Failing storage causes slowness, crashes, and data loss.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'sd_storage_windows', title: 'Windows: download CrystalDiskInfo (free) — blue = Good, red = Bad', description: 'Check "Reallocated Sectors" — any value above 0 is a warning sign.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'sd_storage_macos', title: 'macOS: Disk Utility → select drive → First Aid → Run', description: 'Checks and repairs minor file system errors. Safe to run on any Mac.', type: 'action', completed: false, platforms: ['macos'] },
        ],
      },
      {
        id: 'battery_check',
        icon: '🔋',
        title: 'Battery Health Check',
        description: 'Battery is the most common failure point — inspect before replacing anything else.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'iFixit Battery Repairability',
        refUrl: 'https://www.ifixit.com/repairability',
        subItems: [
          { id: 'bc_cycle', title: 'Check cycle count vs. design capacity', description: 'Mobile >500 cycles = replace. Laptop >300 cycles or <80% health = replace.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'bc_cycle_ios', title: 'iOS 17+: Settings → Battery → Battery Health & Charging → Battery Health', description: 'Shows exact cycle count and maximum capacity percentage.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'bc_cycle_android', title: 'Android: AccuBattery app → Health tab', description: 'Shows charge cycles, estimated wear, and current capacity.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'bc_cycle_windows', title: 'Windows: powercfg /batteryreport — check "Cycle Count" in the HTML report', description: 'Open the report from your user folder (usually C:\\Users\\YourName\\).', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'bc_cycle_macos', title: 'macOS Terminal: system_profiler SPPowerDataType | grep "Cycle Count"', description: 'Or use coconutBattery (free app) for a visual display with age and health.', type: 'action', completed: false, platforms: ['macos'] },
          { id: 'bc_swell', title: '⚠ Inspect for physical swelling — STOP immediately if found', description: 'Bulging back panel (mobile) or raised trackpad (laptop) = fire hazard.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'bc_swell_mobile', title: 'Mobile: press lightly on the center of the back panel', description: 'If it flexes, feels raised, or the screen is being pushed out — battery is swelling.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'bc_swell_laptop', title: 'Laptop: check if trackpad is raised or bottom panel bows outward', description: 'A swollen laptop battery lifts the trackpad making it unclickable.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'bc_heat', title: 'Note if battery gets unusually warm at idle', description: 'Warm during standby or light use = cell failure even if capacity looks normal.', type: 'action', completed: false, platforms: ['all'] },
        ],
      },
      {
        id: 'screen_check',
        icon: '🖥️',
        title: 'Screen Inspection',
        description: 'Diagnose the display before deciding if replacement is needed.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'HP DIY Screen Repair Guide',
        refUrl: 'https://www.hp.com/us-en/shop/tech-takes/diy-laptop-screen-repair',
        subItems: [
          { id: 'sc_pixel', title: 'Run a dead-pixel / stuck-pixel test', description: 'Visit jscreenfix.com — cycles through colors to reveal stuck pixels.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'sc_back', title: 'Test for backlight failure with a flashlight', description: 'Shine torch at screen in dark room. Faint image = backlight failed, not panel.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'sc_touch', title: 'Test touch responsiveness in all zones', description: 'Tap every corner and edge — digitizer damage is often localised.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'sc_touch_samsung', title: 'Samsung: dial *#*#2664#*#* for the built-in touch test', description: 'Opens Samsung\'s native touch diagnostic tool. Drag across all zones.', type: 'action', completed: false, platforms: ['samsung'] },
          { id: 'sc_touch_android', title: 'Android: search "touch screen test" on the Play Store (free)', description: 'Shows which zones respond and which don\'t. Test all corners carefully.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'sc_touch_ios', title: 'iOS: test multi-touch with multiple simultaneous finger touches', description: 'Tap all four corners and swipe across all edges.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'sc_crack', title: 'Assess physical crack depth', description: 'Surface crack: functional. Ink bleeding or black patches: panel needs replacement.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'sc_external', title: 'Connect to an external monitor to isolate the issue', description: 'If external display works fine, the issue is the panel or cable, not the GPU.', type: 'action', completed: false, platforms: ['laptop'] },
        ],
      },
      {
        id: 'charging_port_check',
        icon: '🔌',
        title: 'Charging Port Test',
        description: 'A dirty or loose port often mimics a dead battery — diagnose before replacing parts.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'iFixit Charging Troubleshooting',
        refUrl: 'https://www.ifixit.com/Troubleshooting/Phone',
        subItems: [
          { id: 'cp_clean', title: 'Clean port with a dry wooden toothpick and compressed air', description: 'Lint compaction is the #1 cause of charging failures. Free fix, 5 minutes.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'cp_cable', title: 'Test with a different cable AND a different charger', description: 'Cables fail more often than ports. Try at least 2 different cables.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'cp_meter', title: 'Use a USB-C meter to verify actual delivered wattage', description: 'PortaPow or WITRN meter (~₱500 on Shopee). Compares delivered watts to rated output.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'cp_pins', title: 'Inspect port for bent pins or corrosion with a flashlight', description: 'Green residue = liquid corrosion. Bent pins = port replacement needed.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'cp_pins_ios', title: 'iPhone 12+: charging port is on the logic board — shop only', description: 'Port repair requires microsoldering. Do not attempt DIY.', type: 'info', completed: false, platforms: ['ios'] },
          { id: 'cp_magsafe', title: 'MacBook: check MagSafe / USB-C port for debris and try a different cable', description: 'Apple USB-C cables fail commonly. Try a certified third-party USB-C cable.', type: 'action', completed: false, platforms: ['macos'] },
        ],
      },
      {
        id: 'overheating_check',
        icon: '🌡️',
        title: 'Overheating Diagnosis',
        description: 'Thermal issues are usually just dust buildup — check before assuming hardware failure.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'iFixit: Laptop Overheating',
        refUrl: 'https://www.ifixit.com/Troubleshooting/Acer_Laptop/Overheating/614752',
        subItems: [
          { id: 'ot_temp', title: 'Monitor CPU/GPU temperatures under load', description: 'Check whether temps exceed the thermal throttle threshold.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'ot_temp_windows', title: 'Windows: download HWMonitor (free) — safe: ≤85°C, throttle: ≥95°C', description: 'Look for "Package" or "Core #0" under your CPU section.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'ot_temp_macos', title: 'macOS: use the free Stats app or iStat Menus to check CPU/GPU temp', description: 'CPU die temp above 90°C under normal use = thermal issue.', type: 'action', completed: false, platforms: ['macos'] },
          { id: 'ot_temp_mobile', title: 'Mobile: AccuBattery → Real-time tab shows battery temperature', description: 'Above 40°C at idle = abnormal. Check for background apps consuming CPU.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'ot_clean', title: 'Clean vents with compressed air (no disassembly needed)', description: 'Short bursts from 10–15 cm into exhaust vents. Expect a 10–20°C improvement.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'ot_pad', title: 'Use a laptop cooling pad (~₱350–900 on Shopee)', description: 'Immediate fix for airflow issues. Improves temps by 5–15°C.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'ot_paste', title: 'Thermal paste reapplication (shop, or advanced DIY)', description: 'Most effective fix for persistent overheating. Requires full disassembly.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'ot_mobile_apps', title: 'Mobile: check for runaway background apps', description: 'Settings → Battery → Battery Usage — identify apps using high CPU in background.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'ot_mobile_apps_ios', title: 'iOS: Settings → Privacy → Analytics & Improvements → check logs', description: 'Frequent crash logs for one app = that app is causing overheating.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'ot_mobile_apps_android', title: 'Android: Settings → Device care / Battery → check high usage apps', description: 'Samsung: Device Care → Battery. Other Android: Settings → Battery → Usage.', type: 'action', completed: false, platforms: ['android'] },
        ],
      },
      {
        id: 'software_fix',
        icon: '⚙️',
        title: 'Software Issue Fix',
        description: 'Software problems are fully DIY-safe — try these before any hardware work.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'iFixit: After-repair troubleshooting',
        refUrl: 'https://www.ifixit.com/Wiki/Troubleshooting_Problems_After_a_Repair',
        subItems: [
          { id: 'sw_update2', title: 'Install all pending OS and app updates', description: 'Most charging, performance, and display bugs are patched in updates.', type: 'download', completed: false, platforms: ['all'] },
          { id: 'sw_malware', title: 'Run a malware scan (Malwarebytes free)', description: 'Malware causes battery drain, overheating, and random shutdowns.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'sw_malware_windows', title: 'Windows: Malwarebytes Free — download from malwarebytes.com', description: 'Run a full scan. Remove all flagged items. Restart afterward.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'sw_malware_android', title: 'Android: Settings → Security → Google Play Protect → Scan', description: 'Google Play Protect scans all installed apps automatically.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'sw_malware_ios', title: 'iOS: Settings → General → VPN & Device Management — check for rogue profiles', description: 'iOS is sandboxed — traditional malware is rare. Rogue profiles are the main risk.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'sw_reset', title: 'Last resort: Factory Reset (data must be backed up first)', description: 'Resolves 90% of software issues. Only after Phase 1 backup is confirmed.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'sw_reset_android', title: 'Android: Settings → General Management → Reset → Factory Data Reset', description: 'Path may vary: Samsung uses General Management, others use System → Reset.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'sw_reset_ios', title: 'iOS: Settings → General → Transfer or Reset iPhone → Erase All Content', description: 'Enter Apple ID password. Device returns to the "Hello" setup screen.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'sw_reset_windows', title: 'Windows: Settings → System → Recovery → Reset this PC → Remove everything', description: 'Choose "Local reinstall". Takes 30–60 minutes. Updates to latest Windows.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'sw_reset_macos', title: 'macOS (Apple Silicon): System Settings → General → Transfer or Reset → Erase All', description: 'Intel Macs: restart holding Cmd+R → Recovery Mode → Disk Utility → Erase.', type: 'action', completed: false, platforms: ['macos'] },
        ],
      },
      {
        id: 'liquid_damage_first_aid',
        icon: '💧',
        title: 'Liquid Damage First Aid',
        description: 'Time-critical — every minute the device stays wet worsens corrosion damage.',
        type: 'action', diy: 'caution', completed: false,
        refLabel: 'iFixit iPhone Liquid Damage Repair',
        refUrl: 'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',
        subItems: [
          { id: 'ld_off', title: '⚠ Power off immediately — do NOT charge', description: 'Charging a wet device short-circuits the board. Power off now, even if it seems fine.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'ld_off_samsung', title: 'Samsung: hold Power + Volume Down for 7 seconds to force off', description: 'Do not use the touchscreen if it is behaving erratically.', type: 'action', completed: false, platforms: ['samsung'] },
          { id: 'ld_remove', title: 'Remove SIM card, SD card, case, and all accessories', description: 'Maximize airflow paths. Remove everything that comes off easily.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'ld_remove_laptop', title: 'Laptop: disconnect charger immediately — do NOT reconnect', description: 'If battery is removable, remove it. Pat dry with a lint-free cloth.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'ld_dry', title: 'Dry with silica gel for 24–48 hours — NOT rice', description: 'iFixit: rice is ineffective. Silica gel packets (from shoe boxes) work properly.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'ld_shop', title: 'Take to shop after drying for board cleaning', description: 'Professional cleaning with 99% isopropyl alcohol is almost always required.', type: 'referral', completed: false, platforms: ['all'] },
        ],
      },
      {
        id: 'motherboard_check',
        icon: '⚡',
        title: 'No Power / Motherboard',
        description: 'If the device shows no life at all — this is the most complex scenario.',
        type: 'action', diy: 'shop', completed: false,
        refLabel: 'iFixit: PC Laptop Repair',
        refUrl: 'https://www.ifixit.com/Device/PC_Laptop',
        subItems: [
          { id: 'mb_drain', title: 'Hard reset: hold power button for 30 seconds to drain capacitors', description: 'Restores boot on many Lenovo, HP, Dell laptops that appear completely dead.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'mb_drain_mobile', title: 'Mobile: hold power for 30 seconds, then try charging for 15 minutes first', description: 'A completely flat battery may need a few minutes of charge before it boots.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'mb_led', title: 'Check if any LED or charging indicator responds', description: 'Any LED response = board has partial power. Not fully dead.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'mb_shop', title: '→ Escalate to certified shop for board-level diagnosis', description: 'Motherboard repair requires microsoldering. This is shop-only.', type: 'referral', completed: false, platforms: ['all'] },
        ],
      },
    ],
  },

  // ── Phase 3 ──────────────────────────────────────────────────
  {
    phase: 'Phase 3 — DIY or Shop?',
    steps: [
      {
        id: 'diy_feasibility',
        icon: '🔧',
        title: 'DIY Feasibility Check',
        description: "Use iFixit's repairability score and your tools/skills to decide the right path.",
        type: 'info', diy: 'info', completed: false,
        refLabel: 'iFixit Repairability Scores',
        refUrl: 'https://www.ifixit.com/repairability',
        subItems: [
          { id: 'df_score', title: "Look up your device's iFixit repairability score", description: 'ifixit.com/repairability — score ≥7 = DIY-friendly. Score ≤4 = shop recommended.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'df_tools', title: 'Check if you have the right tools', description: 'iFixit Essential Toolkit covers 95% of phone/laptop repairs. ~₱250–600 on Shopee.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'df_decide', title: 'Decision guide: match your issue type to approach', description: 'DIY-safe: software, SSD/RAM upgrade. Shop: screen, glued battery, motherboard.', type: 'info', completed: false, platforms: ['all'] },
        ],
      },
      {
        id: 'battery_diy_replace',
        icon: '⚠️',
        title: 'Battery Self-Replacement',
        description: 'Only attempt on devices with iFixit score ≥7. Screwed batteries only — never glued.',
        type: 'action', diy: 'caution', completed: false, unsafeDiy: true,
        refLabel: 'iFixit Battery Replacement Guides',
        refUrl: 'https://www.ifixit.com/Device/Phone',
        subItems: [],
      },
    ],
  },

  // ── Phase 4 ──────────────────────────────────────────────────
  {
    phase: 'Phase 4 — Get It Fixed',
    steps: [
      {
        id: 'find_repair_shop',
        icon: '🏪',
        title: 'Find a Certified Repair Shop',
        description: 'Use Connect to locate verified shops. Authorized centers use genuine parts and honor warranty.',
        type: 'referral', diy: 'shop', completed: false,
        isConnect: true, connectFilter: 'repair',
        refLabel: 'iFixit: Choosing a Repair Shop',
        refUrl: 'https://www.ifixit.com/Wiki/Choose_a_Phone_Repair_Shop',
        subItems: [
          { id: 'rs_auth', title: 'Prefer authorized service centers for warranty work', description: 'Apple AASP · Samsung Service Center · Lenovo ASC · HP Care Center', type: 'referral', completed: false, platforms: ['all'] },
          { id: 'rs_auth_apple', title: 'Apple: find AASPs at locate.apple.com/ph', description: 'Includes iStudio, Beyond the Box, Switch, and standalone AASPs nationwide.', type: 'referral', completed: false, platforms: ['ios'] },
          { id: 'rs_auth_samsung', title: 'Samsung: samsung.com/ph/support/service-center — 300+ locations', description: 'Bring proof of purchase for warranty claims.', type: 'referral', completed: false, platforms: ['samsung'] },
          { id: 'rs_auth_laptop', title: 'Laptop: check brand support portal for PH service center locations', description: 'Lenovo: support.lenovo.com · HP: support.hp.com · ASUS: asus.com/ph/support', type: 'referral', completed: false, platforms: ['laptop'] },
          { id: 'rs_quote', title: 'Always get a written repair quote before leaving the device', description: 'Quote must include: parts cost + labor + estimated turnaround time.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'rs_warranty', title: 'Ask about the repair warranty period', description: 'Standard: 30–90 days on parts and labor. Get it in writing.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'rs_receipt', title: 'Keep all receipts and documentation', description: 'Needed for warranty claims and insurance. Photograph and store digitally.', type: 'action', completed: false, platforms: ['all'] },
        ],
      },
    ],
  },

  // ── Phase 5 ──────────────────────────────────────────────────
  {
    phase: 'Phase 5 — After Repair',
    steps: [
      {
        id: 'verify_repair',
        icon: '✅',
        title: 'Verify the Repair',
        description: 'Test everything before leaving the shop — issues found later are harder to claim.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'iFixit: Troubleshooting after repair',
        refUrl: 'https://www.ifixit.com/Wiki/Troubleshooting_Problems_After_a_Repair',
        subItems: [
          { id: 'vr_test', title: 'Test the repaired component at the shop', description: 'Screen: all touch zones + dead pixels. Battery: health %. Port: test charging.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'vr_test_screen', title: 'Screen: run jscreenfix.com and test touch in all corners', description: 'Do this before leaving the counter. Dead pixels and unresponsive zones must be claimed immediately.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'vr_test_battery', title: 'Battery: check health % in settings before leaving', description: 'iOS: Settings → Battery → Battery Health. Android: AccuBattery. Should be ≥95% for new battery.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'vr_test_battery_laptop', title: 'Laptop battery: run powercfg /batteryreport or coconutBattery', description: 'New battery should show Full Charge Capacity ≥95% of Design Capacity.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'vr_48h', title: 'Recheck after 48 hours of normal use', description: 'Some issues only appear under real-world conditions, not quick bench tests.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'vr_recur', title: 'Issue recurs in warranty period? Return to shop immediately', description: 'Bring your receipt. A quality shop honors the repair warranty without question.', type: 'referral', completed: false, platforms: ['all'] },
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
        type: 'action', diy: 'safe', completed: false, recommended: true,
        refLabel: 'iFixit Community Repair Checklist',
        refUrl: 'https://www.ifixit.com/Wiki/Community_Repair_Checklist',
        subItems: [
          { id: 'rbu_photos', title: 'Transfer all photos and videos', description: 'Confirm transfer is complete before wiping.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'rbu_photos_android', title: 'Android: Settings → Google → Backup, or copy DCIM folder via USB', description: 'Verify thumbnails appear in Google Photos before proceeding.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'rbu_photos_ios', title: 'iOS: Settings → [Name] → iCloud → Photos → iCloud Photos', description: 'Or transfer via USB using Finder (Mac) or Windows Explorer.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'rbu_contacts', title: 'Export contacts, calendar, and notes', description: 'Sync to Google/iCloud or export as .vcf file.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'rbu_contacts_android', title: 'Android: Contacts app → Export → save .vcf to external storage', description: 'Also ensure Google Contacts sync is enabled as a cloud backup.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'rbu_contacts_ios', title: 'iOS: iCloud Contacts sync is automatic — verify at iCloud.com', description: 'Go to iCloud.com/contacts to confirm your contacts are synced.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'rbu_apps', title: 'Export: WhatsApp, banking apps, Google Authenticator', description: 'WhatsApp: Settings → Chats → Backup. Authenticator: Transfer accounts.', type: 'download', completed: false, platforms: ['mobile'] },
          { id: 'rbu_laptop', title: 'Laptop: back up documents, downloads, browser data', description: 'Copy Desktop, Documents, Downloads to external drive. Export browser bookmarks.', type: 'action', completed: false, platforms: ['laptop'] },
          { id: 'rbu_laptop_windows', title: 'Windows: copy Desktop, Documents, Downloads to external drive', description: 'Also: Chrome/Edge → Bookmarks → Export. Save passwords to a password manager.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'rbu_laptop_macos', title: 'macOS: Time Machine backup, then copy key folders to external drive', description: 'Also export Safari bookmarks: File → Export Bookmarks.', type: 'action', completed: false, platforms: ['macos'] },
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
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'Data Privacy Act R.A. 10173 PH',
        refUrl: 'https://www.privacy.gov.ph/data-privacy-act/',
        subItems: [
          { id: 'wd_google', title: 'Remove Google Account and disable Find My Device', description: 'Settings → Accounts → Google → Remove. Also disable Find My Device.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'wd_apple', title: 'Sign out of Apple ID — this removes Activation Lock', description: 'Settings → [Your Name] → Sign Out. Without this, no one can use the device.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'wd_samsung', title: 'Remove Samsung Account', description: 'Settings → Accounts and Backup → Manage Accounts → Samsung Account → Remove.', type: 'action', completed: false, platforms: ['samsung'] },
          { id: 'wd_laptop_windows', title: 'Windows: Settings → Accounts → Sign out of Microsoft account', description: 'Also deactivate Office 365 license: Office app → Account → Deactivate.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'wd_laptop_macos', title: 'macOS: System Settings → [Apple ID] → Sign Out', description: 'Also deauthorize iTunes: Account → Authorizations → Deauthorize This Computer.', type: 'action', completed: false, platforms: ['macos'] },
        ],
      },
      {
        id: 'factory_reset',
        icon: '🗑️',
        title: 'Full Factory Reset',
        description: 'Simple deletion is NOT enough — deleted files remain recoverable without a full wipe.',
        type: 'action', diy: 'safe', completed: false,
        refLabel: 'R.A. 10173 Data Privacy Act PH',
        refUrl: 'https://www.privacy.gov.ph/data-privacy-act/',
        subItems: [
          { id: 'fr_ios', title: 'iOS: Settings → General → Transfer or Reset → Erase All Content', description: 'Enter Apple ID password. Device returns to "Hello" setup screen.', type: 'action', completed: false, platforms: ['ios'] },
          { id: 'fr_android', title: 'Android: Settings → General Management → Reset → Factory Data Reset', description: 'Path varies by brand. Wipes all apps, accounts, and personal files.', type: 'action', completed: false, platforms: ['android'] },
          { id: 'fr_samsung', title: 'Samsung: Settings → General Management → Reset → Factory Data Reset', description: 'Enter PIN when prompted. The process takes 5–10 minutes.', type: 'action', completed: false, platforms: ['samsung'] },
          { id: 'fr_windows', title: 'Windows: Settings → System → Recovery → Reset this PC → Remove Everything', description: 'Choose "Remove everything" then "Local reinstall". Takes 30–60 minutes.', type: 'action', completed: false, platforms: ['windows'] },
          { id: 'fr_macos', title: 'macOS: System Settings → General → Transfer or Reset → Erase All Content', description: 'Apple Silicon (2020+). Intel Macs: Cmd+R at startup → Recovery → Erase.', type: 'action', completed: false, platforms: ['macos'] },
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
        type: 'action', diy: 'safe', completed: false,
        subItems: [
          { id: 'rc_sim', title: 'Eject SIM card (insert SIM tool into the tray pinhole)', description: 'Keep the SIM — it\'s tied to your carrier account and your phone number.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'rc_sd', title: 'Remove SD / microSD card', description: 'Your memory card may contain photos and data not covered by cloud backup.', type: 'action', completed: false, platforms: ['mobile'] },
          { id: 'rc_case', title: 'Remove case, screen protector, and accessories', description: 'The facility only needs the bare device.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'rc_charger', title: 'Keep charger unless the facility explicitly accepts it', description: 'Ask first — some facilities accept cables and power adapters separately.', type: 'info', completed: false, platforms: ['all'] },
        ],
      },
      {
        id: 'assess_trade_in',
        icon: '💱',
        title: 'Check Trade-In Programs First',
        description: 'If the device still powers on, you may get store credit instead of just recycling.',
        type: 'info', diy: 'info', completed: false,
        refLabel: 'Globe E-Waste Zero; Apple Trade In PH',
        refUrl: 'https://www.globe.com.ph/blog/electronic-waste-disposal',
        subItems: [
          { id: 'ti_apple', title: 'Apple Trade In (apple.com/ph/shop/trade-in)', description: 'Works for damaged devices too. Get an estimate online, then visit Apple Store or AASP.', type: 'referral', completed: false, platforms: ['ios'] },
          { id: 'ti_samsung', title: 'Samsung Trade-Up (samsung.com/ph)', description: 'Available at Samsung Experience Stores. Accepted for most Galaxy models.', type: 'referral', completed: false, platforms: ['samsung'] },
          { id: 'ti_lazada', title: 'Lazada / Shopee device trade-in partners', description: 'Search "trade-in" on either platform. Certified partners offer drop-off or pickup.', type: 'referral', completed: false, platforms: ['all'] },
          { id: 'ti_globe', title: 'Globe E-Waste Zero — drop off at any Globe Store', description: 'Free, nationwide, no receipt needed. Accepts phones, chargers, cables, earphones.', type: 'referral', completed: false, platforms: ['all'] },
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
        type: 'referral', diy: 'info', completed: false,
        isConnect: true, connectFilter: 'recycling',
        refLabel: 'DENR-EMB: E-Waste Philippines',
        refUrl: 'https://emb.gov.ph/solid-waste-management/ewaste/',
        subItems: [
          { id: 'rf_denr', title: 'DENR-EMB-accredited TSD facilities', description: 'Treatment, Storage & Disposal — the legal standard for e-waste under R.A. 9003.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'rf_globe', title: 'Globe E-Waste Zero — any Globe Store branch', description: 'Free, nationwide. Accepts phones, chargers, cables, earphones, power banks.', type: 'referral', completed: false, platforms: ['all'] },
          { id: 'rf_brand', title: 'Manufacturer take-back programs', description: 'Apple Stores · Samsung Service Centers · HP Planet Partners · Lenovo PH take-back.', type: 'referral', completed: false, platforms: ['all'] },
          { id: 'rf_lgu', title: 'LGU e-waste drives (barangay / city)', description: 'Quarterly DENR-partnership events. Check your city/barangay Facebook page.', type: 'info', completed: false, platforms: ['all'] },
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
        type: 'action', diy: 'info', completed: false,
        refLabel: 'DENR R.A. 9003',
        refUrl: 'https://emb.gov.ph/ra-9003/',
        subItems: [
          { id: 'dc_receipt', title: 'Request a signed drop-off receipt or acknowledgment slip', description: 'Must include: date, device description, facility name, staff signature.', type: 'action', completed: false, platforms: ['all'] },
          { id: 'dc_cert', title: 'Accredited facilities issue a Certificate of Data Destruction', description: 'Crown Workspace PH and others provide chain-of-custody documentation.', type: 'info', completed: false, platforms: ['all'] },
          { id: 'dc_law', title: 'Keep records for at least 1 year', description: 'Protects you under R.A. 10173 (Data Privacy Act) from data liability.', type: 'info', completed: false, platforms: ['all'] },
        ],
      },
    ],
  },
]

export function getRoadmapPhases(direction: 'REPAIR' | 'RECYCLE'): RoadmapPhase[] {
  const source = direction === 'REPAIR' ? REPAIR_PHASES : RECYCLE_PHASES
  return JSON.parse(JSON.stringify(source)) as RoadmapPhase[]
}

export function getRoadmapSteps(direction: 'REPAIR' | 'RECYCLE') {
  return getRoadmapPhases(direction).flatMap(ph => ph.steps)
}