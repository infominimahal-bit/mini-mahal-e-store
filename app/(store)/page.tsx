import React from 'react';
import StoreFront from '@/components/store/StoreFront';
import { getProducts } from '@/lib/services/products';
import { getCategories } from '@/lib/services/categories';
import { getSettings } from '@/lib/services/settings';
import { getTopReviews } from '@/lib/services/reviews';
import { getTopSocialProofs } from '@/lib/services/socialProof';
import { getHomepageSections } from '@/lib/services/sections';
import { SocialProof } from '@/lib/types';

import { getSiteUrl } from '@/lib/site-url-server';
import { Metadata } from 'next';

export const revalidate = 86400; // 24 hours — webhooks purge on admin save

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettings();
    const siteUrl = await getSiteUrl(settings);

    const brandName = settings.storeName || process.env.NEXT_PUBLIC_BRAND_NAME || 'Zaynahs E-Store';
    const tagline = settings.tagline || 'Premium Mobile Shop';
    const banner = settings.bannerUrl || settings.logoUrl || settings.faviconUrl || '';

    // Respect custom metaTitle or default to "StoreName - Tagline"
    const title = settings.metaTitle || `${brandName} - ${tagline}`;

    // Respect custom metaDescription or fallback to tagline or default text
    const desc = (settings.metaDescription || settings.tagline || 'Premium Pakistani E-Commerce Store').slice(0, 160);

    return {
      metadataBase: new URL(siteUrl),
      title: title,
      description: desc,
      openGraph: {
        title: title,
        description: desc,
        images: [{ url: banner }],
      },
      twitter: {
        title: title,
        description: desc,
        images: [banner],
      }
    };
  } catch (err) {
    return {
      title: 'Zaynahs E-Store'
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

  let socialProofs: SocialProof[] = [];
  try {
    const timeoutPromise = new Promise<[]>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    );
    socialProofs = await Promise.race([
      getTopSocialProofs(3),
      timeoutPromise,
    ]);
  } catch {
    // social proofs non-critical — silently skip
  }

  return (
    <StoreFront
      initialProducts={products}
      categories={categories}
      settings={settings}
      reviews={reviews}
      socialProofs={socialProofs}
      sections={sections}
    />
  );
}
