-- ===================================================================
-- Rev.Tech — Multi-Type Support for shops
-- Adds a TEXT[] column to store multiple service types per location.
-- Run after 003_role_cleanup.sql
-- ===================================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS types TEXT[]
  DEFAULT ARRAY['repair']::TEXT[];

-- Backfill existing rows: convert single type to array
UPDATE public.shops
SET types = ARRAY[ CASE
  WHEN type = 'recycling' THEN 'recycle'
  ELSE 'repair'
END ]::TEXT[]
WHERE types IS NULL;

-- Add GIN index for array queries
CREATE INDEX IF NOT EXISTS idx_shops_types ON public.shops USING GIN (types);
