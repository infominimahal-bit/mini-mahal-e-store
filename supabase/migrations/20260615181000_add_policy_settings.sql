-- Migration: Add privacy policy content and individual show/hide visibility controls for FAQ, Returns, and Privacy Policy on Navbar and Footer.
ALTER TABLE store_settings 
  ADD COLUMN IF NOT EXISTS privacy_policy_content TEXT DEFAULT '<h3>Privacy Policy</h3><p>We are committed to maintaining the trust and confidence of our visitors and customers. Read our privacy policy to understand how we collect, use, and protect your personal data.</p>',
  ADD COLUMN IF NOT EXISTS show_faq_in_nav BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_returns_in_nav BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_privacy_in_nav BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_faq_in_footer BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_returns_in_footer BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_privacy_in_footer BOOLEAN DEFAULT true;
