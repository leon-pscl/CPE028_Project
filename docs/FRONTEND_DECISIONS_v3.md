# ReDevice — Frontend Decisions (Branch: `third-iteration`)

> **For agents porting these decisions to another branch.**
> This document captures the actual frontend implementation decisions made in the `third-iteration` branch — not the ideal/planned architecture. Replicate these faithfully when building or modifying frontend code in another branch.

---

## 1. Stack & Tooling

| Layer | Decision | Evidence |
|---|---|---|
| Framework | **React 19** with **Vite 6** | `frontend/package.json`, `vite.config.ts` |
| Language | **TypeScript 5.7** (strict mode) | `tsconfig.json`: `strict: true`, `noUnusedLocals`, `noUnusedParameters` |
| Styling | **Tailwind CSS 3.4** | `tailwind.config.js`, `postcss.config.js` |
| Package manager | **npm** (lockfile committed) | `frontend/package-lock.json` present |
| Path alias | `@` → `./src/*` | Both `vite.config.ts` (resolve alias) and `tsconfig.json` (paths) |

---

## 2. Routing

- **`BrowserRouter`** in `main.tsx` — wraps the entire `<App />`
- **react-router-dom v7** — `<Routes>`, `<Route>`, `<Link>`, `useNavigate`, `useLocation`
- Route structure in `App.tsx`:

| Path | Component | Auth? |
|---|---|---|
| `/` | `Home` | No |
| `/assess` | `Assess` | No |
| `/navigate` | `Navigate` | No (auth-gated features) |
| `/connect` | `Connect` | No (auth-gated features) |
| `/auth/login` | `LoginPage` | No |
| `/auth/register` | `RegisterPage` | No |
| `/auth/forgot-password` | `ForgotPasswordPage` | No |
| `/auth/callback` | `AuthCallbackPage` | No |
| `/auth/profile` | `ProfilePage` | Yes (via `<ProtectedRoute>`) |
| `/admin/review` | `AdminReviewPage` | Yes (`role=moderator`) |

---

## 3. Auth Architecture

### 3.1 Supabase Auth — PKCE Only

`frontend/src/lib/supabaseClient.ts`:

- **Flow**: `flowType: 'pkce'` (prevents token interception in redirects)
- **Persistence**: `persistSession: true` (localStorage — survives page reloads)
- **Auto-refresh**: `autoRefreshToken: true`
- **Session detection**: `detectSessionInUrl: true` (for email confirmation redirects)
- **Client typed**: `createClient<Database>(...)` for type-safe DB queries

### 3.2 Auth Metadata Pattern (Critical)

The app does **NOT** query the `public.users` table. Instead, user profile data (name, role) is read from **Supabase auth `user_metadata`**:

- `AuthProvider` in `context/AuthProvider.tsx` calls `buildUser(rawUser)` which reads `rawUser.user_metadata` for `full_name`, `role`, `avatar_url`
- `signUp()` stores metadata via `options: { data: { full_name, role } }`
- `updateProfile()` updates via `supabase.auth.updateUser({ data: metaUpdates })`
- This avoids 400 errors / RLS issues from querying `public.users`

### 3.3 Auth Types

All in `hooks/useAuth.ts`:

- `AuthUser`: `{ id, email, fullName, role, avatarUrl, emailConfirmed }`
- `UserRole`: `'consumer' | 'moderator' | 'admin'`
- `AuthError`: discriminated union — `'invalid_credentials' | 'email_not_confirmed' | 'rate_limited' | 'network_error' | 'unknown'`
- `AuthContextValue`: `{ user, session, loading, signIn, signUp, signOut, resetPassword, updateProfile }`
- `AuthContext` created in `hooks/useAuth.ts` and provided by `AuthProvider` in `context/AuthProvider.tsx`

### 3.4 Security Patterns

