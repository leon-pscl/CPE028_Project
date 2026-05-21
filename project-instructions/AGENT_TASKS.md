# ReDevice — Agent Task Breakdown & Build Guide

> **For the AI agent:** This is your primary build guide. Read it in full before writing any code.
> The project is built in iterations — each one adds a layer of completeness on top of the last.
> Never rewrite or remove what already works. Only add and polish.
> At the start of every session, read the current iteration's goals and check the iteration log to understand what state the app is in.
> When in doubt about architecture, schema, or API contracts, refer to `ReDevice_Architecture_v2.html`.

---

## Project Summary

**ReDevice** is a Philippines-focused Progressive Web App (PWA) that guides consumers through a structured repair-or-recycle decision for defective or end-of-life smartphones and laptops, then connects them to verified local resources.

**Three core modules:**
- **Assess** — device intake form → ML-driven Repair-or-Recycle Score
- **Navigate** — personalized visual roadmap (repair or recycle path) with offline checklist
- **Connect** — verified directory of repair shops and recycling facilities in the Philippines

**SDG alignment:** SDG 12.4.2 (hazardous waste management) · SDG 12.5.1 (waste reduction via recycling/reuse)

**Reference docs:**
- Architecture, schema, API contracts: `ReDevice_Architecture_v2.html`
- Problem validation: `Group3_Engineering_Problem_Validation_Filled.docx`

---

## How Iterations Work

Each iteration **builds on top of the current state of the application.** Nothing is ever rewritten from scratch.

```
Iteration 1  →  Skeletal proof of concept
                All 3 modules exist and are navigable.
                Fake/hardcoded data is acceptable.
                Goal: show the full user journey end-to-end.

Iteration 2  →  Real data, real logic
                Replace stubs with working backend.
                Connect to Supabase. Real scoring.
                Goal: the core flow works for real.

Iteration 3  →  Polish & completeness
                Edge cases handled. UI refined.
                Self-registration, verification, PWA.
                Goal: demo-ready for stakeholders.

Iteration 4+ →  Production hardening
                ML model, seeding pipeline, security,
                monitoring, offline support.
                Goal: real-world deployable product.
```

**Rules for every iteration:**
- Each iteration must leave the app in a runnable state — no broken builds ever
- New code layers on top of existing code. Don't touch what already works unless fixing a bug
- At the end of each iteration, update the log below with what was actually built and any deviations
- Mark tasks `[x]` as they are completed. Add notes inline if behaviour differs from the plan

---

## Roadmap UI Design Reference

The Navigate module uses an interactive node-graph diagram inspired by roadmap.sh. Key design principles:

**Layout:**
- Main steps flow vertically along a central axis as rectangular node cards
- Each main step has 2 sub-items branching horizontally (left and right) via dashed connector lines
- SVG dashed lines connect the central axis to sub-item nodes
- Central vertical axis line runs behind all nodes (visible on desktop)

**Node states:**
- **Recommended/active:** Amber border (`border-amber-400`), amber background (`bg-amber-50`), amber status icon — draws user attention to the next action
- **Completed:** Brand-green border (`border-brand-400`), brand-green background (`bg-brand-50`), filled checkmark icon
- **Pending:** Light gray border (`border-gray-200`), white background, empty circle icon

**Sub-items:**
- Each main step has 2 sub-items: one branches left, one branches right
- Sub-items are smaller cards with their own checkable status
- Connected to the central axis via dashed SVG lines (`strokeDasharray="4 3"`)
- On mobile, sub-items stack vertically below the main node

**Data structure:**
- `RoadmapStep` has optional `subItems` array and `recommended` boolean
- `RoadmapSubItem` has a `branch` field (`'left' | 'right'`)
- Both main steps and sub-items have independent completion state

**Files:**
- `apps/web/src/modules/navigate/NavigatePage.tsx` — main component with `MainNode` and `SubNode` sub-components
- `apps/web/src/modules/navigate/roadmapData.ts` — step definitions with sub-items
- `apps/web/src/types/index.ts` — `RoadmapStep` and `RoadmapSubItem` interfaces

---

## Iteration Log

> Update this table at the end of every session.

