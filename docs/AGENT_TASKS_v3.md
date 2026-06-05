# Rev.Tech — Agent Task Breakdown & Build Guide (v4)

> **For the AI agent:** This is your primary build guide. Read it in full before writing any code.
> The project is built in iterations — each one adds a layer of completeness on top of the last.
> Never rewrite or remove what already works. Only add and polish.
> At the start of every session, read the current iteration's goals and check the iteration log to understand what state the app is in.
> When in doubt about architecture, schema, or API contracts, refer to `Rev.Tech_Architecture_v4.html`.

---

## Project Summary

**Rev.Tech** is a Philippines-focused responsive web app that guides consumers through a structured repair-or-recycle decision for defective or end-of-life smartphones and laptops, then connects them to verified local resources.

**Three core modules:**
- **Assess** — device intake form → ML-driven Repair-or-Recycle Score
- **Navigate** — personalized visual roadmap (repair or recycle path) with offline checklist
- **Connect** — verified directory of repair shops and recycling facilities in the Philippines

**SDG alignment:** SDG 12.4.2 (hazardous waste management) · SDG 12.5.1 (waste reduction via recycling/reuse)

**Reference docs:**
- Architecture, schema, API contracts: `Rev.Tech_Architecture_v4.html`
- Problem validation: `Group3_Engineering_Problem_Validation_Filled.docx`

---

## How Iterations Work

Each iteration **builds on top of the current state of the application.** Nothing is ever rewritten from scratch.

