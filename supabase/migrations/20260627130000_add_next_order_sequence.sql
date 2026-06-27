-- Add next_order_sequence to store_settings + rewrite trigger to use it
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS next_order_sequence INTEGER DEFAULT 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
BEGIN
  SELECT order_prefix, next_order_sequence INTO prefix, seq_val FROM store_settings LIMIT 1;
  IF prefix IS NULL OR prefix = '' THEN
    prefix := 'ZE-';
  END IF;
  IF seq_val IS NULL THEN
    seq_val := 1;
  END IF;
  NEW.order_number := prefix || LPAD(seq_val::TEXT, 4, '0');
  UPDATE store_settings SET next_order_sequence = seq_val + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
