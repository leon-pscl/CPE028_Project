/**
 * NavigatePage.tsx
 * Full repair + recycle roadmap driven by AssessPage output.
 * Layout: horizontal progress rail with numbered bubble nodes.
 * Clicking a node reveals its sub-tasks in an expandable detail panel below.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  CheckCircle2, Circle, MapPin, AlertCircle, ExternalLink,
  AlertTriangle, Wrench, Recycle, ArrowRight, X,
  Wrench as WrenchIcon, ShoppingCart, BookOpen, ChevronRight,
} from 'lucide-react'
import { getRoadmapPhases } from './roadmapData'
import { buildFilterResult } from './roadmapFilter'
import { loadAssessment } from '@/lib/assessmentStore'
import { db } from '@/lib/database'
import type {
  RoadmapStep, RoadmapPhase, StepStatus, FilterResult,
  AssessmentResult, DeviceFormData, ReasoningChip,
} from '@/types'

// ================================================================
// DETAIL DATABASE
// ================================================================
interface DetailTool   { name: string; icon: string; type: 'essential' | 'optional' | 'caution' }
interface DetailPart   { name: string; icon: string; note: string; search?: string; brand?: string }
interface DetailStep   { text: string; warn?: boolean }
interface DetailRef    { icon: string; label: string; url: string; src: string }
interface DetailSafety { type: 'info' | 'warn' | 'danger'; msg: string }
interface SubDetail {
  icon: string; title: string; note: string
  safety?: DetailSafety[]; tools?: DetailTool[]; parts?: DetailPart[]
  steps?: DetailStep[]; refs?: DetailRef[]
}

const DETAILS: Record<string, SubDetail> = {
  bu_cloud_mobile:{icon:'💾',title:'Enable Full Cloud Backup (Mobile)',note:'Back up all data before any physical repair.',
    safety:[{type:'info',msg:'Do this FIRST — data loss during repair is irreversible.'}],tools:[],parts:[],
    steps:[{text:'Android: Settings → Google → Backup → Back up now.'},{text:'iOS: Settings → [Your Name] → iCloud → iCloud Backup → Back Up Now.'},{text:'WhatsApp: Settings → Chats → Chat Backup → Back Up Now.'},{text:'Google Authenticator: three-dot menu → Transfer accounts → Export accounts.'}],
    refs:[{icon:'📘',label:'Google Backup Help',url:'https://support.google.com/android/answer/2819582',src:'Google Support'},{icon:'📘',label:'iCloud Backup Guide',url:'https://support.apple.com/en-us/108922',src:'Apple Support'}]},
  bu_cloud_laptop:{icon:'💾',title:'Back Up Laptop',note:'Full backup before any hardware work.',
    safety:[{type:'info',msg:'An external SSD/HDD is faster than cloud-only for large backups.'}],tools:[{name:'External HDD/SSD',icon:'💽',type:'essential'}],parts:[],
    steps:[{text:'Windows: Settings → Update & Security → Backup → Add a drive.'},{text:'macOS: System Settings → General → Time Machine → Add Backup Disk.'},{text:'Export browser bookmarks and passwords before wiping.'}],
    refs:[{icon:'📘',label:'Windows Backup',url:'https://support.microsoft.com/en-us/windows/back-up-your-windows-pc',src:'Microsoft'},{icon:'📘',label:'macOS Time Machine',url:'https://support.apple.com/en-us/104984',src:'Apple'}]},
  bu_apps:{icon:'📱',title:'Export App-Specific Data',note:'Standard cloud backup may miss some app data.',tools:[],parts:[],
    steps:[{text:'WhatsApp: Settings → Chats → Chat Backup → Back Up Now.'},{text:'Google Authenticator: Transfer accounts → Export accounts.'},{text:'GCash / Maya: note your MPIN and linked mobile number.'},{text:'BDO, BPI, Metrobank: screenshot account numbers — re-enrollment after repair is standard.'}],
    refs:[{icon:'📘',label:'WhatsApp Backup',url:'https://faq.whatsapp.com/android/chats/how-to-back-up-to-google-drive',src:'WhatsApp FAQ'}]},
  wt_manuf:{icon:'🛡️',title:'Check Manufacturer Warranty',note:'If under warranty, repairs may be free.',tools:[],parts:[],
    steps:[{text:'Apple: checkcoverage.apple.com — enter serial number from Settings → General → About.'},{text:'Samsung: samsung.com/ph/support or call 1-800-10-726-7864. Standard warranty: 1 year.'},{text:'Lenovo: support.lenovo.com — enter serial number from bottom label.'},{text:'HP / ASUS / Acer / Dell: check manufacturer PH support portal.'},{text:'If under warranty — submit warranty claim BEFORE any DIY attempt.'}],
    refs:[{icon:'🌐',label:'Apple Warranty Check',url:'https://checkcoverage.apple.com',src:'Apple'},{icon:'🌐',label:'Samsung Warranty PH',url:'https://www.samsung.com/ph/support/',src:'Samsung PH'}]},
  sd_restart:{icon:'🔄',title:'Force Restart the Device',note:'Clears temporary system states without erasing data.',tools:[],parts:[],
    steps:[{text:'iPhone 8+: press Volume Up, Volume Down, then hold Side button until Apple logo.'},{text:'Samsung Galaxy: hold Power + Volume Down for 7–10 seconds.'},{text:'Most Android: hold Power button for 10 seconds.'},{text:'Windows laptop: hold Power button for 10 seconds. Wait 30 seconds, then restart.'},{text:'MacBook: hold Power (Touch ID) for 10 seconds.'}],
    refs:[{icon:'📘',label:'Samsung force restart',url:'https://www.samsung.com/us/support/answer/ANS00077958/',src:'Samsung Support'}]},
  sd_bat_mob:{icon:'🔋',title:'Check Battery Health (Mobile)',note:'Quickly diagnose battery capacity without opening the device.',tools:[{name:'AccuBattery app (Android)',icon:'📱',type:'essential'}],parts:[],
    steps:[{text:'iOS: Settings → Battery → Battery Health & Charging. Below 80% = eligible for battery service.'},{text:'Samsung: dial *#0228# to see current voltage and temperature.'},{text:'Android (any): AccuBattery (free on Play Store) → Health tab.'},{text:'Below 80% capacity OR battery warm during light use = replacement likely needed.'}],
    refs:[{icon:'📘',label:'Apple Battery Health',url:'https://support.apple.com/en-us/111878',src:'Apple Support'},{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  sd_bat_lap:{icon:'💻',title:'Run Battery Report (Laptop)',note:'Generate a detailed battery health report.',tools:[],parts:[],
    steps:[{text:'Windows: Win+R → cmd → powercfg /batteryreport → open HTML report in user folder.'},{text:'"Full Charge Capacity" below 80% of "Design Capacity" = replacement recommended.'},{text:'macOS: hold Option + click Battery icon → shows Condition.'},{text:'macOS detailed: coconutBattery app (free).'}],
    refs:[{icon:'🌐',label:'Microsoft: powercfg',url:'https://support.microsoft.com/en-us/windows/battery-report-windows',src:'Microsoft'},{icon:'🌐',label:'coconutBattery',url:'https://www.coconut-flavour.com/coconutbattery/',src:'coconut-flavour.com'}]},
  sd_storage:{icon:'💾',title:'Check Storage Health (Laptop)',note:'Failing storage causes slowness and crashes.',tools:[{name:'CrystalDiskInfo (Windows, free)',icon:'💻',type:'essential'},{name:'Disk Utility (macOS, built-in)',icon:'💻',type:'essential'}],parts:[],
    steps:[{text:'Windows: download CrystalDiskInfo. Blue = Good, yellow = Caution, red = Bad.'},{text:'macOS: Disk Utility → Select drive → First Aid → Run.'},{text:'Yellow/red in CrystalDiskInfo — back up immediately.'}],
    refs:[{icon:'🌐',label:'CrystalDiskInfo',url:'https://crystalmark.info/en/software/crystaldiskinfo/',src:'CrystalMark'}]},
  bc_cycle:{icon:'🔋',title:'Check Battery Cycle Count',note:'High cycles = degraded capacity.',tools:[{name:'AccuBattery (Android)',icon:'📱',type:'essential'},{name:'coconutBattery (macOS)',icon:'💻',type:'optional'}],parts:[],
    steps:[{text:'Smartphones: replace after ~500 full cycles. MacBooks: 1,000 cycles.'},{text:'Android: AccuBattery → Health tab shows charge cycles.'},{text:'macOS Terminal: system_profiler SPPowerDataType | grep "Cycle Count".'},{text:'Windows: powercfg /batteryreport → HTML report shows cycle count.'},{text:'iPhone iOS 17+: Settings → Battery → Battery Health & Charging → Battery Health.'}],
    refs:[{icon:'📘',label:'Apple: MacBook battery cycles',url:'https://support.apple.com/en-us/111902',src:'Apple Support'}]},
  bc_swell:{icon:'⚠️',title:'Inspect for Battery Swelling',note:'A swollen battery is a fire hazard — do NOT charge.',
    safety:[{type:'danger',msg:'STOP immediately if swelling is visible. Do NOT charge. Do NOT puncture. Take to a certified shop or e-waste facility within 24 hours.'}],tools:[],parts:[],
    steps:[{text:'Mobile: press lightly on center of back panel. If it flexes or feels raised — battery is swelling.'},{text:'Laptop: swollen battery pushes trackpad upward or bows bottom panel outward.'},{text:'Store on a non-flammable surface away from combustibles until safely disposed of.'},{text:'Take to DENR-accredited e-waste facility or Samsung/Apple service center.',warn:true}],
    refs:[{icon:'📘',label:'iFixit: Swollen Battery Safety',url:'https://www.ifixit.com/Wiki/What_to_do_with_a_swollen_battery',src:'iFixit'},{icon:'📘',label:'Apple: Swollen battery',url:'https://support.apple.com/en-us/101592',src:'Apple Support'}]},
  bc_heat:{icon:'🌡️',title:'Check for Abnormal Battery Heat',note:'Warmth during light use = cell degradation.',tools:[{name:'AccuBattery app (Android)',icon:'📱',type:'essential'}],parts:[],
    steps:[{text:'Normal: slightly warm during charging or intensive use.'},{text:'Abnormal: warm during standby, during a voice call, or right after unplugging.'},{text:'Android: AccuBattery → Real-time tab. Above 40°C at idle = flag.'},{text:'iOS: "Temperature — iPhone needs to cool down" during normal use = battery failing.'}],
    refs:[{icon:'📱',label:'AccuBattery',url:'https://play.google.com/store/apps/details?id=com.digibites.accubattery',src:'Google Play'}]},
  sc_pixel:{icon:'🖥️',title:'Run a Dead-Pixel Test',note:'Checks for stuck or dead pixels.',tools:[{name:'jscreenfix.com (free)',icon:'🌐',type:'essential'}],parts:[],
    steps:[{text:'Open jscreenfix.com → Launch JScreenFix. Cycles through colors to reveal stuck pixels.'},{text:'Dead pixel (permanently black): physical damage — cannot be fixed.'},{text:'Stuck pixel (one color): often fixable with jscreenfix running 10–20 minutes.'},{text:'More than 3–5 clustered stuck pixels = screen replacement likely needed.'}],
    refs:[{icon:'🌐',label:'JScreenFix',url:'https://www.jscreenfix.com',src:'JScreenFix'}]},
  sc_back:{icon:'💡',title:'Test for Backlight Failure',note:'Backlight failure is different from panel failure.',tools:[{name:'Flashlight',icon:'🔦',type:'essential'}],parts:[],
    steps:[{text:'Set screen to max brightness, open a white image, go to a dark room.'},{text:'Shine flashlight at an angle onto the screen.'},{text:'Faint visible content = backlight failed (panel intact). No image = panel or GPU failed.'}],
    refs:[{icon:'📘',label:'iFixit: Laptop display troubleshooting',url:'https://www.ifixit.com/Troubleshooting/PC_Laptop',src:'iFixit'}]},
  sc_touch:{icon:'📱',title:'Mobile Touch Responsiveness Test',note:'Confirms if the digitizer layer is functional.',tools:[{name:'Multi-touch test app',icon:'📱',type:'essential'}],parts:[],
    steps:[{text:'Samsung: dial *#*#2664#*#* — opens the built-in touch test.'},{text:'Other Android: search "touch screen test" on the Play Store.'},{text:"Test every corner and edge — digitizer damage is often localised to one zone."},{text:"Zones that don't respond = digitizer damaged. Full display assembly replacement needed."}],
    refs:[{icon:'📘',label:'iFixit: Phone screen diagnosis',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  sc_crack:{icon:'🔍',title:'Assess Physical Crack Depth',note:'Depth determines repair cost and urgency.',tools:[{name:'Flashlight',icon:'🔦',type:'optional'}],parts:[],
    steps:[{text:'Surface crack only (no color distortion): functional. Screen protector prevents further damage.'},{text:'Crack reaches OLED/LCD (ink bleeding, black patches): full display replacement needed immediately.'},{text:'Laptop: connect to external monitor to confirm GPU still works.'},{text:'Search: "[your model] screen replacement" on iFixit, Lazada, or Shopee.'}],
    refs:[{icon:'📘',label:'iFixit: Phone screen repair',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  cp_clean:{icon:'🧹',title:'Clean the Charging Port',note:'Lint compaction is the #1 cause of charging failures.',
    safety:[{type:'warn',msg:'Never use metal objects inside the port — they can short circuit connectors.'}],
    tools:[{name:'Dry wooden toothpick',icon:'🪥',type:'essential'},{name:'Compressed air can',icon:'💨',type:'essential'},{name:'Flashlight',icon:'🔦',type:'essential'}],parts:[],
    steps:[{text:'Power off completely before cleaning.'},{text:'Shine flashlight into the port. Look for lint compaction at the back.'},{text:'Use a dry wooden toothpick (NOT metal) to gently scrape lint from the back wall.'},{text:'Follow with a short burst of compressed air (held upright, 2–3 cm from port).'},{text:'Power on and test charging. Most Android charging failures are resolved by this step alone.'}],
    refs:[{icon:'📘',label:'iFixit: Charging port cleaning',url:'https://www.ifixit.com/Answers/View/85424/Phone+not+charging',src:'iFixit Community'}]},
  cp_cable:{icon:'🔌',title:'Test With Different Cable and Charger',note:'Cables fail far more often than ports.',tools:[{name:'Second USB-C cable (different brand)',icon:'🔌',type:'essential'}],parts:[],
    steps:[{text:'Try a completely different cable from a different manufacturer.'},{text:'Try a completely different charger/adapter — not just cable swap.'},{text:'Test on a different power outlet — surge damage can affect charger performance.'},{text:'USB-C meter (~₱500–800 on Shopee) shows actual watts delivered.'}],
    refs:[{icon:'📘',label:'iFixit: Charging troubleshooting',url:'https://www.ifixit.com/Troubleshooting/Phone',src:'iFixit'}]},
  cp_meter:{icon:'📊',title:'USB-C Meter Wattage Test',note:'Confirms actual charging power.',tools:[{name:'USB-C power meter (PortaPow / WITRN)',icon:'📊',type:'essential'}],parts:[],
    steps:[{text:'Purchase a USB-C power meter (search on Shopee/Lazada — ₱400–900).'},{text:'Connect: wall charger → USB-C meter → phone. Meter displays voltage, amperage, wattage.'},{text:"Compare displayed wattage to charger's rated output."},{text:'If delivered watts = rated output — port is fine. Investigate battery health instead.'}],
    refs:[{icon:'📘',label:'iFixit: USB-C diagnosis',url:'https://www.ifixit.com/Troubleshooting/Phone',src:'iFixit'}]},
  cp_pins:{icon:'🔍',title:'Inspect Port for Bent Pins or Corrosion',note:'Visible damage means port replacement.',tools:[{name:'Flashlight or magnifying glass',icon:'🔦',type:'essential'}],
    parts:[{name:'USB-C port replacement assembly',icon:'🔌',search:'https://www.ifixit.com/Search?query=charging+port+replacement',note:'Search "[your model] charging port replacement" on iFixit. Difficulty varies by model.',brand:'iFixit / Shopee'}],
    steps:[{text:'Power off. Shine flashlight directly into port at various angles.'},{text:'Green or white residue = corrosion from liquid exposure. Port replacement needed.'},{text:'Bent pins: visible as asymmetric or collapsed pins. Port replacement required.'},{text:'iPhones 12 and newer — charging port is on the logic board. Microsoldering = shop only.'}],
    refs:[{icon:'📘',label:'iFixit: Port guides',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  ot_temp:{icon:'🌡️',title:'Monitor CPU/GPU Temperature',note:'Identify if overheating is throttling or hardware fault.',tools:[{name:'HWMonitor (Windows, free)',icon:'💻',type:'essential'},{name:'iStat Menus (macOS)',icon:'💻',type:'optional'}],parts:[],
    steps:[{text:'Windows: download HWMonitor (cpuid.com). Look for "Package" or "Core #0" temperatures.'},{text:'Safe range: CPU ≤85°C under load. Throttle threshold: 95°C+. Idle: 35–50°C.'},{text:'macOS: iStat Menus (paid) or the free Stats app from GitHub.'},{text:'CPU hits 95°C+ within 2 minutes of load = thermal paste likely needs reapplication.'}],
    refs:[{icon:'🌐',label:'HWMonitor',url:'https://www.cpuid.com/softwares/hwmonitor.html',src:'CPUID'}]},
  ot_clean:{icon:'💨',title:'Clean Laptop Vents (External)',note:'No disassembly needed — the easiest thermal fix.',
    safety:[{type:'warn',msg:'Hold the compressed air can upright. Never tip it — liquid propellant can damage electronics.'}],
    tools:[{name:'Compressed air can (with straw nozzle)',icon:'💨',type:'essential'}],parts:[],
    steps:[{text:'Power off and unplug the laptop.'},{text:'Short 1–2 second bursts from 10–15 cm into the exhaust vents.'},{text:'Repeat until no visible dust comes out.'},{text:'A 10–20°C drop is normal after a good cleaning.'}],
    refs:[{icon:'📘',label:'iFixit: Laptop Overheating',url:'https://www.ifixit.com/Troubleshooting/Acer_Laptop/Overheating/614752',src:'iFixit'}]},
  ot_pad:{icon:'🛌',title:'Use a Laptop Cooling Pad',note:'Immediate, no-risk thermal improvement.',tools:[{name:'Laptop cooling pad with USB fan(s)',icon:'💨',type:'essential'}],
    parts:[{name:'Laptop Cooling Pad',icon:'💨',search:'https://www.lazada.com.ph/catalog/?q=laptop+cooling+pad',note:'Search "laptop cooling pad" on Lazada/Shopee. Typical cost ₱350–900.',brand:'Shopee / Lazada'}],
    steps:[{text:'Place cooling pad on a flat surface. Set laptop on top with intake vents over fans.'},{text:"Connect pad USB to laptop's USB-A port."},{text:'If temperatures drop 5–15°C and throttling stops — cooling pad is a valid long-term solution.'},{text:'If temperatures remain high even with pad — internal fan or thermal paste is the issue.'}],
    refs:[{icon:'📘',label:'iFixit: Overheating',url:'https://www.ifixit.com/Troubleshooting/PC_Laptop',src:'iFixit'}]},
  ot_paste:{icon:'🔧',title:'Thermal Paste Reapplication (Shop)',note:'Most effective thermal fix, but requires full disassembly.',
    safety:[{type:'warn',msg:'Wear an anti-static wrist strap. Ground yourself before touching any component.'}],
    tools:[{name:'Phillips / Torx T5/T8 screwdrivers',icon:'🔩',type:'essential'},{name:'Arctic MX-4 or Noctua NT-H1',icon:'🧴',type:'essential'},{name:'90%+ isopropyl alcohol',icon:'🧪',type:'essential'}],
    parts:[{name:'Thermal paste (Arctic MX-4 or Noctua NT-H1)',icon:'🧴',search:'https://www.lazada.com.ph/catalog/?q=thermal+paste',note:'Cost: ₱350–600 on Shopee/Lazada.',brand:'Arctic / Noctua'}],
    steps:[{text:'Search "[your laptop model] thermal paste replacement" on iFixit or YouTube first.'},{text:'Remove all bottom screws. Photo the layout before starting.'},{text:'Clean old paste with microfiber cloth dampened with 90%+ isopropyl alcohol.'},{text:'Apply a pea-sized (2–3 mm) amount to center of CPU die. Do NOT spread it.'},{text:'Reinstall heatsink in an X-pattern (tighten opposite corners progressively).'}],
    refs:[{icon:'📘',label:'iFixit: Thermal paste guide',url:'https://www.ifixit.com/Wiki/Thermal_Paste_Application',src:'iFixit EDU'}]},
  sw_update:{icon:'⚙️',title:'Install All Pending OS and App Updates',note:'Most bugs are patched in updates.',tools:[],parts:[],
    steps:[{text:'Android: Settings → Software Update → Check for updates. Also: Play Store → Manage apps → Update all.'},{text:'iOS: Settings → General → Software Update.'},{text:'Windows: Settings → Windows Update → Check for updates.'},{text:'macOS: System Settings → General → Software Update.'}],
    refs:[{icon:'📘',label:'Apple iOS update',url:'https://support.apple.com/en-us/111900',src:'Apple Support'}]},
  sw_malware:{icon:'🛡️',title:'Run a Malware Scan',note:'Malware causes battery drain, overheating, and random shutdowns.',tools:[{name:'Malwarebytes (free)',icon:'🛡️',type:'essential'}],parts:[],
    steps:[{text:'Windows: Malwarebytes Free (malwarebytes.com). Run a full scan.'},{text:'macOS: Malwarebytes for Mac (free version).'},{text:'Android: Settings → Security → Google Play Protect → Scan.'},{text:'iOS: Settings → General → VPN & Device Management — check for rogue profiles.'}],
    refs:[{icon:'🌐',label:'Malwarebytes Free',url:'https://www.malwarebytes.com/free',src:'Malwarebytes'}]},
  sw_reset:{icon:'🔄',title:'Factory Reset (Last Software Resort)',note:'Resolves 90% of software issues. Data must be backed up first.',
    safety:[{type:'danger',msg:'Confirm backup is fully complete. This CANNOT be undone.'}],tools:[],parts:[],
    steps:[{text:'Android: Settings → General Management → Reset → Factory Data Reset.'},{text:'iOS: Settings → General → Transfer or Reset iPhone → Erase All Content and Settings.'},{text:'Windows: Settings → System → Recovery → Reset this PC → Remove everything.'},{text:'macOS (Apple Silicon): System Settings → General → Transfer or Reset → Erase All Content.'}],
    refs:[{icon:'📘',label:'Android reset',url:'https://support.google.com/android/answer/6088915',src:'Google Support'}]},
  sw_update2:{icon:'⚙️',title:'Install All Pending OS and App Updates',note:'Most bugs are patched in updates.',tools:[],parts:[],
    steps:[{text:'Android: Settings → Software Update → Check for updates.'},{text:'iOS: Settings → General → Software Update.'},{text:'Windows: Settings → Windows Update → Check for updates.'},{text:'macOS: System Settings → General → Software Update.'}],
    refs:[{icon:'📘',label:'Apple iOS update',url:'https://support.apple.com/en-us/111900',src:'Apple Support'}]},
  sw_malware2:{icon:'🛡️',title:'Run a Malware Scan',note:'Malware causes battery drain, overheating, and random shutdowns.',tools:[{name:'Malwarebytes (free)',icon:'🛡️',type:'essential'}],parts:[],
    steps:[{text:'Windows: Malwarebytes Free (malwarebytes.com). Run a full scan.'},{text:'macOS: Malwarebytes for Mac (free version).'},{text:'Android: Settings → Security → Google Play Protect → Scan.'},{text:'iOS: Settings → General → VPN & Device Management — check for rogue profiles.'}],
    refs:[{icon:'🌐',label:'Malwarebytes Free',url:'https://www.malwarebytes.com/free',src:'Malwarebytes'}]},
  ld_off:{icon:'⚡',title:'Power Off Immediately — Do NOT Charge',note:'Most critical step for liquid damage.',
    safety:[{type:'danger',msg:'Charging a wet device causes immediate short circuits. POWER OFF NOW.'}],tools:[],parts:[],
    steps:[{text:'Hold power button → select Power Off.'},{text:'If screen unresponsive: hold power for 10 seconds to force shutdown.'},{text:'Samsung: hold Power + Volume Down for 7 seconds.'},{text:'DO NOT plug in a charger, even if the device looks fine.'}],
    refs:[{icon:'📘',label:'iFixit: Liquid Damage Repair',url:'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',src:'iFixit'}]},
  ld_remove:{icon:'📦',title:'Remove All Removable Parts',note:'Maximize airflow and minimize corrosion pathways.',tools:[{name:'SIM ejector tool or paperclip',icon:'📎',type:'essential'}],parts:[],
    steps:[{text:'Eject SIM card tray. Remove SIM card and keep it safe.'},{text:'Remove microSD card if present.'},{text:'Remove case, screen protector, and all accessories.'},{text:'Pat exterior gently with a lint-free cloth. Do not rub.'}],
    refs:[{icon:'📘',label:'iFixit: Liquid Damage First Aid',url:'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',src:'iFixit'}]},
  ld_dry:{icon:'🌬️',title:'Dry With Silica Gel — NOT Rice',note:'Rice is ineffective and risks debris entering ports.',
    safety:[{type:'warn',msg:'Do NOT use a hairdryer or oven. Heat above 40°C can warp components.'}],
    tools:[{name:'Silica gel packets',icon:'🟠',type:'essential'},{name:'Sealed zip-lock bag',icon:'📦',type:'essential'}],parts:[],
    steps:[{text:'Pat exterior dry with a lint-free cloth.'},{text:'Place device and silica gel packets (from shoe boxes, medicine bottles) in a sealed bag.'},{text:'Leave sealed for 24–48 hours at room temperature.'},{text:"Do NOT use rice — it is ineffective and starch particles can clog ports."}],
    refs:[{icon:'📘',label:"iFixit: Why rice doesn't work",url:'https://www.ifixit.com/Guide/iPhone+Liquid+Damage+Repair/95280',src:'iFixit'}]},
  mb_drain:{icon:'⚡',title:'Hard Reset: Drain Residual Power',note:'Discharges capacitors that can keep a device in a bad state.',tools:[],parts:[],
    steps:[{text:'Unplug the device from power completely.'},{text:'Hold the power button for 30 full seconds.'},{text:'Laptops with removable batteries: disconnect battery, hold power 10 seconds, reconnect.'},{text:'Wait 30 seconds after releasing. Then press power normally.'}],
    refs:[{icon:'📘',label:'iFixit: Laptop No Power',url:'https://www.ifixit.com/Troubleshooting/PC_Laptop',src:'iFixit'}]},
  df_score:{icon:'📊',title:'Check iFixit Repairability Score',note:'iFixit scores devices 1–10 on DIY-friendliness.',tools:[],parts:[],
    steps:[{text:'Visit ifixit.com/repairability and search for your device model.'},{text:'Score 8–10: Highly DIY-friendly. Screwed components, parts available.'},{text:'Score 5–7: Moderate difficulty. Some glued components but DIY possible.'},{text:'Score 1–4: Shop recommended. Heavily glued or proprietary screws.'},{text:'Notable: Samsung Galaxy S-series = 4/10. iPhone 15/16 = 7/10. Framework Laptop = 10/10.'}],
    refs:[{icon:'📘',label:'iFixit Repairability Scores',url:'https://www.ifixit.com/repairability',src:'iFixit'}]},
  df_tools:{icon:'🔧',title:'Essential DIY Repair Tool Kit',note:'Minimum tools for safe electronics disassembly.',
    tools:[{name:'Phillips #00',icon:'🔩',type:'essential'},{name:'Torx T5/T8',icon:'🔩',type:'essential'},{name:'Pentalobe P5 (Apple)',icon:'🔩',type:'essential'},{name:'Plastic spudger (ESD-safe)',icon:'🪛',type:'essential'},{name:'Anti-static wrist strap',icon:'⚡',type:'essential'}],
    parts:[{name:'iFixit Essential Electronics Toolkit',icon:'🧰',search:'https://www.ifixit.com/products/essential-electronics-toolkit',note:'Includes 16 precision bits + spudger + tweezers. Available on iFixit.com.',brand:'iFixit'},{name:'Generic precision screwdriver set (budget)',icon:'🔩',search:'https://www.shopee.ph/search?keyword=precision+screwdriver+set',note:'Search "precision screwdriver set 60-in-1" on Shopee PH. Cost: ₱250–600.',brand:'Shopee PH'}],
    steps:[{text:'iFixit Essential Electronics Toolkit (~$30): covers 95% of phone and laptop repairs.'},{text:'Budget option: search "precision screwdriver 60-in-1" on Shopee — ₱250–600.'},{text:'Never use a flathead screwdriver near circuit boards — static discharge risk.'}],
    refs:[{icon:'📘',label:'iFixit Essential Toolkit',url:'https://www.ifixit.com/products/essential-electronics-toolkit',src:'iFixit'}]},
  df_decide:{icon:'🤔',title:'DIY vs Shop Decision Guide',note:'Match your issue type to the right approach.',tools:[],parts:[],
    steps:[{text:'DIY-safe (anyone): software fix/reset, external cleaning, RAM/SSD upgrade in screwed laptops.'},{text:'DIY with caution (iFixit ≥6): battery on removable/screwed phones, laptop keyboard.'},{text:'Shop recommended (iFixit ≤5): battery on glued flagship phones, screen replacement.'},{text:'Never DIY: iPhone charging port, OLED panel on flagships, water damage board cleaning.'},{text:'Cost check: if repair exceeds 60–70% of device value, recycle + buy refurbished is better.'}],
    refs:[{icon:'📘',label:'iFixit: Is it worth repairing?',url:'https://www.ifixit.com/repairability',src:'iFixit'}]},
  rs_auth:{icon:'🏆',title:'Authorized Service Centers in Philippines',note:'Use genuine OEM parts and honor manufacturer warranty.',tools:[],parts:[],
    steps:[{text:'Apple: locate.apple.com/ph — includes iStudio, Beyond the Box, Switch.'},{text:'Samsung: samsung.com/ph/support/service-center — 300+ locations nationwide.'},{text:'Lenovo: support.lenovo.com → Find a service provider → Philippines.'},{text:'HP: support.hp.com → Service Center Locator → Philippines.'},{text:'ASUS: asus.com/ph/support/Service-Center-Contents — 20+ locations in Metro Manila.'}],
    refs:[{icon:'🌐',label:'Apple AASP Locator PH',url:'https://locate.apple.com/ph/en',src:'Apple'},{icon:'🌐',label:'Samsung Service Center PH',url:'https://www.samsung.com/ph/support/service-center/',src:'Samsung PH'}]},
  rs_quote:{icon:'📋',title:'Get a Written Repair Quote',note:'Verbal quotes are unenforceable.',tools:[],parts:[],
    steps:[{text:'Ask for written diagnostic fee (if any). Reputable shops charge ₱0–500 for diagnosis.'},{text:'Quote must include: parts cost, labor cost, estimated completion date.'},{text:'Ask: "Will you call me before proceeding if additional issues are found?"'},{text:'Red flag: shop that pressures you or cannot give an itemized quote.'}],
    refs:[{icon:'📘',label:'iFixit: Choosing a repair shop',url:'https://www.ifixit.com/Wiki/Choose_a_Phone_Repair_Shop',src:'iFixit'}]},
  rbu_photos:{icon:'📸',title:'Transfer All Photos and Videos',note:'Irreplaceable files must be off the device before wiping.',tools:[{name:'USB-C to USB-A cable',icon:'🔌',type:'essential'}],parts:[],
    steps:[{text:'Android: Settings → Accounts → Google → Backup. Or connect to PC via USB-C and copy DCIM folder.'},{text:'iOS: Settings → [Name] → iCloud → Photos → iCloud Photos. Or USB transfer via Finder.'},{text:'Confirm all photos visible in Google Photos / iCloud.com before wiping.'}],
    refs:[{icon:'📘',label:'Google Photos Backup',url:'https://support.google.com/photos/answer/6193313',src:'Google'}]},
  wd_google:{icon:'🔐',title:'Remove Google Account from Android',note:'Required before recycling — disables Find My Device.',tools:[],parts:[],
    steps:[{text:'Settings → Accounts and Backup → Manage Accounts → Google → Remove account.'},{text:'Settings → Security → Find My Device — disable.'},{text:'Samsung: also remove Samsung Account from Settings → Accounts and Backup.'}],
    refs:[{icon:'📘',label:'Google: Remove account',url:'https://support.google.com/android/answer/7664951',src:'Google'}]},
  wd_apple:{icon:'🔐',title:'Sign Out of Apple ID / Disable Activation Lock',note:'Without this, the device cannot be reused after recycling.',
    safety:[{type:'danger',msg:'If you skip this step, Activation Lock remains permanently. Sign out BEFORE handing the device over.'}],tools:[],parts:[],
    steps:[{text:'Settings → [Your Name] → Sign Out. Enter Apple ID password.'},{text:'Verify: Settings shows "Sign in to your iPhone" at the top.'},{text:'Alternatively: iCloud.com → Devices → select device → Remove from Account.'}],
    refs:[{icon:'📘',label:'Apple: Remove Activation Lock',url:'https://support.apple.com/en-us/102648',src:'Apple'}]},
  fr_ios:{icon:'🗑️',title:'iOS: Full Factory Reset',note:'Erases all data and removes Apple ID.',
    safety:[{type:'danger',msg:'Confirm backup is complete. Cannot be undone.'}],tools:[],parts:[],
    steps:[{text:'Settings → General → Transfer or Reset iPhone → Erase All Content and Settings.'},{text:'Enter device passcode and Apple ID password.'},{text:'Device restarts to "Hello" setup screen.'},{text:'Hand device to recycling facility at this point.'}],
    refs:[{icon:'📘',label:'Apple: Erase iPhone',url:'https://support.apple.com/en-us/111765',src:'Apple'}]},
  fr_android:{icon:'🗑️',title:'Android: Full Factory Reset',note:'Path varies by brand.',
    safety:[{type:'danger',msg:'Confirm backup is complete. Cannot be undone.'}],tools:[],parts:[],
    steps:[{text:'Samsung: Settings → General Management → Reset → Factory Data Reset.'},{text:'OPPO / Realme: Settings → Additional Settings → Back Up and Reset → Erase All Data.'},{text:'Xiaomi / Redmi: Settings → About phone → Factory Reset.'},{text:'Google Pixel: Settings → System → Reset options → Erase all data.'},{text:'After reset: do NOT complete setup — hand directly to recycling facility.'}],
    refs:[{icon:'📘',label:'Samsung factory reset',url:'https://www.samsung.com/ph/support/mobile-devices/how-to-factory-reset-samsung-mobile/',src:'Samsung PH'}]},
  rc_sim:{icon:'📱',title:'Remove SIM Card',note:'Your SIM is tied to your carrier account.',tools:[{name:'SIM ejector tool or paperclip',icon:'📎',type:'essential'}],parts:[],
    steps:[{text:'Locate SIM tray on the side of your phone.'},{text:'Insert SIM ejector tool into the pinhole. Press firmly until tray pops out.'},{text:'Remove SIM card and store for your replacement device.'}],
    refs:[{icon:'📘',label:'iFixit: SIM card removal',url:'https://www.ifixit.com/Device/Phone',src:'iFixit'}]},
  ti_globe:{icon:'♻️',title:'Globe E-Waste Zero Program',note:'Free, nationwide drop-off. No receipt or registration needed.',tools:[],parts:[],
    steps:[{text:'Bring device to any Globe Store branch.'},{text:"Tell staff you're dropping off for E-Waste Zero program. No forms required."},{text:'Globe accepts: phones, tablets, chargers, cables, earphones, power banks.'},{text:'Find nearest branch: globe.com.ph/store-locator or Globe One app.'}],
    refs:[{icon:'🌐',label:'Globe E-Waste Zero',url:'https://www.globe.com.ph/blog/electronic-waste-disposal',src:'Globe PH'}]},
  rf_denr:{icon:'🏛️',title:'DENR-Accredited TSD Facilities',note:'Legal gold standard for e-waste in the Philippines.',tools:[],parts:[],
    steps:[{text:'DENR-EMB regulates e-waste under R.A. 9003. Only accredited facilities are legally permitted.'},{text:'Crown Workspace Philippines: DENR-accredited TSD. Provides data destruction certificates.'},{text:'Eco-Systems Technology Inc: accredited facility in Laguna.'},{text:'Use Rev.Tech Connect page to find the nearest verified facility.'}],
    refs:[{icon:'🌐',label:'DENR-EMB E-Waste Info',url:'https://emb.gov.ph/solid-waste-management/ewaste/',src:'DENR-EMB PH'}]},
  dc_receipt:{icon:'📄',title:'Request a Drop-Off Receipt',note:'Legal protection under R.A. 9003.',tools:[],parts:[],
    steps:[{text:'At drop-off point, ask for signed receipt or acknowledgment slip.'},{text:'Slip must include: date, device description, facility name, staff signature.'},{text:'Photograph the receipt and store digitally.'},{text:'Keep records for at least 1 year — protects you under R.A. 10173 (Data Privacy Act).'}],
    refs:[{icon:'🌐',label:'Crown Workspace PH',url:'https://www.crownworkspace.com/ph',src:'Crown Workspace'}]},
}

// ================================================================
// STATUS / STYLE HELPERS
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

const CHIP_STYLES: Record<string, string> = {
  age:    'bg-blue-50 text-blue-700 border border-blue-300',
  damage: 'bg-recycle-100 text-recycle-700 border border-recycle-300',
  danger: 'bg-red-50 text-red-700 border border-red-300',
  score:  'bg-brand-100 text-brand-700 border border-brand-300',
  brand:  'bg-canvas text-muted border border-divider',
}

// ================================================================
// DETAIL PANEL (slide-in from right)
// ================================================================
function DetailPanel({ subId, onClose }: { subId: string | null; onClose: () => void }) {
  const detail = subId ? DETAILS[subId] : null
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!subId) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [subId, onClose])

  useEffect(() => {
    if (subId && panelRef.current) panelRef.current.focus()
  }, [subId])

  const SAFETY_STYLES = {
    info:   'bg-blue-50 border border-blue-200 text-blue-800',
    warn:   'bg-recycle-100 border border-recycle-300 text-recycle-800',
    danger: 'bg-red-50 border border-red-300 text-red-800',
  }
  const SAFETY_ICONS = { info: 'ℹ️', warn: '⚠️', danger: '🚨' }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity duration-200 ${subId ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="complementary"
        aria-label="Sub-step detail"
        aria-hidden={!subId}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-surface border-l-2 border-ink shadow-2xl outline-none transition-transform duration-300 ease-in-out ${subId ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {detail && (
          <>
            <div className="flex shrink-0 items-start gap-3 border-b border-divider p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-divider bg-canvas text-xl">
                {detail.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold leading-snug text-ink text-sm md:text-base">{detail.title}</h2>
                <p className="mt-0.5 text-xs text-muted">{detail.note}</p>
              </div>
              <button onClick={onClose} aria-label="Close detail panel"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-divider text-muted transition-colors hover:border-ink hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {detail.safety && detail.safety.length > 0 && (
                <div className="space-y-2">
                  {detail.safety.map((s, i) => (
                    <div key={i} className={`flex items-start gap-2 rounded-lg p-3 text-sm ${SAFETY_STYLES[s.type]}`}>
                      <span className="shrink-0 text-base">{SAFETY_ICONS[s.type]}</span>
                      <span>{s.msg}</span>
                    </div>
                  ))}
                </div>
              )}
              {detail.tools && detail.tools.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-muted">
                    <WrenchIcon className="h-3 w-3" /> Tools You'll Need
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.tools.map((t, i) => (
                      <span key={i} className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        t.type === 'essential' ? 'border-brand-600 bg-brand-50 text-brand-700' :
                        t.type === 'caution'   ? 'border-recycle-500 bg-recycle-50 text-recycle-700' :
                        'border-divider bg-canvas text-muted'
                      }`}>
                        <span>{t.icon}</span>{t.name}
                        {t.type === 'essential' && <span className="ml-1 text-[10px] opacity-60">(essential)</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.parts && detail.parts.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-muted">
                    <ShoppingCart className="h-3 w-3" /> Parts / What to Search For
                  </h3>
                  <div className="space-y-2">
                    {detail.parts.map((p, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-divider bg-canvas p-3">
                        <span className="text-base shrink-0">{p.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink">{p.name}</p>
                          <p className="mt-0.5 text-xs text-muted">{p.note}</p>
                          {p.search && (
                            <a href={p.search} target="_blank" rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
                              🔍 Search on {p.brand ?? 'iFixit'} ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detail.steps && detail.steps.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-muted">
                    📋 Step-by-Step Guide
                  </h3>
                  <ol className="space-y-2">
                    {detail.steps.map((st, i) => (
                      <li key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${
                        st.warn ? 'border-recycle-300 bg-recycle-50' : 'border-divider bg-canvas'
                      }`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-surface ${
                          st.warn ? 'bg-recycle-600' : 'bg-ink'
                        }`}>{i + 1}</span>
                        <p className={`text-xs leading-relaxed ${st.warn ? 'text-recycle-800' : 'text-ink'}`}>{st.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {detail.refs && detail.refs.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-muted">
                    <BookOpen className="h-3 w-3" /> Sources & References
                  </h3>
                  <div className="space-y-1.5">
                    {detail.refs.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-2.5 rounded-lg border border-divider bg-canvas p-2.5 text-ink transition-colors hover:border-blue-400">
                        <span className="shrink-0 text-base">{r.icon}</span>
                        <div>
                          <p className="text-xs font-bold">{r.label}</p>
                          <p className="text-[11px] text-muted">{r.src}</p>
                        </div>
                        <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ================================================================
// REASONING STRIP
// ================================================================
function ReasoningStrip({ chips }: { chips: ReasoningChip[] }) {
  if (!chips.length) return null
  return (
    <div className="border-b border-divider bg-surface px-4 py-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted shrink-0">Why this roadmap</span>
        {chips.map((c, i) => (
          <span key={i} className={`rounded px-2 py-0.5 text-xs font-semibold ${CHIP_STYLES[c.cls] ?? CHIP_STYLES.brand}`}>
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ================================================================
// HORIZONTAL PROGRESS RAIL
// ================================================================
function ProgressRail({
  phases,
  activePhaseIdx,
  activeStepIdx,
  filter,
  onSelectStep,
}: {
  phases: RoadmapPhase[]
  activePhaseIdx: number
  activeStepIdx: number
  filter: FilterResult
  onSelectStep: (phaseIdx: number, stepIdx: number) => void
}) {
  // Flatten all steps with their phase/step indices
  const flatSteps: { step: RoadmapStep; phaseIdx: number; stepIdx: number; globalIdx: number }[] = []
  phases.forEach((ph, phaseIdx) => {
    ph.steps.forEach((step, stepIdx) => {
      flatSteps.push({ step, phaseIdx, stepIdx, globalIdx: flatSteps.length })
    })
  })

  // Progress fill driven only by manually completed steps
  const completedCount = flatSteps.filter(fs => fs.step.completed).length

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-divider" style={{ zIndex: 0 }} />
      {/* Progress fill — advances only when user manually checks off steps */}
      {flatSteps.length > 1 && completedCount > 0 && (
        <div
          className="absolute top-5 left-0 h-0.5 bg-ink transition-all duration-500"
          style={{
            zIndex: 0,
            width: `${(completedCount / flatSteps.length) * 100}%`,
          }}
        />
      )}

      <div className="relative flex items-start justify-between gap-0" style={{ zIndex: 1 }}>
        {flatSteps.map(({ step, phaseIdx, stepIdx, globalIdx }) => {
          const isActive      = phaseIdx === activePhaseIdx && stepIdx === activeStepIdx
          const status        = resolveStatus(step, filter)
          const isSkipped     = status === 'skipped'
          const isUnsafe      = status === 'unsafe'
          const isPriority    = status === 'priority'
          const isRecommended = status === 'recommended'

          // Color priority: completed > active > unsafe > priority > recommended > skipped > default
          let bubbleClass = ''
          if (step.completed) {
            bubbleClass = 'bg-ink border-ink text-surface'
          } else if (isActive) {
            bubbleClass = 'bg-purple border-ink text-ink ring-2 ring-ink ring-offset-2'
          } else if (isUnsafe) {
            bubbleClass = 'bg-recycle-100 border-recycle-700 text-recycle-700'
          } else if (isPriority) {
            bubbleClass = 'bg-teal-500 border-teal-600 text-ink'
          } else if (isRecommended) {
            bubbleClass = 'bg-brand-100 border-brand-600 text-brand-700'
          } else if (isSkipped) {
            bubbleClass = 'bg-canvas border-divider text-subtle opacity-40'
          } else {
            bubbleClass = 'bg-surface border-divider text-muted hover:border-ink hover:text-ink'
          }

          return (
            <div
              key={`${phaseIdx}-${stepIdx}`}
              className="flex flex-col items-center"
              style={{ minWidth: 0, flex: '1 1 0' }}
            >
              <button
                onClick={() => !isUnsafe && !isSkipped && onSelectStep(phaseIdx, stepIdx)}
                disabled={isUnsafe || isSkipped}
                aria-label={`Step: ${step.title}`}
                aria-current={isActive ? 'step' : undefined}
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-150 ${bubbleClass} ${!isUnsafe && !isSkipped ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {step.completed
                  ? <CheckCircle2 className="h-4 w-4" aria-hidden />
                  : globalIdx + 1}
              </button>
              <span className={`mt-2 text-center text-[10px] font-semibold leading-tight max-w-[60px] ${isActive ? 'text-ink' : 'text-muted'}`}>
                {step.title.length > 14 ? step.title.slice(0, 13) + '…' : step.title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ================================================================
// SUB-STEP ROW
// ================================================================
type SubItem = NonNullable<RoadmapStep['subItems']>[number]

function SubRow({
  item,
  stepStatus,
  onToggle,
  onDetail,
}: {
  item: SubItem
  stepStatus: StepStatus
  onToggle: (id: string) => void
  onDetail: (id: string) => void
}) {
  const hasDetail = !!DETAILS[item.id]

  // Row border/bg based on parent step status + own completed state
  let rowClass = ''
  let dotClass = ''
  if (item.completed) {
    rowClass = 'border-ink/20 bg-ink/5'
    dotClass = 'border-ink bg-ink'
  } else if (stepStatus === 'unsafe') {
    rowClass = 'border-recycle-300 bg-recycle-50'
    dotClass = 'border-recycle-500'
  } else if (stepStatus === 'priority') {
    rowClass = 'border-teal-500 bg-teal-100'
    dotClass = 'border-teal hover:border-ink'
  } else if (stepStatus === 'recommended') {
    rowClass = 'border-brand-300 bg-brand-50'
    dotClass = 'border-brand-500 hover:border-brand-700'
  } else {
    rowClass = 'border-divider bg-surface hover:border-ink/30'
    dotClass = 'border-divider hover:border-ink'
  }

  return (
    <div className={`flex min-h-[44px] items-start gap-2.5 rounded-lg border p-3 transition-all ${rowClass}`}>
      <button
        role="checkbox"
        aria-checked={item.completed}
        aria-label={`Mark "${item.title}" as ${item.completed ? 'incomplete' : 'complete'}`}
        onClick={() => onToggle(item.id)}
        className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors ${dotClass}`}
      >
        {item.completed && <CheckCircle2 className="h-3 w-3 text-surface" aria-hidden />}
      </button>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onToggle(item.id)}>
        <p className={`text-sm font-medium leading-snug ${item.completed ? 'line-through text-muted' : 'text-ink'}`}>
          {item.title}
        </p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{item.description}</p>
      </div>
      {hasDetail && (
        <button
          onClick={(e) => { e.stopPropagation(); onDetail(item.id) }}
          className="shrink-0 rounded border border-divider px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted transition-all hover:border-ink hover:text-ink"
          aria-label={`View details for ${item.title}`}
        >
          Details
        </button>
      )}
    </div>
  )
}

// ================================================================
// ACTIVE STEP DETAIL PANEL (below the rail)
// ================================================================
const DIY_LABELS: Record<string, { text: string; cls: string }> = {
  safe:    { text: '✓ DIY-safe',          cls: 'text-brand-700 border-brand-700' },
  shop:    { text: '🏪 Shop recommended', cls: 'text-blue-700 border-blue-700' },
  caution: { text: '⚠ DIY with caution', cls: 'text-recycle-700 border-recycle-700' },
  info:    { text: 'ℹ Decision gate',    cls: 'text-blue-700 border-blue-700' },
}

function ActiveStepPanel({
  step,
  stepNumber,
  status,
  filter,
  onToggleStep,
  onToggleSub,
  onDetail,
}: {
  step: RoadmapStep
  stepNumber: number
  status: StepStatus
  filter: FilterResult
  onToggleStep: (id: string) => void
  onToggleSub: (stepId: string, subId: string) => void
  onDetail: (subId: string) => void
}) {
  const isUnsafe  = status === 'unsafe'
  const isSkipped = status === 'skipped'
  const diyStyle  = step.diy ? DIY_LABELS[step.diy] : null
  const skipReason = filter.skipReasons[step.id]
  const hasSubs   = (step.subItems?.length ?? 0) > 0 && !isUnsafe && !isSkipped

  const accentBar = step.completed ? 'bg-ink' :
    status === 'priority'    ? 'bg-teal' :
    status === 'recommended' ? 'bg-brand-600' :
    status === 'unsafe'      ? 'bg-recycle-700' : 'bg-divider'

  const badgeText = step.completed ? 'DONE' :
    status === 'priority'    ? 'PRIORITY' :
    status === 'recommended' ? 'REC' :
    status === 'unsafe'      ? '⚠ UNSAFE' :
    status === 'skipped'     ? 'N/A' : ''

  const badgeCls = step.completed ? 'bg-ink text-surface' :
    status === 'priority'    ? 'bg-ink text-surface' :
    status === 'recommended' ? 'bg-brand-700 text-surface' :
    status === 'unsafe'      ? 'bg-recycle-700 text-surface' :
    status === 'skipped'     ? 'bg-divider text-muted' : ''

  return (
    <div className="rounded-2xl border border-divider bg-surface shadow-sm overflow-hidden">
      {/* Accent top bar */}
      <div className={`h-1 w-full ${accentBar}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => { if (!isUnsafe && !isSkipped) onToggleStep(step.id) }}
            disabled={isUnsafe || isSkipped}
            aria-label={`Mark "${step.title}" as ${step.completed ? 'incomplete' : 'complete'}`}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
              step.completed ? 'border-ink bg-ink text-surface' :
              status === 'priority' ? 'border-purple bg-purple/30 text-ink' :
              'border-divider text-muted'
            } ${!isUnsafe && !isSkipped ? 'cursor-pointer hover:border-ink/70' : 'cursor-default opacity-50'}`}
          >
            {step.completed
              ? <CheckCircle2 className="h-4 w-4" aria-hidden />
              : <Circle className="h-4 w-4" aria-hidden />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted">Step {stepNumber}</span>
              {step.icon && <span aria-hidden className="text-base">{step.icon}</span>}
              <h3 className={`font-semibold text-base md:text-lg ${step.completed ? 'line-through text-muted' : 'text-ink'}`}>
                {step.title}
              </h3>
              {badgeText && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeCls}`}>
                  {badgeText}
                </span>
              )}
              {/* Current step badge */}
              {!step.completed && !isSkipped && !isUnsafe && (
                <span className="rounded-full border border-purple bg-purple/20 px-2 py-0.5 text-[10px] font-bold text-ink">
                  Current step
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">{step.description}</p>
          </div>
        </div>

        {/* Contextual messages */}
        {isSkipped && skipReason && (
          <p className="mt-3 rounded bg-ink/5 px-3 py-2 text-xs italic text-muted">Not needed: {skipReason}</p>
        )}
        {isUnsafe && (
          <div className="mt-3 flex items-start gap-2 rounded bg-recycle-100 px-3 py-2.5 text-xs font-semibold text-recycle-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Do not attempt without a certified technician. Take to a shop.
          </div>
        )}
        {!isUnsafe && !isSkipped && diyStyle && (
          <span className={`mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${diyStyle.cls}`}>
            {diyStyle.text}
          </span>
        )}

        {/* Connect CTA */}
        {step.isConnect && !isSkipped && (
          <Link
            to={`/connect${step.connectFilter ? `?filter=${step.connectFilter}` : ''}`}
            state={{ direction: filter.direction }}
            className="btn-purple mt-4 inline-flex w-auto items-center gap-2 px-4 py-2 text-sm"
          >
            Find a {filter.direction === 'REPAIR' ? 'repair shop' : 'drop-off point'}
            <MapPin className="h-4 w-4" aria-hidden />
          </Link>
        )}

        {/* External ref */}
        {step.refLabel && step.refUrl && !isSkipped && (
          <a href={step.refUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 border-b border-divider text-xs font-semibold text-muted transition-colors hover:border-ink hover:text-ink">
            <ExternalLink className="h-3 w-3" aria-hidden />
            {step.refLabel}
          </a>
        )}
      </div>

      {/* Sub-steps */}
      {hasSubs && (
        <div className="border-t border-divider px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Sub-steps</p>
          <div className="space-y-2">
            {step.subItems!.map(sub => (
              <SubRow
                key={sub.id}
                item={sub}
                stepStatus={status}
                onToggle={subId => onToggleSub(step.id, subId)}
                onDetail={onDetail}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ================================================================
// PHASE HEADER TABS
// ================================================================
function PhaseTabs({
  phases,
  activePhaseIdx,
  onSelect,
}: {
  phases: RoadmapPhase[]
  activePhaseIdx: number
  onSelect: (idx: number) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {phases.map((ph, idx) => (
        <button
          key={ph.phase}
          onClick={() => onSelect(idx)}
          className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
            idx === activePhaseIdx
              ? 'bg-ink text-surface'
              : 'bg-surface border border-divider text-muted hover:border-ink hover:text-ink'
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">
            {idx + 1}
          </span>
          {ph.phase}
        </button>
      ))}
    </div>
  )
}

// ================================================================
// MAIN PAGE
// ================================================================
export default function NavigatePage() {
  const nav              = useNavigate()
  const { assessmentId } = useParams<{ assessmentId: string }>()

  const [result, setResult]       = useState<AssessmentResult | null>(null)
  const [form, setForm]           = useState<DeviceFormData | null>(null)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!assessmentId) { setLoading(false); return }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRe.test(assessmentId)) { setLoadError('Invalid assessment link.'); setLoading(false); return }

    let cancelled = false
    async function load() {
      const cached = loadAssessment(assessmentId!)
      if (cached && !cancelled) { setResult(cached.result); setForm(cached.form); setLoading(false); return }
      try {
        const { data, error } = await db.assessmentResults.getById(assessmentId!)
        if (cancelled) return
        if (error || !data) { setLoadError('Assessment not found.'); setLoading(false); return }
        setResult(data.result_json as unknown as AssessmentResult)
        setForm(data.form_json as unknown as DeviceFormData)
      } catch { if (!cancelled) setLoadError('Failed to load assessment.') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [assessmentId])

  const direction   = result?.direction ?? 'REPAIR'
  const deviceLabel = form ? `${form.brand} ${form.model}`.trim() || 'your device' : 'your device'

  const filter: FilterResult = result && form
    ? buildFilterResult(form, result)
    : { direction: direction as 'REPAIR' | 'RECYCLE', score: result?.score ?? 0, reasoningChips: [], priorityStepIds: [], recommendedStepIds: [], skippedStepIds: [], unsafeStepIds: [], skipReasons: {} }

  const [phases, setPhases]             = useState<RoadmapPhase[]>(() => getRoadmapPhases(direction))
  const [activePhaseIdx, setActivePhaseIdx] = useState(0)
  const [activeStepIdx, setActiveStepIdx]   = useState(0)
  const [activeDetail, setActiveDetail]     = useState<string | null>(null)

  useEffect(() => { setPhases(getRoadmapPhases(direction)) }, [direction])

  // Clamp active indices when phases change
  useEffect(() => {
    setActivePhaseIdx(0)
    setActiveStepIdx(0)
  }, [direction])

  const activePhase = phases[activePhaseIdx] ?? phases[0]
  const activeStep  = activePhase?.steps[activeStepIdx] ?? activePhase?.steps[0]

  // Compute global step number for display
  let globalStepNumber = 1
  for (let pi = 0; pi < activePhaseIdx; pi++) globalStepNumber += phases[pi].steps.length
  globalStepNumber += activeStepIdx + 1

  const totalGlobalSteps = phases.reduce((a, ph) => a + ph.steps.length, 0)

  const toggleStep = useCallback((id: string) => {
    setPhases(prev => prev.map(ph => ({ ...ph, steps: ph.steps.map(s => s.id === id ? { ...s, completed: !s.completed } : s) })))
  }, [])

  const toggleSub = useCallback((stepId: string, subId: string) => {
    setPhases(prev => prev.map(ph => ({
      ...ph,
      steps: ph.steps.map(s => s.id !== stepId ? s : {
        ...s,
        subItems: s.subItems?.map(si => si.id === subId ? { ...si, completed: !si.completed } : si),
      }),
    })))
  }, [])

  const handleSelectStep = useCallback((phaseIdx: number, stepIdx: number) => {
    setActivePhaseIdx(phaseIdx)
    setActiveStepIdx(stepIdx)
  }, [])

  const handleSelectPhase = useCallback((idx: number) => {
    setActivePhaseIdx(idx)
    setActiveStepIdx(0)
  }, [])

  const openDetail  = useCallback((subId: string) => setActiveDetail(subId), [])
  const closeDetail = useCallback(() => setActiveDetail(null), [])

  // Progress
  const skippedIds     = filter.skippedStepIds
  const allSteps       = phases.flatMap(ph => ph.steps)
  const relevantSteps  = allSteps.filter(s => !skippedIds.includes(s.id))
  const relevantSubs   = relevantSteps.flatMap(s => s.subItems ?? [])
  const done           = relevantSteps.filter(s => s.completed).length + relevantSubs.filter(si => si.completed).length
  const total          = relevantSteps.length + relevantSubs.length
  const progress       = total > 0 ? Math.round((done / total) * 100) : 0
  const isComplete     = done === total && total > 0

  // Active step status
  const activeStatus = activeStep ? resolveStatus(activeStep, filter) : 'default'

  return (
    <div className="min-h-screen bg-section-roadmap">
      <ReasoningStrip chips={filter.reasoningChips} />

      <div className="page-container-md">

        {/* ── Card wrapper ─────────────────────────── */}
        <div className="rounded-2xl border border-divider bg-surface shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="flex items-start justify-between gap-3 border-b border-divider px-5 py-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-ink sm:text-xl">Your roadmap</h1>
              <p className="mt-0.5 text-xs text-muted">
                {deviceLabel}
                {form?.issue ? ` · ${form.issue}` : ''}
              </p>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
              direction === 'REPAIR'
                ? 'border-ink bg-ink text-surface'
                : 'border-brand-700 bg-brand-100 text-brand-700'
            }`}>
              {direction === 'REPAIR'
                ? <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />Repair</span>
                : <span className="flex items-center gap-1"><Recycle className="h-3 w-3" />Recycle</span>
              }
            </span>
          </div>

          {/* Progress bar row */}
          <div className="border-b border-divider px-5 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-muted">Progress</span>
              <span className="text-xs text-muted">{globalStepNumber - 1} / {totalGlobalSteps} steps</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-divider" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-1.5 rounded-full bg-ink transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Phase tabs */}
          <div className="border-b border-divider px-5 py-3">
            <PhaseTabs phases={phases} activePhaseIdx={activePhaseIdx} onSelect={handleSelectPhase} />
          </div>

          {/* Legend + node rail */}
          <div className="border-b border-divider px-5 pt-3 pb-5">
            {/* Legend inline above the nodes */}
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {[
                { dot: 'bg-ink border-ink',             label: 'Completed' },
                { dot: 'bg-purple border-purple',        label: 'Current step' },
                { dot: 'bg-teal-500 border-teal-600',     label: 'Priority' },
                { dot: 'bg-brand-100 border-brand-600',  label: 'Recommended' },
                { dot: 'bg-recycle-100 border-recycle-700', label: 'Unsafe — shop only' },
                { dot: 'bg-canvas border-divider opacity-40', label: 'Not applicable' },
              ].map(({ dot, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
                  <span className={`h-3 w-3 rounded-full border-2 ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
            <ProgressRail
              phases={phases}
              activePhaseIdx={activePhaseIdx}
              activeStepIdx={activeStepIdx}
              filter={filter}
              onSelectStep={handleSelectStep}
            />
          </div>

          {/* Active step detail */}
          <div className="px-5 py-5">
            {activeStep ? (
              <ActiveStepPanel
                step={activeStep}
                stepNumber={globalStepNumber}
                status={activeStatus}
                filter={filter}
                onToggleStep={toggleStep}
                onToggleSub={toggleSub}
                onDetail={openDetail}
              />
            ) : (
              <p className="text-sm text-muted">Select a step above to view its details.</p>
            )}
          </div>


        </div>

        {/* ── Assessment context card ────────────── */}
        {result && (
          <div className="mt-4 rounded-xl border border-divider bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">Assessment result</p>
            <p className="mt-1.5 text-sm text-ink">{result.rationale}</p>
            {result.costEstimate && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple/30 px-3 py-1.5 text-sm font-medium text-ink">
                Estimated repair cost: ₱{result.costEstimate.min.toLocaleString()} – ₱{result.costEstimate.max.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {/* ── Recycle data-wipe notice ───────────── */}
        {direction === 'RECYCLE' && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-ink/20 bg-ink/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
            <div>
              <p className="text-sm font-medium text-ink">Data wipe is mandatory</p>
              <p className="mt-1 text-xs text-muted">Permanently erase all personal data before recycling, as required by the Data Privacy Act (R.A. 10173).</p>
            </div>
          </div>
        )}

        {/* ── Completion banner ──────────────────── */}
        {isComplete && (
          <div className="mt-6 rounded-2xl border-2 border-ink bg-section-hero p-6 text-center">
            <h3 className="text-xl font-bold text-ink">🎉 All steps completed!</h3>
            <p className="mt-1 text-sm text-muted">
              Head to <strong>Connect</strong> to find a certified{' '}
              {direction === 'REPAIR' ? 'repair shop' : 'recycling facility'} near you.
            </p>
            <Link to={`/connect?filter=${direction === 'REPAIR' ? 'repair' : 'recycling'}`} className="btn-accent mt-4 inline-flex w-auto gap-2">
              Open Connect <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* ── Loading / error states ─────────────── */}
        {loading && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted">Loading assessment...</p>
          </div>
        )}
        {!loading && loadError && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted">{loadError}</p>
            <button onClick={() => nav('/assess')} className="mt-2 font-medium text-ink underline hover:opacity-70">
              Take an assessment
            </button>
          </div>
        )}
        {!loading && !loadError && !result && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted">
              No assessment found.{' '}
              <button onClick={() => nav('/assess')} className="font-medium text-ink underline hover:opacity-70">
                Take an assessment first
              </button>
            </p>
          </div>
        )}

        {/* Navigation arrows */}
        {activePhase && activePhase.steps.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => {
                if (activeStepIdx > 0) {
                  setActiveStepIdx(activeStepIdx - 1)
                } else if (activePhaseIdx > 0) {
                  const prevPhase = phases[activePhaseIdx - 1]
                  setActivePhaseIdx(activePhaseIdx - 1)
                  setActiveStepIdx(prevPhase.steps.length - 1)
                }
              }}
              disabled={activePhaseIdx === 0 && activeStepIdx === 0}
              className="flex items-center gap-1.5 rounded-lg border border-divider bg-surface px-4 py-2 text-xs font-semibold text-muted transition-all hover:border-ink hover:text-ink disabled:opacity-30 disabled:cursor-default"
            >
              ← Previous
            </button>

            <span className="text-xs text-muted">
              Step {globalStepNumber} of {totalGlobalSteps}
            </span>

            <button
              onClick={() => {
                const currentPhase = phases[activePhaseIdx]
                if (activeStepIdx < currentPhase.steps.length - 1) {
                  setActiveStepIdx(activeStepIdx + 1)
                } else if (activePhaseIdx < phases.length - 1) {
                  setActivePhaseIdx(activePhaseIdx + 1)
                  setActiveStepIdx(0)
                }
              }}
              disabled={activePhaseIdx === phases.length - 1 && activeStepIdx === (phases[phases.length - 1]?.steps.length ?? 1) - 1}
              className="flex items-center gap-1.5 rounded-lg border border-divider bg-surface px-4 py-2 text-xs font-semibold text-muted transition-all hover:border-ink hover:text-ink disabled:opacity-30 disabled:cursor-default"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

      </div>

      {/* Slide-in detail panel */}
      <DetailPanel subId={activeDetail} onClose={closeDetail} />
    </div>
  )
}