```
Iteration 1  →  Skeletal proof of concept                         [DONE]
                All 3 modules exist and are navigable.
                Fake/hardcoded data is acceptable.
                Goal: show the full user journey end-to-end.

Iteration 2  →  Auth + Database + Real Backend
                User authentication (Supabase Auth).
                User transaction database.
                Real scoring logic (rule-based, ML-ready).
                Dynamic directory using Google Places API / OSM.
                Goal: the core flow works end-to-end with real data.

Iteration 3  →  ML Scoring + Directory Intelligence
                Replace rule-based scoring with ML model (Phase 1 clustering).
                Smarter, dynamic service center / shop search.
                Goal: ML-driven decisions, no more hardcoded data anywhere.

Iteration 4  →  Polish & Responsive Completeness
                Edge cases handled. UI refined.
                Self-registration, verification workflow.
                Responsive web app validated across breakpoints.
                Goal: demo-ready for stakeholders.

Iteration 5+ →  Production Hardening
                Seeding pipeline, security audit,
                monitoring, advanced ML (supervised classifier).
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
| 2 | Auth + database + real backend | `[~] Partial` | Auth (PKCE, metadata pattern, barricade), DB schema (6 migrations, RLS), Connect (Geoapify + Supabase hybrid, user submissions, admin review, rate limiting, sanitization), UI (brand re-skin, loading screen, responsive sidebar). **Deferred:** Google OAuth wiring, anonymous sessions, assessment DB persistence, roadmap state persistence, user history, marker clustering, radius slider, tile fallback, continuous geolocation. See "Known Gaps" section below. |
| 3 | ML scoring + directory intelligence | `[ ] Not started` | Scope expanded: must also close Iter 2 gaps (auth completion, assess/roadmap DB wiring, map enhancements) before or alongside ML work. |
| 4 | Polish + responsive validation | `[ ] Not started` | |
| 5 | Hardening + launch prep | `[ ] Not started` | |

---

## Known Gaps (Current State)

The following items were planned for Iteration 2 but were not fully implemented. They are tracked for completion in Iteration 3 or later.

### Authentication
- **Google OAuth** — `LoginPage` and `RegisterPage` render Google sign-in buttons with `btn-placeholder` styling, but `supabase.auth.signInWithOAuth({ provider: 'google' })` is never called. Supabase project has Google provider enabled server-side; only the client wiring is missing.
- **Anonymous sessions** — `supabase.auth.signInAnonymously()` flow not implemented. Instead, auth gate modals are shown on Navigate and Connect for logged-out users.
- **Account claim** — Merging anonymous → registered account via `supabase.auth.linkIdentity()` not implemented.
- **User history** — `/auth/profile` exists but no `/profile/history` page showing past assessments.

### Assessment Module
- **No DB persistence** — `scoring.ts` computes results entirely client-side. Results are never written to `assessments`, `repair_scores`, or `cost_estimates` tables via `create_assessment_tx`.
- **No ML integration** — Rule-based formula (`computeScore()`) is used instead of calling the ML inference service (`POST /predict`).
- **Screen upload not wired** — File input for screen image exists in `AssessPage.tsx` but is not sent to the ML service.

### Roadmap Module
- **In-memory state only** — `NavigatePage.tsx` tracks step completion in React state. Does not survive page reload.
- **No API endpoints** — `GET /roadmaps`, `POST /steps/complete`, and `POST /impact-events` not implemented.
- **No `checklist_completions` writes** — Step state never persisted to Supabase.
- **No `impact_events` tracking** — Roadmap completion has no audit trail.

### Connect / Map Module
- **No marker clustering** — `leaflet.markercluster` is listed as a dependency in `frontend/package.json` but is never imported or initialized in `MapView.tsx`. With many Geoapify results, markers overlap severely.
- **No radius slider** — `searchRadius` in `useNearbySearch.ts` is hardcoded to 5000m. No UI control for the user to adjust (planned: 1–25 km slider per 2F.8).
- **One-shot geolocation** — `useGeolocation.ts` uses `navigator.geolocation.getCurrentPosition()` instead of `watchPosition()`. User location does not update as the user moves. No fallback to IP-based geolocation when GPS is denied.
- **No tile fallback** — Map uses OpenStreetMap tile layer only. If the CDN is unreachable, the map renders blank. No fallback layer (e.g. CartoDB).
- **Mobile panel UX** — Station panel is a 70vh bottom sheet. When open, most of the map is hidden. No draggable handle for resizing.
- **Rate-limit UX** — `geoapify.ts` enforces token-bucket rate limiting, but the user sees no message when a request is throttled — the fetch silently aborts.
- **Map initial center** — Map starts at `PH_CENTER` (12.88, 121.77, central Philippines). Does not attempt IP-based region detection to center on the user's approximate area.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend / DB | Supabase — PostgreSQL + PostGIS, Auth, Storage, REST API |
| DB region | `ap-southeast-1` (Singapore) — set at project creation, cannot change |
| Mapping | Leaflet.js + OpenStreetMap tiles |
| Directory search | Google Places API (primary) + Nominatim OSM (fallback / geocoding) |
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
│   ├── web/                        # React + Vite Responsive Web App
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── assess/         # Assess module
│   │   │   │   ├── navigate/       # Navigate module
│   │   │   │   ├── connect/        # Connect module
│   │   │   │   └── auth/           # Login / Register / Profile pages
│   │   │   ├── components/         # Shared UI components
│   │   │   ├── hooks/              # Shared React hooks (useAuth, useUser)
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
│       │   ├── clustering.py       # K-Means + DBSCAN
│       │   └── classifier.py       # Phase 2: supervised classifier
│       ├── models/                 # Serialized model files (.pkl / .onnx)
│       ├── requirements.txt
│       └── Dockerfile
├── supabase/
│   ├── migrations/                 # SQL migration files (numbered)
│   └── seed/                       # Seed SQL files
├── scraper/
│   ├── pipelines/
│   │   ├── google_maps.py
│   │   └── facebook_pages.py
│   ├── etl/
│   │   └── transform.py
│   └── ETHICS.md
├── infrastructure/
│   ├── ansible/
│   └── docker-compose.yml
└── .github/
    └── workflows/
        ├── ci.yml
        ├── deploy.yml
        └── seeding.yml
```

---

## Iteration 1 — Skeletal Proof of Concept ✅ COMPLETED

All 3 modules navigable. Fake/hardcoded data. Docker setup. Full user journey verified.

---

## Iteration 2 — Auth, User Database & Real Backend

**Goal:** Add user authentication and user transaction history. Replace stubs with a real working backend. The app reads from and writes to Supabase with proper RLS. Scoring uses real logic with a rule-based formula (ML-ready).

> **Why auth moves here:** User identity is needed before we can store transactions and assessments against a user. Building the user DB schema and auth together in one iteration avoids painful retroactive migrations later.

---

### 2A — Supabase Project Setup

- [ ] **2A.1** Create Supabase project in `ap-southeast-1` (Singapore)
- [ ] **2A.2** Enable PostGIS extension (`Database → Extensions → postgis`)
- [ ] **2A.3** Create `staging` schema with restricted access
- [ ] **2A.4** Write and apply migration files in dependency order:
  - `users`, `devices`, `scoring_config`
  - `assessments`, `repair_scores`, `cost_estimates`
  - `guides`, `checklist_completions`
  - `shops`, `facilities`, `certifications`
  - `verification_tasks`, `audit_logs`
  - `outcome_followups`, `impact_events`, `sdg_impact` view
  - `staging.seeding_sources`
  - `ml_models` + ALTER `repair_scores` for ML columns
