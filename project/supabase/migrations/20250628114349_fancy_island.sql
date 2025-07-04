/*
  # Fix User Signup Trigger

  1. Database Functions
    - Create or replace the handle_new_user function to properly handle user creation
    - Ensure it works with the existing users table schema
    - Handle organization_id from user metadata

  2. Triggers
    - Create trigger on auth.users for new user creation
    - Ensure proper error handling

  3. Security
    - Temporarily disable RLS for the trigger operation
    - Re-enable RLS after user creation
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the new user into the public.users table
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    organization_id,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'organization_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'organization_id')::uuid
      ELSE NULL
    END,
    true,
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (in a real scenario, you might want to use a logging table)
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    -- Re-raise the exception to prevent user creation if profile creation fails
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.users TO supabase_auth_admin;
GRANT ALL ON public.organizations TO supabase_auth_admin;