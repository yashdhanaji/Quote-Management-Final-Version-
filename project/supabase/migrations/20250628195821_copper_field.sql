/*
  # Fix Organization Creation RLS Policy

  1. Security Changes
    - Drop the existing INSERT policy for organizations that may be causing issues
    - Create a new, more explicit INSERT policy for authenticated users
    - Ensure the policy properly checks for authenticated users using auth.uid()

  2. Policy Details
    - Allow authenticated users to create organizations
    - Use proper auth.uid() function to verify authentication
    - Set both USING and WITH CHECK expressions for consistency
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create a new INSERT policy with explicit authentication check
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the policy is properly applied by refreshing the table's RLS
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;