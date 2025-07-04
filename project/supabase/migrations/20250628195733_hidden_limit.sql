/*
  # Fix Organization Insert Policy

  1. Security Updates
    - Drop existing INSERT policy for organizations
    - Create new INSERT policy that properly allows authenticated users to create organizations
    - Ensure the policy checks for authenticated users correctly

  2. Changes
    - Remove the existing "Authenticated users can create organizations" policy
    - Add a new policy with proper authentication check using auth.uid()
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Create a new INSERT policy that properly allows authenticated users
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);