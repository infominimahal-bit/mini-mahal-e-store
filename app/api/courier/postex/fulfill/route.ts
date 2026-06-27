import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { cleanWhatsAppPhone, formatPrice } from '@/lib/utils/whatsapp';
import { sendEmail } from '@/lib/email/sendEmail';
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
    const { orderId, weight, packetCount, remarks, productDetail } = await req.json();

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

    const customerName = order.customer_name || order.customers?.name || '';
    const customerPhone = cleanPhone(order.customer_phone || order.customers?.phone || '');
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

    let totalAmount = parseFloat(order.total) || 0;
    if ((s.postex_cod_check || '0') === '1') {
      const searchText = `${remarks || ''} ${itemName} ${order.notes || ''}`.toLowerCase();
      if (searchText.includes('paid') || searchText.includes('prepaid') || searchText.includes('non-cod') || searchText.includes('non cod')) {
        totalAmount = 0;
      }
    }

    // Remarks — strictly the Default Delivery Note from settings, no concatenation
    const finalRemarks = s.postex_default_remarks || 'Call before delivery';

    // Parse address and city from notes if direct fields are empty
    let shippingAddr = order.shipping_address || '';
    let shippingCity = order.shipping_city || '';
    if (!shippingAddr || !shippingCity) {
      const noteLines = (order.notes || '').split('\n');
      noteLines.forEach((line: string) => {
        const lower = line.toLowerCase().trim();
        if (lower.startsWith('address:') && !shippingAddr) {
          shippingAddr = line.substring('address:'.length).trim();
        }
        if (lower.startsWith('city:') && !shippingCity) {
          shippingCity = line.substring('city:'.length).trim();
        }
      });
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
      orderType: s.postex_order_type || 'Normal',
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
    const storeName = s.store_name || 'Zaynahs E-Store';
    const storeUrl = s.store_url || '';
    const currencySymbol = s.currency_symbol || 'Rs.';

    const items = Array.isArray(order.items) ? order.items : [];
    const orderItemsHtml = renderOrderItemsTable(items, currencySymbol);
    const orderTotal = formatPrice(parseFloat(order.total) || 0, currencySymbol);

    // Shipping address from order notes
    let shippingAddrStr = '';
    let shippingCityStr = '';
    (order.notes || '').split('\n').forEach((line: string) => {
      const l = line.toLowerCase().trim();
      if (l.startsWith('address:')) shippingAddrStr = line.substring('address:'.length).trim();
      if (l.startsWith('city:')) shippingCityStr = line.substring('city:'.length).trim();
    });

    const customerAddress = shippingAddrStr || order.shipping_address || '';
    const customerCity = shippingCityStr || order.shipping_city || '';
    const customerPhoneStr = order.customer_phone || order.customers?.phone || '';

    const emailSubject = `Your order has been shipped via PostEx — Tracking: ${trackingNumber}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f6;">
        <div style="background: #1a1a2e; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: #fff; font-size: 22px; margin: 0;">${storeName}</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1a1a2e; font-size: 18px; margin-top: 0;">Your order has been dispatched!</h2>
          <p style="color: #555; line-height: 1.6;">Hi ${customerName},</p>
          <p style="color: #555; line-height: 1.6;">
            Your order <strong>#${order.order_number || orderId.slice(0, 8)}</strong> has been handed over to
            <strong>PostEx Logistics</strong> and is on its way. Please allow <strong>2-5 working days</strong>
            for delivery. Keep provided phone number active for the rider to reach you.
          </p>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="margin: 0 0 6px; color: #166534; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">Tracking Consignment Number (CN)</p>
            <p style="margin: 0 0 12px; font-size: 24px; font-weight: 800; color: #1a1a2e; letter-spacing: 3px;">${trackingNumber}</p>
            <a href="${trackingUrl}" target="_blank" style="display: inline-block; background: #e94560; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 14px;">Track Your Parcel →</a>
          </div>

          ${finalRemarks ? `<p style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 10px 14px; color: #9a3412; font-size: 13px; line-height: 1.5;"><strong>Note:</strong> ${finalRemarks}</p>` : ''}

          ${orderItemsHtml ? `
            <div style="margin-top: 20px;">
              <h3 style="color: #1a1a2e; font-size: 15px; margin-bottom: 8px;">Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="text-align: left; padding: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase;">Item</th>
                    <th style="text-align: center; padding: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase;">Qty</th>
                    <th style="text-align: right; padding: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
              </table>
              <div style="text-align: right; margin-top: 8px; font-size: 16px; font-weight: 700; color: #1a1a2e;">
                Total: ${orderTotal}
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <h3 style="color: #1a1a2e; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
            <p style="margin: 0; color: #555; font-size: 13px; line-height: 1.6;">
              ${customerName}<br/>
              ${customerAddress ? `${customerAddress}<br/>` : ''}
              ${customerCity || ''}
            </p>
            <p style="margin: 4px 0 0; color: #555; font-size: 13px;"><strong>Phone:</strong> ${customerPhoneStr}</p>
          </div>

          <div style="margin-top: 16px; padding: 12px; background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e; line-height: 1.5;">
            <strong>⚠️ Important:</strong> Orders take <strong>2-5 working days</strong> for delivery. Please ensure the
            provided phone number remains active and switched on. The rider may call you before delivery.
          </div>
        </div>
        <div style="text-align: center; padding: 16px; color: #999; font-size: 11px;">
          <p style="margin: 0;">${storeName}${storeUrl ? ` | <a href="${storeUrl}" style="color: #e94560; text-decoration: none;">${storeUrl}</a>` : ''}</p>
          <p style="margin: 4px 0 0;">This is an automated dispatch notification. Please do not reply directly.</p>
        </div>
      </div>
    `;

    // Send to customer if email exists
    if (customerEmail) {
      try {
        await sendEmail({ to: customerEmail, subject: emailSubject, html: emailHtml });
        console.log(`[PostEx Fulfill] Shipped email sent to customer: ${customerEmail}`);
      } catch (mailErr) {
        console.error('[PostEx Fulfill] Failed to send email to customer:', mailErr);
      }
    }

    // Send to admin/store email as well
    try {
      const adminEmail = s.smtp_email || '';
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `[${storeName}] Order dispatched — ${trackingNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f6;">
              <div style="background: #1a1a2e; border-radius: 12px 12px 0 0; padding: 20px; text-align: center;">
                <h1 style="color: #fff; font-size: 18px; margin: 0;">${storeName}</h1>
              </div>
              <div style="background: #fff; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="color: #1a1a2e; font-size: 16px; margin-top: 0;">Order Fulfilled via PostEx</h2>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #555;">
                  <tr><td style="padding: 4px 0;"><strong>Order:</strong></td><td style="padding: 4px 0;">${order.order_number || orderId}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Customer:</strong></td><td style="padding: 4px 0;">${customerName} (${customerPhone})</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Tracking CN:</strong></td><td style="padding: 4px 0;">${trackingNumber}</td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Tracking Link:</strong></td><td style="padding: 4px 0;"><a href="${trackingUrl}" style="color: #e94560;">${trackingUrl}</a></td></tr>
                  <tr><td style="padding: 4px 0;"><strong>Courier:</strong></td><td style="padding: 4px 0;">PostEx Logistics</td></tr>
                  ${customerEmail ? `<tr><td style="padding: 4px 0;"><strong>Customer Email:</strong></td><td style="padding: 4px 0;">${customerEmail}</td></tr>` : ''}
                  <tr><td style="padding: 4px 0;"><strong>COD Amount:</strong></td><td style="padding: 4px 0;">${currencySymbol} ${totalAmount}</td></tr>
                </table>
                ${orderItemsHtml ? `
                  <h3 style="color: #1a1a2e; font-size: 14px; margin: 16px 0 8px;">Items</h3>
                  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; font-size: 12px;">
                    <thead><tr style="background: #f9fafb;"><th style="text-align: left; padding: 6px;">Item</th><th style="text-align: center; padding: 6px;">Qty</th><th style="text-align: right; padding: 6px;">Total</th></tr></thead>
                    <tbody>${orderItemsHtml}</tbody>
                  </table>
                ` : ''}
                <div style="margin-top: 12px; padding: 10px; background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; font-size: 11px; color: #92400e;">
                  Delivery window: 2-5 working days. Keep provided phone number active.
                </div>
              </div>
              <div style="text-align: center; padding: 12px; color: #999; font-size: 10px;">
                Automated fulfillment notification from ${storeName}.
              </div>
            </div>
          `,
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
