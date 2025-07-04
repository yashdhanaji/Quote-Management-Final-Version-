/*
  # Create users table and authentication setup

  1. New Tables
    - `users`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text, default 'admin')
      - `organization_id` (uuid, references organizations)
      - `is_active` (boolean, default true)
      - `last_login` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policies for authenticated users
    - Add foreign key constraints

  3. Functions
    - Create function to handle user creation on signup
    - Create trigger for automatic user creation
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Create organization if organization_name is provided
  IF NEW.raw_user_meta_data->>'organization_name' IS NOT NULL THEN
    INSERT INTO organizations (name)
    VALUES (NEW.raw_user_meta_data->>'organization_name')
    RETURNING id INTO org_id;
  ELSE
    -- Use default organization if no organization name provided
    SELECT id INTO org_id FROM organizations LIMIT 1;
  END IF;

  -- Create user record
  INSERT INTO users (
    id,
    email,
    full_name,
    role,
    organization_id
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'admin',
    org_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add foreign key constraint to products table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_organization_id_fkey'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint to clients table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_organization_id_fkey'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;