import React from 'react';
import StoreFront from '@/components/store/StoreFront';
import { getProducts } from '@/lib/services/products';
import { getCategories } from '@/lib/services/categories';
import { getSettings } from '@/lib/services/settings';
import { getTopReviews } from '@/lib/services/reviews';
import { getHomepageSections } from '@/lib/services/sections';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getDomainBrand } from '@/lib/utils/getDomainBrand';
import { Metadata } from 'next';

export const revalidate = 86400; // 24 hours — webhooks purge on admin save

export async function generateMetadata(): Promise<Metadata> {
  try {
    const brand = await getDomainBrand();
    const settings = await getSettings();
    const siteUrl = settings?.storeUrl?.replace(/\/+$/, '') || process.env.NEXT_PUBLIC_SITE_URL || '';

    const banner = settings.bannerUrl || settings.logoUrl || settings.faviconUrl || '';
    const title = settings.metaTitle || `${brand.name} - ${brand.tagline}`;
    const desc = (settings.metaDescription || brand.tagline).slice(0, 160);

    return {
      metadataBase: new URL(siteUrl),
      title: {
        absolute: title
      },
      description: desc,
      alternates: { canonical: siteUrl },
      other: {
        'og:locale': 'en_US',
      },
      openGraph: {
        title: title,
        description: desc,
        url: siteUrl,
        siteName: brand.name,
        type: 'website',
        locale: 'en_US',
        images: [{ url: banner, width: 1200, height: 630, alt: brand.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title: title,
        description: desc,
        images: [banner],
        site: settings.twitter_handle || process.env.NEXT_PUBLIC_TWITTER_HANDLE || '',
        creator: settings.twitter_handle || process.env.NEXT_PUBLIC_TWITTER_HANDLE || '',
      }
    };
  } catch {
    return {
      title: 'Store',
      description: 'Premium online store.',
      openGraph: {
        type: 'website',
        title: 'Store',
        description: 'Premium online store.',
        images: [{ url: '/favicon.ico' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Store',
        description: 'Premium online store.',
        images: ['/favicon.ico'],
      }
    };
  }
}

export default async function CatalogPage() {
  const [products, categories, settings, reviews, sections] = await Promise.all([
    getProducts(),
    getCategories(),
    getSettings(),
    getTopReviews(3),
    getHomepageSections(true),
  ]);

  const { count: socialProofCount } = await supabaseAdmin
    .from('social_proof')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)
    .is('deleted_at', null);

  return (
    <StoreFront
      initialProducts={products}
      categories={categories}
      settings={settings}
      reviews={reviews}
      sections={sections}
      socialProofCount={socialProofCount ?? 0}
    />
  );
}
