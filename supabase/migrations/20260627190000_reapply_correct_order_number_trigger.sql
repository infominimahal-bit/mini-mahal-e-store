-- Re-apply the CORRECT generate_order_number() trigger function
-- This ensures any previous buggy version (e.g. from 20260627120000)
-- which set order_number = prefix only (no sequence) is overwritten.
-- 
-- Correct behavior:
-- 1. SECURITY DEFINER: anon users can place orders (trigger needs UPDATE on store_settings)
-- 2. FOR UPDATE: row-level lock prevents race conditions between concurrent orders
-- 3. WHERE id = : satisfies Supabase safe update mode
-- 4. Combines prefix + padded sequence for unique order_number

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
  settings_id UUID;
BEGIN
  SELECT id, order_prefix, next_order_sequence INTO settings_id, prefix, seq_val FROM store_settings FOR UPDATE;
  IF prefix IS NULL OR prefix = '' THEN
    prefix := 'ZE-';
  END IF;
  IF seq_val IS NULL THEN
    seq_val := 1;
  END IF;
  NEW.order_number := prefix || LPAD(seq_val::TEXT, 4, '0');
  UPDATE store_settings SET next_order_sequence = seq_val + 1 WHERE id = settings_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
  EXECUTE FUNCTION generate_order_number();
