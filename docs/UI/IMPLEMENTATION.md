# UI Implementation — Rev.Tech Full Brand Re-skin

Implements the mockups in `docs/UI/` (all 19 images) across the entire application, replacing the previous grayscale placeholder tokens with the brand palette, updating typography, adding a loading screen, and restructuring the Connect page layout.

---

## Scope

- **Color system** — Replaced all grayscale `:root` CSS variables with the brand palette from `Colors Used.png`; added section-specific background tokens (mint, yellow, pink, lavender) and a purple accent token for buttons.
- **Typography** — Changed default body font from Inter to **DM Sans** (per mockup spec). Headers remain **Plus Jakarta Sans**.
- **Loading screen** — New `LoadingScreen` component: full-screen white overlay with a thin animated gradient bar on the right edge (green→yellow→pink→purple) and percentage counter bottom-right. Mounts on initial app load with a 1.5s simulated delay.
- **Home page** — Each of the 4 sections now uses a unique pastel background (mint for hero, yellow for assessment, pink for roadmap, lavender for connect). Footer changed from dark (`bg-ink`) to white (`bg-surface`) with divider lines between links.
- **Auth pages** — Left panel now shows a randomly-cycled Pexels photo (one of three `auth-1.jpg` / `auth-2.jpg` / `auth-3.jpg`). Buttons use the purple accent (`btn-purple`). Inputs have dark borders (`border-divider`) on white background instead of gray placeholder bg.
- **Assessment page** — Background changes to `bg-section-assess` (yellow) for the form, result view background shifts to mint or pink based on repair/recycle direction. Form wrapped in a white rounded card. Buttons use purple accent.
- **Connect (map) page** — Layout restructured to full-height split: map fills the left side, a right panel (~384px) contains header, filter chips (All / Repair Centers / Recycling Centers), and station list with distance info. Search bar overlays the map top-left. Keeps existing Leaflet map implementation.
- **Roadmap page** — Background changes to `bg-section-roadmap` (pink). Content wrapped in a large white rounded card with progress bar and step nodes. All brand-green/brand-amber color classes replaced with neutral `bg-ink`/`bg-purple` tokens.
- **Account (profile) page** — Gray color tokens replaced with `text-ink`/`text-muted`/`bg-surface`/`bg-canvas`. Avatar circle uses purple accent. Assessment history section added below profile info showing all past assessments with device, score, direction, and date.
- **Sidebar** — Collapsed state shows a white square header (no logo). Expanded state reveals Rev.Tech text.
- **Images** — 3 Pexels photos moved from `docs/images/` to `frontend/public/images/` with convenient names.
- **Navbar.tsx** — Deleted (orphaned component, no longer imported anywhere).

---

## Files changed

### New

| File | Purpose |
| --- | --- |
| `frontend/src/components/LoadingScreen.tsx` | Animated loading screen with gradient bar + percentage counter |
| `frontend/src/utils/authImages.ts` | Utility to pick a random auth background image |
| `frontend/public/images/auth-1.jpg` | Pexels photo for auth page left panel (Tima Miroshnichenko) |
| `frontend/public/images/auth-2.jpg` | Pexels photo for auth page left panel (Phong Thanh) |
| `frontend/public/images/auth-3.jpg` | Pexels photo for auth page left panel (Elias Gamez) |

### Modified

