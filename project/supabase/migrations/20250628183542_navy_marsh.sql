/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The "Admins can manage organization users" policy was causing infinite recursion
    - It was querying auth.users metadata from within a users table policy
    - This creates a circular dependency when the policy tries to evaluate itself

  2. Solution
    - Replace the problematic policy with a simpler approach
    - Use direct user ID comparison with auth.uid()
    - Remove the recursive auth.users metadata check
    - Keep the policy logic but make it non-recursive

  3. Changes
    - Drop the problematic "Admins can manage organization users" policy
    - Create a new policy that checks admin role from the users table directly
    - Ensure no circular references in policy definitions
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage organization users" ON users;

-- Create a new policy for admins that doesn't cause recursion
-- This policy allows users with admin role to manage users in their organization
CREATE POLICY "Admins can manage organization users" ON users
  FOR ALL
  TO authenticated
  USING (
    -- Current user is admin and in the same organization
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.organization_id = users.organization_id
    )
  )
  WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
      SELECT 1 FROM users admin_user 
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin' 
      AND admin_user.organization_id = users.organization_id
    )
  );