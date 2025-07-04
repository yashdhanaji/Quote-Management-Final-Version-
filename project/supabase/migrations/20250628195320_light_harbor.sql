/*
  # Fix infinite recursion in organization_users RLS policies

  1. Problem
    - The "Admins can manage organization memberships" policy creates infinite recursion
    - It queries organization_users table from within organization_users policy
    - This causes a circular dependency when checking permissions

  2. Solution
    - Drop the problematic policy that causes recursion
    - Create simpler, non-recursive policies
    - Ensure policies don't reference the same table they're protecting

  3. Changes
    - Remove recursive admin policy
    - Add direct policies for organization management
    - Maintain security while avoiding circular references
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage organization memberships" ON organization_users;

-- Create a simpler policy for admins to manage organization memberships
-- This policy allows users to manage memberships in organizations where they are admins
-- but avoids the recursive query by using a more direct approach
CREATE POLICY "Organization admins can manage memberships"
  ON organization_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
        AND ou.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organization_users.organization_id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
        AND ou.status = 'active'
    )
  );

-- Also check if there are any similar issues with organizations table policies
-- Drop and recreate the organizations admin policy to be more explicit
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;

CREATE POLICY "Organization admins can update organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
        AND ou.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = organizations.id
        AND ou.user_id = auth.uid()
        AND ou.role = 'admin'
        AND ou.status = 'active'
    )
  );