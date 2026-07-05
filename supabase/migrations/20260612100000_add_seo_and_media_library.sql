-- Migration: Add Zaynahs SEO + AI System Tables
-- Date: 2026-06-12

-- 1. Create seo_meta table
CREATE TABLE IF NOT EXISTS seo_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'product'|'category'|'page'
  entity_id UUID NOT NULL,
  seo_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  secondary_keywords TEXT,
  lsi_tags TEXT,
  og_title TEXT,
  og_description TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  image_alt TEXT,
  long_description TEXT,
  faq_schema JSONB DEFAULT '[]'::jsonb,
  pinterest_description TEXT,
  is_optimized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for entity fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_meta_entity ON seo_meta (entity_type, entity_id);

-- 2. Create media_library table
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_filename TEXT,
  seo_filename TEXT,
  file_url TEXT NOT NULL,
  alt_text TEXT,
  title TEXT,
  description TEXT,
  caption TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_enabled BOOLEAN DEFAULT true,
  bucket TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_library_url ON media_library (file_url);

-- 3. Create ai_settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_provider TEXT DEFAULT 'groq',
  content_model TEXT DEFAULT 'llama-3.3-70b-versatile',
  content_keys TEXT DEFAULT '',
  vision_provider TEXT DEFAULT 'gemini',
  vision_model TEXT DEFAULT 'gemini-2.0-flash',
  vision_keys TEXT DEFAULT '',
  brand_name TEXT DEFAULT '',
  store_type TEXT DEFAULT 'General',
  target_market TEXT DEFAULT 'Pakistan',
  tone TEXT DEFAULT 'Professional',
  language TEXT DEFAULT 'English',
  custom_instructions TEXT DEFAULT '',
  auto_content_seo BOOLEAN DEFAULT true,
  auto_media_ai BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default singleton record if not exists
INSERT INTO ai_settings (id, content_provider, content_model, content_keys, vision_provider, vision_model, vision_keys, brand_name, store_type, target_market, tone, language, custom_instructions, auto_content_seo, auto_media_ai)
VALUES (
  '00000000-0000-4000-8000-000000000002', -- Singleton ID for AI Settings
  'groq',
  'llama-3.3-70b-versatile',
  '',
  'gemini',
  'gemini-2.0-flash',
  '',
  'Your Store',
  'General',
  'Pakistan',
  'Professional',
  'English',
  '',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 4. Slug Columns (if not exists)
-- NOTE: Slug columns already exist as normal TEXT NOT NULL UNIQUE on products and categories.
-- This ALTER is added for schema guide compliance, but will only execute if columns are missing.
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;

-- 5. Row Level Security (RLS)
ALTER TABLE seo_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies for seo_meta
CREATE POLICY "Public read seo_meta" ON seo_meta FOR SELECT USING (true);
CREATE POLICY "Admin all seo_meta" ON seo_meta FOR ALL USING (auth.role() = 'authenticated');

-- Policies for media_library
CREATE POLICY "Public read media_library" ON media_library FOR SELECT USING (true);
CREATE POLICY "Admin all media_library" ON media_library FOR ALL USING (auth.role() = 'authenticated');

-- Policies for ai_settings
CREATE POLICY "Admin read ai_settings" ON ai_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all ai_settings" ON ai_settings FOR ALL USING (auth.role() = 'authenticated');
