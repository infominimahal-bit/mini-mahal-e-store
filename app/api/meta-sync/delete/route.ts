import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncProductToMeta } from '@/lib/meta/syncProduct';
import { getProductById } from '@/lib/services/products';

/**
 * POST endpoint to trigger a Meta Catalog DELETE sync for a soft-deleted product.
 * Called from the client deleteProduct flow as a safety net for webhook-based sync.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate admin session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    // Fetch the product (even if soft-deleted, we need its data for Meta sync)
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Call syncProductToMeta with DELETE action
    const result = await syncProductToMeta(product, 'DELETE');

    if (!result.success) {
      console.error('[Meta Delete Sync] Failed:', result.error);
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Meta Delete Sync] Internal error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
