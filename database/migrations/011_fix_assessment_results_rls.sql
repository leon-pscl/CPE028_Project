-- Migration 011: Fix assessment_results and roadmap_progress RLS
-- Re-applies policies that may not have been applied in migration 008/009.
-- Safe to re-run: uses DROP POLICY IF EXISTS before each CREATE POLICY.

-- ── assessment_results ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_results (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  result_json JSONB NOT NULL,
  form_json   JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own assessment results" ON assessment_results;
CREATE POLICY "Users read own assessment results"
  ON assessment_results FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own assessment results" ON assessment_results;
CREATE POLICY "Users insert own assessment results"
  ON assessment_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id
  ON assessment_results (user_id, created_at DESC);

-- ── roadmap_progress ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roadmap_progress (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_result_id UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  completed_step_ids   JSONB NOT NULL DEFAULT '[]',
  completed_sub_ids    JSONB NOT NULL DEFAULT '[]',
  active_phase_idx     INTEGER NOT NULL DEFAULT 0,
  active_step_idx      INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, assessment_result_id)
);

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

CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user_assessment
  ON roadmap_progress (user_id, assessment_result_id);
