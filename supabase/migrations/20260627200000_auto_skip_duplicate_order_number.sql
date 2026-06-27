-- Auto-skip duplicate order_number if it already exists in orders table.
-- If TV-1454 already exists, auto-try TV-1455, TV-1456, ... until a free one is found.
-- Then sets next_order_sequence to continue from there.

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
  settings_id UUID;
  max_attempts INTEGER := 1000;
  attempt INTEGER := 0;
BEGIN
  SELECT id, order_prefix, next_order_sequence INTO settings_id, prefix, seq_val FROM store_settings FOR UPDATE;
  IF prefix IS NULL OR prefix = '' THEN
    prefix := 'ZE-';
  END IF;
  IF seq_val IS NULL THEN
    seq_val := 1;
  END IF;

  LOOP
    attempt := attempt + 1;
    IF attempt > max_attempts THEN
      RAISE EXCEPTION 'generate_order_number: could not find free order_number after % attempts', max_attempts;
    END IF;
    NEW.order_number := prefix || LPAD(seq_val::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE order_number = NEW.order_number);
    seq_val := seq_val + 1;
  END LOOP;

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