| File | Change |
| --- | --- |
| `frontend/index.html` | Removed Inter from Google Fonts, kept DM Sans + Plus Jakarta Sans |
| `frontend/tailwind.config.js` | Added `purple`, `purple-fg`, `section-hero`, `section-assess`, `section-roadmap`, `section-connect` color tokens; changed `font-sans` default to DM Sans |
| `frontend/src/index.css` | Replaced all grayscale `:root` variables with brand palette; added section bg tokens and purple accent; added `btn-purple` component class; added `animate-wipe-in` keyframe; changed `body` to use DM Sans |
| `frontend/src/App.tsx` | Integrated `LoadingScreen` on initial mount |
| `frontend/src/components/Home.tsx` | Section-specific background colors (`bg-section-hero`, `bg-section-assess`, `bg-section-roadmap`, `bg-section-connect`); footer changed to white bg with dark text |
| `frontend/src/components/Sidebar.tsx` | Header logo block: white square when collapsed, Rev.Tech text when expanded |
| `frontend/src/features/auth/AuthLayout.tsx` | Left panel uses random Pexels photo via `getRandomAuthImage()`; added photo credit overlay |
| `frontend/src/features/auth/LoginPage.tsx` | Login button changed to `btn-purple`; restyled inputs with dark borders |
| `frontend/src/features/auth/RegisterPage.tsx` | Create Account button changed to `btn-purple`; "Password Requirements" link added; Back to Login button in confirmation state uses `btn-purple` |
| `frontend/src/features/assess/AssessPage.tsx` | Section backgrounds (yellow for form, mint/pink for results); form wrapped in white card; purple buttons; severity radio selected state uses `border-purple bg-purple/30` |
| `frontend/src/features/connect/ConnectPage.tsx` | Full-height split layout (map left + info panel right); filter chips (All / Repair Centers / Recycling Centers) in right panel; search overlay on map; purple-ish background |
| `frontend/src/features/connect/StationList.tsx` | Updated color tokens (text-gray-* → text-ink/muted, bg-* → bg-ink/*, etc); icons use Lucide `Wrench`/`Recycle` |
| `frontend/src/features/navigate/NavigatePage.tsx` | Pink background (`bg-section-roadmap`); content wrapped in white rounded card; all brand/styling tokens replaced with `bg-ink`/`bg-purple`/`text-ink`/`text-muted` |
| `frontend/src/features/auth/ProfilePage.tsx` | Replaced gray/green color tokens with `text-ink`/`text-muted`/`bg-surface`/`bg-canvas`/`bg-purple`; avatar circle uses purple accent |

### Deleted

| File | Reason |
| --- | --- |
| `frontend/src/components/Navbar.tsx` | Orphaned — no longer imported anywhere after sidebar introduction |

---

## Design system

### Color palette

```css
:root {
  --color-canvas:       249 250 251;   /* #F9FAFB — page background */
  --color-surface:      255 255 255;   /* #FFFFFF — cards, panels */
  --color-ink:          17 25 40;      /* #111928 — primary text */
  --color-muted:        99 115 129;    /* #637381 — secondary text */
  --color-subtle:       190 193 200;   /* #BEC1C8 — tertiary */
  --color-divider:      230 230 230;   /* #E6E6E6 — borders */
  --color-placeholder:  190 193 200;   /* #BEC1C8 — inputs */

  --color-section-hero:     172 239 200;  /* #ACEFC8 — mint */
  --color-section-assess:   240 228 173;  /* #F0E4AD — yellow */
  --color-section-roadmap:  246 216 254;  /* #F6D8FE — pink */
  --color-section-connect:  217 216 255;  /* #D9D8FF — lavender */

  --color-purple:      217 216 255;   /* #D9D8FF — button bg */
  --color-purple-fg:   17 25 40;      /* text on purple */
}
```

### Typography

| Family | Tailwind utility | Used for |
| --- | --- | --- |
| Plus Jakarta Sans | `font-display` | `h1`–`h4` and display text |
| DM Sans | `font-sans` (default) | Body, UI, everything else |

---

## Auth image cycling

The `AuthLayout` left panel selects a random image from 3 Pexels photos on every page mount/refresh. All 3 auth pages (Login, Register, confirmation) share the same randomly-selected image in a single session.

---

## Loading screen behavior

- **Initial load**: `LoadingScreen` appears for ~1.5s on first app mount, then fades away.
- **Route transitions**: A CSS wipe animation (`animate-wipe-in`, right-to-left) plays on route changes (available for future activation).

---

## Sidebar behavior (unchanged from previous version)

| Viewport | Default | Trigger | Result |
| --- | --- | --- | --- |
| Desktop (`md+`) | Narrow icon rail always visible | Pointer enters sidebar | Expands to `--sidebar-width-open`; leaves collapses |
| Mobile (`< md`) | Hidden off-screen | Tap hamburger | Drawer slides in over backdrop |
| Mobile | Drawer open | Tap X or backdrop | Closes |

---

## Verification

```bash
cd frontend
npm run typecheck   # passes
npm run build       # passes
```

---

---

## Phase 2: Dynamic Station Data + User Submissions + Role System

Replaced the hardcoded 13-station dataset with live data from Geoapify Places API + user-submitted locations stored in Supabase. Added role-based access control (consumer / moderator / admin) and an admin review workflow.

### Changes

**Data source** — `frontend/src/lib/stationsData.ts` (hardcoded 13 stations across PH) deleted. Stations now come from two merged sources:
- **Geoapify Places API** — nearby search for electronics repair shops and recycling centers based on user location
- **Supabase** (`shops` table) — user-submitted locations, retrieved via `db.directory.getNearby()`
- Results are deduplicated (Supabase wins when within 50m of a Geoapify result)

**Phone numbers** — Fetched on-demand via Geoapify Place Details API when user clicks a marker (saves credits).

**Geocoding** — Replaced Nominatim (OpenStreetMap) with Geoapify `geocode/autocomplete` for the search bar (same function signature, zero UI changes).

**New endpoints:**
- User-submitted locations → `shops` table (is_verified = false) + `verification_tasks` (status = 'pending')
- `db.directory.submitLocation()` — inserts shop + verification task
- `db.directory.getPendingSubmissions()` — query for moderation
- `db.directory.approveSubmission()` / `rejectSubmission()` — moderator actions

**Role system cleanup:**
- Old roles `shop_admin / verifier / super_admin` → `consumer / moderator / admin`
- Missing `handle_new_user` trigger created (auto-creates `public.users` row on signup)
- RLS policies updated across all tables for new roles
- Frontend types aligned (`UserRole` in `useAuth.ts`, `database.ts`)

**Admin review page** — `/admin/review` route, protected by `requiredRole="moderator"`. Displays pending submissions with approve/reject controls. Reject requires a reason note.

**Multi-type support** — Locations can be both repair AND recycle:
- `Station.type` (single string) → `Station.types: StationType[]` (array)
- AddLocationModal uses checkboxes (not radios) — user picks any combination
- Filter chips use `types.includes()` instead of `type ===`
- Map markers: blue = repair only, green = recycle only, **purple** = both
- DB: new `types TEXT[]` column with GIN index; `getNearby` filters via `@>` (contains) operator
- Backwards compatible: `supabaseShopToStation()` reads `types` first, falls back to single `type`
- New submissions write both `type` (legacy) and `types` (array) columns

**User submissions UI** — "Add" button in the sidebar header opens a modal with:
- Name, services (checkboxes: repair/recycle), address with Geoapify autocomplete, phone, website, hours, brands/items
- On submit: saves to Supabase, shows success toast, refreshes station list

**Map markers** — Three icon variants:
- Blue (repair) / Green (recycle) for verified stations
- Amber for user-submitted (unverified) stations
- Orange circle for user location

**Station list** — Shows "Community" badge for user-submitted stations, contributor attribution ("Added by [name] on [date]"), and loading skeletons during fetch.

**Layout** — Desktop: search bar in sidebar header. Mobile: search bar overlaid on map top. Sidebar widened from `w-80` → `w-96` on desktop.

### New files

| File | Purpose |
| --- | --- |
| `frontend/src/lib/geoapify.ts` | Geoapify API client (nearby search, place details, geocoding) |
| `frontend/src/hooks/useNearbySearch.ts` | Merges Geoapify + Supabase results, deduplicates |
| `frontend/src/hooks/useAdminReview.ts` | Pending submissions, approve/reject |
| `frontend/src/features/connect/AddLocationModal.tsx` | User submission form with address autocomplete |
| `frontend/src/features/admin/AdminReviewPage.tsx` | Moderator review queue |
| `database/migrations/003_role_cleanup.sql` | Role migration + handle_new_user trigger |

### Modified files

| File | Change |
| --- | --- |
| `frontend/src/types/station.ts` | Added `source`, `geoapify_place_id`, contributor fields; `Station.type` → `Station.types: StationType[]` |
| `frontend/src/types/database.ts` | Role types updated to `consumer/moderator/admin` |
| `frontend/src/hooks/useAuth.ts` | `UserRole` type updated |
| `frontend/src/lib/stationUtils.ts` | Nominatim → Geoapify geocoding |
| `frontend/src/lib/database.ts` | Added `submitLocation`, `getPendingSubmissions`, `approveSubmission`, `rejectSubmission`; `Shop.types` field; `getNearby` uses `contains`; `submitLocation` writes `types` array |
| `frontend/src/hooks/useStations.ts` | Uses `useNearbySearch` instead of hardcoded `STATIONS` |
| `frontend/src/hooks/useNearbySearch.ts` | `supabaseShopToStation` reads `types` column with fallback to `type` |
| `frontend/src/features/connect/ConnectPage.tsx` | "Add" button, loading states, error toast, sidebar search, widened panel; filter counts use `types.includes()` |
| `frontend/src/features/connect/MapView.tsx` | Lazy detail fetch on click, amber marker for unverified, Google Maps directions link; purple marker for dual-type, multi-type popup label |
| `frontend/src/features/connect/StationList.tsx` | Loading skeleton, "Community" badge, contributor line; per-type badges (repair + recycle) |
| `frontend/src/features/connect/AddLocationModal.tsx` | Type radios → checkboxes for multi-select; `type` → `selectedTypes: StationType[]` |
| `frontend/src/components/ProtectedRoute.tsx` | Supports `requiredRole` (already existed, now used) |
| `frontend/src/App.tsx` | `/admin/review` route, `/connect` public (no login required) |
| `frontend/vite.config.ts` | `envDir: '..'` to load root `.env` for local dev |
| `.env.example` | Added `VITE_GEOAPIFY_API_KEY` |

### Deleted files

| File | Reason |
| --- | --- |
| `frontend/src/lib/stationsData.ts` | Hardcoded station data replaced by live API |
| `frontend/src/features/connect/shopData.ts` | Unused duplicate dataset |
| `database/migrations/004_multi_type_support.sql` | Adds `types TEXT[]` column for multi-type support |

### Environment

- `VITE_GEOAPIFY_API_KEY` — required, get from https://myprojects.geoapify.com
- A single root `.env` file serves both `npm run dev` (via `envDir: '..'` in Vite config) and Docker Compose (via `env_file: ../.env`)

### Verification

```bash
cd frontend
npm run typecheck   # passes
npm run build       # passes
```

---

## Phase 3: Input Sanitization, Rate Limiting & Rejected Shops Flow

Added XSS/input-injection protection across all user-facing inputs, token-bucket rate limiting for Geoapify API calls, and a rejected-shops lifecycle (submissions show immediately on map; admin can approve/reject from popup; rejected shops hidden from everyone except the submitter).

### Changes

**Input sanitization** (`frontend/src/lib/sanitize.ts` — new):
- `escapeHtml()` — escapes `< > & " ' /` for safe HTML injection into Leaflet popups
- `sanitizeUrl()` — only allows `http:`, `https:`, `mailto:`, `tel:` schemes
- `sanitizePhone()` — strips non-phone characters
- `sanitizeStationName()` / `sanitizeAddress()` — strips HTML special chars with length limits
- `validateRequired()` / `validateLength()` / `validateCoordinates()` — form validation helpers
- `sanitizeForDb()` — strips non-printable/special Unicode chars before Supabase inserts

