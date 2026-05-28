# ReDevice — Frontend Decisions (Branch: `second-iteration-parajas`)

> **For agents porting these decisions to another branch.**
> This document captures the actual frontend implementation decisions made in the `second-iteration-parajas` branch — not the ideal/planned architecture. Replicate these faithfully when building or modifying frontend code in another branch.

---

## 1. Stack & Tooling

| Layer | Decision | Evidence |
|---|---|---|
| Framework | **React 19** with **Vite 6** | `apps/web/package.json`, `vite.config.ts` |
| Language | **TypeScript 5.7** (strict mode) | `tsconfig.json`: `strict: true`, `noUnusedLocals`, `noUnusedParameters` |
| Styling | **Tailwind CSS 3.4** | `tailwind.config.js`, `postcss.config.js` |
| Package manager | **npm** (lockfile committed) | `package-lock.json` present |
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

---

## 3. Auth Architecture

### 3.1 Supabase Auth — PKCE Only

`sources/apps/web/src/lib/supabaseClient.ts`:

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
- `UserRole`: `'consumer' | 'technician' | 'admin'`
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

---

## 4. Styling Conventions

### 4.1 Tailwind Theme

Defined in `tailwind.config.js`:

- **`brand`** palette (green): 50–950, used for primary actions, repair path
- **`recycle`** palette (amber/yellow): 50–950, used for recycling path
- **Font**: `Inter` as primary sans-serif (loaded from Google Fonts in `index.html`)

### 4.2 Custom CSS Classes

Defined in `src/index.css` under `@layer components`:

```
.btn-primary     → brand-600 bg, white text, shadow, hover darken
.btn-secondary   → white bg, gray text, ring-1 border, hover gray-50
.btn-recycle     → recycle-600 bg, white text, shadow, hover darken
.card            → rounded-xl, border, white bg, p-6, shadow-sm
.input-field     → rounded-lg, border, white bg, focus:brand-500 ring
.label           → text-sm, font-medium, gray-700, mb-1.5
```

- **Always use these classes** instead of inline utilities for consistency
- Do NOT use CSS modules, styled-components, or CSS-in-JS

### 4.3 Base Styles

```
* { @apply border-gray-200; }
body { @apply bg-gray-50 text-gray-900 antialiased; }
```

### 4.4 Layout

- Navbar: `fixed top-0 z-50`, `h-16`, `bg-white/90 backdrop-blur-md`
- Main content offset: `pt-16` on `<main>`
- Max width containers: `max-w-7xl` (pages), `max-w-2xl` (forms), `max-w-lg` (profile), `max-w-4xl` (roadmap)
- Responsive: sm/md/lg breakpoints via Tailwind

---

## 5. Component Architecture

### 5.1 Navbar (`components/Navbar.tsx`)

- Fixed top, backdrop blur, responsive (hamburger menu on mobile)
- Nav links: Home, Assess, Navigate, Connect
- Auth-aware: shows Login/Register OR user name/Logout based on `useAuth()`
- Uses `lucide-react` icons
- Active link: `bg-brand-50 text-brand-700`

### 5.2 Home (`components/Home.tsx`)

- Hero section with gradient (`from-brand-600 via-brand-700 to-brand-900`)
- Auth status bar: greeting for logged-in users, login/register links for guests
- Device type badges: Smartphones, Laptops, E-Waste Recycling
- 3-card module grid (Assess, Navigate, Connect) with hover effects
- SDG Impact section (SDG 12.4.2, 12.5.1, Philippines)

### 5.3 Assess (`modules/assess/AssessPage.tsx`)

- Form fields: Brand, Model, Age (months), Issue (dropdown), Severity (radio: minor/moderate/severe)
- Validation: all fields required, age 1–300 months
- Results view: direction badge (REPAIR/RECYCLE), score bar, confidence, rationale, cost estimate, "See My Roadmap" and "Retake" buttons
- Device details summary card

### 5.4 Scoring (`modules/assess/scoring.ts`)

- Weighted formula: `age(20%) + severity(30%) + costRatio(25%) + partsAvailability(15%) + manufacturerSupport(10%)`
- Hard overrides (always win): motherboard + age>48 → RECYCLE; water damage + severe + age>36 → RECYCLE; parts < 20% + severe → RECYCLE
- Score ≥ 50 → REPAIR, < 50 → RECYCLE
- Confidence: high (score >70 or <30), medium, low

### 5.5 Navigate (`modules/navigate/NavigatePage.tsx`)

- **Layout**: Vertical central axis with step cards connected by lines
- **MainNode**: numbered step card with icon, title, description, completion toggle
- **SubNode**: branch cards (left/right) connected by dashed SVG lines (`strokeDasharray="4 3"`)
- States: recommended (amber), completed (brand-green), pending (gray)
- Progress bar with count
- Data wipe warning banner for RECYCLE direction
- Completion state tracked in memory (not persisted to Supabase yet)

### 5.6 Connect (`modules/connect/ConnectPage.tsx`)

- Leaflet map centered on Metro Manila (14.5873, 121.0470), zoom 11
- Custom markers: green (repair), amber (recycling), generated via `L.divIcon` with inline SVG
- Filter buttons: All / Repair / Recycling
- Search input (gated behind auth)
- Shop result cards with type badge
- Auth gate: blurred cards, disabled search for logged-out users

### 5.7 Auth Pages (`modules/auth/`)

