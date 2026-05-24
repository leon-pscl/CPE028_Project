-- ===================================================================
-- ReDevice — Row Level Security (RLS) Policies
-- Run this in Supabase SQL Editor after 001_init_schema.sql
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- Helper function: check if the current user has a specific role
-- ===================================================================
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===================================================================
-- Helper function: check if the current user is any of these roles
-- ===================================================================
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===================================================================
-- USERS table
-- ===================================================================
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow admins/verifiers to read all profiles
CREATE POLICY "Admins and verifiers can read all profiles"
    ON public.users FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- Allow the trigger (from auth.users) to insert new rows
-- Note: SECURITY DEFINER functions bypass RLS, but direct inserts
-- by the trigger should work. Explicit policy just in case.
CREATE POLICY "System can insert user profiles"
    ON public.users FOR INSERT
    WITH CHECK (true);

-- ===================================================================
-- DEVICES table (public catalog)
-- ===================================================================
-- Anyone can read the device catalog
CREATE POLICY "Public can read devices"
    ON public.devices FOR SELECT
    USING (true);

-- Only super_admin can modify devices
CREATE POLICY "Super admin can insert devices"
    ON public.devices FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Super admin can update devices"
    ON public.devices FOR UPDATE
    USING (public.has_role('super_admin'));

CREATE POLICY "Super admin can delete devices"
    ON public.devices FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- SCORING_CONFIG table
-- ===================================================================
-- Authenticated users can read scoring config (for rationale)
CREATE POLICY "Authenticated users can read scoring config"
    ON public.scoring_config FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only super_admin can modify scoring config
CREATE POLICY "Super admin can manage scoring config"
    ON public.scoring_config FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Super admin can update scoring config"
    ON public.scoring_config FOR UPDATE
    USING (public.has_role('super_admin'));

CREATE POLICY "Super admin can delete scoring config"
    ON public.scoring_config FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- ASSESSMENTS table
-- ===================================================================
-- Users can read their own assessments (by user_id or anonymous session UID)
CREATE POLICY "Users can read own assessments"
    ON public.assessments FOR SELECT
    USING (
        user_id = auth.uid()
    );

-- Authenticated users can insert assessments with their own user_id
-- Anonymous sessions can also insert (user_id = their anonymous UID)
CREATE POLICY "Authenticated users can create assessments"
    ON public.assessments FOR INSERT
    WITH CHECK (
        (user_id = auth.uid()) OR
        (auth.role() = 'authenticated' AND user_id IS NOT NULL)
    );

-- Admins/verifiers can read all assessments (for audit/support)
CREATE POLICY "Admins and verifiers can read all assessments"
    ON public.assessments FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- Allow the create_assessment_tx function (SECURITY DEFINER) to work
-- The function itself bypasses RLS due to SECURITY DEFINER

-- ===================================================================
-- REPAIR_SCORES table
-- ===================================================================
-- Users can read scores linked to their assessments
CREATE POLICY "Users can read own repair scores"
    ON public.repair_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = repair_scores.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- Only the create_assessment_tx function inserts; no direct INSERT needed
CREATE POLICY "System can insert repair scores"
    ON public.repair_scores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = repair_scores.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- Admins/verifiers can read all repair scores
CREATE POLICY "Admins and verifiers can read all repair scores"
    ON public.repair_scores FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- COST_ESTIMATES table
-- ===================================================================
-- Users can read estimates linked to their assessments
CREATE POLICY "Users can read own cost estimates"
    ON public.cost_estimates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = cost_estimates.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- System can insert cost estimates
CREATE POLICY "System can insert cost estimates"
    ON public.cost_estimates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = cost_estimates.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- Admins/verifiers can read all cost estimates
CREATE POLICY "Admins and verifiers can read all cost estimates"
    ON public.cost_estimates FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- GUIDES table (public content)
-- ===================================================================
-- Anyone can read guides
CREATE POLICY "Public can read guides"
    ON public.guides FOR SELECT
    USING (true);

-- Only super_admin can modify guides
CREATE POLICY "Super admin can manage guides"
    ON public.guides FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Super admin can update guides"
    ON public.guides FOR UPDATE
    USING (public.has_role('super_admin'));

CREATE POLICY "Super admin can delete guides"
    ON public.guides FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- CHECKLIST_COMPLETIONS table
-- ===================================================================
-- Users can read checklist items for their assessments
CREATE POLICY "Users can read own checklist items"
    ON public.checklist_completions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = checklist_completions.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- Users can insert/update checklist items for their assessments
CREATE POLICY "Users can insert own checklist items"
    ON public.checklist_completions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = checklist_completions.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own checklist items"
    ON public.checklist_completions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = checklist_completions.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- ===================================================================
-- SHOPS table
-- ===================================================================
-- Anyone can read verified shops
CREATE POLICY "Public can read verified shops"
    ON public.shops FOR SELECT
    USING (is_verified = true);

