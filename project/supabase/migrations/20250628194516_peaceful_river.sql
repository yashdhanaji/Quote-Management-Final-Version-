/*
  # Multi-Organization Support Implementation

  1. New Tables
    - `organization_users` - Junction table for user-organization relationships
    - Update existing tables to support multi-org structure

  2. Schema Changes
    - Modify users table to remove direct organization_id reference
    - Add organization context management
    - Update RLS policies for multi-tenant security

  3. Security
    - Organization-scoped data access
    - Role-based permissions per organization
    - Complete data isolation between organizations
*/

-- Create organization_users junction table
CREATE TABLE IF NOT EXISTS organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS on organization_users
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

-- Create policies for organization_users
CREATE POLICY "Users can view their own organization memberships"
  ON organization_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage organization memberships"
  ON organization_users
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

CREATE POLICY "Service role can manage all organization memberships"
  ON organization_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS organization_users_user_id_idx ON organization_users(user_id);
CREATE INDEX IF NOT EXISTS organization_users_organization_id_idx ON organization_users(organization_id);
CREATE INDEX IF NOT EXISTS organization_users_role_idx ON organization_users(role);
CREATE INDEX IF NOT EXISTS organization_users_status_idx ON organization_users(status);

-- Migrate existing data from users table to organization_users
INSERT INTO organization_users (user_id, organization_id, role, status)
SELECT id, organization_id, role, 'active'
FROM users 
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Update users table - remove role and organization_id columns after migration
-- We'll keep them for now to ensure data integrity during transition
-- ALTER TABLE users DROP COLUMN IF EXISTS role;
-- ALTER TABLE users DROP COLUMN IF EXISTS organization_id;

-- Create function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_uuid uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  user_role text,
  user_status text,
  joined_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ou.organization_id,
    o.name as organization_name,
    ou.role as user_role,
    ou.status as user_status,
    ou.joined_at
  FROM organization_users ou
  JOIN organizations o ON ou.organization_id = o.id
  WHERE ou.user_id = user_uuid AND ou.status = 'active'
  ORDER BY ou.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has role in organization
CREATE OR REPLACE FUNCTION user_has_role_in_org(
  user_uuid uuid,
  org_uuid uuid,
  required_role text DEFAULT 'agent'
) RETURNS boolean AS $$
DECLARE
  user_role text;
  role_hierarchy integer;
  required_hierarchy integer;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO user_role
  FROM organization_users
  WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND status = 'active';
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Define role hierarchy (higher number = more permissions)
  role_hierarchy := CASE user_role
    WHEN 'admin' THEN 3
    WHEN 'manager' THEN 2
    WHEN 'agent' THEN 1
    ELSE 0
  END;
  
  required_hierarchy := CASE required_role
    WHEN 'admin' THEN 3
    WHEN 'manager' THEN 2
    WHEN 'agent' THEN 1
    ELSE 0
  END;
  
  RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for existing tables to use organization_users

-- Update quotes policies
DROP POLICY IF EXISTS "Users can view quotes from their organization" ON quotes;
DROP POLICY IF EXISTS "Users can create quotes in their organization" ON quotes;
DROP POLICY IF EXISTS "Users can update quotes in their organization" ON quotes;
DROP POLICY IF EXISTS "Users can delete quotes in their organization" ON quotes;

CREATE POLICY "Users can view quotes from their organizations"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create quotes in their organizations"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update quotes in their organizations"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete quotes in their organizations"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Update products policies
DROP POLICY IF EXISTS "Users can view products from their organization" ON products;
DROP POLICY IF EXISTS "Users can create products in their organization" ON products;
DROP POLICY IF EXISTS "Users can update products in their organization" ON products;
DROP POLICY IF EXISTS "Users can delete products in their organization" ON products;

CREATE POLICY "Users can view products from their organizations"
  ON products
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create products in their organizations"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update products in their organizations"
  ON products
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete products in their organizations"
  ON products
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Update clients policies
DROP POLICY IF EXISTS "Users can view clients from their organization" ON clients;
DROP POLICY IF EXISTS "Users can create clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON clients;

CREATE POLICY "Users can view clients from their organizations"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create clients in their organizations"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update clients in their organizations"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete clients in their organizations"
  ON clients
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Update organizations policies
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;

CREATE POLICY "Users can view their organizations"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can update their organizations"
  ON organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
    )
  );

-- Update quote_items policies
DROP POLICY IF EXISTS "Users can view quote items from their organization" ON quote_items;
DROP POLICY IF EXISTS "Users can create quote items in their organization" ON quote_items;
DROP POLICY IF EXISTS "Users can update quote items in their organization" ON quote_items;
DROP POLICY IF EXISTS "Users can delete quote items in their organization" ON quote_items;

CREATE POLICY "Users can view quote items from their organizations"
  ON quote_items
  FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can create quote items in their organizations"
  ON quote_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can update quote items in their organizations"
  ON quote_items
  FOR UPDATE
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can delete quote items in their organizations"
  ON quote_items
  FOR DELETE
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Update the user creation trigger to handle multi-org
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
    -- Use organization_id from metadata if provided
    org_id := (NEW.raw_user_meta_data->>'organization_id')::uuid;
  END IF;

  -- Create user record
  INSERT INTO users (
    id,
    email,
    full_name,
    is_active
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    true
  );

  -- Create organization membership if org_id exists
  IF org_id IS NOT NULL THEN
    INSERT INTO organization_users (
      user_id,
      organization_id,
      role,
      status
    ) VALUES (
      NEW.id,
      org_id,
      COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_users TO authenticated;
GRANT ALL ON organization_users TO service_role;
GRANT EXECUTE ON FUNCTION get_user_organizations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role_in_org(uuid, uuid, text) TO authenticated;