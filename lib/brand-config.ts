export interface BrandConfig {
  name: string;
  tagline: string;
}

export function getBrandConfig(_hostOrUrl: string): BrandConfig | null {
  const name = process.env.NEXT_PUBLIC_BRAND_NAME || 'Your Store';
  const tagline = process.env.NEXT_PUBLIC_BRAND_TAGLINE || 'Your Online Store';
  return { name, tagline };
}
