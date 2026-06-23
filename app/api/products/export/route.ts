import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ExportBundle, ExportedProduct } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No product IDs provided' }, { status: 400 });
    }

    // Fetch store settings for store name
    const { data: settings } = await supabaseAdmin
      .from('store_settings')
      .select('store_name')
      .eq('id', '00000000-0000-4000-8000-000000000001')
      .single();
    const storeName = settings?.store_name || 'Zaynahs E-Store';

    // Fetch products with images, variants, modifiers
    // NOTE: Omit categories(*) join — it causes "ambiguous relationship" error because
    // products has both a category_id FK and a product_categories junction table.
    // Instead we resolve category info from the category_id field separately below.
    const { data: productsData, error } = await supabaseAdmin
      .from('products')
      .select('*, product_images(*), product_variants(*), product_modifiers(*)')
      .in('id', productIds);

    if (error) {
      console.error('[Export API] Error fetching products:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!productsData || productsData.length === 0) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    // Pre-fetch categories for all products in one batch query
    const categoryIds = [...new Set(productsData.map((p: any) => p.category_id).filter(Boolean))];
    const categoryMap: Record<string, { name: string; slug: string }> = {};
    if (categoryIds.length > 0) {
      const { data: catsData } = await supabaseAdmin
        .from('categories')
        .select('id, name, slug')
        .in('id', categoryIds);
      (catsData || []).forEach((cat: any) => {
        categoryMap[cat.id] = { name: cat.name, slug: cat.slug };
      });
    }

    const exportedProducts: ExportedProduct[] = [];

    for (const product of productsData) {
      // 1. Process product images and convert them to base64 data URLs
      const images = await Promise.all(
        (product.product_images || []).map(async (img: any) => {
          let dataUrl = '';
          let mimeType = 'image/webp';
          let fileSize = 0;
          let originalFilename = img.url.split('/').pop() || 'image.webp';

          try {
            const imageRes = await fetch(img.url);
            if (imageRes.ok) {
              const buffer = await imageRes.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              mimeType = imageRes.headers.get('content-type') || 'image/webp';
              dataUrl = `data:${mimeType};base64,${base64}`;
              fileSize = buffer.byteLength;
            } else {
              console.warn(`[Export API] Fetch failed for image ${img.url}: ${imageRes.statusText}`);
            }
          } catch (err) {
            console.error(`[Export API] Error fetching image URL ${img.url}:`, err);
          }

          // Fetch media_library metadata if available
          let alt = img.alt || '';
          let title = '';
          let description = '';
          let caption = '';

          try {
            const { data: media } = await supabaseAdmin
              .from('media_library')
              .select('*')
              .eq('file_url', img.url)
              .maybeSingle();

            if (media) {
              alt = media.alt_text || alt;
              title = media.title || '';
              description = media.description || '';
              caption = media.caption || '';
              originalFilename = media.original_filename || originalFilename;
              if (media.file_size) fileSize = Number(media.file_size);
              if (media.mime_type) mimeType = media.mime_type;
            }
          } catch (dbErr) {
            console.warn(`[Export API] Error fetching media_library metadata for ${img.url}:`, dbErr);
          }

          return {
            sortOrder: img.sort_order || 0,
            isPrimary: img.is_primary || false,
            alt,
            title,
            description,
            caption,
            dataUrl,
            mimeType,
            originalUrl: img.url,
            fileName: originalFilename,
            fileSize
          };
        })
      );

      // Filter out images that failed to fetch completely (dataUrl is empty)
      const validImages = images.filter(img => img.dataUrl);

      // 2. Process product variants and convert variant images to base64
      const variants = await Promise.all(
        (product.product_variants || []).map(async (v: any) => {
          let imageDataUrl = '';
          let imageMimeType = 'image/webp';

          if (v.image_url) {
            try {
              const varImgRes = await fetch(v.image_url);
              if (varImgRes.ok) {
                const buffer = await varImgRes.arrayBuffer();
                const base64 = Buffer.from(buffer).toString('base64');
                imageMimeType = varImgRes.headers.get('content-type') || 'image/webp';
                imageDataUrl = `data:${imageMimeType};base64,${base64}`;
              }
            } catch (err) {
              console.error(`[Export API] Error fetching variant image ${v.image_url}:`, err);
            }
          }

          return {
            color: v.color || undefined,
            size: v.size || undefined,
            material: v.material || undefined,
            customOption: v.custom_option || undefined,
            customValue: v.custom_value || undefined,
            colorHex: v.color_hex || undefined,
            price: v.price ? parseFloat(v.price.toString()) : undefined,
            comparePrice: v.compare_price ? parseFloat(v.compare_price.toString()) : undefined,
            stock: v.stock || 0,
            sku: v.sku || undefined,
            imageUrl: v.image_url || undefined,
            imageDataUrl: imageDataUrl || undefined,
            imageMimeType: imageDataUrl ? imageMimeType : undefined,
            showImageSwatch: v.show_image_swatch || false,
            active: v.active ?? true,
            sortOrder: v.sort_order || 0
          };
        })
      );

      // 3. Process modifiers
      const modifiers = (product.product_modifiers || []).map((m: any) => ({
        name: m.name,
        price: m.price ? parseFloat(m.price.toString()) : 0,
        active: m.active ?? true,
        sortOrder: m.sort_order || 0
      }));

      // 4. Resolve category from pre-fetched map (avoids ambiguous join)
      const cat = product.category_id ? categoryMap[product.category_id] : null;
      const categoryName = cat?.name;
      const categorySlug = cat?.slug;

      exportedProducts.push({
        name: product.name,
        slug: product.slug,
        description: product.description || undefined,
        shortDescription: product.short_description || undefined,
        price: product.price ? parseFloat(product.price.toString()) : 0,
        comparePrice: product.compare_price ? parseFloat(product.compare_price.toString()) : undefined,
        cost: product.cost ? parseFloat(product.cost.toString()) : undefined,
        sku: product.sku || undefined,
        stock: product.stock || 0,
        hasVariants: product.has_variants || false,
        isService: product.is_service || false,
        isFeatured: product.is_featured || false,
        active: product.active ?? true,
        enableSwatches: product.enable_swatches ?? true,
        showSwatchesOnArchive: product.show_swatches_on_archive ?? true,
        tags: product.tags || [],
        categoryName,
        categorySlug,
        images: validImages,
        variants,
        modifiers
      });
    }

    const bundle: ExportBundle = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeName,
      products: exportedProducts
    };

    return NextResponse.json(bundle);
  } catch (error: any) {
    console.error('[Export API] Failed to export products:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
