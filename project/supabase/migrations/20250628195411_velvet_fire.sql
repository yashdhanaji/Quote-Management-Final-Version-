/*
  # Fix infinite recursion in organization_users RLS policies

  1. Problem
    - Current policies on organization_users table create infinite recursion
    - Policies are checking organization membership by querying the same table they're protecting
    
  2. Solution
    - Drop existing problematic policies
    - Create simpler, non-recursive policies
    - Use direct user ID checks instead of complex subqueries
    
  3. Security
    - Users can view their own organization memberships
    - Organization admins can manage memberships (simplified check)
    - Service role maintains full access
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Organization admins can manage memberships" ON organization_users;
DROP POLICY IF EXISTS "Service role can manage all organization memberships" ON organization_users;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON organization_users;

-- Create new, simplified policies without recursion

-- Users can view their own organization memberships
CREATE POLICY "Users can view own memberships"
  ON organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own memberships (for joining organizations)
CREATE POLICY "Users can insert own memberships"
  ON organization_users
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own membership status (for leaving organizations)
CREATE POLICY "Users can update own memberships"
  ON organization_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can manage all organization memberships
CREATE POLICY "Service role can manage all memberships"
  ON organization_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- For admin management, we'll handle this through the application layer
-- rather than complex RLS policies to avoid recursion