- [ ] **2A.5** Apply RLS policies on all tables (see architecture doc §20)
- [ ] **2A.6** Create Storage buckets: `guides` (public) and `cert-docs` (private)
- [ ] **2A.7** Seed `scoring_config`: `{ "age": 0.20, "issue_severity": 0.30, "cost_ratio": 0.25, "parts_availability": 0.15, "manufacturer_support": 0.10 }`
- [ ] **2A.8** Seed `devices` with top 20 Philippine market devices (Samsung Galaxy A-series, OPPO A-series, iPhone 12–15, Xiaomi Redmi, Vivo Y-series, common laptops)
- [ ] **2A.9** Set up GIST indexes on `shops.geom` and `facilities.geom`
- [ ] **2A.10** Add partial unique indexes on `scoring_config` and `ml_models`

---

### 2B — User Authentication

> Uses Supabase Auth (email + social OAuth). The `users` table extends `auth.users` via a trigger. See architecture doc §15b for the full Auth & Session sequence diagram.

- [ ] **2B.1** Configure Supabase Auth: enable email/password + Google OAuth provider
- [ ] **2B.2** Create DB trigger: on `auth.users` insert → auto-insert into `public.users` with role `consumer`
- [ ] **2B.3** Build `/auth/login` page — email/password form + Google OAuth button
- [ ] **2B.4** Build `/auth/register` page — full name, email, password, role selection (consumer / shop_admin)
- [ ] **2B.5** Build `/auth/forgot-password` page — email reset flow via Supabase Auth
- [ ] **2B.6** Build `/auth/profile` page — view/edit full name, see role, account created date
- [ ] **2B.7** Create `useAuth` hook — exposes `{ user, session, signIn, signOut, signUp, loading, isAnonymous }`
- [ ] **2B.8** Add auth state to app router — protect routes that require login; redirect unauthenticated users
- [ ] **2B.9** Add login/logout UI to the main nav header
- [ ] **2B.10** Verify RLS: anon users can read public data but cannot write to any table; authenticated users can write only their own records
- [ ] **2B.11** Write unit tests covering: register, login, logout, session restore, unauthorized write attempt
- [ ] **2B.12** Implement anonymous sessions: call `supabase.auth.signInAnonymously()` when an unauthenticated user starts an assessment. Store anonymous JWT in Supabase client; pass as Bearer on all API calls so RLS applies. Anonymous sessions expire after 7 days of inactivity.
- [ ] **2B.13** Implement anonymous → registered account claim: after an anonymous user registers, call `supabase.auth.linkIdentity()` to merge the anonymous account into the new registered account. Update `assessments.user_id` FKs to point to the new UID. This preserves all prior assessment history.
- [ ] **2B.14** Handle anonymous session expiry gracefully: if an anonymous JWT is expired on page load, silently create a fresh anonymous session (no error shown to user). Prior anonymous assessment records retain their original UID and are not reassigned.

---

### 2C — User Transaction Database

> Every assessment a logged-in user completes is tied to their account. Anonymous assessments are still allowed (user_id = NULL or anonymous UID). The `user_transactions` table provides an indexed event ledger for the history page — written in the same DB transaction as the primary record to guarantee consistency.

- [ ] **2C.1** Ensure `assessments.user_id` FK to `users.id` is nullable (supports anonymous)
- [ ] **2C.2** Build `/profile/history` page — lists the user's past assessments with device, score, direction, and date; sourced from `user_transactions` (single indexed query, no cross-table JOINs)
- [ ] **2C.3** Implement `GET /api/v1/users/me/assessments` — paginated list of own assessments, ordered by `created_at DESC`; reads from `user_transactions` WHERE `event_type = 'ASSESSMENT_CREATED'`
- [ ] **2C.4** Wire assessment submission to attach `user_id` from session when logged in (or anonymous UID for anonymous sessions)
- [ ] **2C.5** Implement `GET /api/v1/assessments/:id` — session restore; enforce RLS (own record or anon token only)
- [ ] **2C.6** Implement `outcome_followups` write — "What did you end up doing?" prompt after roadmap completion; tied to `assessment_id` + `user_id`
- [ ] **2C.7** Verify that anon assessment records have `user_id` set to the anonymous UID (not NULL at write time) and are not exposed via the registered user history API unless account claim has occurred
- [ ] **2C.8** Wrap all multi-table writes (assessments + repair_scores + cost_estimates + user_transactions) in a single `BEGIN/COMMIT` Postgres transaction executed server-side. Use `supabase.rpc('create_assessment_tx', {...})` or a service-role raw SQL call. Never write these tables across separate client API calls.
- [ ] **2C.9** Write a `create_assessment_tx` Postgres function (in `/supabase/migrations/`) that atomically inserts into `assessments`, `repair_scores`, `cost_estimates`, and `user_transactions` in one transaction. Return `assessment_id` on success; roll back on any error.