- **Barricade principle**: Registration always shows "Check your email" — never reveals whether email exists (`RegisterPage.tsx`)
- **Anti-enumeration**: Duplicate registration returns null (no error) (`AuthProvider.tsx:154-155`)
- **Rate limit handling**: `mapSupabaseError` catches 429 and returns `'rate_limited'`
- **Password policy**: ≥ 8 chars, ≥ 1 uppercase, ≥ 1 number (`RegisterPage.tsx:27-31`)
- **Login flow**: After successful `signIn()`, waits 100ms before navigating to let `onAuthStateChange` fire (`LoginPage.tsx:47`)
- **ProtectedRoute**: `ProtectedRoute.tsx` wraps auth-only pages; redirects to `/auth/login` with `state.from` for post-login redirect

### 3.5 Auth Gating on Modules

Navigate and Connect pages show an **auth gate modal** when the user is not signed in:

- `AuthGateModal`: overlay with backdrop blur, links to login/register, "Maybe later" dismiss
- When dismissed, a persistent **amber warning banner** remains at top of page
- Page content is `pointer-events-none select-none` while modal is open
- Connect module: search/filter inputs are `readOnly` for unauthenticated users; shop list is blurred beyond 2 items

### 3.6 Known Auth Gaps

| Feature | Status |
|---|---|
| Google OAuth buttons rendered on UI | ✅ Done |
| Google OAuth `signInWithOAuth()` wired | ✅ Done (Iteration 4 — see AGENT_TASKS §4D) |
| Anonymous sessions (`signInAnonymously()`) | ❌ Not started |
| Account claim flow (anon → registered merge) | ❌ Not started |
| User history on profile page (`/auth/profile`) | ✅ Done (Iteration 4 — shows all past assessments) |
| Role auth review on Connect page | ✅ Done (Iteration 4 — see AGENT_TASKS §4D) |

These are tracked for completion in Iteration 4 (see `AGENT_TASKS_v3.md` §4D).

---

## 4. Styling Conventions

### 4.1 Tailwind Theme

Defined in `tailwind.config.js`:

- **`brand`** palette (green): 50–950, used for primary actions, repair path
- **`recycle`** palette (amber/yellow): 50–950, used for recycling path
- **Purple accent** palette: used for buttons (`.btn-purple`), profile avatar
- **Section backgrounds**: `section-hero` (mint), `section-assess` (yellow), `section-roadmap` (pink), `section-connect` (lavender)
- **Font**: `DM Sans` as body (default), `Plus Jakarta Sans` as `font-display` for headings

### 4.2 Custom CSS Classes

Defined in `src/index.css` under `@layer components`:

```
.btn-primary     → brand-600 bg, white text, shadow, hover darken
.btn-secondary   → white bg, gray text, ring-1 border, hover gray-50
.btn-recycle     → recycle-600 bg, white text, shadow, hover darken
.btn-purple      → purple-400 bg, ink text, shadow, hover lighten
.card            → rounded-xl, border, white bg, p-6, shadow-sm (removed in re-skin)
.input-field     → rounded-lg, border, white bg, focus:brand-500 ring
.label           → text-sm, font-medium, gray-700, mb-1.5
```

- **Always use these classes** instead of inline utilities for consistency
- Do NOT use CSS modules, styled-components, or CSS-in-JS

### 4.3 Base Styles

```
* { @apply border-gray-200; }
body { @apply bg-gray-50 text-gray-900 antialiased; font-family: 'DM Sans', sans-serif; }
```

---

## 5. Component Architecture

### 5.1 Sidebar (`components/Sidebar.tsx`)

- Collapsible: narrow icon rail on desktop, hidden off-screen on mobile
- Desktop: expands on pointer enter, collapses on leave
- Mobile: hamburger button opens drawer with backdrop
- Auth-aware: shows user name and logout at bottom
- Scroll-spy: highlights current section on Home page

### 5.2 Home (`components/Home.tsx`)

- Hero section with mint background (`bg-section-hero`)
- Auth status bar: greeting for logged-in users, login/register links for guests
- 4 sections with unique pastel backgrounds matching mockups
- SDG Impact section (SDG 12.4.2, 12.5.1, Philippines)

### 5.3 Assess (`features/assess/AssessPage.tsx`)

- Form fields: Brand, Model, Age (months), Issue (dropdown), Severity (radio: minor/moderate/severe)
- Screen image file upload field (not yet wired to ML)
- Validation: all fields required, age 1–300 months
- Results view: direction badge (REPAIR/RECYCLE), score bar, confidence, rationale, cost estimate, "See My Roadmap" and "Retake" buttons
- **Known gap**: Scoring is client-side only (`/features/assess/scoring.ts`). Results are NOT persisted to the database via `create_assessment_tx`. Screen image is not sent to ML service. Assessment history is not saved per-user.

