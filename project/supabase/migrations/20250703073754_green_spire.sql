/*
  # Reset Organization RLS Policies from Scratch

  1. Complete Reset
    - Drop ALL existing RLS policies on organizations table
    - Disable and re-enable RLS to ensure clean state
    - Create new, simple policies from scratch

  2. New Policy Structure
    - INSERT: Allow authenticated users to create organizations
    - SELECT: Allow users to view organizations they belong to
    - UPDATE: Allow organization admins to update their organizations
    - DELETE: Allow organization admins to delete their organizations
    - Service role: Full access for system operations

  3. Security
    - Clean, non-conflicting policies
    - Organization-scoped access based on organization_users table
    - Proper role-based permissions
*/

-- Disable RLS temporarily to clean up
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on organizations table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON organizations';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create new, clean policies

-- 1. INSERT Policy: Allow authenticated users to create organizations
CREATE POLICY "authenticated_users_can_create_organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. SELECT Policy: Users can view organizations they belong to
CREATE POLICY "users_can_view_their_organizations"
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

-- 3. UPDATE Policy: Organization admins can update their organizations
CREATE POLICY "admins_can_update_their_organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM organization_users 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );

-- 4. DELETE Policy: Organization admins can delete their organizations
CREATE POLICY "admins_can_delete_their_organizations"
  ON organizations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM organization_users 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );

-- 5. Service Role Policy: Full access for system operations
CREATE POLICY "service_role_full_access"
  ON organizations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT ALL ON organizations TO service_role;