/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Several RLS policies on the users table contain subqueries that reference the users table itself
    - This creates infinite recursion when Supabase tries to evaluate the policies
    - Specifically affects policies for admin operations and organization member viewing

  2. Solution
    - Drop the problematic policies that cause recursion
    - Recreate them with simplified logic that doesn't create circular references
    - Use direct comparisons instead of subqueries where possible
    - Maintain the same security model but with non-recursive implementation

  3. Changes
    - Remove policies with recursive subqueries
    - Add new policies with simplified, non-recursive conditions
    - Ensure admins can still manage organization users
    - Ensure users can still view organization members
*/

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can delete organization users" ON users;
DROP POLICY IF EXISTS "Admins can insert organization users" ON users;
DROP POLICY IF EXISTS "Admins can update organization users" ON users;
DROP POLICY IF EXISTS "Users can view organization members" ON users;

-- Recreate policies with simplified, non-recursive logic

-- Allow admins to manage users in their organization (simplified approach)
-- This policy allows admins to manage users, but we'll handle the organization check in the application layer
CREATE POLICY "Admins can manage organization users"
  ON users
  FOR ALL
  TO authenticated
  USING (
    -- Allow if the current user is an admin and the target user is in the same organization
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'admin'
      AND au.raw_user_meta_data->>'organization_id' = users.organization_id::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'role' = 'admin'
      AND au.raw_user_meta_data->>'organization_id' = users.organization_id::text
    )
  );

-- Allow users to view other users in their organization (simplified)
CREATE POLICY "Users can view organization members"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if both users are in the same organization
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND au.raw_user_meta_data->>'organization_id' = users.organization_id::text
    )
  );