import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cleanWhatsAppPhone, formatPrice } from '@/lib/utils/whatsapp';
import { sendTemplatedEmail } from '@/lib/email/sendTemplatedEmail';
import { renderOrderItemsTable } from '@/lib/email/variables';

const POSTEX_BASE = 'https://api.postex.pk/services/integration/api';
const POSTEX_STAGING = 'https://staging-api.postex.pk/services/integration/api';

function cleanPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) {
    digits = '0' + digits.substring(2);
  }
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = '0' + digits;
  }
  return digits;
}

function toInternationalPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  } else if (clean.startsWith('3') && clean.length === 10) {
    clean = '92' + clean;
  } else if (clean.startsWith('922') && clean.length === 11) {
    clean = '9232' + clean.slice(3);
  } else if (clean.startsWith('920') && clean.length === 13) {
    clean = '92' + clean.slice(3);
  }
  return clean;
}

async function getMerchantAddresses(token: string, baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/order/v1/get-merchant-address`, {
      headers: { token, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if ((data.statusCode === 200 || data.statusCode === '0200') && data.dist) {
      return data.dist;
    }
  } catch {}
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, weight, packetCount, remarks, productDetail, customerName: reqName, customerPhone: reqPhone, deliveryAddress: reqAddress, cityName: reqCity, total: reqTotal, orderType: reqOrderType } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, customers(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const { data: s } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .single();

    if (!s?.postex_enabled || !s?.postex_api_token) {
      return NextResponse.json({ success: false, error: 'PostEx is not configured.' }, { status: 200 });
    }

    const baseUrl = s.postex_mode === 'production' ? POSTEX_BASE : POSTEX_STAGING;
    const token = s.postex_api_token;

    const customerName = reqName || order.customer_name || order.customers?.name || '';
    const customerPhone = cleanPhone(reqPhone || order.customer_phone || order.customers?.phone || '');
    const customerEmail = order.customer_email || order.customers?.email || '';
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const firstItem = orderItems[0] || {};
    const itemName = firstItem.name || s.postex_default_product || '';
    const itemSku = firstItem.sku || '';

    const deliveryDetail = productDetail || s.postex_default_product || '';

    let finalWeight = parseFloat(String(weight)) || parseFloat(s.postex_default_weight) || 0.5;
    if ((s.postex_weight_check || '1') !== '1') {
      finalWeight = parseFloat(s.postex_default_weight) || 0.5;
    }

    let finalItems = parseInt(String(packetCount)) || parseInt(s.postex_default_items) || 1;
    if ((s.postex_pieces_check || '1') !== '1') {
      finalItems = parseInt(s.postex_default_items) || 1;
    }

    let totalAmount = reqTotal !== undefined && reqTotal !== '' && !isNaN(parseFloat(String(reqTotal))) ? parseFloat(String(reqTotal)) : (parseFloat(order.total) || 0);
    if (totalAmount && reqTotal === undefined && (s.postex_cod_check || '0') === '1') {
      const searchText = `${remarks || ''} ${itemName} ${order.notes || ''}`.toLowerCase();
      if (searchText.includes('paid') || searchText.includes('prepaid') || searchText.includes('non-cod') || searchText.includes('non cod')) {
        totalAmount = 0;
      }
    }

    // Remarks — use from request if provided, otherwise settings default
    const finalRemarks = (remarks || '').trim() || s.postex_default_remarks || 'Call before delivery';

    // Parse address, apt/suite, and city — use request overrides if provided
    let shippingAddr = reqAddress || order.shipping_address || '';
    let shippingCity = (reqCity || order.shipping_city || '').split(',')[0].trim();
    if (!shippingAddr || !shippingCity) {
      const noteLines = (order.notes || '').split('\n');
      let aptSuite = '';
      noteLines.forEach((line: string) => {
        const lower = line.toLowerCase().trim();
        if (lower.startsWith('address:') && !shippingAddr) {
          shippingAddr = line.substring('address:'.length).trim();
        }
        if (lower.startsWith('apt/suite:') || lower.startsWith('apt:')) {
          aptSuite = line.substring(line.indexOf(':') + 1).trim();
        }
        if (lower.startsWith('city:') && !shippingCity) {
          shippingCity = line.substring('city:'.length).trim();
        }
      });
      // If no "Address:" line found, treat first non-labeled line as address
      if (!shippingAddr) {
        for (const line of noteLines) {
          const t = line.trim();
          if (!t) continue;
          const l = t.toLowerCase();
          if (l.startsWith('apt/suite:') || l.startsWith('apt:') ||
              l.startsWith('city:') || l.startsWith('phone:') ||
              l.startsWith('payment method:') || l.startsWith('postal:') ||
              l.startsWith('address:')) {
            continue;
          }
          shippingAddr = t;
          break;
        }
      }
      // Concatenate address + aptSuite
      if (aptSuite) {
        shippingAddr = [shippingAddr, aptSuite].filter(Boolean).join(', ');
      }
      // Sanitize city — strip country/extra text after comma
      shippingCity = (shippingCity || '').split(',')[0].trim();
    }

    let pickupCode = s.postex_pickup_address || '';
    let returnCode = s.postex_return_address || s.postex_pickup_address || '';
    let returnCity = (s.postex_return_city || '').trim().toUpperCase();
    let pickupText = s.postex_pickup_display || pickupCode;
    let returnText = s.postex_return_display || returnCode;

    try {
      const lists = await getMerchantAddresses(token, baseUrl);
      if (Array.isArray(lists) && lists.length > 0) {
        const retMatched = lists.find((a: any) => a.addressCode === s.postex_return_address)
          || lists.find((a: any) => a.addressCode === s.postex_pickup_address)
          || lists.find((a: any) => a.addressType === 'Return Address')
          || lists[0];

        if (retMatched) {
          if (!returnCity && retMatched.cityName) {
            returnCity = retMatched.cityName.trim().toUpperCase();
          }
          returnText = retMatched.address || returnText;
        }

        const pickMatched = lists.find((a: any) => a.addressCode === s.postex_pickup_address);
        if (pickMatched) {
          pickupText = pickMatched.address || pickupText;
        }
      }
    } catch {}

    if (!returnCity) returnCity = 'KARACHI';
    if (pickupCode === '5450') pickupCode = '54500';
    if (returnCode === '5450') returnCode = '54500';

    const normPickup = pickupText.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const normReturn = returnText.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (normPickup === normReturn && pickupCode) {
      returnCode = pickupCode;
    }

    let orderDetail = deliveryDetail;
    if ((s.postex_sku_check || '0') === '1' && itemSku) {
      orderDetail = `${deliveryDetail} (${itemSku})`;
    }

    const payload: Record<string, any> = {
      cityName: shippingCity || 'Karachi',
      customerName,
      customerPhone,
      deliveryAddress: shippingAddr || 'No address provided',
      invoiceDivision: 1,
      invoicePayment: totalAmount,
      items: finalItems,
      orderDetail,
      orderRefNumber: order.order_number || order.id,
      orderType: reqOrderType || s.postex_order_type || 'Normal',
      transactionNotes: finalRemarks,
      pickupAddressCode: pickupCode,
      weight: finalWeight,
    };

    const res = await fetch(`${baseUrl}/order/v3/create-order`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseData = await res.json();

    if (res.status !== 200 && res.status !== 201) {
      const msg = responseData.statusMessage || responseData.message || responseData.error || `PostEx API error (${res.status})`;
      return NextResponse.json({ success: false, error: msg, details: responseData }, { status: 200 });
    }

    const trackingNumber = responseData.dist?.trackingNumber || responseData.data?.trackingNumber || responseData.trackingNumber || responseData.data?.cn || responseData.cn || responseData.data?.awbNumber || responseData.awbNumber || '';
    const trackingUrl = trackingNumber
      ? `https://postex.pk/tracking?cn=${trackingNumber}`
      : '';

    // ── Build combined status_logs + WhatsApp ──────────────────────────────
    const waPhone = toInternationalPhone(order.customer_phone || order.customers?.phone || '');
    const waName = order.customer_name || order.customers?.name || 'Customer';
    const waTemplate = s.postex_whatsapp_template || 'Dear {name}, your order has been booked. You can track it here: {url}\n{note}';
    const waSuffix = s.postex_whatsapp_note || '';

    let waMessage = waTemplate
      .replace(/\{name\}/g, waName)
      .replace(/\{url\}/g, trackingUrl)
      .replace(/\{note\}/g, finalRemarks || waSuffix);

    if (waSuffix && !waMessage.includes(waSuffix)) {
      waMessage += `\n\n${waSuffix}`;
    }

    let waLink = '';
    if (waPhone && s.postex_whatsapp_template) {
      try {
        waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`;
      } catch (waErr) {
        console.error('[PostEx Fulfill] WhatsApp link generation failed:', waErr);
      }
    }

    // Single update with both booking and WhatsApp logs
    const existingLogs = Array.isArray(order.status_logs) ? order.status_logs : [];
    const combinedLogs = [
      ...existingLogs,
      {
        id: Math.random().toString(36).substring(2, 9),
        type: 'status_change' as const,
        message: `Order has been booked at PostEx with Tracking # ${trackingNumber}`,
        status: 'shipped',
        createdAt: new Date().toISOString(),
      },
      {
        id: Math.random().toString(36).substring(2, 9),
        type: 'whatsapp_notification' as const,
        message: `Order has been booked at PostEx with Tracking # ${trackingNumber}. WhatsApp alert ready for ${waPhone || 'N/A'}`,
        waLink,
        status: 'shipped',
        createdAt: new Date().toISOString(),
      },
    ];

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'shipped',
        tracking_number: trackingNumber,
        courier_name: 'PostEx',
        tracking_url: trackingUrl,
        status_logs: combinedLogs,
      })
      .eq('id', orderId);

    // ── Email Notification (Rich product details, tracking, carrier info) ──
    const storeUrl = s.store_url || '';
    const currencySymbol = s.currency_symbol || 'Rs.';

    const items = Array.isArray(order.items) ? order.items : [];
    const orderTotal = formatPrice(parseFloat(order.total) || 0, currencySymbol);

    // Send to customer if email exists
    if (customerEmail) {
      try {
        await sendTemplatedEmail('postex_shipped', customerEmail, {
          order_id: order.order_number || orderId.slice(0, 8),
          customer_name: customerName,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          postex_remarks: finalRemarks,
          order: { items },
          order_total: orderTotal,
        });
        console.log(`[PostEx Fulfill] Shipped email sent to customer: ${customerEmail}`);
      } catch (mailErr) {
        console.error('[PostEx Fulfill] Failed to send email to customer:', mailErr);
      }
    }

    // Send to admin/store email as well
    try {
      const adminEmail = s.smtp_email || '';
      if (adminEmail) {
        await sendTemplatedEmail('admin_postex_shipped', adminEmail, {
          order_id: order.order_number || orderId.slice(0, 8),
          customer_name: customerName,
          customer_phone: customerPhone,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
          order_total: formatPrice(totalAmount, currencySymbol),
          order: { items }
        });
        console.log(`[PostEx Fulfill] Shipped notification sent to admin: ${adminEmail}`);
      }
    } catch (adminMailErr) {
      console.error('[PostEx Fulfill] Failed to send email to admin:', adminMailErr);
    }

    return NextResponse.json({
      success: true,
      trackingNumber,
      trackingUrl,
      courierName: 'PostEx',
      waLink,
      response: responseData,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Fulfillment failed' }, { status: 200 });
  }
}
