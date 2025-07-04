/*
  # Fix Organization RLS Policies

  1. Security Updates
    - Update RLS policies for organizations table to allow creation during signup
    - Add policy for anonymous users during signup process
    - Ensure authenticated users can create organizations

  2. Changes
    - Drop existing restrictive policies
    - Add new policies that support both signup and authenticated user flows
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Allow anonymous user creation during signup" ON organizations;

-- Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow anonymous users to create organizations during signup
CREATE POLICY "Allow anonymous organization creation during signup"
  ON organizations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Ensure the existing SELECT policy works for both authenticated and service role
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_users.organization_id
      FROM organization_users
      WHERE organization_users.user_id = auth.uid()
        AND organization_users.status = 'active'
    )
  );

-- Ensure service role can manage all organizations
DROP POLICY IF EXISTS "Service role can manage all organizations" ON organizations;
CREATE POLICY "Service role can manage all organizations"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update the organization admin update policy
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
CREATE POLICY "Organization admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
        AND ou.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organization_users ou
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
        AND ou.status = 'active'
    )
  );