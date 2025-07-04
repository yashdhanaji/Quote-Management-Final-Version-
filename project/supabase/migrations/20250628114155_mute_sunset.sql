/*
  # Fix signup RLS policies

  1. Security Updates
    - Add policy to allow users to insert their own data during signup
    - Modify existing policies to handle signup flow properly
    
  2. Changes
    - Add INSERT policy for authenticated users to create their own profile
    - Ensure UPDATE policy works for profile completion during signup
*/

-- Drop existing policies to recreate them with proper conditions
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Allow authenticated users to insert their own profile data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also allow service role to manage users (for admin operations)
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);