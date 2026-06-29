import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/services/settings';
import { getDomainBrand } from '@/lib/utils/getDomainBrand';
import { Metadata } from 'next';

export const revalidate = 300; // Cache redirect for 5 minutes

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  try {
    const brand = await getDomainBrand();
    const { slug } = await params;
    
    const { data: category } = await supabaseAdmin
      .from('categories')
      .select('id, name, description, image_url')
      .eq('slug', slug)
      .maybeSingle();

    if (!category) return {};

    const { data: seoMeta } = await supabaseAdmin
      .from('seo_meta')
      .select('*')
      .eq('entity_type', 'category')
      .eq('entity_id', category.id)
      .maybeSingle();

    const settings = await getSettings();
    const siteUrl = `${brand.protocol}://${brand.domain}`;

    const title = seoMeta?.seo_title || `${category.name} | ${brand.name}`;
    const description = seoMeta?.meta_description || category.description || '';
    const imageUrl = category.image_url || settings.logoUrl || settings.faviconUrl || '';

    return {
      metadataBase: new URL(siteUrl),
      title,
      description,
      alternates: {
        canonical: `${siteUrl}/category/${slug}`
      },
      openGraph: {
        title,
        description,
        images: [{ url: imageUrl }]
      }
    };
  } catch {
    return {
      title: 'Shop',
      description: 'Browse our products.',
    };
  }
}

export default async function CategoryRedirectPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  
  // Redirect to the shop page with the category filter applied
  redirect(`/shop?category=${resolvedParams.slug}`);
}