---

### 2D — Assess (Real Scoring)

- [ ] **2D.1** Add brand/model autocomplete from `devices` table
- [ ] **2D.2** Build Vercel Serverless Function `POST /api/v1/assessments` with real weighted scoring and hard override rules (see architecture doc overrides)
- [ ] **2D.3** Build cost estimate heuristic using seeded median parts + labour ranges
- [ ] **2D.4** Build rationale template engine — plain-language output from score band + top factors
- [ ] **2D.5** Write unit tests for scoring — cover all override rules and all score bands

---

### 2E — Navigate (Real)

- [ ] **2E.1** Create `roadmap_templates` data structure (Supabase config table or JSON file)
- [ ] **2E.2** Build `GET /api/v1/roadmaps/:direction?device_id=:uuid` — ordered steps with guide URLs
- [ ] **2E.3** Wire step completion to `POST /api/v1/roadmaps/:assessment_id/steps/:step_id/complete` with idempotency key
- [ ] **2E.4** Persist step state to `checklist_completions` — survives page reload
- [ ] **2E.5** Add data wipe guide as mandatory RECYCLE step
- [ ] **2E.6** Write `impact_events` row on full roadmap completion

---

### 2F — Connect (Dynamic Directory, No Hardcoding)

> **Change of plan:** Instead of hardcoded shop lists or manual DB seeding as the primary data source, the Connect module uses **Google Places API** to search for repair shops and recycling centers dynamically. Supabase is still used for verified/registered shops. This eliminates hardcoded pins and makes the directory useful from day one.
>
> **Location strategy:** The UI supports two modes — auto-detect (browser Geolocation API) and manual text entry (user types a city, barangay, or landmark). Manual entry is essential for users who deny location access or have inaccurate GPS. See architecture doc §11.3 for the dual-mode API contract.

- [ ] **2F.1** Set up Google Places API key (restricted to the app domain) in `.env`
- [ ] **2F.2** Build Vercel Serverless Function `GET /api/v1/directory/search` that:
  - Accepts `lat` + `lon` (auto-detect mode) OR `address_query` (manual text mode, geocoded server-side via Nominatim or Google Geocoding API)
  - Returns a `resolved_location` field so the UI can show a "Showing results near: Makati City" confirmation to the user
  - Returns `400 Bad Request` with `{"error":"location_required"}` if neither `lat+lon` nor `address_query` is provided
  - First queries Supabase `shops` and `facilities` for **verified** records within radius (PostGIS ST_DWithin)
  - Then calls **Google Places API** (`nearbysearch`) for additional results using query terms like "phone repair", "laptop repair", "electronics recycling" in the area
  - Merges and deduplicates results (match on name + address proximity); Supabase-verified records take priority
  - Returns unified paginated result set with `source: "verified" | "google_places"`
- [ ] **2F.3** Build `GET /api/v1/directory/geocode?q=:address` — standalone geocode endpoint for the address preview before search. Cached 24h in `places_cache`. Used by the UI to show a map pin preview as the user types.
- [ ] **2F.4** Build `GET /api/v1/directory/details/:place_id` — fetches full details (hours, phone, website) from Google Places for non-verified results
- [ ] **2F.5** In the Connect UI, show two location input options:
  - **"Use my location"** button → requests browser Geolocation; on grant, runs auto-detect search
  - **Text search box** → user types city/address → live geocode preview on the map (via `/geocode`) → search on submit
  - If Geolocation is denied or unavailable, default to showing the text input with a friendly message
- [ ] **2F.6** Replace all hardcoded map pins in the Connect UI with live results from `2F.2`
- [ ] **2F.7** Add a "verified" badge on cards that come from Supabase verified records
- [ ] **2F.8** Add search controls: keyword input, radius slider (1–25 km), type filter (repair / recycling / all)
- [ ] **2F.9** Wire Navigate referral → Connect pre-filtered by device + direction (repair → shows shops; recycle → shows facilities)
- [ ] **2F.10** Add Leaflet custom markers: green pin for repair shops, amber pin for recycling centers, gold star overlay for verified records
- [ ] **2F.11** Handle Google Places API rate limits gracefully — cache results in `places_cache` (24h TTL); show cached data on error
- [ ] **2F.12** Fallback: if Google Places API key is missing or quota exceeded, fall back to Nominatim OSM search + manual Supabase data only (no broken UI)

---

### Definition of Done — Iteration 2

