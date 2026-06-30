import { replaceVariables } from '../variables';

function wrapLayout(content: string, vars: Record<string, any>, title: string): string {
  const brandName = vars.brand_name || 'Zaynahs E-Store';
  const siteUrl = vars.site_url || '';
  const logoHtml = vars.logo_url 
    ? `<a href="${siteUrl}" target="_blank"><img src="${vars.logo_url}" alt="${brandName}" style="max-height: 50px; margin-bottom: 20px; border: 0;" /></a>` 
    : `<a href="${siteUrl}" target="_blank" style="color: #1a1a2e; text-decoration: none;"><h1 style="margin: 0; color: #1a1a2e; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${brandName}</h1></a>`;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8f8f8; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin: 0 auto;">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 24px 24px 24px; border-bottom: 1px solid #f3f4f6; text-align: center;">
                    ${logoHtml}
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 32px 24px; color: #1a1a1a; font-size: 16px; line-height: 1.5; text-align: left;">
                    ${content}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 24px 32px 24px; border-top: 1px solid #f3f4f6; background-color: #f9fafb; text-align: center; color: #6b7280; font-size: 13px;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a2e;">${brandName}</p>
                    <p style="margin: 0 0 12px 0;">${siteUrl ? `<a href="${siteUrl}" target="_blank" style="color: #e94560; text-decoration: underline; font-weight: 600;">Visit Store →</a>` : ''}</p>
                    <p style="margin: 0 0 16px 0;">If you have any questions, contact us at <a href="mailto:${vars.contact_email}" style="color: #e94560; text-decoration: none;">${vars.contact_email}</a></p>
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">&copy; ${vars.current_year || new Date().getFullYear()} ${brandName}. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getCTAButton(text: string, url: string): string {
  return `
    <div style="margin: 32px 0; text-align: center;">
      <a href="${url}" target="_blank" style="background-color: #1a1a2e; color: #ffffff; padding: 12px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block;">
        ${text}
      </a>
    </div>
  `;
}

