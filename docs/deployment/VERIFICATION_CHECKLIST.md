# Verification Checklist

Current state of project deliverables. Last updated: Iteration 5 (in progress).

---

## ML Models

| Item | Status | Notes |
|------|--------|-------|
| Issue Classifier (98.8% accuracy) | Done | `ml/models/issue_classifier_voting.joblib` |
| Repairability Scorer (R2 = 0.8763) | Done | `ml/models/repairability_voting_regressor.joblib` |
| Training scripts organized | Done | Moved to `ml/scripts/` |

## API Service

| Item | Status | Notes |
|------|--------|-------|
| FastAPI application | Done | `ml/api.py` |
| Health endpoint | Done | `GET /health` |
| Issue classification | Done | `POST /assess/issue` |
| Repairability scoring | Done | `POST /assess/repairability` |
| Combined assessment | Done | `POST /assess/combined` |
| Model info | Done | `GET /info/models` |

## Marketplace Integration

| Item | Status | Notes |
|------|--------|-------|
| Shopee price fetching | Done | API-based, async |
| Lazada price fetching | Done | Web scraping fallback |
| Cost analysis | Done | Parts + labor breakdown, repair ratio |
| Graceful fallback | Done | Service works without marketplace |

## Containerization

| Item | Status | Notes |
|------|--------|-------|
| Dockerfile | Done | `ml/Dockerfile`, Python 3.12-slim |
| Docker Compose | Done | `infra/docker-compose.yml` |

## Frontend

| Item | Status | Notes |
|------|--------|-------|
| React 19 + Vite 6 + TypeScript | Done | Strict mode |
| Tailwind CSS with brand theme | Done | Custom palette, section backgrounds |
| Supabase Auth (PKCE) | Done | Email/password + Google OAuth |
| Auth metadata pattern | Done | No `public.users` queries |
| Auth gate modals | Done | Navigate + Connect pages |
| Assess module | Done | Form + client-side scoring |
| Navigate module | Done | Horizontal scrollable timeline |
| Connect module | Done | Leaflet map + Geoapify + user submissions |
| Admin review page | Done | Approve/reject workflow |
| Profile with history | Done | Assessment history on profile |
| Input sanitization | Done | HTML escaping, URL validation |
| Rate limiting | Done | Token-bucket for Geoapify |
| Responsive design | Done | Mobile + desktop breakpoints |

## Database

| Item | Status | Notes |
|------|--------|-------|
| Schema (9 migrations) | Done | All tables created |
| RLS policies | Done | Applied to all tables |
| Seed data | Done | Devices, sample shops/facilities |
| PostGIS extension | Required | Enable in Supabase dashboard |

## Documentation

| Item | Status | Notes |
|------|--------|-------|
| Project roadmap | Done | `docs/project/ROADMAP.md` |
| Frontend decisions | Done | `docs/frontend/DECISIONS.md` |
| Architecture reference | Done | `docs/Rev.Tech_Architecture_v4.html` |
| Deployment guides | Done | `docs/deployment/` |
| ML integration guide | Done | `docs/ml/INTEGRATION.md` |
| Legal docs | Draft | `docs/legal/privacy.md`, `docs/legal/terms.md` |

---

## Known Gaps (Iteration 5)

| Item | Priority | Notes |
|------|----------|-------|
| Assessment DB persistence | High | Client-side scoring only, not written to DB |
| Roadmap DB persistence | High | In-memory state, does not survive reload |
| Marker clustering | Medium | `leaflet.markercluster` installed but unused |
| Radius slider | Medium | Hardcoded at 5000m |
| Continuous geolocation | Medium | One-shot `getCurrentPosition` |
| Tile fallback | Low | Single OSM tile layer |
| Anonymous sessions | Low | `signInAnonymously()` not implemented |
| Seeding pipeline | Medium | Scraper scripts not yet built |
| Sentry integration | Low | Error tracking not configured |

---

## How to Verify

```bash
# Frontend
cd frontend
npm run typecheck   # Should pass
npm run build       # Should succeed

# ML service
cd ml
python -c "from api import app; print('API loads OK')"

# Docker
docker-compose -f infra/docker-compose.yml up --build
curl http://localhost:5173  # Frontend
```
