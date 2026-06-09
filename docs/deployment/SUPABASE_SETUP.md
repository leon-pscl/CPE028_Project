# Supabase Setup for Rev.Tech Project

## Overview
This document describes the Supabase setup completed for Iteration 3 of the Rev.Tech project, including:
1. Database schema with all required tables
2. Initial seed data for devices and sample shops/facilities
3. Storage bucket recommendations
4. Row Level Security (RLS) policies that need to be implemented
5. Supabase client setup in the frontend

## What's Been Created

### Database Schema (`supabase/migrations/001_init_schema.sql`)
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

### Seed Data (`supabase/seed/001_seed_data.sql`)
- Sample repair/recycling guides
- Sample repair shops (unverified)
- Sample recycling facilities (unverified)

## Manual Setup Required in Supabase Dashboard

### 1. Project Configuration
- Ensure project is in `ap-southeast-1` (Singapore) region
- Enable **PostGIS extension** (Database → Extensions → postgis)

### 2. Storage Buckets
Create these buckets via Supabase Dashboard → Storage:
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
- Geocoding services (Nominatim/Google)
- Google Places API integration
- ML service communication

## Frontend Integration

### Supabase Client
Located at: `apps/web/src/lib/supabaseClient.js`
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Auth Hook
Located at: `apps/web/src/hooks/useAuth.js`
Provides:
- `user` - Current user object
- `session` - Current session
- `loading` - Auth state loading status
- `signIn(email, password)` - Email/password sign in
- `signUp(email, password, options)` - Email/password sign up
- `signOut()` - Sign out user
- `resetPassword(email)` - Password reset

### Database Service
Located at: `apps/web/src/lib/database.js`
Provides organized methods for:
- User profile operations
- Device catalog queries
- Assessment creation and retrieval
- Repair score and cost estimate operations
- Directory searches (shops/facilities)

### Auth Pages
Located in: `apps/web/src/modules/auth/`
- `LoginPage.tsx` - Email/password login
- `RegisterPage.tsx` - User registration with role selection
- `ProfilePage.tsx` - View/edit user profile

### Navigation Updates
- Navbar now shows auth-dependent links
- Home page displays login status and auth links
- Protected routes will need to be implemented (check auth state and redirect)

## Environment Variables
Add these to your `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Next Steps for Iteration 3 Completion

1. **Set up Supabase project** with the above manual configurations
2. **Apply the migration** using Supabase CLI or dashboard
3. **Apply the seed data** for development/testing
4. **Implement RLS policies** as described above
5. **Test the integration**:
   - User registration and login
   - Anonymous assessments (using `signInAnonymously()`)
   - Assessment submission with atomic transaction
   - Directory queries for shops/facilities
   - Profile viewing/editing

## Key Features Implemented (Iteration 2–3)

✅ User authentication (email/password + Google OAuth ready)  
✅ User transaction database with anonymous session support  
✅ Real scoring logic using seeded configuration  
✅ Dynamic directory structure ready for Google Places API integration  
✅ Atomic assessment creation via database function  
✅ Basic UI for auth flows  
✅ Type-safe database operations  

## Important Notes

1. The `create_assessment_tx` function ensures that assessments, repair scores, and cost estimates are created atomically
2. Anonymous users are supported via nullable `user_id` in assessments table
3. The schema follows the specifications in `AGENT_TASKS_v3.md` closely
4. PostGIS extension is required for location-based queries in the Connect module
5. Storage buckets must be created manually via Supabase dashboard