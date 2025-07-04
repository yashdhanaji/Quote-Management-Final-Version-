/*
  # Fix Organization Creation RLS Policy

  1. Security Updates
    - Update INSERT policy for organizations table to properly handle organization creation
    - Ensure authenticated users can create organizations
    - Maintain security while allowing proper functionality

  2. Changes
    - Drop existing INSERT policy that may be too restrictive
    - Create new INSERT policy that allows authenticated users to create organizations
    - Ensure the policy works for both signup flow and regular organization creation
*/

-- Drop the existing INSERT policy for organizations if it exists
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

-- Create a new INSERT policy that allows authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the SELECT policy allows users to view organizations they belong to
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_users 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );