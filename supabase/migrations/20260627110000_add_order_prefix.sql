-- Add order_prefix to store_settings
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS order_prefix TEXT DEFAULT 'ZE-';

-- Update trigger to read prefix dynamically from settings
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
BEGIN
  SELECT COALESCE(order_prefix, 'ZE-') INTO prefix FROM store_settings LIMIT 1;
  NEW.order_number := prefix || LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