| Iteration | Focus | Status | Notes |
|---|---|---|---|
| 1 | Skeletal proof of concept | `[x] Completed` | All 3 modules built + Docker setup. Full user journey verified locally. |
| 2 | Real backend + scoring | `[ ] Not started` | |
| 3 | Polish + self-registration + PWA | `[ ] Not started` | |
| 4 | ML service + seeding pipeline | `[ ] Not started` | |
| 5 | Hardening + launch prep | `[ ] Not started` | |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| PWA | vite-plugin-pwa (service workers, offline, installability) |
| Backend / DB | Supabase — PostgreSQL + PostGIS, Auth, Storage, REST API |
| DB region | `ap-southeast-1` (Singapore) — set at project creation, cannot change |
| Mapping | Leaflet.js + OpenStreetMap tiles |
| ML service | FastAPI on Railway (Python, scikit-learn / XGBoost / ONNX) |
| Scraping | Python + Playwright + BeautifulSoup (isolated, manual-trigger only) |
| CI/CD | GitHub Actions + Vercel |
| Containerization | Docker + Docker Compose |
| Infrastructure | Ansible (environment provisioning) |
| Testing | Vitest (unit) + Playwright (e2e) |
| Error tracking | Sentry |

---

## Folder Structure

Establish this from the start and do not deviate without updating this file.

```
redevice/
├── apps/
│   ├── web/                        # React + Vite PWA
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── assess/         # Assess module
│   │   │   │   ├── navigate/       # Navigate module
│   │   │   │   └── connect/        # Connect module
│   │   │   ├── components/         # Shared UI components
│   │   │   ├── hooks/              # Shared React hooks
│   │   │   ├── lib/                # Supabase client, utils
│   │   │   ├── types/              # TypeScript types
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── ml/                         # FastAPI ML service
│       ├── app/
│       │   ├── main.py
│       │   ├── model.py
│       │   ├── schemas.py
│       │   └── overrides.py        # Hard override rules (never skip these)
│       ├── training/
│       │   ├── clustering.py
│       │   ├── classification.py
│       │   └── evaluate.py
│       ├── models/                 # Serialized model files (.pkl / .onnx)
│       ├── Dockerfile
│       └── requirements.txt
├── supabase/
│   ├── migrations/                 # Numbered SQL migration files — append only
│   └── functions/
├── scraper/
│   ├── pipelines/
│   │   ├── google_maps.py
│   │   └── facebook_pages.py
│   ├── etl/transform.py
│   ├── ETHICS.md
│   ├── Dockerfile
│   └── requirements.txt
├── docker/
│   ├── docker-compose.yml          # Local dev
│   └── docker-compose.ci.yml       # CI
├── ansible/
│   ├── setup.yml                   # Dev machine provisioning
│   └── deploy.yml                  # Production server
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint → test → build → preview deploy
│       ├── deploy.yml              # main → production
│       └── seeding.yml             # workflow_dispatch only — never auto-trigger
├── .env.example
└── AGENT_TASKS.md                  # This file
```

---

## Environment Variables

Use these exact names everywhere. Never invent new ones.

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Server-side only. Never in client bundle.

# ML Service
ML_SERVICE_URL=                   # https://redevice-ml.railway.app
ML_SERVICE_API_KEY=               # Vercel → FastAPI internal auth

# Mapping
VITE_NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org

# Monitoring
SENTRY_DSN=
VITE_SENTRY_DSN=

# CI/CD
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

---

## Coding Conventions

Follow these in every file across all iterations.

- **Language:** TypeScript in `apps/web`. Python 3.11+ in `apps/ml` and `scraper`.
- **Exports:** Named exports only. Default exports only for React page-level components.
- **Styling:** Tailwind utility classes only. No inline styles. No CSS modules.
- **API calls:** All Supabase calls go through `src/lib/supabase.ts`. Never import the client directly in components.
- **Error handling:** Every async function has try/catch. Errors shown via toast, never swallowed silently.
- **Env vars:** Validate at startup. Throw a clear error if any required var is missing.
- **Commits:** Conventional format — `feat:`, `fix:`, `chore:`, `test:`, `docs:`.
- **No magic numbers:** Scoring weights, thresholds, and constants live in named config files, not inline.

---

## Permanent Rules (Apply in Every Iteration, No Exceptions)

- **Never commit secrets.** All real values in `.env` (gitignored). Use `.env.example` to document keys.
- **Migrations are append-only.** Never edit an existing migration file. Always create a new numbered file.
- **Hard override rules survive every iteration.** The forced-RECYCLE conditions below are applied in the Scoring Fn *after* the ML model runs. They are never removed by a model upgrade:
  - Motherboard failure + age > 48 months → RECYCLE
  - Severe liquid damage + age > 36 months → RECYCLE
  - parts_availability = EOL + issue_severity = severe → RECYCLE
