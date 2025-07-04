/*
  # Fix authentication user creation issue

  1. Problem
    - The users table has a foreign key constraint to auth.users(id) ON DELETE CASCADE
    - This is causing issues during user signup because Supabase auth tries to create the auth.users record first
    - But our custom users table constraint is interfering with this process

  2. Solution
    - Remove the problematic foreign key constraint
    - The auth.users table is managed by Supabase internally
    - We should not have foreign key constraints pointing to it
    - Instead, we'll rely on triggers or application logic to maintain data consistency

  3. Changes
    - Drop the foreign key constraint from users table to auth.users
    - Keep the users table structure intact for application data
*/

-- Drop the problematic foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Ensure RLS is properly configured for the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to use auth.uid() instead of uid()
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Add a policy for inserting new users (needed during signup)
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);