### 5.4 Scoring (`features/assess/scoring.ts`)

- Weighted formula: `age(20%) + severity(30%) + costRatio(25%) + partsAvailability(15%) + manufacturerSupport(10%)`
- Hard overrides (always win): motherboard + age>48 → RECYCLE; water damage + severe + age>36 → RECYCLE; parts < 20% + severe → RECYCLE
- Score ≥ 50 → REPAIR, < 50 → RECYCLE
- Confidence: high (score >70 or <30), medium, low
- **Known gap**: All client-side. Not connected to ML service. Not persisted to DB.

### 5.5 Navigate (`features/navigate/NavigatePage.tsx`)

- **Layout**: Vertical central axis with step cards connected by lines
- **MainNode**: numbered step card with icon, title, description, completion toggle
- **SubNode**: branch cards (left/right) connected by dashed SVG lines
- States: recommended (amber), completed (ink), pending (gray)
- Progress bar with count
- Data wipe warning banner for RECYCLE direction
- **Known gap**: Completion state is tracked in React state only. Does NOT persist to `checklist_completions` table. Does NOT survive page reload. No `impact_events` tracking on completion.
- **Note**: Roadmap layout being redesigned in Iteration 4 — horizontal scrollable timeline replaces vertical branching per `rmaptest.html` reference. See AGENT_TASKS §4E.

### 5.6 Connect (`features/connect/ConnectPage.tsx`)

- Leaflet map with OpenStreetMap tiles, maxBounds constrained to Philippines
- Custom divIcon markers: blue (repair), green (recycle), purple (both)
- Amber markers for user-submitted (unverified) stations
- Orange circle for user location
- Marker pinning mode: click map to drop a pin and open "Add Location" modal
- Geocoding autocomplete via Geoapify in search bar
- Filter chips: All / Repair Centers / Recycling Centers
- Station list with distance, type badges, verified/community/rejected badges
- Admin approve/reject buttons on map popup
- Suggest type correction for Geoapify results
- **Known gaps**: No marker clustering (library unused), no radius slider, one-shot geolocation instead of `watchPosition`, no tile fallback, mobile panel covers 70vh of map, rate-limit feedback is silent, map starts at central PH instead of detecting user's region.
- **Role auth review**: Completed per AGENT_TASKS §4D.3 — auth gate, RLS, route protection, rate-limit uniformity all verified. See AGENT_TASKS_v3.md §4D for findings.

### 5.7 Auth Pages (`features/auth/`)

| Page | Notes |
|---|---|
| `LoginPage.tsx` | Email + password, forgot password link, 100ms delay before navigation. Google button is `btn-placeholder` — NOT wired. |
| `RegisterPage.tsx` | Full name, email, role toggle (consumer/technician), password + confirm. Google button is `btn-placeholder` — NOT wired. |
| `ForgotPasswordPage.tsx` | Email input, "check your email" barricade |
| `AuthCallbackPage.tsx` | Spinner while Supabase exchanges code, auto-redirect |
| `ProfilePage.tsx` | Avatar initial, name, email, role, email verified status, edit name, sign out. Includes assessment history section showing all past assessments (device, score, direction, date). |

### 5.8 Admin (`features/admin/AdminReviewPage.tsx`)

- Protected by `requiredRole="moderator"`
- Displays pending submissions with approve/reject controls
- Reject requires a reason note

---

## 6. File Structure (Current State)

