-- ===================================================================
-- ReDevice — Auth Trigger: auto-create public.users on signup
-- ===================================================================
-- When a new user signs up via Supabase Auth (auth.users),
-- this trigger automatically inserts a corresponding row into
-- public.users with metadata from the registration form.

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, full_name, role)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        COALESCE(NEW.raw_user_meta_data ->> 'role', 'consumer')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
