/*
  # Fix user signup constraints

  1. Schema Changes
    - Make `full_name` nullable to allow initial user creation via auth trigger
    - Ensure `organization_id` is nullable for initial signup
    - Keep other constraints intact for data integrity

  2. Security
    - Maintain existing RLS policies
    - No changes to authentication flow

  3. Notes
    - This allows the auth.users trigger to create basic user records
    - Application code will update these fields after organization creation
    - Existing data integrity is preserved
*/

-- Make full_name nullable to allow auth trigger to succeed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'full_name' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN full_name DROP NOT NULL;
  END IF;
END $$;

-- Ensure organization_id is nullable (should already be based on schema, but double-check)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'organization_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;
  END IF;
END $$;

-- Ensure email remains NOT NULL (should already be, but confirm)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'email' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE users ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;