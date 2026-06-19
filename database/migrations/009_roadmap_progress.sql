-- Migration 009: Roadmap Progress
-- Persists per-user checklist state for each assessment roadmap.
-- Stores completed step IDs and sub-item IDs as JSONB arrays.

CREATE TABLE IF NOT EXISTS roadmap_progress (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_result_id UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  -- Flat list of completed step IDs e.g. ["backup_data","check_warranty"]
  completed_step_ids   JSONB NOT NULL DEFAULT '[]',
  -- Flat list of completed sub-item IDs e.g. ["bu_cloud_mobile","bu_apps"]
  completed_sub_ids    JSONB NOT NULL DEFAULT '[]',
  -- Active navigation state so we restore the user to where they left off
  active_phase_idx     INTEGER NOT NULL DEFAULT 0,
  active_step_idx      INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),

  -- One progress record per user per assessment
  UNIQUE (user_id, assessment_result_id)
);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION update_roadmap_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roadmap_progress_updated_at ON roadmap_progress;
CREATE TRIGGER trg_roadmap_progress_updated_at
  BEFORE UPDATE ON roadmap_progress
  FOR EACH ROW EXECUTE FUNCTION update_roadmap_progress_updated_at();

-- Row Level Security
ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own roadmap progress" ON roadmap_progress;
CREATE POLICY "Users read own roadmap progress"
  ON roadmap_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own roadmap progress" ON roadmap_progress;
CREATE POLICY "Users insert own roadmap progress"
  ON roadmap_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own roadmap progress" ON roadmap_progress;
CREATE POLICY "Users update own roadmap progress"
  ON roadmap_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own roadmap progress" ON roadmap_progress;
CREATE POLICY "Users delete own roadmap progress"
  ON roadmap_progress FOR DELETE
  USING (auth.uid() = user_id);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user_assessment
  ON roadmap_progress (user_id, assessment_result_id);
