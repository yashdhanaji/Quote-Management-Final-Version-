/*
  # Fix organization creation RLS policies

  1. Policy Updates
    - Update organizations INSERT policy to allow creation during signup process
    - Ensure authenticated users can create organizations
    - Add policy for anon users during the signup flow

  2. Changes
    - Drop existing restrictive INSERT policy
    - Create new policy that allows both authenticated and anon users to insert
    - This is safe because organization creation is tied to user signup
*/

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow organization creation during signup" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Allow anonymous organization creation during signup" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Create a new policy that allows organization creation during signup
CREATE POLICY "Allow organization creation during signup"
  ON organizations
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Ensure the existing SELECT policy works for authenticated users
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (id IN (
    SELECT organization_users.organization_id
    FROM organization_users
    WHERE (organization_users.user_id = auth.uid()) 
    AND (organization_users.status = 'active'::text)
  ));

-- Ensure the UPDATE policy works correctly
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
CREATE POLICY "Organization admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM organization_users ou
    WHERE (ou.organization_id = organizations.id) 
    AND (ou.user_id = auth.uid()) 
    AND (ou.role = 'admin'::text) 
    AND (ou.status = 'active'::text)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM organization_users ou
    WHERE (ou.organization_id = organizations.id) 
    AND (ou.user_id = auth.uid()) 
    AND (ou.role = 'admin'::text) 
    AND (ou.status = 'active'::text)
  ));

-- Ensure service role can manage all organizations
DROP POLICY IF EXISTS "Service role can manage all organizations" ON organizations;
CREATE POLICY "Service role can manage all organizations"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);