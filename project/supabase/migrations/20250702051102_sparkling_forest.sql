/*
  # Fix Organization Creation Policy

  1. Policy Changes
    - Update the INSERT policy for organizations table to properly handle user creation
    - Ensure authenticated users can create organizations during signup process
    - Add proper service role access for organization creation

  2. Security
    - Maintain RLS protection while allowing legitimate organization creation
    - Ensure only authenticated users can create organizations
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create a new INSERT policy that properly handles organization creation
CREATE POLICY "Users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is authenticated (covers signup scenario)
    auth.uid() IS NOT NULL
  );

-- Ensure service role can also manage organizations (for admin operations)
DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;
CREATE POLICY "Service role can manage organizations"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);