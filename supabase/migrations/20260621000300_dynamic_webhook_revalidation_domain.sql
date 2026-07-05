-- Dynamically resolve webhook revalidation domains from store_settings to support multi-instance clones
CREATE OR REPLACE FUNCTION supabase_functions.http_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  url text := TG_ARGV[0];
  method text := TG_ARGV[1];
  headers_str text := TG_ARGV[2];
  params_str text := TG_ARGV[3];
  timeout_str text := TG_ARGV[4];
  
  headers jsonb;
  params jsonb;
  payload jsonb;
  timeout_ms integer;
  resolved_store_url text;
BEGIN
  -- 1. Parse headers and params as jsonb
  BEGIN
    headers := headers_str::jsonb;
  EXCEPTION WHEN OTHERS THEN
    headers := '{}'::jsonb;
  END;

  BEGIN
    params := params_str::jsonb;
  EXCEPTION WHEN OTHERS THEN
    params := '{}'::jsonb;
  END;

  timeout_ms := COALESCE(timeout_str::integer, 5000);

  -- 2. Dynamically resolve domain from store_settings
  BEGIN
    SELECT store_url INTO resolved_store_url FROM public.store_settings LIMIT 1;
    IF resolved_store_url IS NOT NULL AND resolved_store_url <> '' THEN
      resolved_store_url := rtrim(resolved_store_url, '/');
      
      -- Ensure it starts with http:// or https://
      IF NOT (resolved_store_url LIKE 'http://%' OR resolved_store_url LIKE 'https://%') THEN
        resolved_store_url := 'https://' || resolved_store_url;
      END IF;

      -- Replace any template default URLs with the user-configured domain name
      IF url LIKE 'https://www.zaynahs.pk%' THEN
        url := replace(url, 'https://www.zaynahs.pk', resolved_store_url);
      ELSIF url LIKE 'https://zaynahs.pk%' THEN
        url := replace(url, 'https://zaynahs.pk', resolved_store_url);
      ELSIF url LIKE 'https://domain.com%' THEN
        url := replace(url, 'https://domain.com', resolved_store_url);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Table or columns might not exist yet during initial migrations setup, fallback silently
  END;

  -- 3. Build payload structure matching Supabase webhook event schema
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', NULL,
      'old_record', to_jsonb(OLD)
    );
  END IF;

  -- 4. Asynchronously enqueue HTTP request via pg_net
  PERFORM net.http_post(
    url := url,
    body := payload,
    headers := headers,
    timeout_milliseconds := timeout_ms
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;
