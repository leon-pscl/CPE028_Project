-- ===================================================================
-- Rev.Tech — Type Corrections for Geoapify Places
-- Allows users to suggest type corrections for Geoapify-sourced POIs
-- and admins to approve/reject them.
-- Run after 005_rejected_shops.sql
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.type_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geoapify_place_id TEXT NOT NULL,
  original_types TEXT[] NOT NULL,
  suggested_types TEXT[] NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.type_overrides (
  geoapify_place_id TEXT PRIMARY KEY,
  types TEXT[] NOT NULL,
  updated_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_type_suggestions_status ON public.type_suggestions (status);

ALTER TABLE public.type_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.type_overrides ENABLE ROW LEVEL SECURITY;

-- Users can insert suggestions (authenticated)
CREATE POLICY "Authenticated users can insert type suggestions"
  ON public.type_suggestions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Moderators/admins can read all suggestions
CREATE POLICY "Moderators and admins can read type suggestions"
  ON public.type_suggestions FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

-- Moderators/admins can update suggestions
CREATE POLICY "Moderators and admins can update type suggestions"
  ON public.type_suggestions FOR UPDATE
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

-- Everyone can read type overrides (needed for display)
CREATE POLICY "Anyone can read type overrides"
  ON public.type_overrides FOR SELECT
  USING (true);

-- Only moderators/admins can insert/update type overrides
CREATE POLICY "Moderators and admins can insert type overrides"
  ON public.type_overrides FOR INSERT
  WITH CHECK (public.has_any_role(ARRAY['moderator', 'admin']));

CREATE POLICY "Moderators and admins can update type overrides"
  ON public.type_overrides FOR UPDATE
  USING (public.has_any_role(ARRAY['moderator', 'admin']));
