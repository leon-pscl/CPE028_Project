-- Enforce max length on full_name to prevent abuse
ALTER TABLE public.users
  ADD CONSTRAINT users_full_name_length_check
  CHECK (char_length(full_name) <= 100);
