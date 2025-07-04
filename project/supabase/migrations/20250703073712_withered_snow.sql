/*
  # Fix Organization Creation RLS Policies

  1. Security Changes
    - Remove conflicting INSERT policies on organizations table
    - Add a single, clear policy that allows authenticated users to create organizations
    - Ensure users can create organizations during signup and normal operation

  2. Changes Made
    - Drop existing conflicting INSERT policies
    - Create a unified policy for organization creation
    - Maintain existing SELECT and UPDATE policies
*/

-- Drop existing conflicting INSERT policies
DROP POLICY IF EXISTS "Allow organization creation during signup" ON organizations;
DROP POLICY IF EXISTS "Allow organization creation during signup and normal operation" ON organizations;

-- Create a single, clear INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow anonymous users to create organizations during signup
CREATE POLICY "Anonymous users can create organizations during signup"
  ON organizations
  FOR INSERT
  TO anon
  WITH CHECK (true);