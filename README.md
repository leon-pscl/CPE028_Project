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
│   │   ├── features/   # assess, navigate, connect, auth, admin, legal
│   │   ├── components/ # Sidebar, Home, ProtectedRoute, LoadingScreen, Breadcrumbs
│   │   ├── context/    # AuthProvider
│   │   ├── hooks/      # useAuth, useGeolocation, useStations, useMlAssessment, etc.
│   │   ├── lib/        # supabaseClient, database, geoapify, sanitize, scoring, tests
│   │   ├── types/      # TypeScript definitions (database, station, index)
│   │   └── utils/      # authImages
│   ├── Dockerfile
│   ├── vitest.config.ts
│   ├── vercel.json     # SPA rewrites, Vercel config
│   └── package.json
├── ml/                 # ML inference service — containerized
│   ├── api_integration_unified.py  # Unified FastAPI app
│   ├── predict_unified.py          # Combined text + image assessment
│   ├── predict.py                  # Text issue classification + repairability scoring
│   ├── marketplace.py              # Shopee/Lazada price scraper
│   ├── training/
│   │   ├── scripts/    # Training scripts (issue classifier, repairability scorer, etc.)
│   │   ├── datasets/   # Training data
│   │   └── results/    # Training outputs
│   ├── models/         # Pre-trained weights (.joblib, .pth)
│   ├── tests/          # Pytest test modules
│   ├── examples/       # Usage examples
│   ├── docs/           # API deployment, model training guides
│   ├── requirements.txt
│   ├── Dockerfile
│   └── pytest.ini
├── database/           # Supabase schema
│   ├── migrations/     # 10 migration files (init → username constraints)
│   └── seed/           # Sample guides, shops, facilities
├── supabase/           # Supabase CLI config
├── infra/
│   └── docker-compose.yml  # ML service compose config
├── docs/
│   ├── deployment/     # Supabase setup, verification checklist, deployment options
│   ├── frontend/       # Frontend architecture decisions
│   ├── project/        # Roadmap
│   ├── ml/             # Integration guide
│   ├── legal/          # Privacy policy, terms of service
│   └── UI/             # UI mockups and implementation notes
├── .github/workflows/
│   └── ci.yml          # Frontend test + build, ML pytest + Docker build
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

- **Frontend**: Connect `frontend/` to Vercel — `vercel.json` handles SPA rewrites. Alternatively, build with `frontend/Dockerfile`
- **Database**: Create Supabase project → run `database/migrations/` in order → apply `database/seed/`
- **ML Service**: `docker build -t revtech-ml ./ml && docker run -p 8000:8000 revtech-ml`

## Testing

Automated tests run on every pull request via GitHub Actions.

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

| Test file | What it covers | Tests |
|---|---|---|
| `src/lib/scoring.test.ts` | `computeScore` — score bounds, direction, hard overrides, confidence | 10 |
| `src/lib/sanitize.test.ts` | `escapeHtml`, `sanitizeUrl`, `sanitizePhone`, `sanitizeStationName`, `sanitizeAddress`, `validateRequired`, `validateLength`, `validateCoordinates`, `sanitizeForDb` | 32 |
| `src/lib/rateLimit.test.ts` | `checkRateLimit` token bucket, `canRefetch` cooldown | 7 |
| `src/lib/stationUtils.test.ts` | `haversineKm`, `formatDistance`, `filterStations`, `searchStations`, `withDistances` | 18 |

### ML Service (Pytest)

```bash
cd ml
pip install -r requirements.txt
pytest                # run all tests
pytest --cov=.        # with coverage
```

| Test file | What it covers | Parametrized cases |
|---|---|---|
| `tests/test_model_files.py` | Model `.joblib`/`.pth` files exist, loadable, training summary readable | 3 |
| `tests/test_issue_classifier.py` | `predict_issue_type` — returns label + confidence for damage descriptions | 5 |
| `tests/test_repairability.py` | `predict_repairability` — returns score + recommendation for devices | 4 |
| `tests/test_combined.py` | `combined_assessment` — end-to-end damage + repairability | 3 |
| `tests/test_image_models.py` | Image model inference (corrosion, crack, component classifiers) | — |
| `tests/test_predict_unified.py` | Unified prediction pipeline | — |
| `tests/test_issue_classifier_accuracy.py` | Issue classifier accuracy benchmarks | — |
| `tests/test_repairability_accuracy.py` | Repairability scorer accuracy benchmarks | — |

> ML tests require model files. Generate them first: `cd ml && python training/scripts/train_issue_classifier.py`

### CI Pipeline (`.github/workflows/ci.yml`)

Triggered on PRs to `main`:

1. **Frontend job** — `npm ci` → `typecheck` → `lint` → `vitest run` → `build`
2. **ML job** — `pip install` → `pytest` → Docker build → container health check (`curl /health`)

## Current Status

### ✅ Completed
- Full Supabase schema (15+ tables, PostGIS, RLS, 12 migrations)
- Supabase Auth with PKCE flow, role-based access (consumer/moderator/admin), Google OAuth
- React 19 SPA with all pages (Assess, Navigate, Connect, Auth, Admin, Profile, Legal)
- Device assessment with ML-powered scoring (REPAIR/RECYCLE direction, confidence, rationale)
- Personalized repair/recycle roadmap with progress tracking (persisted to Supabase)
- Leaflet map with custom markers, marker clustering, Geoapify directory search
- User-submitted locations with pin-on-map, admin review workflow, community changes panel
- Assessment history with delete (confirmation modal, cascading cleanup) and collapsible view (last 5 + show all/less)
- ML inference: 5 models — issue classifier (98.8% accuracy), repairability scorer (R²=0.88), crack detector, corrosion detector, image classifier
- Shopee/Lazada marketplace price integration for repair cost estimation
- Input sanitization, rate limiting, loading animation, error boundaries
- CI/CD pipeline (GitHub Actions → Vercel + Google Cloud Run)
- Privacy Policy and Terms of Service pages

### ⚠️ Known Gaps
- Image upload wired to UI but ML integration partially tested end-to-end
- No standalone assessment history dashboard (accessible via Profile page)
