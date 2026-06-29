import React from 'react';
import type { Metadata } from 'next';
import { getGlobalReviews } from '@/lib/services/reviews';
import { getSocialProofs } from '@/lib/services/socialProof';
import { getSettings } from '@/lib/services/settings';
import { getSiteUrl } from '@/lib/site-url-server';
import { getDomainConfig } from '@/lib/config/domains';
import { getDomainBrand } from '@/lib/utils/getDomainBrand';
import ReviewsPageClient from './ReviewsPageClient';

interface PageProps {
  searchParams: Promise<{ search?: string; rating?: string; sort?: string; page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const brand = await getDomainBrand();
    return {
      title: `Customer Reviews | ${brand.name}`,
      description: `Read authentic customer reviews and ratings at ${brand.name}. See what our customers are saying about our products.`,
    };
  } catch {
    return {
      title: 'Customer Reviews',
      description: 'Read authentic customer reviews and ratings.',
    };
  }
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const settings = await getSettings();
  const siteUrl = await getSiteUrl(settings);

  const { reviews, total } = await getGlobalReviews({
    search: sp.search,
    rating: sp.rating ? parseInt(sp.rating) : undefined,
    sort: (sp.sort as any) || 'newest',
    page: parseInt(sp.page || '1'),
    limit: 20,
  });

  const socialProofs = await getSocialProofs();

  const storeName = getDomainConfig(siteUrl || 'localhost:3000').name;

  const combinedTotal = total + socialProofs.length;

  // Generate JSON-LD aggregate schema
  const aggregateRating = reviews.length + socialProofs.length > 0
    ? {
        average: (reviews.reduce((sum, r) => sum + r.rating, 0) + socialProofs.length * 5) / (reviews.length + socialProofs.length),
        count: combinedTotal,
      }
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Customer Reviews | ${storeName}`,
    ...(aggregateRating && {
      review: {
        '@type': 'AggregateRating',
        ratingValue: aggregateRating.average.toFixed(1),
        reviewCount: aggregateRating.count,
        bestRating: 5,
        worstRating: 1,
      }
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReviewsPageClient
        initialReviews={reviews}
        initialTotal={total}
        initialSocialProofs={socialProofs}
        storeUrl={siteUrl}
      />
    </>
  );
}
