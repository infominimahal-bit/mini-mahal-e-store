-- Migration to add trust badge toggles, social platforms, and editable footer columns to settings
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS trust_badge_1_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS trust_badge_2_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS trust_badge_3_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS trust_badge_4_enabled BOOLEAN DEFAULT true,

ADD COLUMN IF NOT EXISTS social_tiktok TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS social_snapchat TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS social_twitter TEXT DEFAULT '',

ADD COLUMN IF NOT EXISTS footer_col_1_title TEXT DEFAULT 'About Our Store',
ADD COLUMN IF NOT EXISTS footer_col_2_title TEXT DEFAULT 'Customer Support',
ADD COLUMN IF NOT EXISTS footer_col_2_text TEXT DEFAULT 'Call/WhatsApp: ' || CHR(10) || 'Email: ' || CHR(10) || 'Timings: 10 AM - 10 PM',
ADD COLUMN IF NOT EXISTS footer_col_3_title TEXT DEFAULT 'Quick Links',
ADD COLUMN IF NOT EXISTS footer_col_4_title TEXT DEFAULT 'Newsletter',
ADD COLUMN IF NOT EXISTS footer_col_4_text TEXT DEFAULT 'Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.';
