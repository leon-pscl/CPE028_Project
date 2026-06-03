-- ===================================================================
-- Rev.Tech — Rejected flag + submitted_by for shops
-- Allows tracking rejected submissions and filtering per-user.
-- Run after 004_multi_type_support.sql
-- ===================================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill rejected based on existing verification_tasks
UPDATE public.shops
SET rejected = TRUE
WHERE id IN (
  SELECT shop_id FROM verification_tasks WHERE status = 'rejected'
);

CREATE INDEX IF NOT EXISTS idx_shops_rejected ON public.shops (rejected);