**Rate limiting** (`frontend/src/lib/rateLimit.ts` — new):
- Token-bucket algorithm: each Geoapify endpoint gets 8 tokens, refills 0.5/sec (~1 request per 2s steady-state)
- `checkRateLimit(key, capacity, refillRate)` — per-endpoint throttling
- `canRefetch(key, cooldownMs)` — 30s cooldown gate for nearby search
- All 4 Geoapify functions (`searchNearbyPlaces`, `getPlaceDetails`, `reverseGeocode`, `geocodeAutocomplete`) check rate limits before making requests
- `useNearbySearch.fetchStations()` enforces a 30s cooldown between refetches

**User submissions show immediately** — Removed `is_verified = true` filter from `getNearby()`. All submissions (verified + unverified) appear on the map. Unverified ones get an amber marker border + "Unverified" badge in popup + "Community" badge in station list.

**Admin approve/reject from map popup** — When moderator/admin clicks an unverified marker, the popup shows Approve/Reject buttons. Approve sets `is_verified = true`. Reject sets `rejected = true` on the shop row.

**Rejected shops lifecycle** — New migration `005_rejected_shops.sql` adds `submitted_by` and `rejected` columns to `shops`:
- Rejected shops are hidden from all users except the submitter (filtered in `getNearby()` via `userId`)
- Submitter sees their rejected shops with a red "Rejected" badge (in both StationList and MapView popup)
- Admin actions (approve/reject) are hidden on rejected shops
- On reject: verification task status set to `rejected`, shop `rejected` flag set to `true`

