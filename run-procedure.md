# RevTech — Run Procedure

First-time setup guide for Iteration 2. Follow these steps in order.

---

## Prerequisites

**Option A — Docker (recommended for first-time devs):**
- **Docker** + **Docker Compose** — [docker.com](https://docker.com)

**Option B — Manual setup:**
- **Node.js** ≥ 20.x — [nodejs.org](https://nodejs.org)
- **Python** ≥ 3.11 — [python.org](https://python.org)
- **Git** — [git-scm.com](https://git-scm.com)

---

## 1. Supabase Setup

**Iteration 2 requires a Supabase project.** The frontend connects to Supabase for auth and database.

### 1a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project
2. Choose **ap-southeast-1** (Singapore) region
3. After creation, enable **PostGIS extension** (Database → Extensions → search `postgis`)
4. Create two **Storage buckets** (Storage → New bucket):
   - `guides` — public bucket
   - `cert-docs` — private bucket

### 1b. Apply Migrations

Open the **SQL Editor** in Supabase Dashboard and run these files in order:

1. `supabase/migrations/001_init_schema.sql` — creates all tables, indexes, scoring config, and sample devices
2. `supabase/migrations/002_rls_policies.sql` — enables RLS on all tables
3. `supabase/migrations/003_auth_trigger.sql` — creates trigger to auto-create `public.users` row on signup
4. `supabase/seed/001_seed_data.sql` — inserts sample repair guides, shops, and recycling facilities for development/testing

### 1c. Configure Auth

In Supabase Dashboard → Authentication → Providers:
- Enable **Email/Password** (default)
- (Optional) Enable **Google** for OAuth sign-in

Authentication → Settings:
- Set **Site URL** to `http://localhost:5173`

---

## 2. Environment Variables

Create `.env` at the **project root** (same level as this file):

```bash
# From project root
cp .env.example .env

# Edit .env with your Supabase credentials:
# Get these from Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Why the project root?** Vite is configured (`vite.config.ts`) to load environment variables from `../..` relative to `apps/web/`, which is the project root. This keeps credentials in one place for both Docker and manual setups.

> **Security:** The Supabase anon key is safe for client-side use when RLS policies are applied (which they are in `002_rls_policies.sql`). The service role key must never be exposed to the client.

---

## 3. Frontend Setup

### Option A: Docker (easiest)

```bash
# From project root
docker compose -f docker/docker-compose.yml up --build
```

> The Docker container automatically loads `.env.local` from the project root — make sure it has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set before running.

The dev server starts at http://localhost:5173 with hot reload.

To stop:
```bash
docker compose -f docker/docker-compose.yml down
```

### Option B: Manual

```bash
# Navigate to the web app
cd apps/web

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
| `npx tsc --noEmit` | TypeScript type-check without building |

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

# Install Python dependencies
pip install -r requirements.txt

# If using the scraper, install Playwright browsers
playwright install
```

To deactivate: run `deactivate`

---

## 5. How to Test Iteration 2 Features

### 5a. Verify Environment

```bash
cd apps/web
npx tsc --noEmit        # Should produce zero errors
npm run build            # Should compile successfully
```

### 5b. Manual Testing Flow

Open http://localhost:5173 and test:

**User Registration & Login**
1. Click **Register** in the nav bar
2. Enter name, email, password, select "Consumer" role
3. Submit — you should be redirected to the profile page
4. Log out (nav button)
5. Click **Login**, enter credentials
6. Profile page should show your name, email, and role

**Anonymous Assessment (not logged in)**
1. While logged out, navigate to **Assess**
2. The assessment form should be functional
3. (Future: anonymous sessions save assessments with anonymous UID)

**History**
1. After logging in, navigate to `/auth/profile`
2. Assessments you submit will appear here (when the API endpoint is wired)

**Directory**
1. Navigate to **Connect**
2. The map should show sample shops/facilities from the seed data
3. (Future: live Google Places API results)

### 5c. Verify RLS Policies

In Supabase Dashboard → Database → Replication:
- Verify RLS is enabled on all 15 tables
- Each table should have its policies listed

### 5d. SQL Verification (in Supabase SQL Editor)

```sql
-- Check seed data loaded
SELECT count(*) FROM public.devices;        -- Should be 14
SELECT count(*) FROM public.scoring_config;  -- Should be 5
SELECT count(*) FROM public.shops;           -- Should be 5
SELECT count(*) FROM public.facilities;      -- Should be 3

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;
```

---

## 6. For Code Reviewers

### Reviewer Setup

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd CPE028_Project
   git checkout second-iteration
   ```

2. **Get a Supabase project** (free tier works):
   - Create at [supabase.com](https://supabase.com) — takes ~2 minutes
   - Run the two migration files in the SQL Editor
   - Copy the project URL and anon key

3. **Start the app:**
   ```bash
   cp .env.example .env
   # Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   docker compose -f docker/docker-compose.yml up --build
   ```
   Or run manually:
   ```bash
   cd apps/web && npm install && npm run dev
   ```

### Reviewer Checklist

| Check | What to verify |
|---|---|
| TypeScript | `npx tsc --noEmit` — zero errors |
| Build | `npm run build` — succeeds |
| Registration | `/auth/register` — form submits, user created |
| Login | `/auth/login` — existing user can sign in |
| Profile | `/auth/profile` — shows user info after login |
| Logout | Nav shows logout, session ends |
| Route protection | Unauthenticated users can still access all pages |
| Seed data | DB has devices, shops, facilities from migration |
| RLS | Tables have RLS policies applied |

### Key Files to Review

| File | What to look for |
|---|---|
| `supabase/migrations/001_init_schema.sql` | Schema design, indexes, atomic transaction function |
| `supabase/migrations/002_rls_policies.sql` | RLS policies for all 15 tables |
| `apps/web/src/lib/supabaseClient.ts` | Supabase client initialization |
| `apps/web/src/hooks/useAuth.ts` | Auth hook with session management |
| `apps/web/src/lib/database.ts` | Typed database service layer |
| `apps/web/src/modules/auth/LoginPage.tsx` | Login UI |
| `apps/web/src/modules/auth/RegisterPage.tsx` | Registration UI |
| `apps/web/src/modules/auth/ProfilePage.tsx` | Profile display |
| `apps/web/src/components/Navbar.tsx` | Auth-aware navigation |

---

## 7. Project Structure

```
CPE028_Project/
├── apps/
│   └── web/              # React + Vite frontend
│       └── src/
│           ├── modules/
│           │   ├── assess/     # Device assessment form
│           │   ├── navigate/   # Repair/recycle roadmap
│           │   ├── connect/    # Shop/facility directory
│           │   └── auth/       # Login / Register / Profile
│           ├── components/     # Shared UI (Navbar, Home)
│           ├── hooks/          # useAuth (session management)
│           └── lib/            # Supabase client, database service
├── supabase/
│   ├── migrations/        # SQL migration files (apply in order)
│   └── seed/              # Seed data for development
├── docker/
│   └── docker-compose.yml
├── requirements.txt
└── .env                   # Your Supabase credentials (gitignored)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `VITE_SUPABASE_URL` not found | Ensure `.env` exists in project root with the variable set |
| Auth: "Invalid login credentials" | Check that Email/Password provider is enabled in Supabase Auth |
| Auth: redirect loop | Set `Site URL` to `http://localhost:5173` in Supabase Auth settings |
| Migration fails (cross-database) | Run files in SQL Editor, not as a single paste. Remove `COMMENT ON TABLE public.storage.buckets` if present |
| RLS blocks reads | Verify policies exist in Database → Replication for each table |
| Docker: port 5173 in use | Change port in `docker-compose.yml` or kill the process using it |
| Docker: build cache stale | Run `docker compose up --build --no-cache` |
| `npm install` fails | Delete `node_modules` + `package-lock.json`, retry |
| TypeScript errors | Run `npx tsc --noEmit` to see full output |
| Leaflet map not showing | Check that `leaflet.css` is loaded in `index.html` |
