# Run Procedure

First-time setup guide. Follow these steps in order.

---

## Prerequisites

**Option A — Docker (recommended for first-time devs):**
- **Docker** + **Docker Compose** — [docker.com](https://docker.com)

**Option B — Manual setup:**
- **Node.js** >= 20.x — [nodejs.org](https://nodejs.org)
- **Python** >= 3.11 — [python.org](https://python.org)
- **Git** — [git-scm.com](https://git-scm.com)

---

## 1. Supabase Setup

**The app requires a Supabase project.** The frontend connects to Supabase for auth and database.

### 1a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project
2. Choose **ap-southeast-1** (Singapore) region
3. After creation, enable **PostGIS extension** (Database -> Extensions -> search `postgis`)
4. Create two **Storage buckets** (Storage -> New bucket):
   - `guides` — public bucket
   - `cert-docs` — private bucket

### 1b. Apply Migrations

Open the **SQL Editor** in Supabase Dashboard and run these files in order:

1. `database/migrations/001_init_schema.sql` — creates all tables, indexes, scoring config, and sample devices
2. `database/migrations/002_rls_policies.sql` — enables RLS on all tables
3. `database/seed/001_seed_data.sql` — inserts sample repair guides, shops, and recycling facilities for development/testing

### 1c. Configure Auth

In Supabase Dashboard -> Authentication -> Providers:
- Enable **Email/Password** (default)
- (Optional) Enable **Google** for OAuth sign-in

Authentication -> Settings:
- Set **Site URL** to `http://localhost:5173`

---

## 2. Environment Variables

```bash
# From project root
cp .env.example .env

# Edit .env with your Supabase credentials:
# Get these from Supabase Dashboard -> Settings -> API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Note:** The Supabase anon key is safe for client-side use when RLS policies are applied. The service role key must never be exposed to the client.

---

## 3. Frontend Setup

### Option A: Docker (easiest)

```bash
# From project root
docker-compose -f infra/docker-compose.yml up --build
```

The dev server starts at http://localhost:5173 with hot reload.

To stop:
```bash
docker-compose -f infra/docker-compose.yml down
```

### Option B: Manual

```bash
# Navigate to the frontend
cd frontend

# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

**Available scripts:**

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type-check without building |

---

## 4. Python Environment Setup

```bash
# From project root
python -m venv cpe028

# Activate it
# Windows (CMD):
cpe028\Scripts\activate
# Windows (PowerShell):
cpe028\Scripts\Activate.ps1
# macOS / Linux:
source cpe028/bin/activate

# Install ML service Python dependencies
pip install -r ml/requirements.txt

# If using the scraper, install Playwright browsers
playwright install
```

To deactivate: run `deactivate`

---

## 5. How to Test Features

### 5a. Verify Environment

```bash
cd frontend
npm install          # Install JS dependencies
npm run typecheck    # Should produce zero errors
npm run build        # Should compile successfully
```

### 5b. Manual Testing Flow

Open http://localhost:5173 and test:

**User Registration & Login**
1. Click **Register** in the nav bar
2. Enter name, email, password (>=8 chars, >=1 uppercase, >=1 number), select a role
3. Submit — you'll see a "Check your email" confirmation message (barricade: same message regardless of whether email exists)
4. Confirm your email from the Supabase magic link
5. Click **Login**, enter credentials
6. Profile page should show your name, email, role, and email verification status

**Assessment & Roadmap**
1. Navigate to **Assess** — fill in device details, submit
2. View your repair-or-recycle score with rationale and cost estimate
3. Click "See My Roadmap" — the roadmap loads with horizontal timeline and detail panel

**Directory**
1. Navigate to **Connect**
2. The map shows shops/facilities based on Geoapify + Supabase data
3. Filter by type (All / Repair / Recycling)

### 5c. Verify RLS Policies

In Supabase Dashboard -> Database -> Replication:
- Verify RLS is enabled on all tables
- Each table should have its policies listed

### 5d. SQL Verification (in Supabase SQL Editor)

```sql
-- Check seed data loaded
SELECT count(*) FROM public.devices;        -- Should be >= 14
SELECT count(*) FROM public.scoring_config;  -- Should be 5
SELECT count(*) FROM public.shops;           -- Should be >= 5
SELECT count(*) FROM public.facilities;      -- Should be >= 3

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;
```

---

## 6. Project Structure

```
CPE028_Project/
├── frontend/             # React + Vite frontend
│   └── src/
│       ├── features/
│       │   ├── assess/       # Device assessment form & scoring
│       │   ├── navigate/     # Interactive repair/recycle roadmap
│       │   ├── connect/      # Shop/facility directory with Leaflet map
│       │   ├── auth/         # Login / Register / ForgotPassword / AuthCallback / Profile
│       │   └── admin/        # Admin review queue
│       ├── components/       # Shared UI (Sidebar, Home, ProtectedRoute, LoadingScreen)
│       ├── context/          # React context providers (AuthProvider)
│       ├── hooks/            # useAuth (typed session management)
│       ├── lib/              # Supabase client (PKCE), database service, geoapify
│       └── types/            # TypeScript definitions (index, database, station)
├── ml/                   # FastAPI ML inference service
├── database/              # SQL migrations + seed data
│   ├── migrations/         # 9 migration files (001–009)
│   └── seed/              # Seed data
├── infra/                 # Docker Compose
├── docs/                  # Project documentation
├── .env                   # Supabase credentials (gitignored)
├── .env.example           # Environment variable template
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `VITE_SUPABASE_URL` not found | Ensure `.env` exists in project root with the variable set |
| Auth: "Invalid login credentials" | Check that Email/Password provider is enabled in Supabase Auth |
| Auth: redirect loop | Set `Site URL` to `http://localhost:5173` in Supabase Auth settings |
| Migration fails | Run files in SQL Editor one at a time |
| RLS blocks reads | Verify policies exist in Database -> Replication for each table |
| Docker: port 5173 in use | Change port in `infra/docker-compose.yml` or kill the process using it |
| Docker: build cache stale | Run `docker-compose up --build --no-cache` |
| `npm install` fails | Delete `frontend/node_modules` + `frontend/package-lock.json`, retry |
| TypeScript errors | Run `npm run typecheck` to see full output |
| Leaflet map not showing | Check that `leaflet.css` is loaded in `index.html` |