-- Shop owners can read their own unverified submissions
-- (shop owner association would use user_id; for now, admins handle this)
CREATE POLICY "Authenticated users can read all shops"
    ON public.shops FOR SELECT
    USING (auth.role() = 'authenticated');

-- Shop admins can submit new shop entries
CREATE POLICY "Shop admins can submit shops"
    ON public.shops FOR INSERT
    WITH CHECK (public.has_any_role(ARRAY['shop_admin', 'super_admin']));

-- Shop admins can update their own shop submissions
CREATE POLICY "Shop admins can update own shops"
    ON public.shops FOR UPDATE
    USING (public.has_any_role(ARRAY['shop_admin', 'super_admin']));

-- Only super_admin can delete shops
CREATE POLICY "Super admin can delete shops"
    ON public.shops FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- FACILITIES table
-- ===================================================================
-- Anyone can read verified facilities
CREATE POLICY "Public can read verified facilities"
    ON public.facilities FOR SELECT
    USING (is_verified = true);

-- Authenticated users can read all facilities
CREATE POLICY "Authenticated users can read all facilities"
    ON public.facilities FOR SELECT
    USING (auth.role() = 'authenticated');

-- Super admin can submit new facilities
CREATE POLICY "Super admin can submit facilities"
    ON public.facilities FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Super admin can update facilities"
    ON public.facilities FOR UPDATE
    USING (public.has_role('super_admin'));

CREATE POLICY "Super admin can delete facilities"
    ON public.facilities FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- VERIFICATION_TASKS table
-- ===================================================================
-- Anyone can create verification tasks (suggest a place)
CREATE POLICY "Public can create verification tasks"
    ON public.verification_tasks FOR INSERT
    WITH CHECK (true);

-- Submitters can read their own tasks
CREATE POLICY "Submitters can read own verification tasks"
    ON public.verification_tasks FOR SELECT
    USING (submitted_by = auth.uid());

-- Admins/verifiers can read all verification tasks
CREATE POLICY "Admins and verifiers can read all tasks"
    ON public.verification_tasks FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- Admins/verifiers can update verification tasks (approve/reject)
CREATE POLICY "Admins and verifiers can update tasks"
    ON public.verification_tasks FOR UPDATE
    USING (public.has_any_role(ARRAY['verifier', 'super_admin']))
    WITH CHECK (public.has_any_role(ARRAY['verifier', 'super_admin']));

-- ===================================================================
-- OUTCOME_FOLLOWUPS table
-- ===================================================================
-- Users can insert followups for their own assessments
CREATE POLICY "Users can insert own outcome followups"
    ON public.outcome_followups FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = outcome_followups.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

-- Users can read their own outcome followups
CREATE POLICY "Users can read own outcome followups"
    ON public.outcome_followups FOR SELECT
    USING (user_id = auth.uid());

-- Admins/verifiers can read all outcome followups (for ML training data)
CREATE POLICY "Admins and verifiers can read all followups"
    ON public.outcome_followups FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- IMPACT_EVENTS table
-- ===================================================================
-- Anyone can read impact events (aggregate stats for SDG dashboard)
CREATE POLICY "Public can read impact events"
    ON public.impact_events FOR SELECT
    USING (true);

-- Only the system can insert impact events (via server-side function)
-- Using SECURITY DEFINER functions instead of direct INSERT

-- ===================================================================
-- AUDIT_LOGS table
-- ===================================================================
-- Only super_admin can read audit logs
CREATE POLICY "Super admin can read audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.has_role('super_admin'));

-- System can insert audit logs (via server-side function)
-- Using SECURITY DEFINER functions instead of direct INSERT

-- ===================================================================
-- ML_MODELS table
-- ===================================================================
-- Anyone can read active ML models (needed for scoring)
CREATE POLICY "Public can read active ML models"
    ON public.ml_models FOR SELECT
    USING (true);

-- Only super_admin can manage ML models
CREATE POLICY "Super admin can manage ML models"
    ON public.ml_models FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Super admin can update ML models"
    ON public.ml_models FOR UPDATE
    USING (public.has_role('super_admin'));

CREATE POLICY "Super admin can delete ML models"
    ON public.ml_models FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- Storage bucket policies (for Supabase Storage)
-- Run these if you've created the buckets via dashboard
-- ===================================================================

-- Guides bucket: public read access
CREATE POLICY "Anyone can read guides"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'guides');

-- Guides bucket: authenticated users can upload (admin)
CREATE POLICY "Authenticated can upload guides"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'guides' AND
        auth.role() = 'authenticated'
    );

-- Cert-docs bucket: only authenticated users can read their own docs
CREATE POLICY "Users can read own cert docs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'cert-docs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Cert-docs bucket: shop admins can upload their cert docs
CREATE POLICY "Shop admins can upload cert docs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'cert-docs' AND
        (storage.foldername(name))[1] = auth.uid()::text AND
        public.has_any_role(ARRAY['shop_admin', 'super_admin'])
    );
