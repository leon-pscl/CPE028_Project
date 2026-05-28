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
- Staging schema for data pipeline

**Authentication (Auth Metadata Pattern)**
- Supabase Auth with PKCE flow (prevents token interception)
- Auth metadata-driven — profile data read from `user_metadata`, not `public.users` table (avoids 400 errors)
- Login, Register, Forgot Password, and Profile pages
- `AuthProvider` context + `useAuth` hook with typed `AuthUser`/`AuthError`/`UserRole`
- Auth-aware navigation bar with user name display
- `ProtectedRoute` component for route gating
- Auth gate modals on Navigate and Connect pages for unauthenticated users
- Barricade security: anti-enumeration registration, "check your email" message
- Password policy: ≥8 chars, ≥1 uppercase, ≥1 number

**Frontend**
- React 19 + Vite 6 + TypeScript strict + Tailwind CSS 3.4
- Custom brand (green) and recycle (amber) color palettes
- Supabase client with PKCE, localStorage persistence, auto-refresh
- Auth pages: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/callback`, `/auth/profile`
- Module pages: Assess (scoring form + result), Navigate (interactive roadmap graph), Connect (Leaflet map + shop directory)
- Custom CSS component classes (`btn-primary`, `.card`, `.input-field`, etc.) with consistent styling
- `lucide-react` icons throughout

**ML Service**
- FastAPI inference server (`ml/app.py`) with MobileNetV3-Small classifier
- Asynchronous marketplace price scraper (`ml/marketplace.py`) for Shopee & Lazada
- Training pipeline (`ml/train.py`) with ONNX export

### 🔜 Next (Iteration 3)
- Google Places API integration for dynamic directory
- Enhanced scoring with unsupervised clustering
- Production-hardened ML deployment

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend / DB | Supabase — PostgreSQL + PostGIS, Auth, Storage, REST API |
| Mapping | Leaflet.js + OpenStreetMap tiles |
| Directory | Google Places API + Nominatim OSM |
| ML service | FastAPI on Railway (Python, scikit-learn / ONNX) |
| CI/CD | GitHub Actions + Vercel |
| Containerization | Docker + Docker Compose |
| Testing | Vitest + Playwright |

## Database Schema

The project uses a **PostgreSQL + PostGIS** database on Supabase with 15 tables organized by domain:

### Core Tables
| Table | Purpose | Key Columns |
|---|---|---|
| `users` | Extends `auth.users` with app-specific roles | `role` (consumer, shop_admin, verifier, super_admin) |
| `devices` | Catalog of smartphones & laptops | `brand`, `model`, `device_type`, `repairability_index` |
| `scoring_config` | Weighted scoring factors | `factor_name`, `weight` (age=0.20, severity=0.30, cost=0.25, parts=0.15, support=0.10) |
| `assessments` | Device assessment records | `device_age_months`, `issue_severity`, `parts_availability`, `cost_ratio` |
| `repair_scores` | ML scores linked to assessments | `direction` (REPAIR/RECYCLE), `score` (0–100), `confidence`, `feature_vector` |
| `cost_estimates` | Cost estimate ranges in PHP | `min_cost`, `max_cost`, `currency` |

### Content & Directory Tables
| Table | Purpose | Key Columns |
|---|---|---|
| `guides` | Repair/recycling guides | `guide_type` (repair, recycle, data_wipe), `device_type` |
| `checklist_completions` | Roadmap step tracking | `assessment_id`, `step_id`, `completed` |
| `shops` | Repair shops with spatial data | `geom` (PostGIS Point), `brands_serviced` (array), `is_verified` |
| `facilities` | Recycling facilities with spatial data | `geom` (PostGIS Point), `accepted_items` (array), `certifications` |
| `verification_tasks` | Place verification workflow | `source` (google_places, manual, facebook), `status` |

### Tracking & ML Tables
| Table | Purpose |
|---|---|
| `outcome_followups` | Post-repair outcome tracking |
| `impact_events` | SDG impact event logging |
| `audit_logs` | Security audit trail |
| `ml_models` | ML model version registry |

### Key Features
- **PostGIS** spatial extension for location-based distance queries on shops/facilities
- **Atomic transactions** via `create_assessment_tx()` — inserts assessment + score + cost in one call
- **Row Level Security** (RLS) with 40+ granular policies per user role
- **`staging` schema** for data pipeline / ETL workflows
- **Auto-updating timestamps** via `update_updated_at_column()` trigger function

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (Singapore region, PostGIS enabled)

### Setup
```bash
# Install dependencies
cd frontend && npm install

# Configure environment
cp .env.example .env
# Add your Supabase URL and anon key to .env

# Run the app
npm run dev
```

### Required Environment Variables
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Project Structure

```
├── frontend/src/
│   ├── features/             # Feature-scoped modules
│   │   ├── assess/           # Device assessment form & scoring engine
│   │   ├── navigate/         # Interactive repair/recycle roadmap
│   │   ├── connect/          # Leaflet map & directory (mapping)
│   │   └── auth/             # Login / Register / ForgotPassword / AuthCallback / Profile
│   ├── components/           # Shared UI (Navbar, Home, ProtectedRoute)
│   ├── context/              # React context providers (AuthProvider)
│   ├── hooks/                # useAuth (typed AuthUser/AuthError/UserRole)
│   ├── lib/                  # Supabase client (PKCE), database service
│   └── types/                # TypeScript type definitions (index, database)
├── ml/                       # FastAPI ML inference service
│   ├── app.py                # API server (health, predict endpoints)
│   ├── model.py              # MobileNetV3-Small classifier
│   ├── train.py              # Training pipeline with ONNX export
│   ├── marketplace.py        # Shopee/Lazada price scraper
│   └── models/               # Pre-trained weights
├── database/                 # PostgreSQL schema & seed data
│   ├── migrations/
│   │   ├── 001_init_schema.sql   # 15 tables, PostGIS, trigger functions
│   │   └── 002_rls_policies.sql  # Row Level Security policies
│   └── seed/
│       └── 001_seed_data.sql     # Guides, shops, facilities
├── infra/                    # Docker Compose configuration
│   └── docker-compose.yml
└── docs/                     # Build guide & architecture docs
    ├── AGENT_TASKS_v3.md
    ├── FRONTEND_DECISIONS_v2.md
    └── Rev.Tech_Architecture_v4.html
```