```
frontend/src/
├── App.tsx                              # Routes, AuthProvider wrapper, LoadingScreen
├── main.tsx                             # BrowserRouter + StrictMode
├── index.css                            # Tailwind + custom component classes + brand tokens
├── vite-env.d.ts                        # Vite type declarations
├── components/
│   ├── Sidebar.tsx                      # Collapsible sidebar (desktop hover, mobile drawer)
│   ├── Home.tsx                         # Landing page (hero, 4 sections, SDG)
│   ├── ProtectedRoute.tsx               # Auth gate wrapper with role support
│   ├── Breadcrumbs.tsx                  # Navigation breadcrumbs
│   └── LoadingScreen.tsx                # GSAP wipe animation on app start
├── context/
│   └── AuthProvider.tsx                 # Auth state, signIn/signUp/signOut/resetPassword/updateProfile
├── hooks/
│   ├── useAuth.ts                       # Auth types, context, hook
│   ├── useGeolocation.ts               # Browser Geolocation API (one-shot, not watchPosition)
│   ├── useStations.ts                   # Filters, searches, sorts stations
│   ├── useNearbySearch.ts              # Merges Geoapify + Supabase results, deduplicates
│   ├── useAdminReview.ts               # Pending submissions, approve/reject
│   └── useScrollSpy.ts                 # Section highlighting on Home
├── lib/
│   ├── supabaseClient.ts               # Supabase client (PKCE, localStorage)
│   ├── database.ts                      # DB query helpers (typed)
│   ├── geoapify.ts                      # Geoapify API client (rate-limited)
│   ├── stationUtils.ts                  # Geocoding, distance, filter helpers
│   ├── stationUtils.test.ts            # Unit tests for station utilities
│   ├── sanitize.ts                     # HTML escaping, URL validation, input sanitization
│   └── rateLimit.ts                    # Token-bucket rate limiter
├── types/
│   ├── index.ts                        # Assessment, Device, Roadmap types
│   ├── database.ts                     # Supabase DB schema types
│   └── station.ts                      # Station, UserLocation, GeocodeResult, FilterType
├── utils/
│   └── authImages.ts                   # Random auth background image picker
└── features/
    ├── assess/
    │   ├── AssessPage.tsx              # Device form + client-side result view
    │   └── scoring.ts                  # Rule-based scoring + overrides (no ML, no DB)
    ├── auth/
    │   ├── AuthLayout.tsx              # Layout with image panel
    │   ├── LoginPage.tsx               # Email/password + placeholder Google button
    │   ├── RegisterPage.tsx            # Registration + placeholder Google button
    │   ├── ProfilePage.tsx             # User info, edit name, sign out
    │   ├── ForgotPasswordPage.tsx      # Password reset
    │   └── AuthCallbackPage.tsx        # OAuth/email confirmation callback
    ├── navigate/
    │   ├── NavigatePage.tsx            # Roadmap graph with MainNode/SubNode
    │   └── roadmapData.ts             # REPAIR + RECYCLE step definitions
    ├── connect/
    │   ├── ConnectPage.tsx             # Map + station panel with search/filter/add
    │   ├── MapView.tsx                 # Leaflet map (no marker clustering)
    │   ├── StationList.tsx             # Scrollable station list with badges
    │   ├── AddLocationModal.tsx        # User submission form with Geoapify autocomplete
    │   └── SuggestTypeModal.tsx        # Type correction suggestion for Geoapify results
    └── admin/
        └── AdminReviewPage.tsx         # Moderator review queue
```

---

## 7. Dependencies (Current)

**Runtime:**
- `react` ^19.0.0, `react-dom` ^19.0.0
- `react-router-dom` ^7.1.1
- `@supabase/supabase-js` ^2.106.1
- `leaflet` ^1.9.4, `@types/leaflet` ^1.9.21
- `leaflet.markercluster` ^1.5.3 (installed but NOT imported — unused)
- `lucide-react` ^0.469.0
- `gsap` ^3.15.0 (loading screen animation)

**Dev:**
- `typescript` ~5.7.2
- `vite` ^6.0.5, `@vitejs/plugin-react` ^4.3.4
- `tailwindcss` ^3.4.17, `postcss`, `autoprefixer`
- `eslint` ^9.17.0, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- `vitest` ^4.1.8

---

## 8. Key Deviations from AGENT_TASKS_v3 Plan

These are intentional decisions in this branch that differ from the ideal plan:

