-- Migration 012: Grant missing table permissions
-- Without GRANTs, PostgreSQL denies access before RLS is evaluated.
-- Safe to re-run: GRANTs are additive (idempotent on apply).

-- ── authenticated role ─────────────────────────────────────────
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.devices TO authenticated;
GRANT SELECT ON public.scoring_config TO authenticated;
GRANT SELECT, INSERT ON public.assessments TO authenticated;
GRANT SELECT, INSERT ON public.repair_scores TO authenticated;
GRANT SELECT, INSERT ON public.cost_estimates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.checklist_completions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.verification_tasks TO authenticated;
GRANT SELECT, INSERT ON public.outcome_followups TO authenticated;
GRANT SELECT ON public.impact_events TO authenticated;
GRANT SELECT ON public.ml_models TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.type_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.type_overrides TO authenticated;

-- ── anon role (public read only) ────────────────────────────────
GRANT SELECT ON public.devices TO anon;
GRANT SELECT ON public.guides TO anon;
GRANT SELECT ON public.shops TO anon;
GRANT SELECT ON public.facilities TO anon;
GRANT SELECT ON public.impact_events TO anon;
GRANT SELECT ON public.ml_models TO anon;
GRANT SELECT ON public.type_overrides TO anon;
