import { getSiteUrl } from '@/lib/site-url-server';
import { formatPrice } from '@/lib/utils/whatsapp';
import { CartItem } from '@/lib/types';

export function renderOrderItemsTable(items: CartItem[], currencySymbol = 'Rs.', siteUrl = ''): string {
  if (!items || items.length === 0) return '';
  return items.map(item => {
    // Get product thumbnail
    let imgUrl = '';
    if (item.selectedVariant?.imageUrl) {
      imgUrl = item.selectedVariant.imageUrl;
    } else if (item.product.images && item.product.images.length > 0) {
      const primary = item.product.images.find(img => img.isPrimary);
      imgUrl = primary ? primary.url : item.product.images[0].url;
    }

    const variantDetails = item.selectedVariant
      ? [
          item.selectedVariant.color,
          item.selectedVariant.size,
          item.selectedVariant.material,
          item.selectedVariant.customValue
        ].filter(Boolean).join(', ')
      : '';

    const modifierDetails = item.selectedModifiers && item.selectedModifiers.length > 0
      ? item.selectedModifiers.map(m => m.name).join(', ')
      : '';

    const productUrl = siteUrl && item.product.slug ? `${siteUrl}/product/${item.product.slug}` : '';

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td width="20%" valign="middle" style="padding: 10px 15px 10px 0;">
          ${imgUrl
            ? productUrl
              ? `<a href="${productUrl}" target="_blank"><img src="${imgUrl}" alt="${item.product.name}" width="100%" style="max-width: 60px; border-radius: 6px; display: block;" /></a>`
              : `<img src="${imgUrl}" alt="${item.product.name}" width="100%" style="max-width: 60px; border-radius: 6px; display: block;" />`
            : `<div style="width: 60px; height: 60px; border-radius: 6px; background-color: #f3f4f6;"></div>`}
        </td>
        <td width="50%" valign="middle" style="padding: 10px 8px;">
          ${productUrl
            ? `<a href="${productUrl}" target="_blank" style="color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 14px; display: block;">${item.product.name}</a>`
            : `<span style="font-weight: 600; color: #1a1a1a; font-size: 14px;">${item.product.name}</span>`}
          ${(item as any).addedLater ? `<span style="display: inline-block; background-color: #fef2f2; color: #ef4444; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-top: 4px; border: 1px solid #fecaca;">Added Later</span>` : ''}
          ${variantDetails ? `<p style="margin: 4px 0 0; color: #666; font-size: 12px;">${variantDetails}</p>` : ''}
          ${modifierDetails ? `<p style="margin: 2px 0 0; color: #10b981; font-size: 12px;">+ ${modifierDetails}</p>` : ''}
        </td>
        <td width="10%" valign="middle" align="center" style="padding: 10px 8px; color: #444; font-size: 14px; white-space: nowrap;">
          x${item.quantity}
        </td>
        <td width="20%" valign="middle" align="right" style="padding: 10px 0 10px 8px; font-weight: 700; color: #1a1a2e; font-size: 14px; white-space: nowrap;">
          ${formatPrice(item.total, currencySymbol)}
        </td>
      </tr>
    `;
  }).join('');
}

export async function buildVariables(emailType: string, data: Record<string, any>): Promise<Record<string, any>> {
  const settings = data.settings || {};
  const currencySymbol = settings.currencySymbol || 'Rs.';

  // Start with standard variables
  const vars: Record<string, any> = {
    brand_name: settings.storeName || 'Zaynahs E-Store',
    site_url: await getSiteUrl(settings),
    customer_name: data.customer?.name || data.user?.name || 'Customer',
    customer_email: data.customer?.email || data.user?.email || '',
    contact_email: settings.headerTopBarEmail || settings.smtp_email || '',
    currency: currencySymbol,
    current_year: new Date().getFullYear().toString()
  };

  // If order details exist, populate order-related variables
  if (data.order) {
    const order = data.order;
    vars.order_id = order.orderNumber || order.id;
    vars.order_date = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    vars.order_total = formatPrice(order.total, currencySymbol);
    vars.order_subtotal = formatPrice(order.subtotal || order.total, currencySymbol);
    
    // Webhook payload comes from Supabase so fields are snake_case: discount_amount, shipping_amount
    const discountAmount = order.discount_amount || order.discountAmount || 0;
    vars.order_discount_fee = discountAmount > 0 ? `-${formatPrice(discountAmount, currencySymbol)}` : '';
    
    const shippingAmount = order.shipping_amount || order.shippingAmount || 0;
    vars.order_shipping_fee = formatPrice(shippingAmount, currencySymbol);
    vars.order_status = order.status;

    // Default payment method
    vars.order_payment_method = 'Cash on delivery';

    // Address
    const address = order.shipping_address || data.customer || {};
    let addressName = order.customerName || address.name || data.customer?.name || data.user?.name || 'Customer';
    let street = address.street || address.address || '';
    let city = address.city || '';
    let postalCode = address.postalCode || '';
    let phone = address.phone || order.customerPhone || data.customer?.phone || '';

    // Parse specific address fields from formatted notes if present
    if (order.notes) {
      const addressMatch = order.notes.match(/Address:\s*(.+)/i);
      const aptMatch = order.notes.match(/Apt\/Suite:\s*(.+)/i);
      const cityMatch = order.notes.match(/City:\s*(.+)/i);
      const postalMatch = order.notes.match(/Postal:\s*(.+)/i);
      const phoneMatch = order.notes.match(/Phone:\s*(.+)/i);
      const paymentMatch = order.notes.match(/Payment Method:\s*(.+)/i);

      if (addressMatch) {
        street = addressMatch[1].trim();
        if (aptMatch) {
          street += `, ${aptMatch[1].trim()}`;
        }
      }
      if (cityMatch) city = cityMatch[1].trim();
      if (postalMatch) postalCode = postalMatch[1].trim();
      if (phoneMatch) phone = phoneMatch[1].trim();
      if (paymentMatch) vars.order_payment_method = paymentMatch[1].trim();
    }

    vars['shipping_address.name'] = addressName;
    vars['shipping_address.phone'] = phone;
    vars['shipping_address.street'] = street;
    vars['shipping_address.city'] = city;
    vars['shipping_address.postal_code'] = postalCode;
    vars['shipping_address.full'] = address.full || 
      [addressName, street, city, postalCode, phone].filter(Boolean).join(', ');

    // Shipping
    vars.tracking_number = order.trackingNumber || '';
    vars.courier_name = order.courierName || '';
    vars.tracking_url = order.trackingUrl || '';
    vars.estimated_delivery = order.estimatedDelivery || '';

    // Cancel/Refund
    vars.cancel_reason = order.cancelReason || '';
    vars.refund_amount = order.refundAmount ? formatPrice(order.refundAmount, currencySymbol) : '';
  }

  // Auth reset
  if (data.resetLink) {
    vars.reset_link = data.resetLink;
  }

  // Admin and other custom variables
  vars.admin_panel_url = `${vars.site_url}/admin`;
  
  if (data.product) {
    vars.product_name = data.product.name || '';
    vars.product_stock = data.product.stock !== undefined ? data.product.stock.toString() : '0';
  }
  
  if (data.review) {
    vars.review_rating = '★'.repeat(data.review.rating || 0) + '☆'.repeat(5 - (data.review.rating || 0));
    vars.review_text = data.review.comment || '';
    vars.review_author = data.review.customerName || '';
  }

  if (data.contact) {
    vars.contact_name = data.contact.name || '';
    vars.contact_subject = data.contact.subject || '';
    vars.contact_message = data.contact.message || '';
  }

  return vars;
}

export function replaceVariables(text: string, variables: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/\{\{([a-zA-Z0-9_\.]+)\}\}/g, (match, key) => {
    // Check direct key or dotted path
    const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], variables);
    // If not found in variables, check direct dotted key in the flat variables object (e.g. 'shipping_address.full')
    if (value !== undefined) {
      return String(value);
    }
    const flatValue = variables[key];
    if (flatValue !== undefined) {
      return String(flatValue);
    }
    return match;
  });
}
