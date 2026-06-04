# ReDevice — Repair or Recycle Decision Tool

A Philippines-focused responsive web app that guides consumers through a structured repair-or-recycle decision for defective or end-of-life smartphones and laptops, then connects them to verified local resources.

**Three core modules:**
- **Assess** — device intake form → ML-driven Repair-or-Recycle Score
- **Navigate** — personalized visual roadmap (repair or recycle path)
- **Connect** — verified directory of repair shops and recycling facilities in the Philippines

## Current Status (Iteration 3)

Iteration 1 provided a skeletal proof of concept. Iteration 2 built out real auth, a Supabase database with 6 migrations, a Geoapify-powered directory with user submissions and admin review, input sanitization and rate limiting, and full brand re-skin. We are now in **Iteration 3**, with the following documented honestly:

### ✅ Completed

**Database (Supabase)**
- Full schema with 15 tables covering users, devices, assessments, scoring, shops, facilities, verification, and impact tracking
- PostGIS extension for location-based queries
- Atomic `create_assessment_tx` function for transaction integrity
- Row Level Security (RLS) policies on all tables
- Initial seed data: scoring weights, Philippine market devices, sample shops/facilities
- 6 migrations: init schema, RLS policies, role cleanup, multi-type support, rejected shops lifecycle, type corrections

**Authentication**
- Supabase Auth with PKCE flow (prevents token interception)
- Auth metadata-driven — profile data read from `user_metadata`, not `public.users` table
- Login, Register, Forgot Password, Auth Callback, and Profile pages
- `AuthProvider` context + `useAuth` hook with typed `AuthUser`/`AuthError`/`UserRole`
- Auth-aware sidebar with user name display and logout
- `ProtectedRoute` component for route gating with role-based access (`consumer`, `moderator`)
- Barricade security: anti-enumeration registration, "check your email" message
- Password policy: ≥8 chars, ≥1 uppercase, ≥1 number
- Auth gate modals on Navigate and Connect pages for logged-out users

**Frontend & UI**
- React 19 + Vite 6 + TypeScript strict + Tailwind CSS 3.4
- Custom brand (mint) and section-based color palette (yellow, pink, lavender)
- Collapsible sidebar with scroll-spy section highlighting and mobile drawer
- All auth pages and module pages (Assess, Navigate, Connect) built
- Admin review page (`/admin/review`) for moderator approval workflow
- Loading screen with GSAP wipe animation on app start
- `lucide-react` icons throughout, custom CSS tokens with `btn-*`, `.card`, `.input-field` classes

**Connect Module (Map & Directory)**
- Leaflet map with OpenStreetMap tiles, custom divIcon markers (blue=repair, green=recycle, purple=both)
- Geoapify Places API for live nearby search and geocoding autocomplete
- Supabase integration for user-submitted locations with verified/unverified/rejected states
- Marker pinning mode — click map to drop a pin and add a location
- Admin approve/reject from map popup (moderator/admin role)
- Suggest type correction for Geoapify results
- Input sanitization (`sanitize.ts`) — HTML escaping, URL validation, form validation
- Token-bucket rate limiting (`rateLimit.ts`) for Geoapify API calls
- Multi-type support — stations can be both repair AND recycle
- Mobile-responsive layout: map full-width, station panel as bottom sheet

**ML Service**
- FastAPI inference server (`ml/app.py`) with MobileNetV3-Small binary classifier
- Asynchronous marketplace price scraper (`ml/marketplace.py`) for Shopee & Lazada
- Training pipeline (`ml/train.py`) with ONNX export
- Health check (`GET /health`) and prediction (`POST /predict`) endpoints

### ⚠️ Known Gaps

Not everything planned for Iteration 2 was perfectly implemented. These are tracked for completion in current/future iterations:

**Assessment (Assess Module)**
- Scoring is **client-side only** — `scoring.ts` computes rule-based scores in the browser but does not persist results to the database via `create_assessment_tx`
- No ML integration — rule-based formula is used instead of the MobileNetV3-Small classifier
- Screen image upload field exists in the form but is not wired to the ML inference pipeline
- Assessment history is not saved per-user (no `/profile/history` page)

**Roadmap (Navigate Module)**
- Step completion state is **in-memory only** — does not survive page reload
- No `checklist_completions` table writes or `impact_events` tracking
- No API endpoints built (`GET /roadmaps`, `POST /steps/complete`)
- No data wipe guide as a mandatory RECYCLE step

