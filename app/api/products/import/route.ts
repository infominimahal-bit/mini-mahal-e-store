import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ExportBundle } from '@/lib/types';

const IMAGE_FETCH_TIMEOUT_MS = 15000; // 15 seconds per image

/**
 * Fetch with a timeout to prevent import from hanging on slow/dead image URLs.
 */
async function fetchWithTimeout(url: string, timeoutMs: number = IMAGE_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

const isOwnStorageUrl = (url: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;
  
  const cleanSupabase = supabaseUrl.replace(/^https?:\/\//, '').toLowerCase();
  const cleanUrl = url.replace(/^https?:\/\//, '').toLowerCase();
  
  return cleanUrl.startsWith(cleanSupabase) && cleanUrl.includes('/product-images/');
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const strategy = (formData.get('strategy') as 'skip' | 'overwrite' | 'rename') || 'skip';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const bundle = JSON.parse(text) as ExportBundle;

    if (!bundle || bundle.version !== '1.0' || !bundle.products || !Array.isArray(bundle.products)) {
      return NextResponse.json({ error: 'Invalid export file format' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Helper to send progress chunks
        const sendProgress = (result: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'));
        };

        // Notify client of start and total count
        sendProgress({ type: 'start', total: bundle.products.length });

        const categoryCache: Record<string, string> = {};

        for (const p of bundle.products) {
          try {
            // Check if product with the same slug already exists
            const { data: existing } = await supabaseAdmin
              .from('products')
              .select('id, name, slug')
              .eq('slug', p.slug)
              .maybeSingle();

            if (existing) {
              if (strategy === 'skip') {
                sendProgress({
                  success: true,
                  productName: p.name,
                  status: 'skipped',
                  message: `Product with slug "${p.slug}" already exists. Skipped.`
                });
                continue;
              }
            }

            // 1. Handle/Resolve Category (by slug)
            let categoryId = null;
            if (p.categorySlug) {
              if (categoryCache[p.categorySlug]) {
                categoryId = categoryCache[p.categorySlug];
              } else {
                const { data: cat } = await supabaseAdmin
                  .from('categories')
                  .select('id')
                  .eq('slug', p.categorySlug)
                  .maybeSingle();

                if (cat) {
                  categoryId = cat.id;
                  categoryCache[p.categorySlug] = cat.id;
                } else {
                  // Create category if it doesn't exist
                  const catData = p.categoryData || {
                    name: p.categoryName || 'Uncategorized',
                    slug: p.categorySlug,
                    active: true,
                    sortOrder: 0
                  };
                  const { data: newCat, error: catErr } = await supabaseAdmin
                    .from('categories')
                    .insert({
                      name: catData.name,
                      slug: catData.slug,
                      description: catData.description || null,
                      image_url: catData.imageUrl || null,
                      active: catData.active ?? true,
                      sort_order: catData.sortOrder || 0
                    })
                    .select('id')
                    .single();

                  if (catErr) {
                    console.error('[Import API] Failed to create category:', catErr);
                  } else if (newCat) {
                    categoryId = newCat.id;
                    categoryCache[p.categorySlug] = newCat.id;
                  }
                }
              }
            }

            let productId = '';
            let finalName = p.name;
            let finalSlug = p.slug;
            let statusAction: 'imported' | 'overwritten' = 'imported';

            if (existing) {
              if (strategy === 'overwrite') {
                productId = existing.id;
                statusAction = 'overwritten';

                // Delete variant, modifier, and category associations to prevent conflicts/duplicates
                await supabaseAdmin.from('product_images').delete().eq('product_id', productId);
                await supabaseAdmin.from('product_variants').delete().eq('product_id', productId);
                await supabaseAdmin.from('product_modifiers').delete().eq('product_id', productId);
                await supabaseAdmin.from('product_categories').delete().eq('product_id', productId);

                // Update existing product details
                const { error: updateErr } = await supabaseAdmin
                  .from('products')
                  .update({
                    name: p.name,
                    description: p.description || null,
                    short_description: p.shortDescription || null,
                    price: p.price,
                    compare_price: p.comparePrice || null,
                    cost: p.cost || null,
                    sku: p.sku || null,
                    stock: p.stock,
                    has_variants: p.hasVariants,
                    is_service: p.isService,
                    is_featured: p.isFeatured,
                    active: p.active,
                    enable_swatches: p.enableSwatches,
                    show_swatches_on_archive: p.showSwatchesOnArchive,
                    tags: p.tags,
                    category_id: categoryId,
                    deleted_at: null,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', productId);

                if (updateErr) throw updateErr;
              } else if (strategy === 'rename') {
                // Generate a unique name and slug
                let suffix = 1;
                finalSlug = `${p.slug}-${suffix}`;
                finalName = `${p.name} (Copy ${suffix})`;
                while (true) {
                  const { data: existsSlug } = await supabaseAdmin
                    .from('products')
                    .select('id')
                    .eq('slug', finalSlug)
                    .maybeSingle();
                  if (!existsSlug) break;
                  suffix++;
                  finalSlug = `${p.slug}-${suffix}`;
                  finalName = `${p.name} (Copy ${suffix})`;
                }

                const { data: newProd, error: insertErr } = await supabaseAdmin
                  .from('products')
                  .insert({
                    name: finalName,
                    slug: finalSlug,
                    description: p.description || null,
                    short_description: p.shortDescription || null,
                    price: p.price,
                    compare_price: p.comparePrice || null,
                    cost: p.cost || null,
                    sku: p.sku || null,
                    stock: p.stock,
                    has_variants: p.hasVariants,
                    is_service: p.isService,
                    is_featured: p.isFeatured,
                    active: p.active,
                    enable_swatches: p.enableSwatches,
                    show_swatches_on_archive: p.showSwatchesOnArchive,
                    tags: p.tags,
                    category_id: categoryId
                  })
                  .select('id')
                  .single();

                if (insertErr) throw insertErr;
                productId = newProd.id;
              }
            } else {
              // Insert a new product
              const { data: newProd, error: insertErr } = await supabaseAdmin
                .from('products')
                .insert({
                  name: p.name,
                  slug: p.slug,
                  description: p.description || null,
                  short_description: p.shortDescription || null,
                  price: p.price,
                  compare_price: p.comparePrice || null,
                  cost: p.cost || null,
                  sku: p.sku || null,
                  stock: p.stock,
                  has_variants: p.hasVariants,
                  is_service: p.isService,
                  is_featured: p.isFeatured,
                  active: p.active,
                  enable_swatches: p.enableSwatches,
                  show_swatches_on_archive: p.showSwatchesOnArchive,
                  tags: p.tags,
                  category_id: categoryId
                })
                .select('id')
                .single();

              if (insertErr) throw insertErr;
              productId = newProd.id;
            }

            // 2. Upload Product-level images
            const uploadedUrlsMap: Record<string, string> = {};

            for (let i = 0; i < (p.images || []).length; i++) {
              const img = p.images[i];
              try {
                let publicUrl = '';

                if (img.originalUrl && isOwnStorageUrl(img.originalUrl)) {
                  // The image is already hosted in our own storage. Reuse it.
                  publicUrl = img.originalUrl;
                  
                  // Ensure it exists in media_library
                  const { data: existingMedia } = await supabaseAdmin
                    .from('media_library')
                    .select('id')
                    .eq('file_url', publicUrl)
                    .maybeSingle();
                    
                  if (!existingMedia) {
                    await supabaseAdmin
                      .from('media_library')
                      .insert({
                        original_filename: img.fileName || `${p.slug}-${i}.webp`,
                        file_url: publicUrl,
                        alt_text: img.alt || p.name,
                        title: img.title || p.name,
                        description: img.description || '',
                        caption: img.caption || '',
                        bucket: 'product-images',
                        ai_generated: img.aiGenerated || false,
                        ai_enabled: img.aiEnabled ?? true,
                        file_size: img.fileSize || 0,
                        mime_type: img.mimeType || 'image/webp'
                      });
                  }
                } else if (img.originalUrl) {
                  // Fetch the external image to our bucket
                  const imageRes = await fetchWithTimeout(img.originalUrl);
                  if (!imageRes.ok) throw new Error('Failed to fetch image from URL');
                  
                  const arrayBuffer = await imageRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  
                  const mimeType = imageRes.headers.get('content-type') || 'image/webp';
                  const sanitizedProdName = finalName
                    .replace(/[^a-zA-Z0-9-_\s]/g, '')
                    .trim()
                    .replace(/\s+/g, '-')
                    .toLowerCase();
                  const timestamp = Date.now();
                  const extension = mimeType.split('/').pop() || 'webp';
                  const fileName = `products/${productId}/${sanitizedProdName}-${timestamp}-${i}.${extension}`;

                  // Upload file to Supabase storage
                  const { error: uploadError } = await supabaseAdmin.storage
                    .from('product-images')
                    .upload(fileName, buffer, {
                      contentType: mimeType,
                      cacheControl: 'public, max-age=31536000',
                      upsert: true
                    });

                  if (uploadError) throw uploadError;

                  // Get public URL
                  const { data: pubUrlData } = supabaseAdmin.storage
                    .from('product-images')
                    .getPublicUrl(fileName);
                  publicUrl = pubUrlData.publicUrl;

                  // Insert into media_library
                  await supabaseAdmin
                    .from('media_library')
                    .insert({
                      original_filename: img.fileName || `${sanitizedProdName}-${i}.${extension}`,
                      seo_filename: fileName.split('/').pop(),
                      file_url: publicUrl,
                      alt_text: img.alt || finalName,
                      title: img.title || finalName,
                      description: img.description || '',
                      caption: img.caption || '',
                      bucket: 'product-images',
                      ai_generated: img.aiGenerated || false,
                      ai_enabled: img.aiEnabled ?? true,
                      file_size: img.fileSize || buffer.length,
                      mime_type: mimeType
                    });
                } else {
                  continue;
                }

                if (img.originalUrl) {
                  uploadedUrlsMap[img.originalUrl] = publicUrl;
                }

                // Link to product
                await supabaseAdmin
                  .from('product_images')
                  .insert({
                    product_id: productId,
                    url: publicUrl,
                    alt: img.alt || finalName,
                    sort_order: img.sortOrder || 0,
                    is_primary: img.isPrimary || false
                  });
              } catch (imgErr) {
                console.error(`[Import API] Failed to process image ${i} for ${finalName}:`, imgErr);
              }
            }

            // 3. Upload variant images & Insert Variants
            for (const v of (p.variants || [])) {
              let varImageUrl = v.imageUrl || null;

              if (v.imageUrl && uploadedUrlsMap[v.imageUrl]) {
                // Reuse the product-level image that was already uploaded/processed
                varImageUrl = uploadedUrlsMap[v.imageUrl];
              } else if (v.imageUrl && isOwnStorageUrl(v.imageUrl)) {
                // Image is already hosted in our own storage
                varImageUrl = v.imageUrl;

                // Ensure it exists in media_library
                const { data: existingMedia } = await supabaseAdmin
                  .from('media_library')
                  .select('id')
                  .eq('file_url', varImageUrl)
                  .maybeSingle();
                  
                if (!existingMedia) {
                  const optString = [v.color, v.size, v.material].filter(Boolean).join('-') || 'var';
                  await supabaseAdmin
                    .from('media_library')
                    .insert({
                      original_filename: `${p.slug}-variant-${optString}.webp`,
                      file_url: varImageUrl,
                      alt_text: `${finalName} Variant`,
                      title: `${finalName} Variant`,
                      bucket: 'product-images',
                      ai_generated: v.aiGenerated || false,
                      ai_enabled: v.aiEnabled ?? true,
                      file_size: 0,
                      mime_type: 'image/webp'
                    });
                }
              } else if (v.imageUrl) {
                try {
                  const varImgRes = await fetchWithTimeout(v.imageUrl);
                  if (varImgRes.ok) {
                    const arrayBuffer = await varImgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const mimeType = varImgRes.headers.get('content-type') || 'image/webp';

                    const varExtension = mimeType.split('/').pop() || 'webp';
                    const timestamp = Date.now();
                    const optString = [v.color, v.size, v.material].filter(Boolean).join('-') || 'var';
                    const fileName = `products/${productId}/variants/${optString}-${timestamp}.${varExtension}`;

                    // Upload to Storage
                    const { error: uploadError } = await supabaseAdmin.storage
                      .from('product-images')
                      .upload(fileName, buffer, {
                        contentType: mimeType,
                        cacheControl: 'public, max-age=31536000',
                        upsert: true
                      });

                    if (uploadError) throw uploadError;

                    // Get URL
                    const { data: pubUrlData } = supabaseAdmin.storage
                      .from('product-images')
                      .getPublicUrl(fileName);
                    varImageUrl = pubUrlData.publicUrl;

                    // Insert into media_library
                    await supabaseAdmin
                      .from('media_library')
                      .insert({
                        original_filename: `${p.slug}-variant-${optString}.${varExtension}`,
                        seo_filename: fileName.split('/').pop(),
                        file_url: varImageUrl,
                        alt_text: `${finalName} Variant`,
                        title: `${finalName} Variant`,
                        bucket: 'product-images',
                        ai_generated: v.aiGenerated || false,
                        ai_enabled: v.aiEnabled ?? true,
                        file_size: buffer.length,
                        mime_type: mimeType
                      });
                  }
                } catch (varImgErr) {
                  console.error(`[Import API] Failed to upload variant image for ${finalName}:`, varImgErr);
                }
              }

              // Insert variant record
              await supabaseAdmin
                .from('product_variants')
                .insert({
                  product_id: productId,
                  color: v.color || null,
                  size: v.size || null,
                  material: v.material || null,
                  custom_option: v.customOption || null,
                  custom_value: v.customValue || null,
                  color_hex: v.colorHex || null,
                  price: v.price || null,
                  compare_price: v.comparePrice || null,
                  stock: v.stock || 0,
                  sku: v.sku || null,
                  image_url: varImageUrl,
                  show_image_swatch: v.showImageSwatch || false,
                  active: v.active ?? true,
                  sort_order: v.sortOrder || 0
                });
            }

            // 4. Insert Modifiers
            for (const m of (p.modifiers || [])) {
              await supabaseAdmin
                .from('product_modifiers')
                .insert({
                  product_id: productId,
                  name: m.name,
                  price: m.price,
                  active: m.active ?? true,
                  sort_order: m.sortOrder || 0
                });
            }

            // 5. Create product_categories junction records for all categories
            const categoryIdsToLink: string[] = [];
            
            // Add primary category if set
            if (categoryId) {
              categoryIdsToLink.push(categoryId);
            }

            // Process multi-category array from export bundle
            if (p.categories && Array.isArray(p.categories)) {
              for (const catItem of p.categories) {
                if (!catItem.slug || catItem.slug === 'shop') continue;
                
                // Check cache first
                if (categoryCache[catItem.slug]) {
                  const cachedId = categoryCache[catItem.slug];
                  if (!categoryIdsToLink.includes(cachedId)) {
                    categoryIdsToLink.push(cachedId);
                  }
                  continue;
                }

                // Resolve or create category
                const { data: existingCat } = await supabaseAdmin
                  .from('categories')
                  .select('id')
                  .eq('slug', catItem.slug)
                  .maybeSingle();

                if (existingCat) {
                  categoryCache[catItem.slug] = existingCat.id;
                  if (!categoryIdsToLink.includes(existingCat.id)) {
                    categoryIdsToLink.push(existingCat.id);
                  }
                } else {
                  // Create the category
                  const { data: newCat, error: catCreateErr } = await supabaseAdmin
                    .from('categories')
                    .insert({
                      name: catItem.name,
                      slug: catItem.slug,
                      description: catItem.description || null,
                      image_url: catItem.imageUrl || null,
                      active: catItem.active ?? true,
                      sort_order: catItem.sortOrder || 0
                    })
                    .select('id')
                    .single();

                  if (!catCreateErr && newCat) {
                    categoryCache[catItem.slug] = newCat.id;
                    if (!categoryIdsToLink.includes(newCat.id)) {
                      categoryIdsToLink.push(newCat.id);
                    }
                  } else {
                    console.error(`[Import API] Failed to create category '${catItem.slug}':`, catCreateErr);
                  }
                }
              }
            }

            // Always include the system "shop" category
            const SHOP_CATEGORY_ID = '00000000-0000-4000-8000-000000000099';
            if (!categoryIdsToLink.includes(SHOP_CATEGORY_ID)) {
              categoryIdsToLink.push(SHOP_CATEGORY_ID);
            }

            // Insert junction records (skip duplicates with upsert-like pattern)
            if (categoryIdsToLink.length > 0) {
              const junctionRows = categoryIdsToLink.map(catId => ({
                product_id: productId,
                category_id: catId
              }));

              // Use onConflict to avoid duplicate key errors
              const { error: junctionErr } = await supabaseAdmin
                .from('product_categories')
                .upsert(junctionRows, { onConflict: 'product_id,category_id', ignoreDuplicates: true });

              if (junctionErr) {
                console.error(`[Import API] Failed to insert product_categories for ${finalName}:`, junctionErr);
              }
            }

            // Success progress push
            sendProgress({
              success: true,
              productName: finalName,
              status: statusAction,
              message: `Product "${finalName}" imported successfully.`
            });

          } catch (prodErr: any) {
            console.error(`[Import API] Failed to import product "${p.name}":`, prodErr);
            sendProgress({
              success: false,
              productName: p.name,
              status: 'error',
              error: prodErr.message || 'Unknown database write error'
            });
          }
        }

        // Close stream
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('[Import API] Import process crashed:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}
