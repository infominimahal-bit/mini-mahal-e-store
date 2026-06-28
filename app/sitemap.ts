import { MetadataRoute } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/services/settings';
import { getSiteUrl } from '@/lib/site-url-server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let siteUrl = '';
  try {
    const settings = await getSettings();
    siteUrl = await getSiteUrl(settings);
  } catch (e) {
    console.warn('Failed to load settings in sitemap:', e);
  }

  // 1. Fetch products and categories
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('slug, updated_at, name')
    .is('deleted_at', null)
    .eq('is_active', true);

  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('slug, updated_at')
    .eq('active', true);

  // 2. Base static routes
  const staticPages = [
    { path: '', priority: 1.0, freq: 'daily' as const },
    { path: '/faq', priority: 0.5, freq: 'monthly' as const },
    { path: '/returns', priority: 0.5, freq: 'monthly' as const },
    { path: '/contact', priority: 0.5, freq: 'monthly' as const },
    { path: '/privacy-policy', priority: 0.3, freq: 'monthly' as const },
    { path: '/wishlist', priority: 0.4, freq: 'weekly' as const },
  ];

  const routes: MetadataRoute.Sitemap = staticPages.map((p) => ({
    url: `${siteUrl}${p.path}`,
    lastModified: new Date(),
    changeFrequency: p.freq,
    priority: p.priority,
  }));

  // 3. Add products
  if (products) {
    products.forEach((p) => {
      routes.push({
        url: `${siteUrl}/product/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      });
    });
  }

  // 4. Add categories (filtering via shop page as per Rule #0)
  if (categories) {
    categories.forEach((c) => {
      routes.push({
        url: `${siteUrl}/shop?category=${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });
  }

  return routes;
}
