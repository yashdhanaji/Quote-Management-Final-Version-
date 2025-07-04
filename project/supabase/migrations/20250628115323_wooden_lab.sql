/*
  # Create quotes and quote_items tables

  1. New Tables
    - `quotes`
      - `id` (uuid, primary key)
      - `quote_number` (text, unique)
      - `client_id` (uuid, foreign key to clients)
      - `status` (text, enum-like)
      - `subtotal` (numeric)
      - `discount_amount` (numeric)
      - `tax_amount` (numeric)
      - `total_amount` (numeric)
      - `valid_until` (date)
      - `terms_conditions` (text)
      - `notes` (text)
      - `created_by` (uuid, foreign key to users)
      - `approved_by` (uuid, foreign key to users)
      - `sent_at` (timestamp)
      - `organization_id` (uuid, foreign key to organizations)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `quote_items`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to quotes)
      - `product_id` (uuid, foreign key to products)
      - `quantity` (integer)
      - `unit_price` (numeric)
      - `discount_percent` (numeric)
      - `tax_amount` (numeric)
      - `total_amount` (numeric)

  2. Security
    - Enable RLS on both tables
    - Add policies for organization-based access
*/

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'sent')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  valid_until date NOT NULL,
  terms_conditions text,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  sent_at timestamptz,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote_items table
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  discount_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  tax_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Users can view quotes from their organization"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create quotes in their organization"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update quotes in their organization"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quotes in their organization"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Create policies for quote_items
CREATE POLICY "Users can view quote items from their organization"
  ON quote_items
  FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create quote items in their organization"
  ON quote_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update quote items in their organization"
  ON quote_items
  FOR UPDATE
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete quote items in their organization"
  ON quote_items
  FOR DELETE
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS quotes_organization_id_idx ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS quotes_client_id_idx ON quotes(client_id);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);
CREATE INDEX IF NOT EXISTS quotes_created_at_idx ON quotes(created_at);
CREATE INDEX IF NOT EXISTS quote_items_quote_id_idx ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS quote_items_product_id_idx ON quote_items(product_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quotes table
DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();