function getOrderSummary(vars: Record<string, any>): string {
  return `
    <h3 style="margin-top: 32px; color: #1a1a2e; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Order Details</h3>
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-top: 16px;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb; text-align: left; font-size: 14px; color: #6b7280;">
          <th colspan="2" style="padding-bottom: 8px;">Item</th>
          <th style="padding-bottom: 8px; text-align: center;">Qty</th>
          <th style="padding-bottom: 8px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${vars.order_items_html || ''}
      </tbody>
    </table>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px; font-size: 14px; color: #4b5563;">
      <tr>
        <td style="padding: 4px 0;">Subtotal</td>
        <td style="padding: 4px 0; text-align: right;">${vars.order_subtotal}</td>
      </tr>
      ${vars.order_discount_fee ? `
      <tr>
        <td style="padding: 4px 0; color: #10b981;">Discount</td>
        <td style="padding: 4px 0; text-align: right; color: #10b981;">${vars.order_discount_fee}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 4px 0;">Shipping</td>
        <td style="padding: 4px 0; text-align: right;">${vars.order_shipping_fee}</td>
      </tr>
      <tr style="font-weight: 700; color: #1a1a2e; font-size: 16px; border-top: 1px solid #e5e7eb;">
        <td style="padding: 12px 0 4px 0;">Total</td>
        <td style="padding: 12px 0 4px 0; text-align: right;">${vars.order_total}</td>
      </tr>
    </table>

    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px; border-top: 2px solid #f3f4f6; padding-top: 16px;">
      <tr>
        <td width="50%" valign="top" style="padding-right: 16px;">
          <h3 style="margin: 0 0 8px 0; color: #1a1a2e; font-size: 14px;">Shipping Address</h3>
          <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.6;">
            ${vars['shipping_address.full'] || ''}
          </p>
        </td>
        <td width="50%" valign="top" style="padding-left: 16px; border-left: 1px solid #f3f4f6;">
          <h3 style="margin: 0 0 8px 0; color: #1a1a2e; font-size: 14px;">Payment Method</h3>
          <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.6;">
            ${vars.order_payment_method || 'Cash on delivery'}
          </p>
        </td>
      </tr>
    </table>
  `;
}

export function getDefaultTemplate(emailType: string, vars: Record<string, any>): string {
  let content = '';
  let title = '';

  switch (emailType) {
    case 'welcome':
      title = 'Welcome!';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Welcome to ${vars.brand_name}!</h2>
        <p>Hello ${vars.customer_name},</p>
        <p>Your account is ready. You can now start exploring and shopping our premium collections.</p>
        ${getCTAButton('Start Shopping', `${vars.site_url}/shop`)}
        <p>Thank you for choosing us!</p>
      `;
      break;

    case 'password_reset':
      title = 'Reset Password';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Reset Your Password</h2>
        <p>Hello ${vars.customer_name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.</p>
        ${getCTAButton('Reset Password', vars.reset_link || '')}
        <p>If you didn't request this, you can safely ignore this email.</p>
      `;
      break;

    case 'password_changed':
      title = 'Password Changed';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Password Changed</h2>
        <p>Hello ${vars.customer_name},</p>
        <p>Your account password was successfully updated.</p>
        <p style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; color: #78350f; font-size: 14px;">
          <strong>Warning:</strong> If you did not make this change, please contact us immediately to secure your account.
        </p>
      `;
      break;

    case 'order_placed':
      title = `Order Confirmation #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Thank you for your order!</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>We've received your order and are getting it ready. We will notify you once it has been confirmed.</p>
        ${getCTAButton('View Your Order', `${vars.site_url}/shop`)}
        ${getOrderSummary(vars)}
      `;
      break;

    case 'order_confirmed':
      title = `Order Confirmed #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Your order is confirmed!</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>Your order <strong>#${vars.order_id}</strong> is confirmed and being prepared. We will let you know once it ships.</p>
        ${getOrderSummary(vars)}
      `;
      break;

    case 'order_processing':
      title = `Order Processing #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Your order is being prepared!</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>We are packaging your order <strong>#${vars.order_id}</strong> and it will be handed over to our shipping partner shortly.</p>
        ${getOrderSummary(vars)}
      `;
      break;

    case 'order_shipped':
      title = `Order Shipped #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Your order has shipped!</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>Good news! Your order <strong>#${vars.order_id}</strong> has been shipped and is on its way to you.</p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0; font-size: 14px;">
          <p style="margin: 0 0 8px 0;"><strong>Courier:</strong> ${vars.courier_name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Tracking Number:</strong> ${vars.tracking_number}</p>
          ${vars.estimated_delivery ? `<p style="margin: 0;"><strong>Estimated Delivery:</strong> ${vars.estimated_delivery}</p>` : ''}
        </div>
        
        ${vars.tracking_url ? getCTAButton('Track Your Order', vars.tracking_url) : ''}
        ${getOrderSummary(vars)}
      `;
      break;

    case 'order_out_for_delivery':
      title = `Out for Delivery #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Out for Delivery</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>Your order <strong>#${vars.order_id}</strong> is out for delivery today. Please make sure someone is available to receive it.</p>
        ${getOrderSummary(vars)}
      `;
      break;

    case 'order_delivered':
      title = `Order Delivered #${vars.order_id}`;
      content = `
        <h2 style="color: #10b981; margin-top: 0;">Delivered!</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>Your order <strong>#${vars.order_id}</strong> has been successfully delivered. We hope you love your purchase!</p>
        ${getOrderSummary(vars)}
      `;
      break;

    case 'order_cancelled':
      title = `Order Cancelled #${vars.order_id}`;
      content = `
        <h2 style="color: #ef4444; margin-top: 0;">Order Cancelled</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>Your order <strong>#${vars.order_id}</strong> has been cancelled.</p>
        ${vars.cancel_reason ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; color: #991b1b; font-size: 14px; border-radius: 4px;"><strong>Reason:</strong> ${vars.cancel_reason}</div>` : ''}
        <p>If you did not request this cancellation, or if there was an issue with your payment or verification, please reply to this email or contact us on WhatsApp. We are here to help!</p>
        ${getOrderSummary(vars)}
        ${getCTAButton('Continue Shopping', `${vars.site_url || '#'}`)}
      `;
      break;

    case 'order_refunded':
      title = `Order Refunded #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Refund Processed</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>We have processed a refund of <strong>${vars.refund_amount}</strong> for your order <strong>#${vars.order_id}</strong>.</p>
        <p>The refunded amount should reflect in your account within 5-7 business days, depending on your payment provider.</p>
      `;
      break;

    case 'review_request':
      title = 'How was your order?';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Leave a Review</h2>
        <p>Hi ${vars.customer_name},</p>
        <p>Thank you for shopping with us! We hope you love your recent order. Could you take a moment to tell us how we did?</p>
        ${getCTAButton('Leave a Review', `${vars.site_url}/shop`)}
        <p>Your feedback helps us and other customers immensely!</p>
      `;
      break;

    case 'admin_new_order':
      title = `Admin Alert: New Order #${vars.order_id}`;
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">New Order Received!</h2>
        <p>A new order <strong>#${vars.order_id}</strong> has been placed on the storefront.</p>
        <p><strong>Total:</strong> ${vars.order_total}</p>
        <p><strong>Customer:</strong> ${vars.customer_name} (${vars.customer_email})</p>
        ${getCTAButton('View in Dashboard', `${vars.admin_panel_url}/orders`)}
        ${getOrderSummary(vars)}
      `;
      break;

    case 'admin_order_cancelled':
      title = `Admin Alert: Order Cancelled #${vars.order_id}`;
      content = `
        <h2 style="color: #ef4444; margin-top: 0;">Order Cancelled Alert</h2>
        <p>Order <strong>#${vars.order_id}</strong> was cancelled.</p>
        <p><strong>Customer:</strong> ${vars.customer_name}</p>
        ${vars.cancel_reason ? `<p><strong>Reason:</strong> ${vars.cancel_reason}</p>` : ''}
        ${getCTAButton('View in Dashboard', `${vars.admin_panel_url}/orders`)}
      `;
      break;

    case 'admin_low_stock':
      title = `Admin Alert: Low Stock ${vars.product_name}`;
      content = `
        <h2 style="color: #ef4444; margin-top: 0;">Low Stock Warning</h2>
        <p>The following product has low stock:</p>
        <p><strong>Product Name:</strong> ${vars.product_name}</p>
        <p><strong>Current Stock:</strong> ${vars.product_stock} units</p>
        ${getCTAButton('Manage Stock', `${vars.admin_panel_url}/products`)}
      `;
      break;

    case 'admin_new_customer':
      title = 'Admin Alert: New Customer';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">New Customer Registration</h2>
        <p>A new customer has registered on the storefront:</p>
        <p><strong>Name:</strong> ${vars.customer_name}</p>
        <p><strong>Email:</strong> ${vars.customer_email}</p>
      `;
      break;

    case 'admin_new_review':
      title = 'Admin Alert: New Review';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">New Review Submitted</h2>
        <p>A customer has reviewed a product:</p>
        <p><strong>Product:</strong> ${vars.product_name}</p>
        <p><strong>Author:</strong> ${vars.review_author}</p>
        <p><strong>Rating:</strong> ${vars.review_rating}</p>
        <p><strong>Comment:</strong></p>
        <p style="background-color: #f3f4f6; border-radius: 8px; padding: 12px; font-style: italic; color: #4b5563;">
          "${vars.review_text}"
        </p>
        ${getCTAButton('Moderate Reviews', `${vars.admin_panel_url}/products`)}
      `;
      break;

    case 'admin_contact_form':
      title = 'Admin Alert: Contact Form';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">New Contact Form Message</h2>
        <p>You received a message via the contact form:</p>
        <p><strong>From:</strong> ${vars.contact_name} (${vars.customer_email})</p>
        <p><strong>Subject:</strong> ${vars.contact_subject}</p>
        <p><strong>Message:</strong></p>
        <p style="background-color: #f3f4f6; border-radius: 8px; padding: 12px; color: #4b5563; line-height: 1.6;">
          ${vars.contact_message}
        </p>
      `;
      break;

    default:
      title = 'Notification';
      content = `
        <h2 style="color: #1a1a2e; margin-top: 0;">Notification</h2>
        <p>Hello,</p>
        <p>This is a default storefront notification email.</p>
      `;
  }

  return wrapLayout(content, vars, title);
}