- **ML model promotion is always manual.** Never auto-set `active = true` on a new model. An admin must review evaluation metrics and promote explicitly.
- **Scraping is always manual.** `seeding.yml` is `workflow_dispatch` only. No automated triggers ever.
- **The staging schema is isolated.** No live app code path reads from or writes to `staging.*` except the admin seeding endpoints.

---

## Iteration 1 — Skeletal Proof of Concept

**Goal:** Show the complete user journey end-to-end. All three modules are navigable.
Data can be hardcoded or mocked. This is about proving the flow, not the logic.

**What "skeletal" means here:**
- Assess: form exists, submits, shows a hardcoded or calculated score result
- Navigate: roadmap renders with placeholder steps based on the score direction
- Connect: map renders with a few hardcoded shop pins
- The three modules are linked: completing Assess leads to Navigate, Navigate has a button into Connect

**Infrastructure:**
- [x] **1.1** Initialize repo with the folder structure above
- [x] **1.2** Set up `apps/web` — Vite + React + TypeScript + Tailwind, hello world renders
- [ ] **1.3** Set up GitHub Actions `ci.yml` — lint + type-check + build on every push
- [ ] **1.4** Connect Vercel to the repo — auto-deploys on push to `main`
- [ ] **1.5** Create `.env.example` with all variables listed above
- [x] **1.6** Create `docker-compose.yml` — web dev server runs via Docker

**Assess (skeletal):**
- [x] **1.7** Build device intake form — brand (text), model (text), age (number), issue (dropdown), severity (dropdown)
- [x] **1.8** On submit, compute a simple rule-based score locally (no API yet) and display: score number, REPAIR or RECYCLE direction, one-line rationale

**Navigate (skeletal):**
- [x] **1.9** Build roadmap UI — interactive node-graph diagram (roadmap.sh style). Main steps render as rectangular nodes on a central vertical axis, connected by vertical lines. Each main step has 2 sub-items branching horizontally left and right via dashed connector lines. Recommended/active node highlighted with amber fill. Completed nodes styled with brand-green border/fill. Other nodes outlined with light gray. Status icons (checkmark for completed, circle for pending) on every node. Feels like a skill tree, not a linear list.
- [x] **1.10** Steps and sub-items are checkable — state lives in React only (no persistence yet)
- [x] **1.11** Final step on each path has a "Find a shop / drop-off" button linking to Connect

**Connect (skeletal):**
- [x] **1.12** Integrate Leaflet.js with OpenStreetMap base layer
- [x] **1.13** Render 3–5 hardcoded shop/facility pins on the map (Metro Manila coordinates)
- [x] **1.14** Show a basic list below the map — name, address, type

