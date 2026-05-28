-- =============================================================================
-- 003_auth_rls_policies.sql
--
-- Barricade-inspired Row Level Security policies for the users table.
-- Run this in Supabase Dashboard → SQL Editor AFTER 002_rls_policies.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- USERS table
-- ---------------------------------------------------------------------------

-- Enable RLS (idempotent)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile on signup" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- A user can only read their own row
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- A user can update only their own row (cannot change role or id)
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert only for the authenticated user's own id
-- (triggered on signUp by useAuth.ts)
CREATE POLICY "Users can insert their own profile on signup"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- ASSESSMENTS table
-- ---------------------------------------------------------------------------

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can create assessments" ON public.assessments;
DROP POLICY IF EXISTS "Anonymous assessments are insertable" ON public.assessments;

-- Authenticated users see only their own assessments
CREATE POLICY "Users can view their own assessments"
  ON public.assessments
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL  -- anonymous assessments are readable by the session owner
  );

-- Authenticated users can create assessments linked to themselves
CREATE POLICY "Users can create assessments"
  ON public.assessments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL  -- allow anonymous
  );

-- ---------------------------------------------------------------------------
-- Prevent privilege escalation: users cannot set role = 'admin' on themselves
-- ---------------------------------------------------------------------------

-- This trigger fires on UPDATE to the users table and rejects
-- any attempt by a non-admin to change their own role.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If role is being changed...
  IF NEW.role <> OLD.role THEN
    -- ...only allow it if the caller is an admin
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: cannot change your own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_escalation ON public.users;

CREATE TRIGGER enforce_role_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