**Map & Directory (Connect Module)**
- **Marker clustering not implemented** — `leaflet.markercluster` is in dependencies but never used; markers overlap with many results
- **No radius slider** — `searchRadius` hardcoded at 5000m; user cannot adjust search area (planned 1–25 km slider)
- **One-shot geolocation** — uses `getCurrentPosition` instead of `watchPosition`; does not track user movement; no IP-geolocation fallback when GPS denied
- **No tile fallback** — if OpenStreetMap tile CDN is unreachable, map goes blank
- **Mobile panel UX** — 70vh bottom sheet covers most of the map when open; no draggable handle
- **Rate-limit UX** — Geoapify calls are rate-limited but the user sees no message when throttled
- **Map initial center** — starts at central PH instead of detecting user's approximate region

**Authentication**
- **Google OAuth buttons are rendered but not wired** — `LoginPage` and `RegisterPage` show placeholder buttons; `supabase.auth.signInWithOAuth()` is never called
- **Anonymous sessions** (`signInAnonymously()`) not implemented — auth gate modals used instead
- **Account claim flow** (anonymous → registered merge) not implemented
- **User history page** — `/auth/profile` exists but no assessment history dashboard

### Next (Iteration 4)

- **Auth Completion**: Wire Google OAuth buttons, implement anonymous sessions + account claim
- **Assessment DB Persistence**: Wire `create_assessment_tx` to persist assessments from the client
- **ML Scoring Integration**: Connect ML inference service to the assessment pipeline with graceful fallback to rule-based scoring
- **Roadmap Persistence**: Save step state to `checklist_completions`, add `impact_events` tracking, build API endpoints
- **Map Enhancements**: Marker clustering, radius slider, continuous geolocation, tile fallback, improved mobile panel
- **User History Dashboard**: Build assessment history page with past results, scores, and directions
- **Production Hardening**: Vercel deployment, security audit, Sentry monitoring, Lighthouse audits

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS 3.4 |
| Backend / DB | Supabase — PostgreSQL + PostGIS, Auth, Storage, REST API |
| Mapping | Leaflet.js + OpenStreetMap tiles + MarkerCluster |
| Directory | Geoapify Places API |
| ML service | FastAPI (Python, PyTorch / ONNX) |
| CI/CD | Vercel (frontend) |
| Containerization | Docker + Docker Compose |
| Testing | Vitest |
| Animation | GSAP + Motion + Anime.js |

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (Singapore region, PostGIS enabled)
- Geoapify API key (free tier at [myprojects.geoapify.com](https://myprojects.geoapify.com))

### Setup
```bash
# Configure environment
cp .env.example .env
# Add your Supabase URL, anon key, and Geoapify API key

# Install dependencies & run frontend
cd frontend && npm install && npm run dev
```

### Required Environment Variables
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEOAPIFY_API_KEY=your_geoapify_key
```

## Project Structure

```
├── frontend/src/
│   ├── features/
│   │   ├── assess/           # Device assessment form, client-side scoring engine (ML not yet wired)
│   │   ├── navigate/         # Interactive repair/recycle roadmap (state not yet persisted)
│   │   ├── connect/          # Leaflet map, station list, add/suggest modals (no marker clustering yet)
│   │   ├── auth/             # Login / Register / ForgotPassword / AuthCallback / Profile
│   │   └── admin/            # Admin review page for moderator approval
│   ├── components/           # Shared UI (Sidebar, Home, ProtectedRoute, Breadcrumbs, LoadingScreen)
│   ├── context/              # React context providers (AuthProvider)
│   ├── hooks/                # useAuth, useGeolocation, useStations, useAdminReview, etc.
│   ├── lib/                  # Supabase client (PKCE), database service, geoapify, rateLimit, sanitize
│   └── types/                # TypeScript definitions (index, database, station)
├── ml/                       # FastAPI ML inference service + training pipeline
│   ├── app.py                # API server (health, predict endpoints)
│   ├── model.py              # MobileNetV3-Small classifier
│   ├── train.py              # Training pipeline with ONNX export
│   ├── marketplace.py        # Shopee/Lazada price scraper
│   └── models/               # Pre-trained weights
├── database/
│   ├── migrations/           # 6 migration files (init, RLS, role cleanup, multi-type, etc.)
│   └── seed/                 # Sample guides, shops, facilities
├── infra/                    # Docker Compose configuration
├── docs/                     # Architecture docs, UI mockups, build guide
└── .env.example              # Environment variable template
```