- [ ] User can register, log in, and log out
- [ ] Logged-in user's assessments are saved and visible in `/profile/history`
- [ ] Anonymous assessment (not logged in) works via `signInAnonymously()`, writes with anonymous UID, appears in history after account claim
- [ ] Samsung A54 (24 months, cracked screen) → score 70–90, REPAIR, real DB record written atomically via `create_assessment_tx`
- [ ] 2018 laptop (72 months, motherboard, severe) → hard override → RECYCLE
- [ ] Completing a roadmap creates an `impact_events` row
- [ ] Connect map shows results for both auto-detect and manual text location entry
- [ ] Manual text search for "Makati City" returns geocoded results on the map
- [ ] RLS verified: anon (pre-signInAnonymously) cannot write to any table; authenticated users can write only their own records

---

## Iteration 3 — ML Scoring, Auth Completion & Map Enhancements

**Goal:** Replace the rule-based scoring formula with a real ML model. Close the remaining Iteration 2 gaps: wire Google OAuth, implement anonymous sessions, persist assessments and roadmap state to the database, and improve the map with clustering and a radius slider. No hardcoded or in-memory-only data remains.

> **Why ML and gap-filling together:** The ML service exists but needs client-side wiring. Auth gaps (OAuth, anonymous sessions) are prerequisites for assessment persistence. Map enhancements unlock the Connect module's full potential. Completing these together produces a genuinely functional end-to-end app.

---

### 3A — FastAPI ML Service Setup

- [ ] **3A.1** Set up `apps/ml` FastAPI service — `GET /health`, `POST /predict`
- [ ] **3A.2** Implement `POST /predict` contract (see architecture doc §17):
  - Input: `device_age_months`, `issue_severity` (1–3), `parts_availability` (0–3), `repairability_idx`, `cost_ratio`, `manufacturer_support` (0/1)
  - Output: `direction`, `confidence`, `probability`, `feature_importances`
- [ ] **3A.3** At service start, load active model from `apps/ml/models/` (sklearn pickle or ONNX)
- [ ] **3A.4** Implement hard override rules in `overrides.py` — these run before and after model output (see architecture doc; overrides always win)
- [ ] **3A.5** Containerize FastAPI with Docker; test locally
- [ ] **3A.6** Deploy FastAPI service to Railway; record URL in `.env` as `ML_SERVICE_URL`

---

### 3B — Phase 1 Clustering (No Labeled Dataset)

> At launch there are no confirmed repair/recycle outcomes. We use unsupervised clustering to discover natural device groupings, then have a domain expert label them.

- [ ] **3B.1** Write `training/clustering.py` — K-Means + DBSCAN on the feature vector:
  - Features: `device_age_months`, `issue_severity`, `parts_availability`, `repairability_idx`, `cost_ratio`, `manufacturer_support`
  - Preprocessing: StandardScaler normalization
  - K-Means: elbow method to estimate k; fit and evaluate
  - DBSCAN: auto-tune `eps` via k-NN distance plot; preferred when k is unknown
- [ ] **3B.2** Evaluate both algorithms with silhouette scores; document results
- [ ] **3B.3** Generate cluster profiles (centroid feature values) and export as readable summary for domain expert review
- [ ] **3B.4** Domain expert (repair technician) reviews cluster profiles and assigns labels: REPAIR / RECYCLE / BORDERLINE — record in `ml_models.notes`
- [ ] **3B.5** Map cluster labels to `direction` output in `model.py`; BORDERLINE clusters output `confidence: LOW`
- [ ] **3B.6** Serialize winning model to `apps/ml/models/clustering_v1.pkl`; insert record into `ml_models` table with `active = true`

---

### 3C — Wire ML into Scoring Function

- [ ] **3C.1** Update `POST /api/v1/assessments` Scoring Fn:
  - Build feature vector from device record + user inputs
  - Call `ML_SERVICE_URL/predict` with feature vector
  - On success: use ML `direction` + `confidence` + `probability` + `feature_importances`
  - On ML timeout / error: fall back silently to rule-based formula from `scoring_config` (zero user-facing downtime)
- [ ] **3C.2** Persist `ml_model_id`, `feature_vector`, `probability`, `feature_importances` on each `repair_scores` write
- [ ] **3C.3** Update rationale template engine to use `feature_importances` from ML response (top 2 factors drive the rationale text)
- [ ] **3C.4** Integration test: Scoring Fn falls back gracefully when ML service is unreachable
- [ ] **3C.5** Write unit tests: ML path, fallback path, all hard override rules

---

### 3D — Smarter Directory (Enhanced Connect)

