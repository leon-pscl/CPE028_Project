/**
 * NavigatePage.tsx
 * ─────────────────
 * Clean vertical accordion layout.
 * Sub-items are filtered by device class (iOS / Samsung / Android /
 * Windows / macOS) so only relevant steps are shown.
 * Detail slide-in panel with tools, parts, steps, refs.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle, MapPin, ArrowRight,
  AlertCircle, X, ShoppingCart, BookOpen,
  Wrench as WrenchIcon, Recycle,
} from 'lucide-react'
import { getRoadmapPhases } from './roadmapData'
import { buildFilterResult } from './roadmapFilter'
import type {
  RoadmapStep, RoadmapPhase, StepStatus, FilterResult,
  AssessmentResult, DeviceFormData, ReasoningChip,
} from '@/types'

// ================================================================
//  DETAIL DATABASE
// ================================================================
interface DTool   { name: string; icon: string; type?: 'essential'|'optional'|'caution' }
interface DPart   { name: string; icon: string; note: string; search?: string; brand?: string }
interface DStep   { text: string; warn?: boolean }
interface DRef    { icon: string; label: string; url: string; src: string }
interface DSafety { type: 'info'|'warn'|'danger'; msg: string }
interface Detail  {
  icon: string; title: string; note: string
  safety?: DSafety[]; tools?: DTool[]; parts?: DPart[]
  steps?: DStep[]; refs?: DRef[]
}

const DETAILS: Record<string, Detail> = {
  bu_cloud_mobile:{icon:'💾',title:'Enable Full Cloud Backup (Mobile)',note:'Back up all data before any physical repair.',safety:[{type:'info',msg:'Do this FIRST — data loss during repair is irreversible.'}],tools:[],parts:[],steps:[{text:'Android: Settings → Google → Backup → Back up now.'},{text:'iOS: Settings → [Your Name] → iCloud → iCloud Backup → Back Up Now.'},{text:'WhatsApp: Settings → Chats → Chat Backup → Back Up Now.'},{text:'Google Authenticator: three-dot menu → Transfer accounts → Export accounts.'}],refs:[{icon:'📘',label:'Google Backup Help',url:'https://support.google.com/android/answer/2819582',src:'Google Support'},{icon:'📘',label:'iCloud Backup Guide',url:'https://support.apple.com/en-us/108922',src:'Apple Support'}]},
  bu_cloud_android:{icon:'📱',title:'Android: Enable Google Backup',note:'Backs up contacts, apps, settings, photos to Google One.',tools:[],parts:[],steps:[{text:'Settings → Google → Backup → Back up now.'},{text:'Ensure Photos, Contacts, App data, and Call history are all checked.'},{text:'Verify at drive.google.com that your backup timestamp is recent.'}],refs:[{icon:'📘',label:'Google Backup Help',url:'https://support.google.com/android/answer/2819582',src:'Google Support'}]},
  bu_cloud_ios:{icon:'☁️',title:'iOS: iCloud Backup',note:'Backs up photos, messages, app data, health data to iCloud.',tools:[],parts:[],steps:[{text:'Settings → [Your Name] → iCloud → iCloud Backup → Back Up Now.'},{text:'Wait for the backup to finish. Check iCloud.com → Account → Storage to confirm.'},{text:'Ensure you have enough iCloud storage (free tier: 5 GB). Upgrade if needed.'}],refs:[{icon:'📘',label:'iCloud Backup Guide',url:'https://support.apple.com/en-us/108922',src:'Apple Support'}]},
  bu_cloud_laptop:{icon:'💾',title:'Back Up Laptop',note:'Full backup before any hardware work.',safety:[{type:'info',msg:'An external SSD/HDD is faster than cloud-only for large backups.'}],tools:[{name:'External HDD/SSD',icon:'💽',type:'essential'}],parts:[],steps:[{text:'Windows: Settings → Update & Security → Backup → Add a drive.'},{text:'macOS: System Settings → General → Time Machine → Add Backup Disk.'},{text:'Export browser bookmarks and passwords before wiping.'}],refs:[{icon:'📘',label:'Windows Backup',url:'https://support.microsoft.com/en-us/windows/back-up-your-windows-pc',src:'Microsoft'},{icon:'📘',label:'macOS Time Machine',url:'https://support.apple.com/en-us/104984',src:'Apple'}]},
  bu_apps:{icon:'📱',title:'Export App-Specific Data',note:'Standard cloud backup may miss some app data.',tools:[],parts:[],steps:[{text:'WhatsApp: Settings → Chats → Chat Backup → Back Up Now.'},{text:'Google Authenticator: Transfer accounts → Export accounts. Scan QR on new device.'},{text:'GCash / Maya: note your MPIN and linked mobile number.'},{text:'BDO, BPI, Metrobank: screenshot account numbers — re-enrollment after repair is standard.'}],refs:[{icon:'📘',label:'WhatsApp Backup',url:'https://faq.whatsapp.com/android/chats/how-to-back-up-to-google-drive',src:'WhatsApp FAQ'}]},
  bu_apps_samsung:{icon:'📲',title:'Samsung Smart Switch Backup',note:'Back up everything including apps and settings via Smart Switch.',tools:[{name:'Smart Switch (PC/Mac app)',icon:'💻',type:'essential'}],parts:[],steps:[{text:'Download Smart Switch from samsung.com/smartswitch on your PC or Mac.'},{text:'Connect your phone via USB-C cable.'},{text:'Click Backup — it backs up apps, contacts, messages, settings, and media.'},{text:'Smart Switch also transfers your backup to a new Samsung device.'}],refs:[{icon:'🌐',label:'Samsung Smart Switch',url:'https://www.samsung.com/ph/apps/smart-switch/',src:'Samsung PH'}]},
  wt_manuf:{icon:'🛡️',title:'Check Manufacturer Warranty',note:'If under warranty, repairs may be free.',tools:[],parts:[],steps:[{text:'Check the respective support portal for your brand.'},{text:'Standard warranty in PH: most brands offer 1 year parts and labor.'},{text:'If under warranty and damage is from normal use — submit warranty claim BEFORE any DIY attempt.'}],refs:[{icon:'🌐',label:'Samsung Warranty PH',url:'https://www.samsung.com/ph/support/',src:'Samsung PH'}]},
  wt_manuf_apple:{icon:'🍎',title:'Apple: Check Warranty Status',note:'Apple offers 1-year limited warranty and optional AppleCare+.',tools:[],parts:[],steps:[{text:'Go to checkcoverage.apple.com and enter your serial number.'},{text:'Serial number: Settings → General → About → Serial Number.'},{text:'Apple Authorized Service Providers (AASPs) in PH: iStudio, Beyond the Box, Switch.'},{text:'AppleCare+ extends warranty to 2 years and covers accidental damage.'}],refs:[{icon:'🌐',label:'Apple Warranty Check',url:'https://checkcoverage.apple.com',src:'Apple'},{icon:'🌐',label:'Apple AASP Locator PH',url:'https://locate.apple.com/ph/en',src:'Apple'}]},
  wt_manuf_samsung:{icon:'📱',title:'Samsung: Check Warranty Status',note:'Samsung standard warranty is 1 year in the Philippines.',tools:[],parts:[],steps:[{text:'Visit samsung.com/ph/support or call 1-800-10-726-7864 (toll-free).'},{text:'Bring: proof of purchase (receipt), the device, and the original box if available.'},{text:'Samsung Service Centers: 300+ locations nationwide. Find nearest at samsung.com/ph/support/service-center.'},{text:'Samsung Premium Care is available as an extended service plan.'}],refs:[{icon:'🌐',label:'Samsung Service Center PH',url:'https://www.samsung.com/ph/support/service-center/',src:'Samsung PH'}]},
  wt_manuf_laptop:{icon:'💻',title:'Laptop: Check Manufacturer Warranty',note:'Most laptops have 1-year warranty. Some brands offer 2 years.',tools:[],parts:[],steps:[{text:'Lenovo: support.lenovo.com → enter serial number from bottom label.'},{text:'HP: support.hp.com → Service Center Locator → Philippines.'},{text:'ASUS: asus.com/ph/support/Service-Center-Contents — 20+ locations in Metro Manila.'},{text:'Acer: acer.com/ph → Where to Buy & Service. Dell: dell.com/support.'},{text:'Serial number is on the bottom label or in Settings/System → About.'}],refs:[{icon:'🌐',label:'Lenovo Support PH',url:'https://support.lenovo.com',src:'Lenovo'},{icon:'🌐',label:'HP Support PH',url:'https://support.hp.com',src:'HP'}]},
  sd_restart:{icon:'🔄',title:'Force Restart the Device',note:'Clears temporary system states without erasing data.',tools:[],parts:[],steps:[{text:'This resolves most freezes and performance issues instantly.'},{text:'Does NOT erase any data or settings.'},{text:'If the device is unresponsive: use the force-restart method for your specific model.'}],refs:[]},
  sd_restart_iphone:{icon:'📱',title:'iPhone Force Restart',note:'Works on iPhone 8 and later.',tools:[],parts:[],steps:[{text:'Press and quickly release Volume Up.'},{text:'Press and quickly release Volume Down.'},{text:'Press and hold the Side (Power) button until the Apple logo appears.'},{text:'Release the button. The phone will restart normally.'}],refs:[{icon:'📘',label:'Apple: Restart iPhone',url:'https://support.apple.com/en-us/111358',src:'Apple Support'}]},
  sd_restart_samsung:{icon:'📱',title:'Samsung Galaxy Force Restart',note:'Works on all Galaxy models.',tools:[],parts:[],steps:[{text:'Hold Power + Volume Down simultaneously for 7–10 seconds.'},{text:'Release when the Samsung logo appears.'},{text:'If that doesn\'t work: hold Power for 10+ seconds.'}],refs:[{icon:'📘',label:'Samsung force restart',url:'https://www.samsung.com/us/support/answer/ANS00077958/',src:'Samsung Support'}]},
  sd_restart_android:{icon:'📱',title:'Android Force Restart',note:'For non-Samsung Android phones.',tools:[],parts:[],steps:[{text:'Hold the Power button for 10 seconds until the manufacturer logo appears.'},{text:'Some phones: hold Power + Volume Down for 10 seconds.'},{text:'If device has a physical reset pinhole: insert a paperclip briefly.'}],refs:[]},
  sd_restart_laptop:{icon:'💻',title:'Laptop Force Restart',note:'Clears any stuck processes or bad boot state.',tools:[],parts:[],steps:[{text:'Hold the Power button for 10 seconds until the laptop fully shuts off.'},{text:'Wait 30 seconds (lets capacitors discharge).'},{text:'Press Power to restart normally.'},{text:'If the laptop was on battery, try with the charger connected.'}],refs:[]},
  sd_bat_ios:{icon:'🔋',title:'iPhone: Check Battery Health',note:'Shows capacity and peak performance capability.',tools:[],parts:[],steps:[{text:'Settings → Battery → Battery Health & Charging.'},{text:'Below 80% capacity = eligible for battery service under Apple\'s policy.'},{text:'iOS 17+: tap "Battery Health" for cycle count information.'},{text:'"Service Recommended" or "Performance Management Applied" = replace soon.'}],refs:[{icon:'📘',label:'Apple Battery Health Docs',url:'https://support.apple.com/en-us/111878',src:'Apple Support'}]},
  sd_bat_samsung:{icon:'🔋',title:'Samsung: Check Battery Health',note:'Uses a built-in diagnostic code.',tools:[],parts:[],steps:[{text:'Open the Phone/Dialer app.'},{text:'Dial *#0228# — this opens the Battery Status screen.'},{text:'Shows: current voltage, temperature, and battery level.'},{text:'Also check: Settings → Device care → Battery for usage stats.'}],refs:[{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  sd_bat_android:{icon:'🔋',title:'Android: Check Battery Health',note:'Use AccuBattery for accurate wear percentage.',tools:[{name:'AccuBattery app (free)',icon:'📱',type:'essential'}],parts:[],steps:[{text:'Download AccuBattery from the Play Store (free).'},{text:'Use the device for a few full charge cycles to get accurate readings.'},{text:'Check the Health tab — shows wear percentage and estimated remaining capacity.'},{text:'Below 80% = replacement recommended.'}],refs:[{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  sd_bat_windows:{icon:'💻',title:'Windows: Battery Report',note:'Generates a detailed HTML report of battery health.',tools:[],parts:[],steps:[{text:'Press Win+R, type "cmd", press Enter.'},{text:'Type: powercfg /batteryreport and press Enter.'},{text:'Open the HTML file from your user folder (C:\\Users\\YourName\\battery-report.html).'},{text:'"Full Charge Capacity" below 80% of "Design Capacity" = replacement recommended.'}],refs:[{icon:'🌐',label:'Microsoft: powercfg',url:'https://support.microsoft.com/en-us/windows/battery-report-windows',src:'Microsoft'}]},
  sd_bat_macos:{icon:'💻',title:'macOS: Check Battery Health',note:'Hold Option key for quick status, or use coconutBattery.',tools:[],parts:[],steps:[{text:'Hold Option and click the Battery icon in the menu bar — shows "Condition".'},{text:'Conditions: Normal → Good. Service Recommended → replace soon. Replace Now → urgent.'},{text:'For detailed stats: download coconutBattery (free at coconut-flavour.com).'},{text:'coconutBattery shows: cycle count, age, full charge capacity, and temperature.'}],refs:[{icon:'🌐',label:'coconutBattery',url:'https://www.coconut-flavour.com/coconutbattery/',src:'coconut-flavour.com'}]},
  sd_storage_windows:{icon:'💾',title:'Windows: Check Storage Health',note:'CrystalDiskInfo reads SMART data from your drive.',tools:[{name:'CrystalDiskInfo (free)',icon:'💻',type:'essential'}],parts:[],steps:[{text:'Download CrystalDiskInfo from crystalmark.info (free, portable).'},{text:'Blue circle = Good. Yellow = Caution. Red = Bad.'},{text:'Check "Reallocated Sectors" — any value above 0 is a warning sign.'},{text:'Check "Uncorrectable Sectors" — above 0 = imminent failure likely.'}],refs:[{icon:'🌐',label:'CrystalDiskInfo',url:'https://crystalmark.info/en/software/crystaldiskinfo/',src:'CrystalMark'}]},
  sd_storage_macos:{icon:'💻',title:'macOS: Disk Utility First Aid',note:'Checks and repairs minor file system errors.',tools:[],parts:[],steps:[{text:'Open Finder → Applications → Utilities → Disk Utility.'},{text:'Select your startup disk from the left panel.'},{text:'Click "First Aid" → "Run". Enter password if prompted.'},{text:'If it reports errors it cannot fix: back up immediately and take to a shop.'}],refs:[{icon:'📘',label:'Apple: Disk Utility Help',url:'https://support.apple.com/en-us/guide/disk-utility/dskutl1010/mac',src:'Apple Support'}]},
  bc_cycle:{icon:'🔋',title:'Check Battery Cycle Count',note:'High cycles = degraded capacity.',tools:[],parts:[],steps:[{text:'Smartphones: replace after ~500 full cycles (typical 2–3 years).'},{text:'MacBooks: Apple specifies 1,000 cycles before capacity drops below 80%.'},{text:'Windows laptops: typically 300–500 cycles depending on brand.'}],refs:[{icon:'📘',label:'Apple: MacBook battery cycles',url:'https://support.apple.com/en-us/111902',src:'Apple Support'}]},
  bc_cycle_ios:{icon:'🔋',title:'iPhone: Cycle Count via Battery Health',note:'iOS 17+ shows cycle count in Battery Health.',tools:[],parts:[],steps:[{text:'Settings → Battery → Battery Health & Charging.'},{text:'iOS 17+: tap "Battery Health" for the detailed view including cycle count.'},{text:'Apple recommends replacement after the battery reaches 500 cycles or drops below 80%.'}],refs:[{icon:'📘',label:'Apple Battery Health',url:'https://support.apple.com/en-us/111878',src:'Apple Support'}]},
  bc_cycle_android:{icon:'🔋',title:'Android: Cycle Count via AccuBattery',note:'AccuBattery estimates cycle count from charge patterns.',tools:[{name:'AccuBattery (free)',icon:'📱',type:'essential'}],parts:[],steps:[{text:'Download AccuBattery from the Play Store.'},{text:'Health tab shows: charge cycles, estimated wear, and capacity.'},{text:'Allow a few full cycles for accuracy. The more cycles logged, the more accurate it is.'}],refs:[{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  bc_cycle_windows:{icon:'💻',title:'Windows: Cycle Count via Battery Report',note:'Built into Windows — no app needed.',tools:[],parts:[],steps:[{text:'Open CMD (Win+R → cmd).'},{text:'Type: powercfg /batteryreport and press Enter.'},{text:'Open the HTML report. Find "Installed Batteries" section for cycle count.'},{text:'Compare "Full Charge Capacity" to "Design Capacity" for health percentage.'}],refs:[{icon:'🌐',label:'Microsoft: powercfg',url:'https://support.microsoft.com/en-us/windows/battery-report-windows',src:'Microsoft'}]},
  bc_cycle_macos:{icon:'💻',title:'macOS: Cycle Count via coconutBattery',note:'Free app with full battery stats.',tools:[{name:'coconutBattery (free)',icon:'💻',type:'essential'}],parts:[],steps:[{text:'Download coconutBattery from coconut-flavour.com (free).'},{text:'Or in Terminal: system_profiler SPPowerDataType | grep "Cycle Count".'},{text:'Shows: cycle count, age, full charge capacity, temperature, and charge status.'}],refs:[{icon:'🌐',label:'coconutBattery',url:'https://www.coconut-flavour.com/coconutbattery/',src:'coconut-flavour.com'}]},
  bc_swell:{icon:'⚠️',title:'Inspect for Battery Swelling',note:'A swollen battery is a fire hazard — do NOT charge.',safety:[{type:'danger',msg:'STOP immediately if swelling is visible. Do NOT charge. Do NOT puncture. Take to a certified shop or e-waste facility within 24 hours.'}],tools:[],parts:[],steps:[{text:'Mobile: press lightly on center of back panel. If it flexes or raises — battery is swelling.'},{text:'Laptop: swollen battery pushes trackpad upward or bows the bottom panel outward.'},{text:'Store on a non-flammable surface away from combustibles until safely disposed of.'},{text:'Take to DENR-accredited e-waste facility or Samsung/Apple service center.',warn:true}],refs:[{icon:'📘',label:'iFixit: Swollen Battery Safety',url:'https://www.ifixit.com/Wiki/What_to_do_with_a_swollen_battery',src:'iFixit'},{icon:'📘',label:'Apple: Swollen battery',url:'https://support.apple.com/en-us/101592',src:'Apple Support'}]},
  bc_swell_mobile:{icon:'📱',title:'Mobile: Check for Swollen Battery',note:'The back panel or screen being pushed out is a sign of swelling.',tools:[],parts:[],steps:[{text:'Place the phone flat on a table and spin it gently. If it wobbles on the center = swelling.'},{text:'Press lightly on the center of the back panel. If it flexes outward = swelling.'},{text:'Check if the screen is lifted at the edges or if the frame is separating.'},{text:'Do NOT charge the device. Do NOT force the back panel off.'}],refs:[{icon:'📘',label:'iFixit: Swollen Battery',url:'https://www.ifixit.com/Wiki/What_to_do_with_a_swollen_battery',src:'iFixit'}]},
  bc_swell_laptop:{icon:'💻',title:'Laptop: Check for Swollen Battery',note:'Trackpad raised or bottom panel bowing = swollen battery.',tools:[],parts:[],steps:[{text:'Press the trackpad. If it feels raised or doesn\'t click = battery is pushing it up.'},{text:'Close the lid and look at the bottom panel. If it bows outward = swollen battery.'},{text:'Open the lid. If it won\'t close flat = battery is expanding.'},{text:'Disconnect the charger. Do NOT plug it in again until the battery is replaced.'}],refs:[{icon:'📘',label:'iFixit: Swollen Battery',url:'https://www.ifixit.com/Wiki/What_to_do_with_a_swollen_battery',src:'iFixit'}]},
  bc_heat:{icon:'🌡️',title:'Check for Abnormal Battery Heat',note:'Warmth during light use = cell degradation.',tools:[{name:'AccuBattery app (Android)',icon:'📱',type:'essential'}],parts:[],steps:[{text:'Normal: slightly warm during charging or intensive use (gaming, video).'},{text:'Abnormal: warm during standby, during a voice call, or right after unplugging.'},{text:'Android: AccuBattery → Real-time tab. Above 40°C at idle = flag for diagnosis.'},{text:'iOS: "Temperature — iPhone needs to cool down" during normal use = battery failing.'}],refs:[{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  sc_pixel:{icon:'🖥️',title:'Run a Dead-Pixel / Stuck-Pixel Test',note:'Checks for stuck or dead pixels before deciding on screen replacement.',tools:[{name:'jscreenfix.com (free, browser)',icon:'🌐',type:'essential'}],parts:[],steps:[{text:'Open jscreenfix.com in your browser → click "Launch JScreenFix".'},{text:'Dead pixel (permanently black): physical damage — cannot be fixed.'},{text:'Stuck pixel (permanently one color): often fixable with jscreenfix running 10–20 minutes.'},{text:'More than 3–5 clustered stuck pixels = screen replacement likely needed.'}],refs:[{icon:'🌐',label:'JScreenFix',url:'https://www.jscreenfix.com',src:'JScreenFix'}]},
  sc_back:{icon:'💡',title:'Test for Backlight Failure',note:'Backlight failure is different from panel failure — different repair.',tools:[{name:'Flashlight',icon:'🔦',type:'essential'}],parts:[],steps:[{text:'Set screen to maximum brightness. Open a white image (blank Word doc, white webpage).'},{text:'Take the laptop to a completely dark room. Shine a flashlight at a 45° angle onto the screen.'},{text:'If you can faintly see your desktop content = backlight failed, panel intact.'},{text:'No image visible at all = LCD panel has failed, or GPU/cable connection issue.'}],refs:[{icon:'📘',label:'iFixit: Laptop display troubleshooting',url:'https://www.ifixit.com/Troubleshooting/PC_Laptop',src:'iFixit'}]},
  sc_touch:{icon:'📱',title:'Mobile Touch Responsiveness Test',note:'Tests if the digitizer layer is functional.',tools:[],parts:[],steps:[{text:'Test every corner and edge — digitizer damage is often localised to one zone.'},{text:'Try scrolling, pinch-to-zoom, and multi-touch gestures.'},{text:'Zones that don\'t respond = digitizer damaged. Usually requires full display assembly replacement.'}],refs:[{icon:'📘',label:'iFixit: Phone screen diagnosis',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  sc_touch_samsung:{icon:'📱',title:'Samsung: Built-in Touch Test',note:'Samsung has a native touch diagnostic via dial code.',tools:[],parts:[],steps:[{text:'Open the Phone/Dialer app.'},{text:'Dial *#*#2664#*#* — this opens the Samsung touch test.'},{text:'Draw and drag across the entire screen. Red areas = unresponsive zones.'},{text:'If zones fail the test = digitizer or LCD panel replacement needed.'}],refs:[{icon:'📘',label:'iFixit: Phone screen diagnosis',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  sc_touch_android:{icon:'📱',title:'Android: Touch Screen Test App',note:'Free apps on Play Store for touch diagnostics.',tools:[{name:'Touch Screen Test app (free)',icon:'📱',type:'essential'}],parts:[],steps:[{text:'Search "touch screen test" on the Play Store. Install any free app.'},{text:'Draw with your finger across all zones — the app shows which zones register correctly.'},{text:'Test all four corners and edges specifically — cracks often affect edges first.'}],refs:[{icon:'📘',label:'iFixit: Phone screen diagnosis',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  sc_touch_ios:{icon:'📱',title:'iPhone: Multi-Touch Test',note:'iOS has no official dial code — test manually.',tools:[],parts:[],steps:[{text:'Place four fingers on the screen simultaneously in different locations.'},{text:'Swipe diagonally across the entire screen slowly.'},{text:'Tap each corner of the screen individually.'},{text:'Any zone that doesn\'t register = digitizer damaged in that area.'}],refs:[],},
  sc_crack:{icon:'🔍',title:'Assess Physical Crack Depth',note:'Crack depth determines repair cost and urgency.',tools:[{name:'Flashlight',icon:'🔦',type:'optional'}],parts:[],steps:[{text:'Surface crack only (no color distortion): device is functional. A screen protector prevents further damage.'},{text:'Crack reaches OLED/LCD (ink bleeding, black patches): full display replacement needed immediately.'},{text:'Do not delay — liquid crystal leaks spread and make repairs more expensive over time.'},{text:'Search: "[your model] screen replacement" on iFixit, Lazada, or Shopee.'}],refs:[{icon:'📘',label:'iFixit: Phone screen repair',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  sc_external:{icon:'🖥️',title:'Connect to External Monitor',note:'Isolates whether the issue is the panel, cable, or GPU.',tools:[{name:'HDMI or USB-C to HDMI cable',icon:'🔌',type:'essential'}],parts:[],steps:[{text:'Connect the laptop to an external monitor using HDMI or USB-C.'},{text:'If the external monitor shows a normal image = panel or LCD cable is the issue, GPU is fine.'},{text:'If the external monitor also has issues = GPU or motherboard problem. Take to shop.'},{text:'Check the panel connector cable inside the laptop lid hinge area (shop job to access).'}],refs:[]},
  cp_clean:{icon:'🧹',title:'Clean the Charging Port',note:'Lint compaction is the #1 cause of charging failures. Free fix.',safety:[{type:'warn',msg:'Never use metal objects inside the port — they can short circuit the connectors.'}],tools:[{name:'Dry wooden toothpick',icon:'🪥',type:'essential'},{name:'Compressed air can',icon:'💨',type:'essential'},{name:'Flashlight',icon:'🔦',type:'essential'}],parts:[],steps:[{text:'Power off the device completely before cleaning.'},{text:'Shine a flashlight into the port. Look for grey/white lint compaction at the back wall.'},{text:'Use a dry wooden toothpick (NOT metal) to gently scrape lint from the back wall.'},{text:'Follow with a short burst of compressed air (can held upright, 2–3 cm from port).'},{text:'Power on and test charging. Most Android charging failures are resolved by this step alone.'}],refs:[{icon:'📘',label:'iFixit: Charging port cleaning',url:'https://www.ifixit.com/Answers/View/85424/Phone+not+charging',src:'iFixit Community'}]},
  cp_cable:{icon:'🔌',title:'Test With Different Cable and Charger',note:'Cables fail far more often than ports.',tools:[{name:'Second USB-C cable (different brand)',icon:'🔌',type:'essential'}],parts:[],steps:[{text:'Try a completely different cable from a different manufacturer.'},{text:'Try a completely different charger/adapter — not just the cable.'},{text:'Test on a different power outlet — surge damage can affect charger performance.'},{text:'USB-C meter (~₱500–800 on Shopee) shows actual watts delivered for definitive diagnosis.'}],refs:[{icon:'📘',label:'iFixit: Charging troubleshooting',url:'https://www.ifixit.com/Troubleshooting/Phone',src:'iFixit'}]},
  cp_meter:{icon:'📊',title:'USB-C Meter Wattage Test',note:'Confirms actual charging power vs. rated output.',tools:[{name:'USB-C power meter (PortaPow / WITRN)',icon:'📊',type:'essential'}],parts:[],steps:[{text:'Purchase a USB-C power meter (search on Shopee/Lazada — ₱400–900).'},{text:'Connect: wall charger → USB-C meter → phone. Meter displays V, A, and W in real-time.'},{text:'Compare displayed wattage to charger\'s rated output printed on the adapter.'},{text:'If delivered watts = rated output — port is fine. Investigate battery or charger instead.'}],refs:[{icon:'📘',label:'iFixit: USB-C diagnosis',url:'https://www.ifixit.com/Troubleshooting/Phone',src:'iFixit'}]},
  cp_pins:{icon:'🔍',title:'Inspect Port for Bent Pins or Corrosion',note:'Visible damage means port replacement.',tools:[{name:'Flashlight or magnifying glass',icon:'🔦',type:'essential'}],parts:[{name:'USB-C port replacement assembly',icon:'🔌',search:'https://www.ifixit.com/Search?query=charging+port+replacement',note:'Search "[your model] charging port replacement" on iFixit. Difficulty varies by model.',brand:'iFixit / Shopee'}],steps:[{text:'Power off. Shine flashlight directly into port at various angles.'},{text:'Green or white residue = corrosion from liquid exposure. Port replacement needed.'},{text:'Bent pins inside USB-C: visible as asymmetric or collapsed pins. Port replacement required.'},{text:'Many Android phones have the charging port on a separate daughterboard — DIY-possible.'}],refs:[{icon:'📘',label:'iFixit: Port guides',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  cp_pins_ios:{icon:'🔍',title:'iPhone 12+: Charging Port is on Logic Board',note:'Requires microsoldering — shop only.',safety:[{type:'danger',msg:'Do not attempt DIY. iPhone 12 and newer have the charging port soldered directly to the logic board. Only certified shops with microsoldering equipment can repair this.'}],tools:[],parts:[],steps:[{text:'Power off. Shine flashlight into the Lightning or USB-C port.'},{text:'Debris or corrosion visible = take to Apple AASP for professional cleaning.'},{text:'Bent pins or physical damage = logic board repair. Apple AASP or certified microsoldering shop only.'},{text:'iFixit score for iPhone 12–14 is 4/10 — not recommended for DIY.'}],refs:[{icon:'🌐',label:'Apple AASP Locator PH',url:'https://locate.apple.com/ph/en',src:'Apple'}]},
  cp_magsafe:{icon:'💻',title:'MacBook: Check MagSafe / USB-C Port',note:'MacBook charging port issues are often cable-related.',tools:[{name:'USB-C cable (Apple certified)',icon:'🔌',type:'essential'}],parts:[],steps:[{text:'Inspect the USB-C port with a flashlight for debris or bent pins.'},{text:'Try a different USB-C cable — Apple\'s own cables fail commonly, especially at the connector end.'},{text:'Try a different USB-C charger (60W+ for most MacBooks, 96W+ for 16-inch).'},{text:'If the MagSafe LED is orange/green = charger works, board accepts charge. Issue may be battery.'}],refs:[{icon:'📘',label:'Apple: MacBook charging',url:'https://support.apple.com/en-us/104943',src:'Apple Support'}]},
  ot_temp_windows:{icon:'🌡️',title:'Windows: Monitor CPU/GPU Temperature',note:'HWMonitor is the go-to free tool.',tools:[{name:'HWMonitor (free)',icon:'💻',type:'essential'}],parts:[],steps:[{text:'Download HWMonitor from cpuid.com (free, portable — no install needed).'},{text:'Expand your CPU section. Look for "Package" or "Core #0–#N" rows.'},{text:'Safe under full load: ≤85°C. Thermal throttle starts: ~95°C. Idle: 35–50°C.'},{text:'Run a 4K YouTube video or Cinebench (free) while monitoring to stress the CPU.'}],refs:[{icon:'🌐',label:'HWMonitor',url:'https://www.cpuid.com/softwares/hwmonitor.html',src:'CPUID'}]},
  ot_temp_macos:{icon:'🌡️',title:'macOS: Monitor CPU/GPU Temperature',note:'Stats is a free menu bar app.',tools:[{name:'Stats (free, GitHub)',icon:'💻',type:'essential'}],parts:[],steps:[{text:'Download Stats from github.com/exelban/stats (free, open source).'},{text:'Enables CPU, GPU, and battery temperature in the menu bar.'},{text:'CPU die temp above 90°C under normal use = thermal issue likely.'},{text:'Also check Activity Monitor (Applications → Utilities) for any runaway processes.'}],refs:[{icon:'🌐',label:'Stats app (GitHub)',url:'https://github.com/exelban/stats',src:'GitHub'}]},
  ot_temp_mobile:{icon:'🌡️',title:'Mobile: Check CPU Temperature',note:'AccuBattery shows battery temperature which correlates with CPU heat.',tools:[{name:'AccuBattery (free)',icon:'📱',type:'essential'}],parts:[],steps:[{text:'AccuBattery → Real-time tab shows battery temperature in °C.'},{text:'Above 40°C at idle = abnormal. Check for apps using high CPU in background.'},{text:'Settings → Battery → Battery Usage: identify apps consuming excessive CPU/battery.'},{text:'Uninstall or force-stop the offending app and monitor temperature.'}],refs:[{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  ot_clean:{icon:'💨',title:'Clean Laptop Vents (External)',note:'No disassembly needed — the easiest thermal fix.',safety:[{type:'warn',msg:'Hold the compressed air can upright. Never tip it — liquid propellant can damage electronics.'}],tools:[{name:'Compressed air can (with straw nozzle)',icon:'💨',type:'essential'}],parts:[],steps:[{text:'Power off and unplug the laptop.'},{text:'Identify intake vents (usually bottom) and exhaust vents (usually sides or back).'},{text:'Short 1–2 second bursts from 10–15 cm into the exhaust vents.'},{text:'Insert straw nozzle into intake vents briefly, then blow out through exhaust.'},{text:'A 10–20°C temperature drop is normal after a thorough cleaning.'}],refs:[{icon:'📘',label:'iFixit: Laptop Overheating',url:'https://www.ifixit.com/Troubleshooting/Acer_Laptop/Overheating/614752',src:'iFixit'}]},
  ot_pad:{icon:'🛌',title:'Use a Laptop Cooling Pad',note:'Immediate no-risk thermal improvement.',tools:[{name:'Laptop cooling pad with USB fan(s)',icon:'💨',type:'essential'}],parts:[{name:'Laptop Cooling Pad',icon:'💨',search:'https://www.lazada.com.ph/catalog/?q=laptop+cooling+pad',note:'Search "laptop cooling pad" on Lazada/Shopee. Typical cost ₱350–900.',brand:'Shopee / Lazada'}],steps:[{text:'Place cooling pad on a flat surface. Set laptop with intake vents aligned over pad fans.'},{text:'Connect pad USB to laptop\'s USB-A port.'},{text:'If temperatures drop 5–15°C and throttling stops — cooling pad is a valid long-term solution.'}],refs:[{icon:'📘',label:'iFixit: Overheating',url:'https://www.ifixit.com/Troubleshooting/PC_Laptop',src:'iFixit'}]},
  ot_paste:{icon:'🔧',title:'Thermal Paste Reapplication',note:'Most effective thermal fix, but requires full disassembly.',safety:[{type:'warn',msg:'Wear an anti-static wrist strap. Ground yourself before touching any component.'}],tools:[{name:'Phillips / Torx T5/T8 screwdrivers',icon:'🔩',type:'essential'},{name:'Arctic MX-4 or Noctua NT-H1',icon:'🧴',type:'essential'},{name:'90%+ isopropyl alcohol',icon:'🧪',type:'essential'}],parts:[{name:'Thermal paste (Arctic MX-4 or Noctua NT-H1)',icon:'🧴',search:'https://www.lazada.com.ph/catalog/?q=thermal+paste',note:'Cost: ₱350–600 on Shopee/Lazada.',brand:'Arctic / Noctua'}],steps:[{text:'Search "[your laptop model] thermal paste replacement" on iFixit or YouTube first.'},{text:'Remove all bottom screws. Photo the layout before starting.'},{text:'Clean old paste with microfiber cloth dampened with 90%+ isopropyl alcohol.'},{text:'Apply a pea-sized (2–3 mm) amount to center of CPU die. Do NOT spread it.'},{text:'Reinstall heatsink in an X-pattern (tighten opposite corners progressively).'}],refs:[{icon:'📘',label:'iFixit: Thermal paste guide',url:'https://www.ifixit.com/Wiki/Thermal_Paste_Application',src:'iFixit EDU'}]},
  ot_mobile_apps_ios:{icon:'📱',title:'iOS: Find Overheating Apps',note:'Background app refresh and location services are common culprits.',tools:[],parts:[],steps:[{text:'Settings → Battery → Battery Usage: shows which apps used the most battery.'},{text:'Settings → Privacy → Location Services: disable "Always" location for non-essential apps.'},{text:'Settings → General → Background App Refresh: disable for apps that don\'t need it.'},{text:'If the phone heats up during calls: there may be a modem or antenna issue — take to shop.'}],refs:[{icon:'📘',label:'Apple: iPhone overheating',url:'https://support.apple.com/en-us/111781',src:'Apple Support'}]},
  ot_mobile_apps_android:{icon:'📱',title:'Android: Find Overheating Apps',note:'Battery Usage and Developer Options help identify runaway apps.',tools:[],parts:[],steps:[{text:'Settings → Battery → Battery Usage: identify apps with unexpectedly high usage.'},{text:'Samsung: Settings → Device Care → Battery → check high usage apps.'},{text:'Force-stop the offending app: Settings → Apps → [app name] → Force Stop.'},{text:'If overheating continues after stopping all suspect apps — hardware issue. Take to shop.'}],refs:[]},
  sw_update:{icon:'⚙️',title:'Install All Pending Updates',note:'Most bugs are patched in updates.',tools:[],parts:[],steps:[{text:'Check for both OS updates and individual app updates.'},{text:'After updating, restart the device and test the original issue.'},{text:'If the issue was software-level, it may be fully resolved by the update.'}],refs:[]},
  sw_malware_windows:{icon:'🛡️',title:'Windows: Run Malware Scan',note:'Malware causes battery drain, overheating, and random shutdowns.',tools:[{name:'Malwarebytes Free',icon:'🛡️',type:'essential'}],parts:[],steps:[{text:'Download Malwarebytes Free from malwarebytes.com.'},{text:'Run a full scan. Remove all flagged items.'},{text:'Restart the computer after removing threats.'},{text:'Also: Windows Security → Virus & threat protection → Quick Scan (built-in).'}],refs:[{icon:'🌐',label:'Malwarebytes Free',url:'https://www.malwarebytes.com/free',src:'Malwarebytes'}]},
  sw_malware_android:{icon:'🛡️',title:'Android: Google Play Protect Scan',note:'Built-in — no download needed.',tools:[],parts:[],steps:[{text:'Settings → Security → Google Play Protect → Scan.'},{text:'Play Protect scans all installed apps automatically in the background.'},{text:'Avoid third-party "security" apps from unknown publishers — many are adware themselves.'}],refs:[]},
  sw_malware_ios:{icon:'🛡️',title:'iOS: Check for Rogue Profiles',note:'iOS is sandboxed — traditional malware is rare but profiles can be dangerous.',tools:[],parts:[],steps:[{text:'Settings → General → VPN & Device Management.'},{text:'If you see any profile you didn\'t install intentionally — tap it and remove it.'},{text:'These profiles can grant apps elevated permissions or redirect your web traffic.'}],refs:[]},
  sw_reset_android:{icon:'🔄',title:'Android: Factory Reset',note:'Path varies by brand.',safety:[{type:'danger',msg:'Confirm backup is fully complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'Samsung: Settings → General Management → Reset → Factory Data Reset.'},{text:'OPPO / Realme: Settings → Additional Settings → Back Up and Reset → Erase All Data.'},{text:'Xiaomi / Redmi: Settings → About phone → Factory Reset.'},{text:'Google Pixel: Settings → System → Reset options → Erase all data.'}],refs:[{icon:'📘',label:'Google: Factory reset Android',url:'https://support.google.com/android/answer/6088915',src:'Google Support'}]},
  sw_reset_ios:{icon:'🔄',title:'iOS: Factory Reset',note:'Erase All Content and Settings.',safety:[{type:'danger',msg:'Confirm backup is fully complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'Settings → General → Transfer or Reset iPhone → Erase All Content and Settings.'},{text:'Enter your Apple ID password when prompted. This removes Activation Lock simultaneously.'},{text:'The process takes 3–10 minutes. Device will restart to the "Hello" screen.'}],refs:[{icon:'📘',label:'Apple: Erase iPhone',url:'https://support.apple.com/en-us/111765',src:'Apple Support'}]},
  sw_reset_windows:{icon:'🔄',title:'Windows: Reset This PC',note:'Reinstalls Windows while wiping personal files.',safety:[{type:'danger',msg:'Back up everything first. This erases all personal files and apps.'}],tools:[],parts:[],steps:[{text:'Settings → System → Recovery → Reset this PC.'},{text:'Choose "Remove everything" then "Local reinstall".'},{text:'The process takes 30–60 minutes. The PC will restart several times.'}],refs:[{icon:'📘',label:'Microsoft: Reset Windows',url:'https://support.microsoft.com/en-us/windows/reinstall-windows',src:'Microsoft Support'}]},
  sw_reset_macos:{icon:'🔄',title:'macOS: Erase All Content and Settings',note:'Apple Silicon Macs (2020+) only.',safety:[{type:'danger',msg:'Back up everything first. This cannot be undone.'}],tools:[],parts:[],steps:[{text:'System Settings → General → Transfer or Reset → Erase All Content and Settings.'},{text:'Intel Macs: restart holding Cmd+R → enter Recovery Mode → Disk Utility → Erase → reinstall macOS.'},{text:'The process takes 20–45 minutes depending on your internet speed.'}],refs:[{icon:'📘',label:'Apple: Erase Mac',url:'https://support.apple.com/en-us/102664',src:'Apple Support'}]},
  ld_off:{icon:'⚡',title:'Power Off Immediately',note:'Most critical step for liquid damage.',safety:[{type:'danger',msg:'Charging a wet device causes immediate short circuits. POWER OFF NOW.'}],tools:[],parts:[],steps:[{text:'Hold power button → select Power Off.'},{text:'If screen is unresponsive: hold power for 10 seconds to force shutdown.'},{text:'DO NOT plug in a charger, even if the device looks fine.'},{text:'DO NOT press any buttons more than necessary — this pushes water further in.'}],refs:[{icon:'📘',label:'iFixit: Liquid Damage Repair',url:'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',src:'iFixit'}]},
  ld_off_samsung:{icon:'📱',title:'Samsung: Force Off After Water Damage',note:'Use the hardware force-off method.',tools:[],parts:[],steps:[{text:'Hold Power + Volume Down simultaneously for 7 seconds.'},{text:'Do not use the touchscreen — it may be erratic and can cause unintended actions.'},{text:'Once off: remove the SIM tray, wipe exterior with lint-free cloth.'},{text:'Do NOT press the power button again until device has dried for 24–48 hours.'}],refs:[]},
  ld_remove:{icon:'📦',title:'Remove All Removable Parts (Mobile)',note:'Maximize airflow and minimize corrosion pathways.',tools:[{name:'SIM ejector tool or paperclip',icon:'📎',type:'essential'}],parts:[],steps:[{text:'Eject SIM card tray using the SIM tool. Remove SIM card and keep it safe.'},{text:'Remove microSD card if present.'},{text:'Remove the case, screen protector, and all accessories.'},{text:'Pat exterior gently with a clean lint-free cloth. Do NOT rub.'}],refs:[{icon:'📘',label:'iFixit: Liquid Damage First Aid',url:'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',src:'iFixit'}]},
  ld_remove_laptop:{icon:'💻',title:'Laptop: Disconnect Power Immediately',note:'Never reconnect charger until fully dry.',tools:[],parts:[],steps:[{text:'Disconnect the charger/power adapter immediately.'},{text:'If the battery is removable (older laptops): remove it now.'},{text:'Close the lid and rotate the laptop upside down to let liquid drain out.'},{text:'Pat dry with a lint-free cloth. Do NOT use a hairdryer.'}],refs:[]},
  ld_dry:{icon:'🌬️',title:'Dry With Silica Gel — NOT Rice',note:'Rice is ineffective and risks debris entering ports.',safety:[{type:'warn',msg:'Do NOT use a hairdryer or oven. Heat above 40°C can warp components.'}],tools:[{name:'Silica gel packets',icon:'🟠',type:'essential'},{name:'Sealed zip-lock bag',icon:'📦',type:'essential'}],parts:[],steps:[{text:'Pat exterior dry with a lint-free cloth. Gently shake to expel water from ports.'},{text:'Place device and several silica gel packets (from shoe boxes, medicine bottles) in a sealed bag.'},{text:'Leave sealed for 24–48 hours at room temperature.'},{text:'Do NOT use rice — it is ineffective and starch particles can clog ports.'}],refs:[{icon:'📘',label:'iFixit: Why rice doesn\'t work',url:'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',src:'iFixit Guide'}]},
  mb_drain:{icon:'⚡',title:'Laptop: Drain Residual Power',note:'Discharges capacitors that can keep a laptop in a bad state.',tools:[],parts:[],steps:[{text:'Unplug the laptop from the charger completely.'},{text:'Hold the power button for 30 full seconds (drains capacitors).'},{text:'For laptops with removable batteries: disconnect battery, hold power 10 seconds, reconnect.'},{text:'Wait 30 seconds after releasing. Then press power normally.'}],refs:[{icon:'📘',label:'iFixit: Laptop No Power',url:'https://www.ifixit.com/Troubleshooting/PC_Laptop',src:'iFixit'}]},
  mb_drain_mobile:{icon:'📱',title:'Mobile: Charge First, Then Force Restart',note:'Completely flat battery may need a few minutes of charge to boot.',tools:[],parts:[],steps:[{text:'Connect to a known-working charger and cable. Wait 15 minutes.'},{text:'After 15 minutes, attempt a force restart (don\'t wait for any display).'},{text:'iPhone 8+: Vol Up → Vol Down → hold Side button for 10s.'},{text:'Samsung/Android: hold Power + Volume Down for 10s.'},{text:'If still no response after 30 minutes: take to shop for board-level diagnosis.'}],refs:[]},
  df_score:{icon:'📊',title:'Check iFixit Repairability Score',note:'iFixit scores devices 1–10 on DIY-friendliness.',tools:[],parts:[],steps:[{text:'Visit ifixit.com/repairability and search for your device model.'},{text:'Score 8–10: Highly DIY-friendly. Screwed components, parts available.'},{text:'Score 5–7: Moderate difficulty. Some glued components but DIY possible.'},{text:'Score 1–4: Shop recommended. Heavily glued or proprietary screws.'},{text:'Notable: Samsung Galaxy S-series = 4/10. iPhone 15/16 = 7/10. Galaxy A54 = 6/10. Framework = 10/10.'}],refs:[{icon:'📘',label:'iFixit Repairability Scores',url:'https://www.ifixit.com/repairability',src:'iFixit'}]},
  df_tools:{icon:'🔧',title:'Essential DIY Repair Tool Kit',note:'Minimum tools for safe electronics disassembly.',tools:[{name:'Phillips #00',icon:'🔩',type:'essential'},{name:'Torx T5/T8',icon:'🔩',type:'essential'},{name:'Pentalobe P5 (Apple)',icon:'🔩',type:'essential'},{name:'Plastic spudger (ESD-safe)',icon:'🪛',type:'essential'},{name:'Anti-static wrist strap',icon:'⚡',type:'essential'}],parts:[{name:'iFixit Essential Electronics Toolkit',icon:'🧰',search:'https://www.ifixit.com/products/essential-electronics-toolkit',note:'Includes 16 precision bits + spudger + tweezers. Available on iFixit.com.',brand:'iFixit'},{name:'Generic precision screwdriver set (budget)',icon:'🔩',search:'https://www.shopee.ph/search?keyword=precision+screwdriver+set',note:'Search "precision screwdriver set 60-in-1" on Shopee PH. Cost: ₱250–600.',brand:'Shopee PH'}],steps:[{text:'iFixit Essential Electronics Toolkit (~$30 USD): covers 95% of phone and laptop repairs.'},{text:'Budget option: search "precision screwdriver 60-in-1" on Shopee — ₱250–600.'},{text:'Verify kit includes: Pentalobe P5 (Apple), Torx T5/T8 (laptops), Phillips #00.'},{text:'Never use a flathead screwdriver near circuit boards — static discharge risk.'}],refs:[{icon:'📘',label:'iFixit Essential Toolkit',url:'https://www.ifixit.com/products/essential-electronics-toolkit',src:'iFixit'}]},
  df_decide:{icon:'🤔',title:'DIY vs Shop Decision Guide',note:'Match your issue type to the right approach.',tools:[],parts:[],steps:[{text:'DIY-safe (anyone can do): software fix/reset, external cleaning, RAM/SSD upgrade in screwed laptops.'},{text:'DIY with caution (iFixit ≥6): battery on removable/screwed phones, laptop keyboard.'},{text:'Shop recommended (iFixit ≤5): battery on glued flagship phones, screen replacement.'},{text:'Never DIY (soldering required): iPhone charging port, OLED panel on flagships, water damage board cleaning.'},{text:'Cost check: if repair exceeds 60–70% of device replacement value → recycle + buy refurbished.'}],refs:[{icon:'📘',label:'iFixit: Is it worth repairing?',url:'https://www.ifixit.com/repairability',src:'iFixit'}]},
  rs_auth_apple:{icon:'🍎',title:'Apple Authorized Service Providers (PH)',note:'AASPs use genuine Apple parts and tools.',tools:[],parts:[],steps:[{text:'Find AASPs at locate.apple.com/ph.'},{text:'Authorized locations in PH: iStudio, Beyond the Box, Switch, and standalone AASPs.'},{text:'Bring: the device, proof of purchase, and Apple ID credentials.'},{text:'Out-of-warranty service: Apple has a flat fee for screen, battery, and other component repairs.'}],refs:[{icon:'🌐',label:'Apple AASP Locator PH',url:'https://locate.apple.com/ph/en',src:'Apple'}]},
  rs_auth_samsung:{icon:'📱',title:'Samsung Service Centers (PH)',note:'300+ locations nationwide.',tools:[],parts:[],steps:[{text:'Find nearest center: samsung.com/ph/support/service-center.'},{text:'Bring: the device, original receipt, and Samsung account credentials if applicable.'},{text:'Samsung Premium Care covers accidental damage if enrolled within 30 days of purchase.'},{text:'Out-of-warranty common prices: screen ~₱3,500–7,000; battery ~₱1,500–2,500 (Galaxy A/S series).'}],refs:[{icon:'🌐',label:'Samsung Service Center PH',url:'https://www.samsung.com/ph/support/service-center/',src:'Samsung PH'}]},
  rs_auth_laptop:{icon:'💻',title:'Laptop Brand Service Centers (PH)',note:'Find your brand\'s nearest authorized service center.',tools:[],parts:[],steps:[{text:'Lenovo: support.lenovo.com → click "Find a service provider" → Philippines.'},{text:'HP: support.hp.com → Service Center Locator → Philippines.'},{text:'ASUS: asus.com/ph/support/Service-Center-Contents → 20+ locations in Metro Manila.'},{text:'Acer: acer.com/ph → Service Center. Dell: dell.com/en-ph/category/services.'},{text:'Bring: laptop, charger, and proof of purchase for warranty claims.'}],refs:[{icon:'🌐',label:'Lenovo Support PH',url:'https://support.lenovo.com',src:'Lenovo'},{icon:'🌐',label:'HP Support PH',url:'https://support.hp.com',src:'HP'}]},
  rs_quote:{icon:'📋',title:'Get a Written Repair Quote',note:'Verbal quotes are unenforceable. Always get it in writing.',tools:[],parts:[],steps:[{text:'Ask for a written diagnostic fee (if any). Reputable shops charge ₱0–500 for diagnosis.'},{text:'Quote must include: parts cost (by name), labor cost, and estimated completion date.'},{text:'Ask: "Will you call me before proceeding if additional issues are found?"'},{text:'Red flag: shop that pressures you to decide immediately or can\'t give an itemized quote.'}],refs:[{icon:'📘',label:'iFixit: Choosing a repair shop',url:'https://www.ifixit.com/Wiki/Choose_a_Phone_Repair_Shop',src:'iFixit'}]},
  vr_test_battery:{icon:'🔋',title:'Verify Battery After Repair (Mobile)',note:'New battery should show ≥95% capacity.',tools:[],parts:[],steps:[{text:'iOS: Settings → Battery → Battery Health — should show 100% for new battery.'},{text:'Android: AccuBattery → Health tab — should show minimal wear on a new battery.'},{text:'Samsung: *#0228# → should show normal voltage (~4.2V at full charge).'},{text:'Charge to 100% and test: battery should not warm up during normal use.'}],refs:[]},
  vr_test_battery_laptop:{icon:'💻',title:'Verify Battery After Repair (Laptop)',note:'Full Charge Capacity should be ≥95% of Design Capacity.',tools:[],parts:[],steps:[{text:'Windows: run powercfg /batteryreport in CMD. Open HTML report.'},{text:'"Full Charge Capacity" should be ≥95% of "Design Capacity" for a new battery.'},{text:'macOS: coconutBattery should show "Age: 0 months" and "Capacity: ~100%".'},{text:'Charge to 100% and verify it doesn\'t lose charge unusually fast.'}],refs:[]},
  // recycle subs
  rbu_photos_android:{icon:'📸',title:'Android: Transfer Photos',note:'Google Photos or USB transfer.',tools:[],parts:[],steps:[{text:'Google Photos: ensure Backup is on and "Backup complete" shows in the app.'},{text:'USB transfer: connect to PC, select "File Transfer" in the USB mode popup, copy DCIM folder.'},{text:'Verify thumbnails appear in Google Photos at photos.google.com before wiping.'}],refs:[{icon:'📘',label:'Google Photos Backup',url:'https://support.google.com/photos/answer/6193313',src:'Google'}]},
  rbu_photos_ios:{icon:'📸',title:'iOS: Transfer Photos',note:'iCloud Photos or USB transfer.',tools:[],parts:[],steps:[{text:'iCloud Photos: Settings → [Name] → iCloud → Photos → iCloud Photos. Verify at iCloud.com/photos.'},{text:'USB: connect to Mac → Finder → trust the device → import photos.'},{text:'USB on Windows: use the "Import pictures and videos" option in File Explorer.'}],refs:[{icon:'📘',label:'iCloud Photos',url:'https://support.apple.com/en-us/111784',src:'Apple Support'}]},
  rbu_contacts_android:{icon:'📒',title:'Android: Export Contacts',note:'Export as .vcf file for portability.',tools:[],parts:[],steps:[{text:'Contacts app → three-dot menu → Export → save .vcf to internal storage or SD card.'},{text:'Also ensure Google Contacts sync is enabled: Settings → Google → Contacts Sync.'},{text:'Verify contacts appear at contacts.google.com before wiping.'}],refs:[]},
  rbu_contacts_ios:{icon:'📒',title:'iOS: Export Contacts via iCloud',note:'iCloud Contact sync is automatic.',tools:[],parts:[],steps:[{text:'Ensure iCloud Contacts sync is on: Settings → [Name] → iCloud → Contacts toggle = on.'},{text:'Verify at iCloud.com/contacts that all contacts appear.'},{text:'Or export .vcf: iCloud.com/contacts → Select All → Export vCard.'}],refs:[]},
  rbu_laptop_windows:{icon:'💻',title:'Windows: Back Up Before Wiping',note:'Copy all important files to external drive.',tools:[{name:'External HDD/SSD',icon:'💽',type:'essential'}],parts:[],steps:[{text:'Copy Desktop, Documents, Downloads, Pictures, Videos to external drive.'},{text:'Chrome: Settings → Bookmarks → Export bookmarks to HTML file.'},{text:'Export passwords: Chrome → Settings → Passwords → Download CSV file. Store securely.'},{text:'Deactivate Office 365: Office app → File → Account → Deactivate.'}],refs:[]},
  rbu_laptop_macos:{icon:'💻',title:'macOS: Back Up Before Wiping',note:'Time Machine + manual copy of key folders.',tools:[{name:'External HDD/SSD',icon:'💽',type:'essential'}],parts:[],steps:[{text:'Run a final Time Machine backup.'},{text:'Copy Desktop, Documents, Downloads to external drive as extra safety.'},{text:'Safari: File → Export Bookmarks.'},{text:'Sign out of iCloud: System Settings → [Apple ID] → Sign Out.'},{text:'Deauthorize iTunes: iTunes/Music → Account → Authorizations → Deauthorize This Computer.'}],refs:[]},
  wd_google:{icon:'🔐',title:'Android: Remove Google Account',note:'Required before recycling — disables Find My Device.',tools:[],parts:[],steps:[{text:'Settings → Accounts and Backup → Manage Accounts → Google → Remove account.'},{text:'Settings → Biometrics and Security → Find My Mobile (Samsung) OR Settings → Security → Find My Device — disable.'},{text:'Samsung: also remove Samsung Account from Settings → Accounts and Backup → Samsung Account → Remove.'}],refs:[{icon:'📘',label:'Google: Remove account',url:'https://support.google.com/android/answer/7664951',src:'Google Support'}]},
  wd_apple:{icon:'🔐',title:'iOS: Sign Out of Apple ID',note:'Without this, Activation Lock remains permanently.',safety:[{type:'danger',msg:'If you skip this step, Activation Lock remains permanently. NO recycler or buyer can use the device. Sign out BEFORE handing the device over.'}],tools:[],parts:[],steps:[{text:'Settings → [Your Name] → Sign Out. Enter your Apple ID password.'},{text:'Verify: Settings should show "Sign in to your iPhone" at the top — not your name.'},{text:'Alternatively remotely: iCloud.com → Find Devices → select device → Remove from Account.'}],refs:[{icon:'📘',label:'Apple: Remove Activation Lock',url:'https://support.apple.com/en-us/102648',src:'Apple Support'}]},
  wd_samsung:{icon:'📱',title:'Samsung: Remove Samsung Account',note:'Disables Samsung Find My Mobile tracking.',tools:[],parts:[],steps:[{text:'Settings → Accounts and Backup → Manage Accounts → Samsung Account.'},{text:'Tap your Samsung account → Remove account. Enter password when prompted.'},{text:'Also: Settings → Biometrics and Security → Find My Mobile → disable (turn off tracking).'}],refs:[]},
  wd_laptop_windows:{icon:'💻',title:'Windows: Sign Out of Microsoft Account',note:'Also deactivate any paid software licenses.',tools:[],parts:[],steps:[{text:'Settings → Accounts → Your info → Sign in with a local account instead (if Microsoft account is linked).'},{text:'Or: Settings → Accounts → Access work or school → remove any connected accounts.'},{text:'Office 365: Office app → File → Account → Deactivate Product.'},{text:'Adobe Creative Cloud: Help → Sign Out, then deactivate license.'}],refs:[]},
  wd_laptop_macos:{icon:'💻',title:'macOS: Sign Out of Apple ID',note:'Also deauthorize iTunes and other services.',tools:[],parts:[],steps:[{text:'System Settings → [Apple ID] → Sign Out. Choose "Keep a Copy" for local data.'},{text:'Music/iTunes: Music → Account → Authorizations → Deauthorize This Computer.'},{text:'iMessage: Messages → Settings → iMessage → Sign Out.'},{text:'FaceTime: FaceTime → Settings → sign out.'}],refs:[]},
  fr_ios:{icon:'🗑️',title:'iOS: Full Factory Reset',note:'Erases all data and removes Apple ID.',safety:[{type:'danger',msg:'Confirm backup is complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'Settings → General → Transfer or Reset iPhone → Erase All Content and Settings.'},{text:'Enter your device passcode and Apple ID password.'},{text:'Device restarts to the "Hello" setup screen.'},{text:'Hand device to recycling facility at this point — do NOT complete setup.'}],refs:[{icon:'📘',label:'Apple: Erase iPhone',url:'https://support.apple.com/en-us/111765',src:'Apple Support'}]},
  fr_android:{icon:'🗑️',title:'Android: Full Factory Reset',note:'Path varies by brand.',safety:[{type:'danger',msg:'Confirm backup is complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'OPPO / Realme: Settings → Additional Settings → Back Up and Reset → Erase All Data.'},{text:'Xiaomi / Redmi: Settings → About phone → Factory Reset → Erase all data.'},{text:'Google Pixel: Settings → System → Reset options → Erase all data (factory reset).'},{text:'Vivo: Settings → System & Device → Backup and Reset → Factory Reset.'},{text:'After reset: do NOT complete setup — hand directly to recycling facility.'}],refs:[{icon:'📘',label:'Android reset guide',url:'https://support.google.com/android/answer/6088915',src:'Google Support'}]},
  fr_samsung:{icon:'📱',title:'Samsung: Factory Data Reset',note:'Complete wipe of Samsung Galaxy devices.',safety:[{type:'danger',msg:'Confirm backup is complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'Settings → General Management → Reset → Factory Data Reset.'},{text:'Tap Reset → Delete all. Enter your PIN when prompted.'},{text:'The process takes 5–10 minutes. Device restarts to the Samsung setup screen.'},{text:'Do NOT complete setup — hand directly to recycling facility.'}],refs:[{icon:'📘',label:'Samsung factory reset',url:'https://www.samsung.com/ph/support/mobile-devices/how-to-factory-reset-samsung-mobile/',src:'Samsung PH'}]},
  fr_windows:{icon:'💻',title:'Windows: Reset This PC',note:'Full wipe and reinstall of Windows.',safety:[{type:'danger',msg:'Back up everything first. Confirm backup is complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'Settings → System → Recovery → Reset this PC.'},{text:'Click "Remove everything" then "Local reinstall".'},{text:'Takes 30–60 minutes. PC will restart several times.'},{text:'After reset: PC shows the Windows setup screen. Hand to facility at this point.'}],refs:[{icon:'📘',label:'Microsoft: Reset Windows',url:'https://support.microsoft.com/en-us/windows/reinstall-windows',src:'Microsoft Support'}]},
  fr_macos:{icon:'💻',title:'macOS: Erase All Content and Settings',note:'Apple Silicon Macs (2020+) only.',safety:[{type:'danger',msg:'Confirm backup is complete. This CANNOT be undone.'}],tools:[],parts:[],steps:[{text:'System Settings → General → Transfer or Reset → Erase All Content and Settings.'},{text:'For Intel Macs (pre-2020): restart holding Cmd+R → Recovery Mode → Disk Utility → Erase → reinstall macOS.'},{text:'Process takes 20–45 minutes. Mac shows the "Hello" setup screen when complete.'},{text:'Hand to recycling facility at this point — do NOT complete setup.'}],refs:[{icon:'📘',label:'Apple: Erase Mac',url:'https://support.apple.com/en-us/102664',src:'Apple Support'}]},
  rc_sim:{icon:'📱',title:'Remove SIM Card',note:'Your SIM is tied to your carrier account and phone number.',tools:[{name:'SIM ejector tool (or paperclip)',icon:'📎',type:'essential'}],parts:[],steps:[{text:'Locate the SIM tray on the side of your phone.'},{text:'Insert the SIM ejector tool into the small pinhole. Press firmly until the tray pops out.'},{text:'Remove the SIM card and store it separately. Keep it for your replacement device.'},{text:'If your phone uses an eSIM only: contact your carrier to transfer the eSIM profile.'}],refs:[]},
  ti_apple:{icon:'🍎',title:'Apple Trade In Program (PH)',note:'Works for damaged devices too.',tools:[],parts:[],steps:[{text:'Get an estimate at apple.com/ph/shop/trade-in (enter model, condition, storage).'},{text:'Bring the device and its original accessories to an Apple Store or AASP.'},{text:'Apple accepts cracked screens and non-functional devices — may get a lower credit.'},{text:'Credit is applied to a new device purchase.'}],refs:[{icon:'🌐',label:'Apple Trade In PH',url:'https://www.apple.com/ph/shop/trade-in',src:'Apple PH'}]},
  ti_samsung:{icon:'📱',title:'Samsung Trade-Up Program (PH)',note:'Available at Samsung Experience Stores.',tools:[],parts:[],steps:[{text:'Bring your old Galaxy device to a Samsung Experience Store.'},{text:'Staff will assess the device condition and provide a trade-in value.'},{text:'Value is deducted from the price of a new Samsung device.'},{text:'Accepted: most Galaxy A, S, and Z series models.'}],refs:[{icon:'🌐',label:'Samsung Trade-Up PH',url:'https://www.samsung.com/ph/smartphones/galaxy-s/',src:'Samsung PH'}]},
  ti_globe:{icon:'♻️',title:'Globe E-Waste Zero Program',note:'Free, nationwide drop-off. No receipt or registration needed.',tools:[],parts:[],steps:[{text:'Bring device to any Globe Store branch.'},{text:'Tell staff you\'re dropping off for the E-Waste Zero program. No forms required.'},{text:'Globe accepts: phones, tablets, chargers, cables, earphones, power banks.'},{text:'Find nearest branch: globe.com.ph/store-locator or the Globe One app.'}],refs:[{icon:'🌐',label:'Globe E-Waste Zero',url:'https://www.globe.com.ph/blog/electronic-waste-disposal',src:'Globe PH'}]},
  rf_denr:{icon:'🏛️',title:'DENR-Accredited TSD Facilities',note:'Legal gold standard for e-waste in the Philippines.',tools:[],parts:[],steps:[{text:'DENR-EMB regulates e-waste under R.A. 9003. Only accredited facilities are legally permitted.'},{text:'Crown Workspace Philippines: DENR-accredited TSD. Provides data destruction certificates.'},{text:'Eco-Systems Technology Inc: accredited facility in Laguna. Contact via ecosystech.com.ph.'},{text:'Use Rev.Tech Connect page to find the nearest verified facility in your area.'}],refs:[{icon:'🌐',label:'DENR-EMB E-Waste Info',url:'https://emb.gov.ph/solid-waste-management/ewaste/',src:'DENR-EMB PH'}]},
  dc_receipt:{icon:'📄',title:'Request a Drop-Off Receipt',note:'Legal protection under R.A. 9003.',tools:[],parts:[],steps:[{text:'At the drop-off point, ask for a signed receipt or acknowledgment slip.'},{text:'The slip must include: date, device description, facility name, and staff signature.'},{text:'Photograph the receipt and store digitally. Physical receipts can fade.'},{text:'Keep records for at least 1 year — protects you under R.A. 10173 (Data Privacy Act).'}],refs:[{icon:'🌐',label:'Crown Workspace PH',url:'https://www.crownworkspace.com/ph',src:'Crown Workspace'}]},
}

// ================================================================
//  HELPERS
// ================================================================
function resolveStatus(step: RoadmapStep, filter: FilterResult): StepStatus {
  if (step.completed)                              return 'default'
  if (filter.unsafeStepIds.includes(step.id))      return 'unsafe'
  if (filter.skippedStepIds.includes(step.id))     return 'skipped'
  if (filter.priorityStepIds.includes(step.id))    return 'priority'
  if (filter.recommendedStepIds.includes(step.id)) return 'recommended'
  if (step.diy === 'info')                         return 'info'
  return 'default'
}

const STATUS_CFG = {
  priority:    { border:'border-purple',      bg:'bg-purple/10',         badge:'bg-ink text-surface',          text:'PRIORITY',  dot:'bg-purple'      },
  recommended: { border:'border-brand-600',   bg:'bg-brand-50',          badge:'bg-brand-600 text-surface',    text:'REC',       dot:'bg-brand-600'   },
  info:        { border:'border-divider',     bg:'bg-surface',           badge:'bg-ink/10 text-ink',           text:'INFO',      dot:'bg-ink/30'      },
  unsafe:      { border:'border-recycle-600', bg:'bg-recycle-50',        badge:'bg-recycle-600 text-surface',  text:'⚠ UNSAFE',  dot:'bg-recycle-600' },
  skipped:     { border:'border-divider',     bg:'bg-canvas opacity-40', badge:'bg-divider text-muted',        text:'N/A',       dot:'bg-divider'     },
  default:     { border:'border-divider',     bg:'bg-surface',           badge:'',                             text:'',          dot:'bg-divider'     },
  done:        { border:'border-ink/20',      bg:'bg-ink/5',             badge:'bg-ink text-surface',          text:'DONE',      dot:'bg-ink'         },
} as const

const DIY_BADGE: Record<string, { label: string; cls: string }> = {
  safe:    { label:'✓ DIY-safe',          cls:'text-brand-700 border-brand-600 bg-brand-50'    },
  shop:    { label:'🏪 Shop recommended', cls:'text-blue-700  border-blue-400  bg-blue-50'     },
  caution: { label:'⚠ DIY with caution', cls:'text-recycle-700 border-recycle-400 bg-recycle-50' },
  info:    { label:'ℹ Decision gate',    cls:'text-blue-700  border-blue-400  bg-blue-50'     },
}

const CHIP_CLS: Record<string, string> = {
  age:    'bg-blue-50 text-blue-700 border border-blue-200',
  damage: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50   text-red-700   border border-red-200',
  score:  'bg-brand-50 text-brand-700 border border-brand-200',
  brand:  'bg-canvas   text-muted     border border-divider',
}

// ================================================================
//  DETAIL PANEL
// ================================================================
function DetailPanel({ subId, onClose }: { subId: string|null; onClose: () => void }) {
  const d = subId ? DETAILS[subId] : null
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!subId) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [subId, onClose])

  useEffect(() => { if (subId) ref.current?.focus() }, [subId])

  const SAFE_CLS = { info:'bg-blue-50 border-blue-200 text-blue-800', warn:'bg-amber-50 border-amber-200 text-amber-800', danger:'bg-red-50 border-red-200 text-red-800' }
  const SAFE_ICO = { info:'ℹ️', warn:'⚠️', danger:'🚨' }

  return (
    <>
      <div onClick={onClose} aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/25 transition-opacity duration-200 ${subId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <aside ref={ref} tabIndex={-1} aria-hidden={!subId} aria-label="Sub-step detail"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-surface border-l-2 border-ink shadow-2xl outline-none transition-transform duration-300 ${subId ? 'translate-x-0' : 'translate-x-full'}`}>
        {d && <>
          {/* Head */}
          <div className="flex shrink-0 items-start gap-3 border-b border-divider p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-divider bg-canvas text-xl">{d.icon}</div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold leading-snug text-ink md:text-base">{d.title}</h2>
              <p className="mt-0.5 text-xs text-muted">{d.note}</p>
            </div>
            <button onClick={onClose} aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider text-muted hover:border-ink hover:text-ink transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {d.safety?.map((s,i) => (
              <div key={i} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${SAFE_CLS[s.type]}`}>
                <span className="shrink-0">{SAFE_ICO[s.type]}</span><span>{s.msg}</span>
              </div>
            ))}
            {d.tools && d.tools.length > 0 && (
              <div>
                <SectionTitle icon={<WrenchIcon className="h-3 w-3"/>} label="Tools You'll Need" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {d.tools.map((t,i) => (
                    <span key={i} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      t.type==='essential' ? 'border-brand-400 bg-brand-50 text-brand-700' :
                      t.type==='caution'   ? 'border-amber-300 bg-amber-50 text-amber-700' :
                      'border-divider bg-canvas text-muted'}`}>
                      {t.icon} {t.name}
                      {t.type==='essential' && <span className="opacity-50 text-[10px]">(essential)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {d.parts && d.parts.length > 0 && (
              <div>
                <SectionTitle icon={<ShoppingCart className="h-3 w-3"/>} label="Parts / What to Search For" />
                <div className="mt-2 space-y-2">
                  {d.parts.map((p,i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-divider bg-canvas p-3">
                      <span className="text-base shrink-0">{p.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink">{p.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{p.note}</p>
                        {p.search && <a href={p.search} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">🔍 Search on {p.brand??'iFixit'} ↗</a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {d.steps && d.steps.length > 0 && (
              <div>
                <SectionTitle label="Step-by-Step Guide" />
                <ol className="mt-2 space-y-2">
                  {d.steps.map((s,i) => (
                    <li key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${s.warn ? 'border-amber-200 bg-amber-50':'border-divider bg-canvas'}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-surface ${s.warn?'bg-amber-500':'bg-ink'}`}>{i+1}</span>
                      <p className={`text-xs leading-relaxed ${s.warn?'text-amber-800':'text-ink'}`}>{s.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {d.refs && d.refs.length > 0 && (
              <div>
                <SectionTitle icon={<BookOpen className="h-3 w-3"/>} label="Sources & References" />
                <div className="mt-2 space-y-1.5">
                  {d.refs.map((r,i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-2.5 rounded-lg border border-divider bg-canvas p-2.5 text-ink transition-colors hover:border-blue-300">
                      <span className="shrink-0 text-base">{r.icon}</span>
                      <div><p className="text-xs font-bold">{r.label}</p><p className="text-[11px] text-muted">{r.src}</p></div>
                      <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>}
      </aside>
    </>
  )
}

function SectionTitle({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-muted">
      {icon}{label}
      <div className="flex-1 border-t border-divider ml-1" />
    </div>
  )
}

// ================================================================
//  REASONING STRIP
// ================================================================
function ReasoningStrip({ chips }: { chips: ReasoningChip[] }) {
  if (!chips.length) return null
  return (
    <div className="border-b border-divider bg-surface px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted shrink-0">
          Why this roadmap
        </span>
        {chips.map((c, i) => (
          <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP_CLS[c.cls] ?? CHIP_CLS.brand}`}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ================================================================
//  SUB-STEP ROW
// ================================================================
type SubItem = NonNullable<RoadmapStep['subItems']>[number]

function SubRow({ item, onToggle, onDetail }: {
  item: SubItem
  onToggle: (id: string) => void
  onDetail: (id: string) => void
}) {
  const hasDetail = !!DETAILS[item.id]
  return (
    <div className={`flex min-h-[44px] items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-all ${
      item.completed ? 'border-ink/15 bg-ink/5' : 'border-divider bg-surface hover:border-ink/20 hover:bg-canvas'
    }`}>
      {/* Checkbox */}
      <button
        role="checkbox" aria-checked={item.completed}
        aria-label={`${item.completed ? 'Unmark' : 'Mark'} "${item.title}" as complete`}
        onClick={() => onToggle(item.id)}
        className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
          item.completed ? 'border-ink bg-ink' : 'border-divider hover:border-ink/50'
        }`}
      >
        {item.completed && <CheckCircle2 className="h-3 w-3 text-surface" aria-hidden />}
      </button>
      {/* Text */}
      <button className="min-w-0 flex-1 text-left" onClick={() => onToggle(item.id)}>
        <p className={`text-sm font-medium leading-snug ${item.completed ? 'line-through text-muted' : 'text-ink'}`}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>
      </button>
      {/* Details button */}
      {hasDetail && (
        <button
          onClick={e => { e.stopPropagation(); onDetail(item.id) }}
          className="shrink-0 self-start rounded border border-divider px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted transition-all hover:border-ink hover:bg-canvas hover:text-ink"
          aria-label={`View guide for ${item.title}`}
        >
          Guide
        </button>
      )}
    </div>
  )
}

// ================================================================
//  STEP CARD  — clean vertical design
// ================================================================
function StepCard({ step, stepNumber, status, filter, onToggleStep, onToggleSub, onToggleOpen, onDetail }: {
  step: RoadmapStep
  stepNumber: number
  status: StepStatus
  filter: FilterResult
  onToggleStep: (id: string) => void
  onToggleSub: (stepId: string, subId: string) => void
  onToggleOpen: (id: string) => void
  onDetail: (subId: string) => void
}) {
  const cfg        = step.completed ? STATUS_CFG.done : STATUS_CFG[status]
  const isUnsafe   = status === 'unsafe'
  const isSkipped  = status === 'skipped'
  const isClickable = !isUnsafe && !isSkipped
  const diy        = step.diy ? DIY_BADGE[step.diy] : null
  const skipReason = filter.skipReasons[step.id]

  // Filter out skipped sub-items for this device
  const visibleSubs = (step.subItems ?? []).filter(
    si => !filter.skippedSubIds.includes(si.id)
  )
  const hasSubs = visibleSubs.length > 0 && !isUnsafe && !isSkipped

  return (
    <div className={`rounded-xl border-2 transition-all duration-200 ${cfg.border} ${cfg.bg} ${
      isClickable ? 'cursor-pointer hover:shadow-md' : ''
    } ${isSkipped ? 'opacity-40' : ''}`}>

      {/* ── Card header ── */}
      <div
        role={isClickable ? 'button' : 'note'}
        tabIndex={isClickable ? 0 : -1}
        aria-label={step.title}
        onClick={() => { if (isClickable) onToggleStep(step.id) }}
        onKeyDown={e => { if ((e.key==='Enter'||e.key===' ') && isClickable) { e.preventDefault(); onToggleStep(step.id) } }}
        className="flex items-start gap-3 p-4"
      >
        {/* Step number bubble */}
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all mt-0.5 ${
          step.completed
            ? 'bg-ink text-surface'
            : status === 'priority'
              ? 'bg-purple/80 text-surface'
              : status === 'recommended'
                ? 'bg-brand-600 text-surface'
                : 'bg-canvas border border-divider text-muted'
        }`}>
          {step.completed ? <CheckCircle2 className="h-4 w-4" /> : stepNumber}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            {step.icon && <span aria-hidden className="text-base leading-none">{step.icon}</span>}
            <span className={`text-sm font-bold leading-snug md:text-[15px] ${step.completed ? 'line-through text-muted' : 'text-ink'}`}>
              {step.title}
            </span>
            {cfg.text && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${cfg.badge}`}>
                {cfg.text}
              </span>
            )}
          </div>

          {/* Description */}
          {!isSkipped && (
            <p className="mt-1 text-xs leading-relaxed text-muted md:text-[13px]">{step.description}</p>
          )}

          {/* Skip reason */}
          {isSkipped && skipReason && (
            <p className="mt-1 text-xs italic text-muted">Not needed: {skipReason}</p>
          )}

          {/* Unsafe notice */}
          {isUnsafe && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-recycle-100 px-2.5 py-2 text-xs font-semibold text-recycle-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Do not attempt without a certified technician. Take to a shop.
            </div>
          )}

          {/* Bottom row: DIY tag + Connect CTA + ref link */}
          {!isUnsafe && !isSkipped && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {diy && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${diy.cls}`}>
                  {diy.label}
                </span>
              )}
              {step.isConnect && (
                <Link
                  to={`/connect${step.connectFilter ? `?filter=${step.connectFilter}` : ''}`}
                  state={{ direction: filter.direction }}
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-surface transition-opacity hover:opacity-80"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Find {filter.direction === 'REPAIR' ? 'repair shop' : 'drop-off point'}
                </Link>
              )}
              {step.refLabel && step.refUrl && (
                <a href={step.refUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted underline decoration-divider hover:text-ink hover:decoration-ink transition-colors">
                  <ExternalLink className="h-3 w-3" />{step.refLabel}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Sub-steps ── */}
      {hasSubs && (
        <div className="border-t border-divider/60 px-4 pb-3">
          <button
            onClick={() => onToggleOpen(step.id)}
            aria-expanded={step.subOpen}
            className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-muted transition-colors hover:text-ink"
          >
            {step.subOpen
              ? <><ChevronUp className="h-3.5 w-3.5" />Hide {visibleSubs.length} sub-step{visibleSubs.length!==1?'s':''}</>
              : <><ChevronDown className="h-3.5 w-3.5" />Show {visibleSubs.length} sub-step{visibleSubs.length!==1?'s':''}</>
            }
          </button>
          {step.subOpen && (
            <div className="space-y-1.5 pb-1 animate-in fade-in-0 slide-in-from-top-1 duration-150">
              {visibleSubs.map(sub => (
                <SubRow
                  key={sub.id}
                  item={sub}
                  onToggle={subId => onToggleSub(step.id, subId)}
                  onDetail={onDetail}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ================================================================
//  PHASE SECTION  — clean accordion with progress dot
// ================================================================
function PhaseSection({ phase, phaseIndex, filter, stepOffset, onToggleStep, onToggleSub, onToggleOpen, onDetail }: {
  phase: RoadmapPhase; phaseIndex: number; filter: FilterResult; stepOffset: number
  onToggleStep: (id: string) => void
  onToggleSub: (stepId: string, subId: string) => void
  onToggleOpen: (id: string) => void
  onDetail: (subId: string) => void
}) {
  const doneInPhase   = phase.steps.filter(s => s.completed).length
  const totalInPhase  = phase.steps.length
  const phasePct      = totalInPhase > 0 ? Math.round((doneInPhase / totalInPhase) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Phase header */}
      <div className="flex items-center gap-3">
        {/* Progress ring */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-divider,#E6E6E6)" strokeWidth="3" />
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor"
              strokeWidth="3" strokeDasharray={`${2*Math.PI*13}`}
              strokeDashoffset={`${2*Math.PI*13*(1-phasePct/100)}`}
              className="text-ink transition-all duration-500" strokeLinecap="round" />
          </svg>
          <span className="relative text-[10px] font-extrabold text-ink">{phaseIndex+1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">{phase.phase}</p>
          <p className="text-xs text-muted">{doneInPhase}/{totalInPhase} completed</p>
        </div>
        {doneInPhase === totalInPhase && totalInPhase > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-bold text-ink">
            <CheckCircle2 className="h-3.5 w-3.5" />Done
          </span>
        )}
      </div>

      {/* Steps — vertical stack */}
      <div className="ml-4 space-y-3 border-l-2 border-divider pl-6">
        {phase.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            stepNumber={stepOffset + i + 1}
            status={resolveStatus(step, filter)}
            filter={filter}
            onToggleStep={onToggleStep}
            onToggleSub={onToggleSub}
            onToggleOpen={onToggleOpen}
            onDetail={onDetail}
          />
        ))}
      </div>
    </div>
  )
}

// ================================================================
//  MAIN PAGE
// ================================================================
export default function NavigatePage() {
  const nav      = useNavigate()
  const location = useLocation()
  const state    = location.state as { result?: AssessmentResult; form?: DeviceFormData } | null

  const result    = state?.result ?? null
  const form      = state?.form   ?? null
  const direction = result?.direction ?? 'REPAIR'
  const deviceLabel = form ? `${form.brand} ${form.model}`.trim() || 'your device' : 'your device'

  const filter: FilterResult = result && form
    ? buildFilterResult(form, result)
    : {
        direction: direction as 'REPAIR'|'RECYCLE',
        score: result?.score ?? 0,
        reasoningChips: [], priorityStepIds: [], recommendedStepIds: [],
        skippedStepIds: [], unsafeStepIds: [], skipReasons: {},
        skippedSubIds: [], deviceClass: 'unknown',
      }

  const [phases, setPhases]       = useState<RoadmapPhase[]>(() => getRoadmapPhases(direction))
  const [activeDetail, setDetail] = useState<string|null>(null)

  useEffect(() => { setPhases(getRoadmapPhases(direction)) }, [direction])

  const toggleStep = useCallback((id: string) => {
    setPhases(p => p.map(ph => ({ ...ph, steps: ph.steps.map(s => s.id===id ? {...s,completed:!s.completed} : s) })))
  }, [])

  const toggleSub = useCallback((stepId: string, subId: string) => {
    setPhases(p => p.map(ph => ({ ...ph, steps: ph.steps.map(s =>
      s.id!==stepId ? s : { ...s, subItems: s.subItems?.map(si => si.id===subId ? {...si,completed:!si.completed} : si) }
    )})))
  }, [])

  const toggleOpen = useCallback((id: string) => {
    setPhases(p => p.map(ph => ({ ...ph, steps: ph.steps.map(s => s.id===id ? {...s,subOpen:!s.subOpen} : s) })))
  }, [])

  const openDetail  = useCallback((id: string) => setDetail(id), [])
  const closeDetail = useCallback(() => setDetail(null), [])

  // Progress (excluding skipped steps and their subs)
  const skipped       = filter.skippedStepIds
  const skippedSubs   = filter.skippedSubIds
  const allSteps      = phases.flatMap(ph => ph.steps)
  const relSteps      = allSteps.filter(s => !skipped.includes(s.id))
  const relSubs       = relSteps.flatMap(s => (s.subItems??[]).filter(si => !skippedSubs.includes(si.id)))
  const done          = relSteps.filter(s=>s.completed).length + relSubs.filter(si=>si.completed).length
  const total         = relSteps.length + relSubs.length
  const progress      = total > 0 ? Math.round((done/total)*100) : 0
  const isComplete    = done===total && total>0

  let offset = 0

  return (
    <div className="min-h-screen bg-section-roadmap">
      <ReasoningStrip chips={filter.reasoningChips} />

      <div className="page-container-md space-y-6 py-6">

        {/* ── Header ── */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              {direction==='REPAIR' ? 'Your Repair Roadmap' : 'Your Recycle Roadmap'}
            </h1>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              direction==='REPAIR' ? 'bg-ink/10 text-ink' : 'bg-brand-100 text-brand-700'}`}>
              {direction==='REPAIR'
                ? <><WrenchIcon className="h-3 w-3"/>REPAIR</>
                : <><Recycle className="h-3 w-3"/>RECYCLE</>
              }
            </span>
            {result && (
              <span className="rounded-full bg-canvas border border-divider px-2.5 py-0.5 text-xs font-semibold text-muted">
                Score {result.score}/100 · {result.confidence} confidence
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Steps personalised for{' '}
            <span className="font-semibold text-ink">{deviceLabel}</span>
            {form?.issue && <>.{' '}Issue: <span className="font-semibold text-ink">{form.issue}</span></>}.
          </p>
        </div>

        {/* ── Progress bar ── */}
        <div className="rounded-xl border border-divider bg-surface p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">Overall Progress</span>
            <span className="text-muted">{done} / {total} steps</span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-divider"
            role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-ink transition-all duration-500" style={{width:`${progress}%`}}/>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted">
            <span>{progress}% complete</span>
            {filter.skippedSubIds.length + filter.skippedStepIds.length > 0 && (
              <span>{filter.skippedStepIds.length} steps + sub-steps filtered for your {filter.deviceClass.replace('-',' ')}</span>
            )}
          </div>
          {isComplete && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-sm font-semibold text-ink">
              <CheckCircle2 className="h-4 w-4 shrink-0"/>All steps completed! 🎉
            </div>
          )}
        </div>

        {/* ── Assessment context ── */}
        {result && (
          <div className="rounded-xl border border-divider bg-surface p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Assessment result</p>
            <p className="mt-1.5 text-sm text-ink leading-relaxed">{result.rationale}</p>
            {result.costEstimate && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple/20 border border-purple/30 px-3 py-1.5 text-sm font-medium text-ink">
                Estimated repair cost: ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* ── Recycle notice ── */}
        {direction==='RECYCLE' && (
          <div className="flex items-start gap-3 rounded-lg border border-ink/15 bg-ink/5 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink"/>
            <div>
              <p className="text-sm font-semibold text-ink">Data wipe is mandatory before recycling</p>
              <p className="mt-0.5 text-xs text-muted">Required by the Data Privacy Act (R.A. 10173). Permanently erase all personal data first.</p>
            </div>
          </div>
        )}

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-divider bg-surface px-4 py-3">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted w-full sm:w-auto">Legend</span>
          {Object.entries(STATUS_CFG).filter(([k])=>k!=='default').map(([k,v]) => (
            <span key={k} className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`h-2.5 w-2.5 rounded-full ${v.dot}`}/>{k.charAt(0).toUpperCase()+k.slice(1)}
            </span>
          ))}
        </div>

        {/* ── Roadmap ── */}
        <div className="space-y-10">
          {phases.map((phase, idx) => {
            const o = offset; offset += phase.steps.length
            return (
              <PhaseSection key={phase.phase} phase={phase} phaseIndex={idx} filter={filter}
                stepOffset={o} onToggleStep={toggleStep} onToggleSub={toggleSub}
                onToggleOpen={toggleOpen} onDetail={openDetail} />
            )
          })}
        </div>

        {/* ── Completion banner ── */}
        {isComplete && (
          <div className="rounded-2xl border-2 border-ink bg-section-hero p-6 text-center">
            <h3 className="text-xl font-bold text-ink">🎉 All steps completed!</h3>
            <p className="mt-1 text-sm text-muted">
              Head to <strong>Connect</strong> to find a certified{' '}
              {direction==='REPAIR' ? 'repair shop' : 'recycling facility'} near you.
            </p>
            <Link to={`/connect?filter=${direction==='REPAIR'?'repair':'recycling'}`}
              className="btn-accent mt-4 inline-flex w-auto gap-2">
              Open Connect <ArrowRight className="h-4 w-4"/>
            </Link>
          </div>
        )}

        {/* ── No assessment fallback ── */}
        {!result && (
          <div className="rounded-xl border border-divider bg-surface p-6 text-center">
            <p className="text-sm text-muted">No assessment found.</p>
            <button onClick={() => nav('/assess')}
              className="mt-2 text-sm font-semibold text-ink underline hover:opacity-70">
              Take an assessment first →
            </button>
          </div>
        )}
      </div>

      <DetailPanel subId={activeDetail} onClose={closeDetail} />
    </div>
  )
}