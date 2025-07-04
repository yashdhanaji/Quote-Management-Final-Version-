/*
  # Fix infinite recursion in users table RLS policy

  1. Security Changes
    - Remove the problematic "Users can view organization members" policy that causes infinite recursion
    - Add a simpler policy that allows users to view other users in their organization
    - The new policy uses the users table directly instead of auth.users metadata to avoid recursion

  2. Policy Updates
    - Drop the recursive policy
    - Create a new non-recursive policy for viewing organization members
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view organization members" ON users;

-- Create a new policy that allows users to view organization members without recursion
-- This policy allows users to see other users who share the same organization_id
CREATE POLICY "Users can view organization members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT u.organization_id 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.organization_id IS NOT NULL
    )
  );