**Data flow** — `submitLocation()` now:
- Sets `submitted_by` on the shop so ownership is tracked
- Returns the `task_id` from the created verification task
- All inputs sanitized via `sanitizeForDb()` before Supabase insert

### New files

| File | Purpose |
| --- | --- |
| `frontend/src/lib/sanitize.ts` | HTML escaping, URL validation, input sanitization, form validation |
| `frontend/src/lib/rateLimit.ts` | Token-bucket rate limiter + cooldown gate |
| `database/migrations/005_rejected_shops.sql` | Adds `submitted_by` + `rejected` columns to `shops` |

### Modified files

| File | Change |
| --- | --- |
| `frontend/src/features/connect/MapView.tsx` | All user data escaped in popup HTML; approve/reject buttons for admin; "Rejected" badge for rejected shops |
| `frontend/src/features/connect/AddLocationModal.tsx` | Pre-submit validation + sanitization on all fields (name, address, phone, URL, brands) |
| `frontend/src/features/connect/StationList.tsx` | "Rejected" badge shown for rejected shops |
| `frontend/src/lib/database.ts` | `getNearby` accepts `userId`, excludes rejected unless submitter, joins tasks for `task_id`; `submitLocation` sanitizes inputs + sets `submitted_by`; `rejectSubmission` sets `rejected=true` on shop |
| `frontend/src/lib/geoapify.ts` | Rate-limited all 4 API functions via `checkRateLimit()` |
| `frontend/src/hooks/useNearbySearch.ts` | 30s cooldown on refetch; passes `userId` to `getNearby` |
| `frontend/src/hooks/useStations.ts` | Accepts and forwards `userId` |
| `frontend/src/features/connect/ConnectPage.tsx` | Passes `user.id` and `currentUserRole` to hooks/MapView; approve/reject handlers wired |
| `frontend/src/types/station.ts` | Added `rejected?`, `shop_id?`, `task_id?` fields |

### Environment

No new env vars. Rate limits are hardcoded (tunable in `geoapify.ts` constants).

### Verification

```bash
cd frontend
npm run typecheck   # passes
npm run build       # passes
```

## Current Iteration Status

We are now in **Iteration 4**. See `AGENT_TASKS_v3.md` for full details on the iteration scope and known gaps.

### Tracked for Iteration 4

- **Auth**: Google OAuth wired (`LoginPage`, `RegisterPage`, `AuthCallbackPage`), user history section on `/auth/profile` (all past assessments). Still pending: anonymous sessions + account claim.
- **Role auth review**: Role-based access on Connect page reviewed and confirmed per `AGENT_TASKS_v3.md` §4D.3
- **Roadmap**: Redesigned to horizontal scrollable timeline with detail side panel per `rmaptest.html` reference (§4E)
- **Assessment**: Wire `create_assessment_tx` to persist results to DB — deferred
- **Connect/Map**: Marker clustering, radius slider, continuous `watchPosition` geolocation — deferred

### Carry-over Follow-ups

- Wire Footer links (`Terms of Service`, `Privacy Policy`, `Contact Us`) to real routes.
- Implement the language switcher in `AuthLayout` (currently a static button).
- Add route transition wipe animation (CSS `animate-wipe-in` defined but not wired).
- The LoadingScreen currently uses a simple `setInterval` for demo progress — replace with actual app readiness detection.