| Planned (AGENT_TASKS_v3) | Actual Implementation | Reason |
|---|---|---|
| Auth uses `public.users` table via trigger | Auth uses `user_metadata` only — no DB query | Avoid 400 errors from missing/misconfigured `users` table |
| Google OAuth via `signInWithOAuth()` | Buttons rendered with `btn-placeholder` — not wired | Deferred to Iter 3 (see §3E in AGENT_TASKS_v3) |
| Anonymous sessions via `signInAnonymously()` | Not implemented — auth gate modals used instead | Deferred |
| `user_transactions` ledger table | Schema exists but transactions not written | Deferred — assessment results not persisted yet |
| Google Places API for dynamic directory | Geoapify Places API used instead | Geoapify offers free tier, no API key restrictions |
| Assessment DB persistence via `create_assessment_tx` | Client-side scoring only — no DB writes | Deferred to Iter 3 (see §3G) |
| Roadmap state persisted to `checklist_completions` | In-memory state only — does not survive reload | Deferred to Iter 3 (see §3G) |
| Marker clustering (`leaflet.markercluster`) | Library installed but never initialized | Deferred to Iter 3 (see §3F) |
| Radius slider (1–25 km) for directory search | `searchRadius` hardcoded at 5000m | Deferred to Iter 3 (see §3F) |
| Continuous geolocation (`watchPosition`) | One-shot `getCurrentPosition` only | Deferred to Iter 3 (see §3F) |
| Tile fallback layer | Single OSM tile layer — no fallback | Deferred to Iter 3 (see §3F) |
| `/profile/history` page | Not implemented | Deferred to Iter 3 (see §3E) |
| Serverless Functions (Vercel) for API | No API functions — all logic is client-side | Deferred |
| RLS policies enforced | Not applicable — app doesn't write to DB from client | Auth metadata pattern + no DB writes yet |
| Vercel Serverless Functions | Not implemented — app is fully client-side | Deferred |

---

## 9. Docker Setup

- `frontend/Dockerfile`: `node:20-alpine`, exposes port 5173
- `infra/docker-compose.yml`: web service, volume mounts for hot reload, env vars passed via `env_file: ../.env`
- Docker command: `npm run dev -- --host 0.0.0.0`

---

## 10. Replication Checklist

When porting these frontend decisions to another branch, ensure:

- [ ] React 19 + Vite 6 + TypeScript strict + Tailwind 3.4
- [ ] `@` path alias in both Vite and TypeScript config
- [ ] `BrowserRouter` in `main.tsx`
- [ ] Custom Tailwind theme: `brand` (green), `recycle` (amber), `purple`, section backgrounds
- [ ] Component CSS classes (`.btn-primary`, `.btn-purple`, `.card`, `.input-field`) in `index.css`
- [ ] DM Sans (body) + Plus Jakarta Sans (headings) from Google Fonts
- [ ] Supabase client with PKCE flow, localStorage persistence
- [ ] Auth metadata pattern — no `public.users` queries
- [ ] Auth types in `hooks/useAuth.ts`, provider in `context/AuthProvider.tsx`
- [ ] `ProtectedRoute` with `state.from` redirect preservation + `requiredRole`
- [ ] Auth gate modals on Navigate and Connect pages
- [ ] Barricade security: anti-enumeration registration, "check your email" message
- [ ] Password policy: ≥8 chars, ≥1 uppercase, ≥1 number
- [ ] Scoring: weighted formula + hard overrides in `scoring.ts` (client-side only)
- [ ] Sidebar: collapsible, scroll-spy, auth-aware, mobile drawer
- [ ] Leaflet map: custom divIcon markers, PH bounds, pinning mode
- [ ] Geoapify API: nearby search, place details, geocoding autocomplete
- [ ] Rate limiting: token-bucket for Geoapify + 30s cooldown
- [ ] Sanitization: HTML escaping, URL validation, form validation
- [ ] All auth pages: Login, Register, ForgotPassword, AuthCallback, Profile
- [ ] Admin review page: `/admin/review` with approve/reject
- [ ] `lucide-react` for all icons (no other icon library)
- [ ] Route pattern: `/auth/*` for auth pages, `/assess`/`/navigate`/`/connect` for modules
- [ ] Docker: node:20-alpine, port 5173, volume mounts for dev
- [ ] **Known gaps acknowledged**: see §3.6 (auth), §5.3–5.5 (assess/roadmap), §5.6 (map)