> Build on the Geoapify integration from Iteration 2. Add ranking, better filtering, and caching so the directory is genuinely useful.

- [ ] **3D.1** Add server-side result ranking in `GET /api/v1/directory/search`:
  - Verified Supabase records rank first
  - Then Geoapify results sorted by distance
  - Within same distance tier: higher rating ranks higher
- [ ] **3D.2** Add `brand` filter to directory search — for repair shops, filter by `brands_serviced` (Supabase) or keyword-augmented Geoapify query
- [ ] **3D.3** Ensure Geoapify API responses are cached in `places_cache` (24h TTL); verify cache is also applied to geocode responses
- [ ] **3D.4** Add "suggest this place" flow — user can flag a Geoapify result to be added to the verified directory; creates a `verification_task` with `source: geoapify` and the `place_id` for admin review
- [ ] **3D.5** Implement background geocoding job (pg_cron or Edge Fn, hourly) — for any `shops` or `facilities` records with NULL `geom`, call Nominatim and populate the geometry column
- [ ] **3D.6** Remove any remaining hardcoded data from the Connect module — all pins must come from the API

---

### 3E — Auth Completion

> Close the two remaining Auth gaps from Iteration 2: wire the Google OAuth buttons and implement anonymous sessions with account claiming.

- [ ] **3E.1** Wire Google OAuth buttons on `LoginPage.tsx` and `RegisterPage.tsx`:
  - Call `supabase.auth.signInWithOAuth({ provider: 'google' })` on button click
  - Remove `btn-placeholder` class, add proper spinner + error handling
  - Handle OAuth redirect callback in `AuthCallbackPage.tsx`
- [ ] **3E.2** Implement anonymous sessions:
  - Call `supabase.auth.signInAnonymously()` when an unauthenticated user starts an assessment
  - Store anonymous JWT in Supabase client; pass as Bearer on all API calls
  - Anonymous sessions expire after 7 days of inactivity
  - Handle anonymous session expiry gracefully — silently create a fresh anonymous session on page load if expired
- [ ] **3E.3** Implement anonymous → registered account claim:
  - After anonymous user registers, call `supabase.auth.linkIdentity()` to merge
  - Update `assessments.user_id` FKs to point to the new UID
- [ ] **3E.4** Build user history page (`/profile/history`):
  - Lists past assessments with device, score, direction, and date
  - Sources from `user_transactions` WHERE `event_type = 'ASSESSMENT_CREATED'`

---

### 3F — Map Enhancements (Connect Module)

> Fix the known map imperfections: add marker clustering, radius slider, continuous geolocation, tile fallback, and better mobile UX.

- [ ] **3F.1** Implement marker clustering:
  - Import and initialize `L.markerClusterGroup()` in `MapView.tsx`
  - Add all station markers to the cluster group instead of plain `L.layerGroup`
  - Configure spider-leg max cluster radius (50px default, tune as needed)
- [ ] **3F.2** Add radius slider UI:
  - Replace hardcoded `searchRadius: 5000` in `useNearbySearch.ts` with state driven by a slider
  - Add slider control (100m–25km range) to the Connect sidebar
  - Debounce refetch on slider change (300ms)
- [ ] **3F.3** Switch to continuous geolocation:
  - Replace `getCurrentPosition()` with `watchPosition()` in `useGeolocation.ts`
  - Add IP-based geolocation fallback (`fetch('https://ipapi.co/json/')` or similar) when GPS is denied
  - Show "Using approximate location (IP-based)" indicator when in fallback mode
- [ ] **3F.4** Add tile fallback layer:
  - Try OpenStreetMap tiles first; on error, switch to CartoDB light tiles
  - Show a subtle warning banner if fallback is active
- [ ] **3F.5** Improve mobile bottom sheet:
  - Add a draggable handle to resize the station panel
  - Default to `max-h-[40vh]` on open; user can drag up to `80vh`
  - Map should remain partially visible at all times
- [ ] **3F.6** Add user-facing rate-limit feedback:
  - When a Geoapify throttled request is detected, show inline message
  - "Search is rate-limited. Please wait a moment…" with a small countdown
- [ ] **3F.7** Improve map initial center:
  - On first load, attempt IP-based geolocation to center map on user's region
  - Fall back to `PH_CENTER` (12.88, 121.77) if IP lookup fails

---

### 3G — Assessment & Roadmap DB Wiring

> Persist assessment results and roadmap state to Supabase so data survives page reload and is visible in user history.

- [ ] **3G.1** Wire assessment submission to `create_assessment_tx`:
  - On Assess form submit, call `supabase.rpc('create_assessment_tx', {...})` with feature vector
  - Store returned `assessment_id` in local state for roadmap linking
  - Show error toast and fall back to client-side display if RPC fails
