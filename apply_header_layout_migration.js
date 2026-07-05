const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: './.env.local' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('No database connection string found in env');
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const sql = `
      -- Swatches sizes migration
      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS archive_swatch_size TEXT DEFAULT 'md';
      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS product_swatch_size TEXT DEFAULT 'md';
      ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS archive_swatch_align TEXT DEFAULT 'left';

      -- Header layouts and styling migration
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
    `;
    
    console.log('Executing header layout SQL migrations...');
    await client.query(sql);
    console.log('Database migrations applied successfully');
  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
