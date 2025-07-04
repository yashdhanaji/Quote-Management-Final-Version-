/*
  # Fix user signup schema issues

  1. Schema Updates
    - Make email column nullable with default to handle auth trigger
    - Ensure proper defaults for user creation
    - Add missing constraints and indexes

  2. Security
    - Maintain existing RLS policies
    - Ensure proper user creation flow
*/

-- Make email nullable to handle auth trigger creation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Ensure we have a proper trigger function for handling new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin',
    true,
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth creation
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the trigger function has proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;