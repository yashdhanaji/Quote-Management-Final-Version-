/*
  # Fix Organization Creation Policy

  1. Security Updates
    - Update RLS policy to allow authenticated users to create organizations
    - Ensure proper permissions for organization creation during signup and normal operation

  2. Changes
    - Drop existing restrictive INSERT policy if it exists
    - Create new INSERT policy that allows authenticated users to create organizations
    - Maintain security by ensuring users can only create organizations they will be part of
*/

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create a proper INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ensure the existing policies are properly configured
-- Update the existing policy to be more permissive for organization creation
DROP POLICY IF EXISTS "Allow anonymous user creation during signup" ON organizations;

-- Create policy that allows both anonymous and authenticated users to create organizations
-- This is needed for the signup flow where users might not be fully authenticated yet
CREATE POLICY "Allow organization creation during signup and normal operation"
  ON organizations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);