| Page | Notes |
|---|---|
| `LoginPage.tsx` | Email + password, forgot password link, 100ms delay before navigation |
| `RegisterPage.tsx` | Full name, email, role toggle (consumer/technician), password + confirm, "check your email" success state |
| `ForgotPasswordPage.tsx` | Email input, "check your email" barricade |
| `AuthCallbackPage.tsx` | Spinner while Supabase exchanges code, auto-redirect to `/` or `/auth/reset-password` |
| `ProfilePage.tsx` | Avatar initial, name, email, role, email verified status, edit name inline, sign out |

---

## 6. File Structure (Current State)

```
apps/web/src/
├── App.tsx                              # Routes, AuthProvider wrapper
├── main.tsx                             # BrowserRouter + StrictMode
├── index.css                            # Tailwind + custom component classes
├── vite-env.d.ts                        # Vite type declarations
├── components/
│   ├── Home.tsx                         # Landing page (hero, modules, SDG)
│   ├── Navbar.tsx                       # Top navigation (responsive)
│   └── ProtectedRoute.tsx               # Auth gate wrapper
├── context/
│   └── AuthProvider.tsx                  # Auth state, signIn/signUp/signOut/resetPassword/updateProfile
├── hooks/
│   └── useAuth.ts                        # Auth types, context, hook
├── lib/
│   ├── supabaseClient.ts                # Supabase client (PKCE, localStorage)
│   └── database.ts                       # DB query helpers (not actively used — auth uses metadata)
├── types/
│   ├── index.ts                          # Assessment, Device, Roadmap, Shop types
│   └── database.ts                       # Supabase DB schema types
└── modules/
    ├── assess/
    │   ├── AssessPage.tsx                # Device form + result view
    │   └── scoring.ts                    # Rule-based scoring + overrides
    ├── auth/
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── ProfilePage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   └── AuthCallbackPage.tsx
    ├── navigate/
    │   ├── NavigatePage.tsx              # Roadmap graph with MainNode/SubNode
    │   └── roadmapData.ts                # REPAIR + RECYCLE step definitions
    └── connect/
        ├── ConnectPage.tsx               # Map + shop list with auth gating
        └── shopData.ts                   # Hardcoded shops (5 pins, Metro Manila)
```

---

## 7. Dependencies (Current)

**Runtime:**
- `react` ^19.0.0, `react-dom` ^19.0.0
- `react-router-dom` ^7.1.1
- `@supabase/supabase-js` ^2.106.1
- `leaflet` ^1.9.4, `@types/leaflet` ^1.9.15
- `lucide-react` ^0.469.0

**Dev:**
- `typescript` ~5.7.2
- `vite` ^6.0.5, `@vitejs/plugin-react` ^4.3.4
- `tailwindcss` ^3.4.17, `postcss`, `autoprefixer`
- `eslint` ^9.17.0, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`

---

## 8. Docker Setup

- `apps/web/Dockerfile`: `node:20-alpine`, exposes port 5173
- `docker/docker-compose.yml`: web service, volume mounts for hot reload, env vars passed for Supabase
- Docker command: `npm run dev -- --host 0.0.0.0`

---

## 9. Key Deviations from AGENT_TASKS_v3 Plan

These are intentional decisions in this branch that differ from the ideal plan:

| Planned (AGENT_TASKS_v3) | Actual Implementation | Reason |
|---|---|---|
| Auth uses `public.users` table via trigger | Auth uses `user_metadata` only — no DB query | Avoid 400 errors from missing/misconfigured `users` table |
| Anonymous sessions via `signInAnonymously()` | Not implemented | Deferred — auth gate modals used instead |
| `user_transactions` ledger table | Not implemented | Auth metadata pattern eliminates need |
| Google Places API for dynamic directory | Hardcoded `shopData.ts` (5 pins, Metro Manila) | Deferred — API key setup not done |
| Serverless Functions (Vercel) for API | No API functions — all logic is client-side | Deferred — app runs fully client-side |
| Checklist state persisted to Supabase | In-memory state only (does not survive reload) | Deferred |
| `/profile/history` page | Not implemented | Profile page shows only current user info |
| RLS policies | Not applicable — app doesn't write to DB from client | Auth metadata pattern |

---

## 10. Replication Checklist

When porting these frontend decisions to another branch, ensure:

- [ ] React 19 + Vite 6 + TypeScript strict + Tailwind 3.4
- [ ] `@` path alias in both Vite and TypeScript config
- [ ] `BrowserRouter` in `main.tsx`
- [ ] Custom `brand` (green) and `recycle` (amber) Tailwind color palette
- [ ] Component CSS classes (`.btn-primary`, `.card`, `.input-field`, etc.) in `index.css`
- [ ] Inter font from Google Fonts
- [ ] Supabase client with PKCE flow, localStorage persistence
- [ ] Auth metadata pattern — no `public.users` queries
- [ ] Auth types in `hooks/useAuth.ts`, provider in `context/AuthProvider.tsx`
- [ ] `ProtectedRoute` with `state.from` redirect preservation
- [ ] Auth gate modals on Navigate and Connect pages
- [ ] Barricade security: anti-enumeration registration, "check your email" message
- [ ] Password policy: ≥8 chars, ≥1 uppercase, ≥1 number
- [ ] Scoring: weighted formula + hard overrides in `scoring.ts`
- [ ] Navbar: fixed top, backdrop blur, responsive hamburger, auth-aware
- [ ] Leaflet map centered on Metro Manila with custom divIcon markers
- [ ] All auth pages: Login, Register, ForgotPassword, AuthCallback, Profile
- [ ] `lucide-react` for all icons (no other icon library)
- [ ] Route pattern: `/auth/*` for auth pages, `/assess`/`/navigate`/`/connect` for modules
- [ ] Docker: node:20-alpine, port 5173, volume mounts for dev
