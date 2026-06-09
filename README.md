# Rev.Tech — Repair or Recycle Decision Tool

A Philippines-focused web app guiding consumers through a structured repair-or-recycle decision for defective smartphones and laptops, connecting them to verified local resources.

**Three core modules:**
- **Assess** — device intake form → ML-driven Repair-or-Recycle Score
- **Navigate** — personalized visual roadmap (repair or recycle path)
- **Connect** — directory of repair shops and recycling facilities via Leaflet map

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS 3.4 — deployed on **Vercel** |
| Database | **Supabase** — PostgreSQL + PostGIS, Auth, Row Level Security |
| Mapping | Leaflet.js + OpenStreetMap + Geoapify Places API |
| ML Service | FastAPI (Python, PyTorch / scikit-learn) — **containerized** via Docker |
| CI/CD | GitHub Actions → Vercel (frontend) + Docker (ML) |

## Project Structure

```
├── frontend/           # Vite SPA — deploys to Vercel
│   ├── src/
│   │   ├── features/   # assess, navigate, connect, auth, admin
│   │   ├── components/ # Sidebar, Home, ProtectedRoute, LoadingScreen
│   │   ├── context/    # AuthProvider
│   │   ├── hooks/      # useAuth, useGeolocation, useStations, etc.
│   │   ├── lib/        # supabaseClient, database service, geoapify, sanitize
│   │   └── types/      # TypeScript definitions
│   ├── vercel.json     # SPA rewrites, Vercel config
│   └── package.json
├── ml/                 # ML inference service — containerized
│   ├── api.py          # Unified FastAPI app (7 endpoints)
│   ├── model.py        # MobileNetV3-Small image classifier
│   ├── predict.py      # Text issue classification + repairability scoring
│   ├── marketplace.py  # Shopee/Lazada price scraper
│   ├── train.py        # Image model training pipeline
│   ├── train_text_models.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── models/         # Pre-trained weights
├── database/           # Supabase schema
│   ├── migrations/     # 6 migration files (init → type corrections)
│   └── seed/           # Sample guides, shops, facilities
├── infra/
│   └── docker-compose.yml  # ML service compose config
├── docs/
│   ├── deployment/     # Supabase setup, verification checklist
│   ├── project/        # Completion summary
│   ├── ml/             # Marketplace integration guide
│   └── UI/             # UI mockups and implementation notes
├── .github/workflows/
│   └── ci.yml          # Frontend typecheck + lint + test + build
├── .env.example
└── README.md
```

## Getting Started

```bash
# 1. Configure environment
cp .env.example .env
# Add your Supabase URL, anon key, Geoapify key

# 2. Frontend
cd frontend && npm install && npm run dev

# 3. ML service (Docker)
docker compose -f infra/docker-compose.yml up -d
```

### Required Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEOAPIFY_API_KEY=your-geoapify-key
VITE_ML_SERVICE_URL=http://localhost:8000
```

## Deployment

- **Frontend**: Connect `frontend/` to Vercel — `vercel.json` handles SPA rewrites
- **Database**: Create Supabase project → run `database/migrations/` in order → apply `database/seed/`
- **ML Service**: `docker build -t revtech-ml ./ml && docker run -p 8000:8000 revtech-ml`

## Current Status

### ✅ Completed
- Full Supabase schema (15 tables, PostGIS, RLS, 6 migrations)
- Supabase Auth with PKCE flow, role-based access (consumer/moderator/admin)
- React 19 SPA with all pages (Assess, Navigate, Connect, Auth, Admin)
- Leaflet map with custom markers, Geoapify directory search, admin review workflow
- ML inference: text issue classifier (98.8% accuracy) + repairability scorer (R²=0.88)
- Image quality classifier (MobileNetV3-Small)
- Shopee/Lazada marketplace price integration
- Input sanitization, rate limiting, loading animation

### ⚠️ Known Gaps
- Scoring is client-side only (not persisted via `create_assessment_tx`)
- Image upload not wired to ML inference pipeline
- Roadmap step state is in-memory only
- Marker clustering not implemented
- Google OAuth buttons rendered but not wired
- No assessment history dashboard
