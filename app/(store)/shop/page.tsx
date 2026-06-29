import React from 'react';
import ShopPage from '@/components/store/ShopPage';
import { getProducts } from '@/lib/services/products';
import { getCategories, getCategoryBySlug } from '@/lib/services/categories';
import { getSettings } from '@/lib/services/settings';
import { getDomainBrand } from '@/lib/utils/getDomainBrand';
import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 3600; // 1 hour ISR — webhooks purge on admin save

interface PageProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  try {
    const brand = await getDomainBrand();
    const { category: categorySlug } = await searchParams;
    const settings = await getSettings();
    const siteUrl = settings?.storeUrl?.replace(/\/+$/, '') || process.env.NEXT_PUBLIC_SITE_URL || '';

    let title = `Shop Products | ${brand.name}`;
    let description = (settings.metaDescription || brand.tagline).slice(0, 160);
    let imageUrl = settings.logoUrl || settings.faviconUrl || '';
    let canonicalUrl = `${siteUrl}/shop`;

    if (categorySlug) {
      const category = await getCategoryBySlug(categorySlug);
      if (category) {
        const { data: seoMeta } = await supabaseAdmin
          .from('seo_meta')
          .select('*')
          .eq('entity_type', 'category')
          .eq('entity_id', category.id)
          .maybeSingle();

        title = seoMeta?.seo_title || `${category.name} | ${brand.name}`;
        description = seoMeta?.meta_description || category.description || `Explore our ${category.name} collection at ${brand.name}.`;
        imageUrl = category.imageUrl || imageUrl;
        canonicalUrl = `${siteUrl}/shop?category=${categorySlug}`;
      }
    }

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'website',
        images: [{ url: imageUrl }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      }
    };
  } catch {
    return {
      title: 'Shop',
      description: 'Browse our products.',
    };
  }
}

export default async function StoreShopPage({ searchParams }: PageProps) {
  const { category: categorySlug } = await searchParams;
  
  const [products, categories, settings] = await Promise.all([
    getProducts(),
    getCategories(),
    getSettings()
  ]);

  let faqSchema: any = null;
  if (categorySlug) {
    const category = categories.find(c => c.slug === categorySlug);
    if (category) {
      const { data: seoMeta } = await supabaseAdmin
        .from('seo_meta')
        .select('faq_schema')
        .eq('entity_type', 'category')
        .eq('entity_id', category.id)
        .maybeSingle();

      if (seoMeta?.faq_schema && Array.isArray(seoMeta.faq_schema) && seoMeta.faq_schema.length > 0) {
        faqSchema = {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": seoMeta.faq_schema.map((item: any) => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": item.a
            }
          }))
        };
      }
    }
  }

  return (
    <>
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <ShopPage
        initialProducts={products}
        categories={categories}
        settings={settings}
      />
    </>
  );
}

