# ReDevice — Repair or Recycle Decision Tool

A Philippines-focused responsive web app that guides consumers through a structured repair-or-recycle decision for defective or end-of-life smartphones and laptops, then connects them to verified local resources.

**Three core modules:**
- **Assess** — device intake form → ML-driven Repair-or-Recycle Score
- **Navigate** — personalized visual roadmap (repair or recycle path)
- **Connect** — verified directory of repair shops and recycling facilities in the Philippines

## Current Status (Iteration 2)

Iteration 1 provided a skeletal proof of concept with hardcoded data. Iteration 2 adds:

### ✅ Completed

**Database (Supabase)**
- Full schema with 15 tables covering users, devices, assessments, scoring, shops, facilities, verification, and impact tracking
- PostGIS extension for location-based queries
- Atomic `create_assessment_tx` function for transaction integrity
- Row Level Security (RLS) policies on all tables
- Initial seed data: scoring weights, Philippine market devices, sample shops/facilities
- Additional migrations: role cleanup, multi-type support, rejected shops, type corrections

**Authentication (Auth Metadata Pattern)**
- Supabase Auth with PKCE flow (prevents token interception)
- Auth metadata-driven — profile data read from `user_metadata`, not `public.users` table
- Login, Register, Forgot Password, Auth Callback, and Profile pages
- `AuthProvider` context + `useAuth` hook with typed `AuthUser`/`AuthError`/`UserRole`
- Auth-aware sidebar with user name display and logout
- `ProtectedRoute` component for route gating with role-based access (`consumer`, `moderator`)
- Barricade security: anti-enumeration registration, "check your email" message
- Password policy: ≥8 chars, ≥1 uppercase, ≥1 number

**Frontend**
- React 19 + Vite 6 + TypeScript strict + Tailwind CSS 3.4
- Custom brand (mint) and section-based color palette (yellow, pink, lavender)
- Collapsible sidebar with scroll-spy section highlighting and mobile drawer
- Auth pages: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/callback`, `/auth/profile`
- Module pages: Assess (scoring form + screen image upload + ML result), Navigate (interactive roadmap with branching sub-items), Connect (Leaflet map + station list + add/suggest modals)
- Admin review page (`/admin/review`) for moderator approval workflow
- Loading screen with GSAP wipe animation on app start
- `lucide-react` icons throughout
- Geoapify Places API for dynamic directory search and geocoding
- Custom CSS tokens with `btn-*`, `.card`, `.input-field` utility classes

**ML Service**
- FastAPI inference server (`ml/app.py`) with MobileNetV3-Small binary classifier
- Asynchronous marketplace price scraper (`ml/marketplace.py`) for Shopee & Lazada
- Training pipeline (`ml/train.py`) with ONNX export
- Health check (`GET /health`) and prediction (`POST /predict`) endpoints

### Next (Iteration 3)
- Production deployment and hardening
- User history and account dashboard
- Additional UI polish and imagery

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
│   │   ├── assess/           # Device assessment form, scoring engine, ML integration
│   │   ├── navigate/         # Interactive repair/recycle roadmap with sub-items
│   │   ├── connect/          # Leaflet map, station list, add/suggest modals
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
