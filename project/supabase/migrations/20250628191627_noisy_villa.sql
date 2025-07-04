/*
  # Add organization settings support

  1. Changes
    - Ensure organizations table has a settings JSONB column
    - Add default settings structure
    - Update existing organizations to have default settings

  2. Security
    - Maintain existing RLS policies
    - No changes to permissions
*/

-- Ensure settings column exists and has default value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE organizations ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- Update existing organizations to have default settings if they don't have any
UPDATE organizations 
SET settings = '{
  "default_tax_rate": 0,
  "default_terms_conditions": "",
  "default_payment_terms": "Net 30 Days",
  "default_quote_expiry_days": 30
}'::jsonb
WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Ensure the default is set for future records
ALTER TABLE organizations ALTER COLUMN settings SET DEFAULT '{
  "default_tax_rate": 0,
  "default_terms_conditions": "",
  "default_payment_terms": "Net 30 Days",
  "default_quote_expiry_days": 30
}'::jsonb;