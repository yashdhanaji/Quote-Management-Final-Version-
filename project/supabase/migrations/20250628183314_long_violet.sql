/*
  # Fix Users Backend Connection Issues

  1. Problem Analysis
    - Users table may have RLS policies that are too restrictive
    - Need to ensure proper organization-based access
    - Check if users can query their own organization's users

  2. Solutions
    - Update RLS policies to allow organization-based user queries
    - Ensure proper foreign key relationships
    - Add missing indexes for performance

  3. Security
    - Maintain organization isolation
    - Allow users to see other users in their organization
    - Prevent cross-organization data access
*/

-- First, let's check if the users table exists and has proper structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'Users table does not exist';
  END IF;
END $$;

-- Ensure organization_id column exists and has proper foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE users ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Create comprehensive RLS policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to read other users in their organization
CREATE POLICY "Users can view organization members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update users in their organization
CREATE POLICY "Admins can update organization users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow users to insert their own data during signup
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow admins to insert users in their organization
CREATE POLICY "Admins can insert organization users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete users in their organization (except themselves)
CREATE POLICY "Admins can delete organization users"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    id != auth.uid() AND
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage all users
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS users_organization_id_idx ON users(organization_id);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users(is_active);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT ALL ON users TO service_role;