- [ ] **3G.2** Build `GET /api/v1/assessments/:id` for session restore:
  - Retrieve stored assessment from DB
  - Display the same result view with persisted score, direction, rationale
- [ ] **3G.3** Persist roadmap step state:
  - On step toggle, call `POST /api/v1/roadmaps/:assessment_id/steps/:step_id/complete`
  - On page load, fetch persisted state from `checklist_completions`
- [ ] **3G.4** Implement `impact_events` row on full roadmap completion:
  - When all steps are checked, write an `impact_events` record
  - Show an SDG impact confirmation animation to the user

---

### Definition of Done — Iteration 3

- [ ] `/predict` returns valid JSON for any valid feature vector
- [ ] Scoring Fn uses ML output; falls back silently on ML timeout
- [ ] `ml_model_id`, `feature_vector`, `probability` persisted on every assessment
- [ ] Connect map has zero hardcoded pins; all results from API (Geoapify + Supabase)
- [ ] Cached Geoapify results serve correctly within TTL
- [ ] Domain expert sign-off on cluster label mappings documented in `ml_models.notes`
- [ ] Google OAuth login works end-to-end (click → Google redirect → callback → logged in)
- [ ] Anonymous sessions: unauthenticated user can take assessment → see anonymous progress → register → claim history
- [ ] User history page shows all past assessments with correct scores
- [ ] Map markers are clustered — no overlap at any zoom level
- [ ] Radius slider adjusts search area (1–25 km) and triggers refetch
- [ ] User location updates as user moves (watchPosition); IP fallback works when GPS is denied
- [ ] Map tile fallback: OpenStreetMap down → CartoDB tiles load automatically
- [ ] Mobile panel: draggable handle, map partially visible at all times
- [ ] Assessment results persist to DB via `create_assessment_tx` and survive page reload
- [ ] Roadmap step state persists to `checklist_completions` and survives page reload
- [ ] Full roadmap completion writes an `impact_events` row

---

## Iteration 4 — Polish, Self-Registration & Responsive Validation

**Goal:** Demo-ready. UI is refined, shop owners can register themselves, app is validated across mobile and desktop breakpoints.

---

### UI Polish

- [ ] **4.1** Improve Assess result UI — score visualization, confidence indicator, cost range display
- [ ] **4.2** Improve Navigate roadmap UI — node entrance animations, connector draw-in, step type badges (action / info / download / referral), mobile-responsive sub-items
- [ ] **4.3** Improve Connect map — marker clusters, shop popup cards, distance labels
- [ ] **4.4** Add filter UI to Connect — radius, device type, brand, facility type
- [ ] **4.5** Add "Last verified" freshness indicator to shop/facility cards
- [ ] **4.6** Add SDG impact counter to home screen from `sdg_impact` view
- [ ] **4.7** Add Filipino language toggle (EN / FIL)

---

### Self-Registration & Verification

- [ ] **4.8** Build shop self-registration form UI (`/register/shop`) — requires `shop_admin` role
- [ ] **4.9** Implement `POST /api/v1/directory/shops/register` with cert doc upload to `cert-docs` Storage bucket
- [ ] **4.10** Implement Verification Service auto-checks: Nominatim geocoding, duplicate detection
- [ ] **4.11** Build admin dashboard (`/admin/verification`) — PENDING task list with auto-check results; protected route for `verifier` and `super_admin`
- [ ] **4.12** Implement `PATCH /api/v1/admin/verification-tasks/:task_id` — approve / reject
- [ ] **4.13** Set up email notification to `shop_admin` on decision (Supabase DB Webhook → Resend)
- [ ] **4.14** Add user ratings (display + submission) on shop/facility cards

---

### Responsive Web App Validation

- [ ] **4.15** Run responsive design audit — test at 375px (mobile), 768px (tablet), 1280px (desktop) in Chrome DevTools
- [ ] **4.16** Verify Leaflet map renders correctly at all breakpoints; tap targets ≥ 44px on mobile
- [ ] **4.17** Add optimistic UI for checklist step completion (step shows checked immediately; confirmed or reverted on server response)
- [ ] **4.18** Run Lighthouse Performance audit in CI; target score ≥ 85
- [ ] **4.19** Run Lighthouse Accessibility audit in CI; target score ≥ 90
- [ ] **4.20** Confirm checklist state persists on page reload (restored from Supabase, not localStorage)

---

### Definition of Done — Iteration 4

