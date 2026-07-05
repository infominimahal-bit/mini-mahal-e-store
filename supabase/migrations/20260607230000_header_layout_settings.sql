-- Alter store_settings to support header layouts, contacts, newsletter announcement, and styling customization
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_show_top_bar BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_top_bar_phone TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_top_bar_email TEXT DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_show_newsletter BOOLEAN DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_newsletter_text TEXT DEFAULT 'Summer sale discount off 50%. Shop Sale';

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_top_bar_bg TEXT DEFAULT '#d97706';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_top_bar_text_color TEXT DEFAULT '#ffffff';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_bg TEXT DEFAULT '#ffffff';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_text_color TEXT DEFAULT '#1a1a2e';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_border_color TEXT DEFAULT '#e5e7eb';

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_desktop_logo_align TEXT DEFAULT 'left';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_desktop_search_align TEXT DEFAULT 'right';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_desktop_wishlist_align TEXT DEFAULT 'right';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_desktop_cart_align TEXT DEFAULT 'right';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_desktop_theme_align TEXT DEFAULT 'right';

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_mobile_logo_align TEXT DEFAULT 'center';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_mobile_menu_align TEXT DEFAULT 'left';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_mobile_search_align TEXT DEFAULT 'right';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_mobile_cart_align TEXT DEFAULT 'right';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS header_mobile_wishlist_align TEXT DEFAULT 'hidden';
