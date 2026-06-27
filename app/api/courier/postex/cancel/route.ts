import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const POSTEX_HOST = 'https://api.postex.pk';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('tracking_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const tn = order.tracking_number;
    if (!tn) {
      return NextResponse.json({ success: false, error: 'Order has no tracking number to cancel' }, { status: 200 });
    }

    const { data: s } = await supabaseAdmin
      .from('store_settings')
      .select('postex_api_token, postex_mode')
      .single();

    const token = s?.postex_api_token;
    if (!token) {
      return NextResponse.json({ success: false, error: 'PostEx is not configured' }, { status: 200 });
    }

    const baseUrl = s?.postex_mode === 'production' ? POSTEX_HOST : 'https://staging-api.postex.pk';

    const res = await fetch(`${baseUrl}/services/integration/api/order/v1/cancel-order`, {
      method: 'PUT',
      headers: {
        token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trackingNumber: tn }),
    });

    const data = await res.json();
    const ok = data.statusCode === 200 || data.statusCode === '200' || data.statusCode === '0200';

    if (ok) {
      return NextResponse.json({ success: true, message: `Shipment ${tn} cancelled on PostEx` });
    }

    return NextResponse.json({
      success: false,
      error: data.statusMessage || data.message || 'PostEx cancel failed',
      details: data,
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Cancel failed' }, { status: 200 });
  }
}