- [ ] App renders correctly on mobile (375px) and desktop (1280px+)
- [ ] Shop owner can register → admin can approve → shop appears as verified in directory
- [ ] Checklist state persists on page reload (Supabase, not localStorage)
- [ ] Lighthouse Performance ≥ 85, Accessibility ≥ 90

---

## Iteration 5 — Hardening & Launch Preparation

**Goal:** Production-ready. Secure, monitored, and defensible. Supervised ML classifier if labeled data exists.

---

### Seeding Pipeline

- [ ] **5.1** Write `scraper/pipelines/google_maps.py` and `facebook_pages.py`
- [ ] **5.2** Write `scraper/etl/transform.py` — dedup, normalize, strip PII
- [ ] **5.3** Write `scraper/ETHICS.md` — robots.txt compliance, ≥2s delay, takedown email
- [ ] **5.4** Set up `seeding.yml` GitHub Actions — `workflow_dispatch` only, environment protection required
- [ ] **5.5** Implement admin seeding endpoints (`GET /admin/seeding/staging`, `POST /admin/seeding/import`)
- [ ] **5.6** Run first real scraping run on Metro Manila; import first real batch (≥ 20 shops)

---

### Phase 2 ML — Supervised Classifier (if ≥500 labeled outcomes exist)

- [ ] **5.7** Check `outcome_followups` count — proceed only if ≥ 500 confirmed outcomes
- [ ] **5.8** Write `training/classifier.py` — join `assessments` + `outcome_followups`; feature engineering; train Logistic Regression → Random Forest → XGBoost
- [ ] **5.9** **⚠ Label leakage rule:** Use only `user_confirmed_outcome` as ground truth — never rule-based v1 outputs
- [ ] **5.10** Evaluate with accuracy, F1, AUC-ROC, confusion matrix; document in `ml_models`
- [ ] **5.11** Export best model as ONNX; insert into `ml_models` with `active = false`
- [ ] **5.12** Admin promotes new model to `active = true` → FastAPI reloads; old model becomes fallback

---

### Security & Hardening

- [ ] **5.13** Security audit — RLS verified on all tables; service-role key absent from client bundle
- [ ] **5.14** Enable MFA for `verifier` and `super_admin` roles (Supabase Auth TOTP)
- [ ] **5.15** Implement data erasure endpoint `DELETE /api/v1/users/me` — nullify `user_id` FKs, delete auth + public user records
- [ ] **5.16** Set up Sentry for web app and ML service
- [ ] **5.17** Set up Vercel Analytics
- [ ] **5.18** Configure all monitoring alerts (see architecture doc §22)
- [ ] **5.19** Enable Supabase daily backups + 7-day PITR
- [ ] **5.20** Enable PgBouncer connection pooling (transaction mode)
- [ ] **5.21** Write Ansible `setup.yml` (dev provisioning) and `deploy.yml` (production VPS)
- [ ] **5.22** Load test — 100 concurrent assessment submissions
- [ ] **5.23** Full e2e test suite on production environment
- [ ] **5.24** Final Lighthouse audit — Performance ≥ 85, Accessibility ≥ 90

---

### Definition of Done — Iteration 5

- [ ] Zero critical Sentry issues in 24-hour staging run
- [ ] All CI tests pass on production
- [ ] Lighthouse targets met
- [ ] First real scraping batch imports ≥ 20 shops to live directory
- [ ] Scraped records cannot reach live DB without explicit admin approval
- [ ] DENR export CSV generated and verified

---

## Change Log

| Version | Date | Changes |
|---|---|---|
| v1 | Original | Initial plan — Iter 2: real backend; Iter 3: polish + auth + PWA; Iter 4: ML + seeding |
| v2 | — | **Auth + user DB moved to Iter 2.** **ML moved to Iter 3.** **Hardcoded directory replaced with Google Places API + Supabase hybrid in Iter 2.** **Iter numbering shifted accordingly.** |
| v3 | — | **Architecture ref updated to v4.** **PWA/offline dropped.** **Auth gaps filled:** anonymous sessions, account claim flow. **Transaction integrity added** (`create_assessment_tx`). **User history** sources from `user_transactions`. **Connect directory:** dual-mode location. |
| v4 | Current | **Iteration 2 acknowledged as partial** — Known Gaps section documents what's deferred (Google OAuth, anonymous sessions, assessment DB persistence, roadmap persistence, marker clustering, radius slider, continuous geolocation, tile fallback, mobile panel UX). **Iteration 3 scope expanded** to include Auth Completion (3E), Map Enhancements (3F), and Assessment/Roadmap DB Wiring (3G) alongside ML work. **README updated** to honestly reflect gaps. **Google Places → Geoapify** substitution documented. |
