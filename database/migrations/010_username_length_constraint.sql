-- Truncate any full_name values that exceed 100 chars
UPDATE public.users SET full_name = left(full_name, 100) WHERE char_length(full_name) > 100;

-- Enforce max length on full_name to prevent abuse
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_full_name_length_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_full_name_length_check
      CHECK (char_length(full_name) <= 100);
  END IF;
END $$;
