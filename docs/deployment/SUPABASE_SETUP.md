# Supabase Setup

## Overview

Supabase setup for Rev.Tech, including database schema, seed data, storage buckets, and RLS policies.

## What's Been Created

### Database Schema (`database/migrations/001_init_schema.sql`)
- **Core tables**: users, devices, scoring_config, assessments, repair_scores, cost_estimates
- **Content tables**: guides, checklist_completions
- **Directory tables**: shops, facilities (with PostGIS geography support)
- **Verification & tracking**: verification_tasks, outcome_followups, impact_events, audit_logs
- **ML tables**: ml_models
- **Indexes**: Performance indexes on foreign keys and spatial data
- **Functions**:
  - `create_assessment_tx()` - Atomic transaction for creating assessments with related records
  - `update_updated_at_column()` - Automatic timestamp updates
- **Initial data**:
  - Scoring configuration weights from the specification
  - Sample Philippine market devices

### Additional Migrations
- `002_rls_policies.sql` — RLS policies for all tables
- `003_role_cleanup.sql` — Role migration + handle_new_user trigger
- `004_multi_type_support.sql` — `types TEXT[]` column for multi-type support
- `005_rejected_shops.sql` — Rejected shops lifecycle
- `006_type_corrections.sql` — Type correction suggestions
- `007_user_transactions.sql` — User transaction ledger
- `008_assessment_results.sql` — Assessment results table
- `009_roadmap_progress.sql` — Roadmap progress tracking

### Seed Data (`database/seed/001_seed_data.sql`)
- Sample repair/recycling guides
- Sample repair shops (unverified)
- Sample recycling facilities (unverified)

## Manual Setup Required in Supabase Dashboard

### 1. Project Configuration
- Ensure project is in `ap-southeast-1` (Singapore) region
- Enable **PostGIS extension** (Database -> Extensions -> postgis)

### 2. Storage Buckets
Create these buckets via Supabase Dashboard -> Storage:
- `guides` - Public bucket for repair/recycling guides
- `cert-docs` - Private bucket for shop verification documents

### 3. Row Level Security (RLS)
Enable RLS on all tables and create policies. Key policies needed:

#### Users Table
- Users can read their own profile
- Users can update their own profile
- Admins/verifiers can read all profiles (if needed)

#### Assessments Table
- Users can read their own assessments
- Anonymous users can create assessments (but not read others')
- Users can create assessments linked to their user_id

#### Shops/Facilities Tables
- Public can read verified shops/facilities
- Only admins/verifiers can create/update/delete
- Shop owners can read/update their own unverified submissions

#### Verification Tasks
- Public can create verification tasks (suggest a place)
- Admins/verifiers can read/update all tasks
- Submitters can read their own tasks

### 4. Auth Configuration
Enable these providers in Supabase Auth:
- Email/Password
- Google (for OAuth)

### 5. Edge Functions (Optional)
Consider creating Edge Functions for:
- Geocoding services (Nominatim/Geoapify)
- ML service communication

## Frontend Integration

### Supabase Client
Located at: `frontend/src/lib/supabaseClient.ts`
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### Auth Hook
Located at: `frontend/src/hooks/useAuth.ts`
Provides:
- `user` - Current user object
- `session` - Current session
- `loading` - Auth state loading status
- `signIn(email, password)` - Email/password sign in
- `signUp(email, password, options)` - Email/password sign up
- `signOut()` - Sign out user
- `resetPassword(email)` - Password reset

### Database Service
Located at: `frontend/src/lib/database.ts`
Provides organized methods for:
- User profile operations
- Device catalog queries
- Assessment creation and retrieval
- Repair score and cost estimate operations
- Directory searches (shops/facilities)

### Auth Pages
Located in: `frontend/src/features/auth/`
- `LoginPage.tsx` - Email/password login + Google OAuth
- `RegisterPage.tsx` - User registration with role selection + Google OAuth
- `ProfilePage.tsx` - View/edit user profile, assessment history

## Environment Variables
Add these to your `.env` file:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Important Notes

1. The `create_assessment_tx` function ensures that assessments, repair scores, and cost estimates are created atomically
2. Anonymous users are supported via nullable `user_id` in assessments table
3. PostGIS extension is required for location-based queries in the Connect module
4. Storage buckets must be created manually via Supabase dashboard
