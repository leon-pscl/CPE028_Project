-- Assessment Results table
-- Stores full ML assessment payloads as JSONB for roadmap retrieval.

CREATE TABLE IF NOT EXISTS assessment_results (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  result_json JSONB NOT NULL,
  form_json  JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own assessment results
CREATE POLICY "Users read own assessment results"
  ON assessment_results FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own assessment results
CREATE POLICY "Users insert own assessment results"
  ON assessment_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id
  ON assessment_results (user_id, created_at DESC);
