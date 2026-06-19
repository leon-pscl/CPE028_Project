-- Staging test users (one per role)
-- Password for all: Test1234!

-- Consumer
SELECT auth.admin_create_user(
  'consumer@test.com',
  'Test1234!',
  '{"full_name": "Test Consumer", "role": "consumer"}'::jsonb,
  false
);

-- Moderator
SELECT auth.admin_create_user(
  'moderator@test.com',
  'Test1234!',
  '{"full_name": "Test Moderator", "role": "moderator"}'::jsonb,
  false
);

-- Admin
SELECT auth.admin_create_user(
  'admin@test.com',
  'Test1234!',
  '{"full_name": "Test Admin", "role": "admin"}'::jsonb,
  false
);