**Linking:**
- [x] **1.15** Assess result page has a "See my roadmap" button → Navigate
- [x] **1.16** Navigate final step links to Connect (pre-filtered label in URL, even if filter isn't implemented yet)

**Definition of done for Iteration 1:**
- [x] A user can go: fill form → see score → see roadmap → check off steps → reach the Connect map
- [x] The full journey is completable without errors
- [ ] Deployed and accessible on Vercel
- [ ] No broken CI

**Notes:**
- Docker Compose added for easy first-time dev setup (`docker compose -f docker/docker-compose.yml up --build`)
- Scoring uses rule-based weighted formula with hard override conditions (motherboard + age > 48mo, liquid damage + age > 36mo, EOL parts + severe)
- Custom Leaflet markers (green for repair, amber for recycling)
- Remaining: `.env.example`, GitHub Actions CI, Vercel deploy

---

## Iteration 2 — Real Backend & Scoring

**Goal:** Replace all stubs and hardcoded data with a real working backend.
The app now reads from and writes to Supabase. Scoring uses real logic.

**Supabase setup:**
- [ ] **2.1** Create Supabase project in `ap-southeast-1` (Singapore)
- [ ] **2.2** Enable PostGIS extension
- [ ] **2.3** Create `staging` schema with restricted access
- [ ] **2.4** Write and apply migration files in dependency order (see architecture doc §18 for full schema):
  - `users`, `devices`, `scoring_config`
  - `assessments`, `repair_scores`, `cost_estimates`
  - `guides`, `checklist_completions`
  - `shops`, `facilities`, `certifications`
  - `verification_tasks`, `audit_logs`
  - `outcome_followups`, `impact_events`, `sdg_impact` view
  - `staging.seeding_sources`
  - `ml_models` + ALTER `repair_scores` for ML columns
- [ ] **2.5** Apply RLS policies on all tables (see architecture doc §20)
- [ ] **2.6** Create Storage buckets: `guides` (public) and `cert-docs` (private)
- [ ] **2.7** Seed `scoring_config` with rule-based weights: `{ "age": 0.20, "issue_severity": 0.30, "cost_ratio": 0.25, "parts_availability": 0.15, "manufacturer_support": 0.10 }`
- [ ] **2.8** Seed `devices` with top 20 Philippine market devices (Samsung Galaxy A-series, OPPO A-series, iPhone 12–15, Xiaomi Redmi, Vivo Y-series, common laptops)
- [ ] **2.9** Set up GIST indexes on `shops.geom` and `facilities.geom`
- [ ] **2.10** Add partial unique indexes on `scoring_config` and `ml_models`

**Assess (real):**
- [ ] **2.11** Add brand/model autocomplete from `devices` table
- [ ] **2.12** Build Vercel Serverless Function `POST /api/v1/assessments` with real weighted scoring logic and hard override rules
- [ ] **2.13** Build cost estimate heuristic using seeded median parts + labour ranges
- [ ] **2.14** Build rationale template engine — plain-language output from score band + top factors
- [ ] **2.15** Implement `GET /api/v1/assessments/:id` for session restore
- [ ] **2.16** Write unit tests for scoring — cover all override rules and all score bands

**Navigate (real):**
- [ ] **2.17** Create `roadmap_templates` data structure in Supabase (or config file)
- [ ] **2.18** Build `GET /api/v1/roadmaps/:direction?device_id=:uuid` — returns ordered steps with guide URLs
- [ ] **2.19** Wire step completion to `POST /api/v1/roadmaps/:assessment_id/steps/:step_id/complete` with idempotency key
- [ ] **2.20** Persist step state to `checklist_completions` — survives page reload
- [ ] **2.21** Add data wipe guide as mandatory RECYCLE step
- [ ] **2.22** Write `impact_events` row on full roadmap completion

**Connect (real):**
- [ ] **2.23** Seed `shops` with 15 real Metro Manila repair shops
- [ ] **2.24** Seed `facilities` with 10 real PH recycling centers / DENR TSD facilities
- [ ] **2.25** Build `GET /api/v1/directory/search` with PostGIS geo-radius, filters, pagination
- [ ] **2.26** Replace hardcoded map pins with live Supabase data
- [ ] **2.27** Wire up Navigate referral → Connect pre-filtered by device + direction

**Definition of done for Iteration 2:**
- Samsung A54 (24 months, cracked screen) → score 70–90, REPAIR, real DB record written
- 2018 laptop (72 months, motherboard, severe) → hard override → RECYCLE
- Completing a roadmap creates an `impact_events` row
- Map shows real seeded shops; geo search returns correct distance-sorted results
- RLS verified: anon cannot write to any table

---

## Iteration 3 — Polish, Self-Registration & PWA

**Goal:** Demo-ready. UI is refined, shop owners can register, app is installable.

**UI polish:**
- [ ] **3.1** Improve Assess result UI — score visualization, confidence indicator, cost range display
- [ ] **3.2** Improve Navigate roadmap UI — enhance node-graph with animations (node entrance, connector draw-in), step type badges styled distinctly (action / info / download / referral), responsive layout for mobile (sub-items stack below main nodes), keyboard navigation between nodes
- [ ] **3.3** Improve Connect map — marker clusters, shop popup cards, distance labels
- [ ] **3.4** Add filter UI to Connect — radius, device type, brand, facility type
- [ ] **3.5** Add "Last verified" freshness indicator to shop/facility cards
- [ ] **3.6** Add SDG impact counter to home screen from `sdg_impact` view
- [ ] **3.7** Add Filipino language toggle (EN / FIL)

**Self-registration & verification:**
- [ ] **3.8** Build shop self-registration form UI
- [ ] **3.9** Implement `POST /api/v1/directory/shops/register` with cert doc upload
- [ ] **3.10** Implement Verification Service — auto-checks: Nominatim geocoding, duplicate detection
- [ ] **3.11** Build admin dashboard — PENDING task list with auto-check results
- [ ] **3.12** Implement `PATCH /api/v1/admin/verification-tasks/:task_id` — approve / reject
- [ ] **3.13** Set up email notification to shop_admin on decision (Supabase DB Webhook → Resend)
- [ ] **3.14** Add user ratings (display + submission)

**PWA & offline:**
- [ ] **3.15** Configure `vite-plugin-pwa` — manifest, 512×512 icon, display: standalone
- [ ] **3.16** Implement service worker caching (cache-first for static + guides, stale-while-revalidate for directory)
- [ ] **3.17** Implement localForage offline checklist queue + Background Sync flush
- [ ] **3.18** Add optimistic UI for checklist step completion
- [ ] **3.19** Cache OSM tiles at zoom 10–16, 7-day TTL
- [ ] **3.20** Run Lighthouse PWA audit — target score ≥ 90 in CI

**Definition of done for Iteration 3:**
- App is installable on Android from Chrome
- A shop owner can register; admin can approve; shop appears as verified in directory
- Offline: roadmap and cached guide load without network; step completion queues and syncs
- Lighthouse PWA ≥ 90

---

## Iteration 4 — ML Service & Seeding Pipeline

**Goal:** The scoring system uses a real ML model. The directory is populated via automated scraping.

**ML service:**
- [ ] **4.1** Set up `apps/ml` FastAPI service — `GET /health`, `POST /predict`
- [ ] **4.2** Implement Phase 1.5 clustering — K-Means + DBSCAN scripts in `training/clustering.py`
- [ ] **4.3** Evaluate with silhouette scores; document results in `ml_models.notes`
- [ ] **4.4** Get domain expert (repair technician) to label cluster profiles; record in `ml_models`
- [ ] **4.5** Serialize winning model to `apps/ml/models/`
- [ ] **4.6** Update Scoring Fn to call `/predict` — rule-based formula becomes silent fallback
- [ ] **4.7** Persist `ml_model_id`, `feature_vector`, `probability`, `feature_importances` on each `repair_scores` write
- [ ] **4.8** Build post-assessment follow-up prompt — "What did you end up doing?" → `outcome_followups`
- [ ] **4.9** Containerize FastAPI with Docker; deploy to Railway
- [ ] **4.10** Integration test: Scoring Fn falls back gracefully when ML service is down

**Seeding pipeline:**
- [ ] **4.11** Write `scraper/pipelines/google_maps.py` and `facebook_pages.py`
- [ ] **4.12** Write `scraper/etl/transform.py` — dedup, normalise, strip PII
- [ ] **4.13** Write `scraper/ETHICS.md` — robots.txt compliance, rate limiting (≥2s delay), takedown email
- [ ] **4.14** Set up `seeding.yml` GitHub Actions — `workflow_dispatch` only, environment protection required
- [ ] **4.15** Implement admin seeding endpoints (`GET /admin/seeding/staging`, `POST /admin/seeding/import`)
- [ ] **4.16** Run first real scraping run on Metro Manila; import first real batch

**Definition of done for Iteration 4:**
- `/predict` returns valid JSON for any valid feature vector
- Scoring Fn uses ML output; falls back silently on ML timeout
- First real scraping batch imports ≥ 20 shops to live directory
- Scraped records cannot reach live DB without explicit admin approval

---

## Iteration 5 — Hardening & Launch Preparation

**Goal:** Production-ready. Secure, monitored, and defensible.

- [ ] **5.1** Security audit — RLS verified on all tables; service-role key absent from client bundle
- [ ] **5.2** Enable MFA for verifier and super_admin roles
- [ ] **5.3** Implement data erasure endpoint `DELETE /api/v1/users/me`
- [ ] **5.4** Set up Sentry for web app and ML service
- [ ] **5.5** Set up Vercel Analytics
- [ ] **5.6** Configure all monitoring alerts from architecture doc §22
- [ ] **5.7** Enable Supabase daily backups + 7-day PITR
- [ ] **5.8** Enable PgBouncer connection pooling (transaction mode)
- [ ] **5.9** Write Ansible `setup.yml` (dev provisioning) and `deploy.yml` (production VPS)
- [ ] **5.10** Load test — 100 concurrent assessment submissions
- [ ] **5.11** Full e2e test suite on production environment
- [ ] **5.12** Final Lighthouse audit — Performance ≥ 85, PWA ≥ 90, Accessibility ≥ 90

**Definition of done for Iteration 5:**
- Zero critical Sentry issues in 24-hour staging run
- All CI tests pass on production
- Lighthouse targets met
- DENR export CSV generated and verified
