# RevTech — Repair or Recycle Decision Tool

A Philippines-focused responsive web app that guides consumers through a structured repair-or-recycle decision for defective or end-of-life smartphones and laptops, then connects them to verified local resources.

**Three core modules:**
- **Assess** — device intake form → ML-driven Repair-or-Recycle Score
- **Navigate** — personalized visual roadmap (repair or recycle path)
- **Connect** — verified directory of repair shops and recycling facilities in the Philippines

## Current Status (Iteration 2)

Iteration 1 provided a skeletal proof of concept with hardcoded data. Iteration 2 adds:

### Completed

**Database (Supabase)**
- Full schema with 15 tables covering users, devices, assessments, scoring, shops, facilities, verification, and impact tracking
- PostGIS extension for location-based queries
- Atomic `create_assessment_tx` function for transaction integrity
- Row Level Security (RLS) policies on all tables
- Initial seed data: scoring weights, Philippine market devices, sample shops/facilities
- Staging schema for data pipeline

**Authentication**
- Supabase Auth with email/password + Google OAuth (configured)
- Login, Register, and Profile pages
- `useAuth` hook with session management
- Auth-aware navigation bar and home page
- Route protection ready

**Frontend**
- Supabase client (`apps/web/src/lib/supabaseClient.js`)
- Database service layer (`apps/web/src/lib/database.js`) with organized CRUD methods
- Auth pages: `/auth/login`, `/auth/register`, `/auth/profile`

### Next (Iteration 3)
- ML scoring service (FastAPI/Railway)
- Google Places API integration for dynamic directory
- Enhanced scoring with unsupervised clustering

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

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (Singapore region, PostGIS enabled)

### Setup
```bash
# Install dependencies
cd apps/web && npm install

# Configure environment
cp .env.example .env.local
# Add your Supabase URL and anon key to .env.local

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
├── apps/web/src/
│   ├── modules/
│   │   ├── assess/          # Assess module
│   │   ├── navigate/        # Navigate module
│   │   ├── connect/         # Connect module
│   │   └── auth/            # Login / Register / Profile
│   ├── components/          # Shared UI components
│   ├── hooks/               # useAuth, etc.
│   ├── lib/                 # Supabase client, database service
│   └── types/               # TypeScript types
├── supabase/
│   ├── migrations/          # SQL migration files
│   └── seed/                # Seed data
└── project-instructions/    # Build guide and architecture docs
```
