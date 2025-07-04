/*
  # Add INSERT policy for organizations table

  1. Security Changes
    - Add INSERT policy for authenticated users to create organizations
    - This allows users to create new organizations when they don't belong to any existing organization

  2. Policy Details
    - Policy name: "Authenticated users can create organizations"
    - Allows any authenticated user to insert new organization records
    - This is necessary for the organization creation flow in the application
*/

-- Add INSERT policy for organizations table
CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);