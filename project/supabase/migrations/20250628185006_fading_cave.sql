/*
  # Fix infinite recursion in users table RLS policies - Final Fix

  1. Problem
    - The users table still has RLS policies that cause infinite recursion
    - The "Users can view organization members" policy is trying to query the users table from within a users table policy
    - This creates a circular dependency that PostgreSQL cannot resolve

  2. Solution
    - Drop ALL existing RLS policies on the users table
    - Create simple, non-recursive policies that don't reference the users table in subqueries
    - Use auth.uid() directly for user identification
    - Simplify organization-based access without recursive queries

  3. Security Model
    - Users can read/update their own data
    - Service role can manage all users
    - Remove complex organization-based policies that cause recursion
    - Handle organization access at the application level instead of database level
*/

-- Drop ALL existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can view organization members" ON users;
DROP POLICY IF EXISTS "Admins can manage organization users" ON users;
DROP POLICY IF EXISTS "Admins can delete organization users" ON users;
DROP POLICY IF EXISTS "Admins can insert organization users" ON users;
DROP POLICY IF EXISTS "Admins can update organization users" ON users;
DROP POLICY IF EXISTS "Service role can manage all users" ON users;

-- Create simple, non-recursive policies

-- Allow users to read their own data only
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own data only
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own data during signup
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role can manage all users (for admin operations)
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT ALL ON users TO service_role;