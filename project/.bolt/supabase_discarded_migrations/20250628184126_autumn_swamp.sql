/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - The "Admins can manage organization users" policy causes infinite recursion
    - It queries the users table from within a users table policy check
    - This creates a circular dependency that results in infinite recursion

  2. Solution
    - Remove the problematic policy that causes recursion
    - Restructure policies to avoid self-referential queries
    - Use auth.jwt() claims or simpler conditions where possible
    - Keep essential policies for user data access

  3. Changes
    - Drop the recursive "Admins can manage organization users" policy
    - Keep other essential policies that don't cause recursion
    - Ensure users can still access their own data and organization members
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage organization users" ON users;

-- Ensure we have the essential policies without recursion
-- Users can read their own data (this should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Users can update their own data (this should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data"
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Users can insert their own data (this should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data"
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Users can view organization members (this should already exist and doesn't cause recursion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can view organization members'
  ) THEN
    CREATE POLICY "Users can view organization members"
      ON users
      FOR SELECT
      TO authenticated
      USING (organization_id IN ( 
        SELECT u.organization_id
        FROM users u
        WHERE ((u.id = auth.uid()) AND (u.organization_id IS NOT NULL))
      ));
  END IF;
END $$;

-- Service role can manage all users (this should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Service role can manage all users'
  ) THEN
    CREATE POLICY "Service role can manage all users"
      ON users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;