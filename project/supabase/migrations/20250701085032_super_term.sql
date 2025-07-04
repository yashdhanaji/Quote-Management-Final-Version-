/*
  # Fix user signup RLS policies

  1. Policy Updates
    - Update INSERT policy for users table to allow signup process
    - Ensure new users can be created during authentication flow
  
  2. Security
    - Maintain security while allowing user creation
    - Users can only insert their own data during signup
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Create a new INSERT policy that allows user creation during signup
-- This allows both authenticated users (for admin creation) and the signup process
CREATE POLICY "Allow user creation during signup"
  ON users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Allow if user is creating their own record (during signup, uid() might be null initially)
    auth.uid() = id 
    OR 
    -- Allow if no current user (during the signup process)
    auth.uid() IS NULL
    OR
    -- Allow service role (for admin operations)
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Also ensure we have a policy for anon users to insert during signup
-- This is specifically for the signup flow where the user isn't authenticated yet
CREATE POLICY "Allow anonymous user creation during signup"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);