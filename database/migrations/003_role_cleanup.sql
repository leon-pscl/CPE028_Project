-- ===================================================================
-- Rev.Tech — Role Cleanup & handle_new_user Trigger
-- Run this in Supabase SQL Editor after 002_rls_policies.sql
-- ===================================================================

-- 1. Drop old CHECK constraint and re-add with new roles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('consumer', 'moderator', 'admin'));

-- 2. Update existing rows (map old roles to new)
UPDATE public.users
SET role = CASE
  WHEN role IN ('shop_admin', 'verifier') THEN 'moderator'
  WHEN role = 'super_admin' THEN 'admin'
  ELSE 'consumer'
END
WHERE id != auth.uid(); -- ponytail: skip current user to avoid Supabase self-role-change trigger

-- 3. Create trigger function to auto-create public.users row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'consumer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Drop old RLS helper function references (they work on role TEXT so they're fine)
-- The has_role and has_any_role functions work with any TEXT values, so no change needed

-- 6. Update RLS policies for shops — consumers can submit now
DROP POLICY IF EXISTS "Shop admins can submit shops" ON public.shops;
CREATE POLICY "Authenticated users can submit shops"
  ON public.shops FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Shop admins can update own shops" ON public.shops;
CREATE POLICY "Moderators and admins can update shops"
  ON public.shops FOR UPDATE
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Super admin can delete shops" ON public.shops;
CREATE POLICY "Admins can delete shops"
  ON public.shops FOR DELETE
  USING (public.has_role('admin'));

-- 7. Update RLS policies for facilities — consumers can submit now
DROP POLICY IF EXISTS "Super admin can submit facilities" ON public.facilities;
CREATE POLICY "Authenticated users can submit facilities"
  ON public.facilities FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Super admin can update facilities" ON public.facilities;
CREATE POLICY "Moderators and admins can update facilities"
  ON public.facilities FOR UPDATE
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Super admin can delete facilities" ON public.facilities;
CREATE POLICY "Admins can delete facilities"
  ON public.facilities FOR DELETE
  USING (public.has_role('admin'));

-- 8. Update RLS policies for verification_tasks
DROP POLICY IF EXISTS "Admins and verifiers can read all tasks" ON public.verification_tasks;
CREATE POLICY "Moderators and admins can read all tasks"
  ON public.verification_tasks FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Admins and verifiers can update tasks" ON public.verification_tasks;
CREATE POLICY "Moderators and admins can update tasks"
  ON public.verification_tasks FOR UPDATE
  USING (public.has_any_role(ARRAY['moderator', 'admin']))
  WITH CHECK (public.has_any_role(ARRAY['moderator', 'admin']));

-- 9. Update users table policies
DROP POLICY IF EXISTS "Admins and verifiers can read all profiles" ON public.users;
CREATE POLICY "Moderators and admins can read all profiles"
  ON public.users FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

-- 10. Update remaining policies referencing old roles
DROP POLICY IF EXISTS "Admins and verifiers can read all assessments" ON public.assessments;
CREATE POLICY "Moderators and admins can read all assessments"
  ON public.assessments FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Admins and verifiers can read all repair scores" ON public.repair_scores;
CREATE POLICY "Moderators and admins can read all repair scores"
  ON public.repair_scores FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Admins and verifiers can read all cost estimates" ON public.cost_estimates;
CREATE POLICY "Moderators and admins can read all cost estimates"
  ON public.cost_estimates FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Admins and verifiers can read all followups" ON public.outcome_followups;
CREATE POLICY "Moderators and admins can read all followups"
  ON public.outcome_followups FOR SELECT
  USING (public.has_any_role(ARRAY['moderator', 'admin']));

DROP POLICY IF EXISTS "Super admin can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role('admin'));

-- Update devices policies
DROP POLICY IF EXISTS "Super admin can insert devices" ON public.devices;
CREATE POLICY "Admins can insert devices"
  ON public.devices FOR INSERT
  WITH CHECK (public.has_role('admin'));

DROP POLICY IF EXISTS "Super admin can update devices" ON public.devices;
CREATE POLICY "Admins can update devices"
  ON public.devices FOR UPDATE
  USING (public.has_role('admin'));

DROP POLICY IF EXISTS "Super admin can delete devices" ON public.devices;
CREATE POLICY "Admins can delete devices"
  ON public.devices FOR DELETE
  USING (public.has_role('admin'));

-- Update scoring_config policies
DROP POLICY IF EXISTS "Super admin can manage scoring config" ON public.scoring_config;
DROP POLICY IF EXISTS "Super admin can update scoring config" ON public.scoring_config;
DROP POLICY IF EXISTS "Super admin can delete scoring config" ON public.scoring_config;
CREATE POLICY "Admins can insert scoring config"
  ON public.scoring_config FOR INSERT
  WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins can update scoring config"
  ON public.scoring_config FOR UPDATE
  USING (public.has_role('admin'));
CREATE POLICY "Admins can delete scoring config"
  ON public.scoring_config FOR DELETE
  USING (public.has_role('admin'));

-- Update guides policies
DROP POLICY IF EXISTS "Super admin can manage guides" ON public.guides;
DROP POLICY IF EXISTS "Super admin can update guides" ON public.guides;
DROP POLICY IF EXISTS "Super admin can delete guides" ON public.guides;
CREATE POLICY "Admins can insert guides"
  ON public.guides FOR INSERT
  WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins can update guides"
  ON public.guides FOR UPDATE
  USING (public.has_role('admin'));
CREATE POLICY "Admins can delete guides"
  ON public.guides FOR DELETE
  USING (public.has_role('admin'));

-- Update ML models policies
DROP POLICY IF EXISTS "Super admin can manage ML models" ON public.ml_models;
DROP POLICY IF EXISTS "Super admin can update ML models" ON public.ml_models;
DROP POLICY IF EXISTS "Super admin can delete ML models" ON public.ml_models;
CREATE POLICY "Admins can insert ML models"
  ON public.ml_models FOR INSERT
  WITH CHECK (public.has_role('admin'));
CREATE POLICY "Admins can update ML models"
  ON public.ml_models FOR UPDATE
  USING (public.has_role('admin'));
CREATE POLICY "Admins can delete ML models"
  ON public.ml_models FOR DELETE
  USING (public.has_role('admin'));

-- Update storage policies
DROP POLICY IF EXISTS "Shop admins can upload cert docs" ON storage.objects;
CREATE POLICY "Authenticated can upload cert docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cert-docs' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    auth.role() = 'authenticated'
  );
