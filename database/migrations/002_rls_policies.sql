-- ===================================================================
-- Rev.Tech — Row Level Security (RLS) Policies
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
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admins and verifiers can read all profiles" ON public.users;
CREATE POLICY "Admins and verifiers can read all profiles"
    ON public.users FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

DROP POLICY IF EXISTS "System can insert user profiles" ON public.users;
CREATE POLICY "System can insert user profiles"
    ON public.users FOR INSERT
    WITH CHECK (true);

-- ===================================================================
-- DEVICES table (public catalog)
-- ===================================================================
DROP POLICY IF EXISTS "Public can read devices" ON public.devices;
CREATE POLICY "Public can read devices"
    ON public.devices FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super admin can insert devices" ON public.devices;
CREATE POLICY "Super admin can insert devices"
    ON public.devices FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can update devices" ON public.devices;
CREATE POLICY "Super admin can update devices"
    ON public.devices FOR UPDATE
    USING (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can delete devices" ON public.devices;
CREATE POLICY "Super admin can delete devices"
    ON public.devices FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- SCORING_CONFIG table
-- ===================================================================
DROP POLICY IF EXISTS "Authenticated users can read scoring config" ON public.scoring_config;
CREATE POLICY "Authenticated users can read scoring config"
    ON public.scoring_config FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Super admin can manage scoring config" ON public.scoring_config;
CREATE POLICY "Super admin can manage scoring config"
    ON public.scoring_config FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can update scoring config" ON public.scoring_config;
CREATE POLICY "Super admin can update scoring config"
    ON public.scoring_config FOR UPDATE
    USING (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can delete scoring config" ON public.scoring_config;
CREATE POLICY "Super admin can delete scoring config"
    ON public.scoring_config FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- ASSESSMENTS table
-- ===================================================================
DROP POLICY IF EXISTS "Users can read own assessments" ON public.assessments;
CREATE POLICY "Users can read own assessments"
    ON public.assessments FOR SELECT
    USING (
        user_id = auth.uid()
    );

DROP POLICY IF EXISTS "Authenticated users can create assessments" ON public.assessments;
CREATE POLICY "Authenticated users can create assessments"
    ON public.assessments FOR INSERT
    WITH CHECK (
        (user_id = auth.uid()) OR
        (auth.role() = 'authenticated' AND user_id IS NOT NULL)
    );

DROP POLICY IF EXISTS "Admins and verifiers can read all assessments" ON public.assessments;
CREATE POLICY "Admins and verifiers can read all assessments"
    ON public.assessments FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- REPAIR_SCORES table
-- ===================================================================
DROP POLICY IF EXISTS "Users can read own repair scores" ON public.repair_scores;
CREATE POLICY "Users can read own repair scores"
    ON public.repair_scores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = repair_scores.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert repair scores" ON public.repair_scores;
CREATE POLICY "System can insert repair scores"
    ON public.repair_scores FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = repair_scores.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins and verifiers can read all repair scores" ON public.repair_scores;
CREATE POLICY "Admins and verifiers can read all repair scores"
    ON public.repair_scores FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- COST_ESTIMATES table
-- ===================================================================
DROP POLICY IF EXISTS "Users can read own cost estimates" ON public.cost_estimates;
CREATE POLICY "Users can read own cost estimates"
    ON public.cost_estimates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = cost_estimates.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert cost estimates" ON public.cost_estimates;
CREATE POLICY "System can insert cost estimates"
    ON public.cost_estimates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = cost_estimates.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins and verifiers can read all cost estimates" ON public.cost_estimates;
CREATE POLICY "Admins and verifiers can read all cost estimates"
    ON public.cost_estimates FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- GUIDES table (public content)
-- ===================================================================
DROP POLICY IF EXISTS "Public can read guides" ON public.guides;
CREATE POLICY "Public can read guides"
    ON public.guides FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super admin can manage guides" ON public.guides;
CREATE POLICY "Super admin can manage guides"
    ON public.guides FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can update guides" ON public.guides;
CREATE POLICY "Super admin can update guides"
    ON public.guides FOR UPDATE
    USING (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can delete guides" ON public.guides;
CREATE POLICY "Super admin can delete guides"
    ON public.guides FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- CHECKLIST_COMPLETIONS table
-- ===================================================================
DROP POLICY IF EXISTS "Users can read own checklist items" ON public.checklist_completions;
CREATE POLICY "Users can read own checklist items"
    ON public.checklist_completions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = checklist_completions.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own checklist items" ON public.checklist_completions;
CREATE POLICY "Users can insert own checklist items"
    ON public.checklist_completions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assessments
            WHERE assessments.id = checklist_completions.assessment_id
            AND assessments.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own checklist items" ON public.checklist_completions;
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
DROP POLICY IF EXISTS "Public can read verified shops" ON public.shops;
CREATE POLICY "Public can read verified shops"
    ON public.shops FOR SELECT
    USING (is_verified = true);

DROP POLICY IF EXISTS "Authenticated users can read all shops" ON public.shops;
CREATE POLICY "Authenticated users can read all shops"
    ON public.shops FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Shop admins can submit shops" ON public.shops;
CREATE POLICY "Shop admins can submit shops"
    ON public.shops FOR INSERT
    WITH CHECK (public.has_any_role(ARRAY['shop_admin', 'super_admin']));

DROP POLICY IF EXISTS "Shop admins can update own shops" ON public.shops;
CREATE POLICY "Shop admins can update own shops"
    ON public.shops FOR UPDATE
    USING (public.has_any_role(ARRAY['shop_admin', 'super_admin']));

DROP POLICY IF EXISTS "Super admin can delete shops" ON public.shops;
CREATE POLICY "Super admin can delete shops"
    ON public.shops FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- FACILITIES table
-- ===================================================================
DROP POLICY IF EXISTS "Public can read verified facilities" ON public.facilities;
CREATE POLICY "Public can read verified facilities"
    ON public.facilities FOR SELECT
    USING (is_verified = true);

DROP POLICY IF EXISTS "Authenticated users can read all facilities" ON public.facilities;
CREATE POLICY "Authenticated users can read all facilities"
    ON public.facilities FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Super admin can submit facilities" ON public.facilities;
CREATE POLICY "Super admin can submit facilities"
    ON public.facilities FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can update facilities" ON public.facilities;
CREATE POLICY "Super admin can update facilities"
    ON public.facilities FOR UPDATE
    USING (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can delete facilities" ON public.facilities;
CREATE POLICY "Super admin can delete facilities"
    ON public.facilities FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- VERIFICATION_TASKS table
-- ===================================================================
DROP POLICY IF EXISTS "Public can create verification tasks" ON public.verification_tasks;
CREATE POLICY "Public can create verification tasks"
    ON public.verification_tasks FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Submitters can read own verification tasks" ON public.verification_tasks;
CREATE POLICY "Submitters can read own verification tasks"
    ON public.verification_tasks FOR SELECT
    USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS "Admins and verifiers can read all tasks" ON public.verification_tasks;
CREATE POLICY "Admins and verifiers can read all tasks"
    ON public.verification_tasks FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

DROP POLICY IF EXISTS "Admins and verifiers can update tasks" ON public.verification_tasks;
CREATE POLICY "Admins and verifiers can update tasks"
    ON public.verification_tasks FOR UPDATE
    USING (public.has_any_role(ARRAY['verifier', 'super_admin']))
    WITH CHECK (public.has_any_role(ARRAY['verifier', 'super_admin']));

-- ===================================================================
-- OUTCOME_FOLLOWUPS table
-- ===================================================================
DROP POLICY IF EXISTS "Users can insert own outcome followups" ON public.outcome_followups;
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

DROP POLICY IF EXISTS "Users can read own outcome followups" ON public.outcome_followups;
CREATE POLICY "Users can read own outcome followups"
    ON public.outcome_followups FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins and verifiers can read all followups" ON public.outcome_followups;
CREATE POLICY "Admins and verifiers can read all followups"
    ON public.outcome_followups FOR SELECT
    USING (public.has_any_role(ARRAY['super_admin', 'verifier']));

-- ===================================================================
-- IMPACT_EVENTS table
-- ===================================================================
DROP POLICY IF EXISTS "Public can read impact events" ON public.impact_events;
CREATE POLICY "Public can read impact events"
    ON public.impact_events FOR SELECT
    USING (true);

-- ===================================================================
-- AUDIT_LOGS table
-- ===================================================================
DROP POLICY IF EXISTS "Super admin can read audit logs" ON public.audit_logs;
CREATE POLICY "Super admin can read audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.has_role('super_admin'));

-- ===================================================================
-- ML_MODELS table
-- ===================================================================
DROP POLICY IF EXISTS "Public can read active ML models" ON public.ml_models;
CREATE POLICY "Public can read active ML models"
    ON public.ml_models FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super admin can manage ML models" ON public.ml_models;
CREATE POLICY "Super admin can manage ML models"
    ON public.ml_models FOR INSERT
    WITH CHECK (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can update ML models" ON public.ml_models;
CREATE POLICY "Super admin can update ML models"
    ON public.ml_models FOR UPDATE
    USING (public.has_role('super_admin'));

DROP POLICY IF EXISTS "Super admin can delete ML models" ON public.ml_models;
CREATE POLICY "Super admin can delete ML models"
    ON public.ml_models FOR DELETE
    USING (public.has_role('super_admin'));

-- ===================================================================
-- Storage bucket policies (for Supabase Storage)
-- ===================================================================

DROP POLICY IF EXISTS "Anyone can read guides" ON storage.objects;
CREATE POLICY "Anyone can read guides"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'guides');

DROP POLICY IF EXISTS "Authenticated can upload guides" ON storage.objects;
CREATE POLICY "Authenticated can upload guides"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'guides' AND
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "Users can read own cert docs" ON storage.objects;
CREATE POLICY "Users can read own cert docs"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'cert-docs' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Shop admins can upload cert docs" ON storage.objects;
CREATE POLICY "Shop admins can upload cert docs"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'cert-docs' AND
        (storage.foldername(name))[1] = auth.uid()::text AND
        public.has_any_role(ARRAY['shop_admin', 'super_admin'])
    );
