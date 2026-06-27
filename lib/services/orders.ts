'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Order, CartItem, StatusLogItem } from '@/lib/types';
import { getCustomerSession } from '@/lib/utils/customer-auth';

interface OrderRow {
  id: string;
  order_number: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_id?: string | null;
  items?: unknown;
  subtotal?: string | number | null;
  total?: string | number | null;
  discount_amount?: string | number | null;
  shipping_amount?: string | number | null;
  discount_code?: string | null;
  status: string;
  notes?: string | null;
  staff_notes?: string | null;
  status_logs?: unknown;
  review_email_pending?: boolean | null;
  delivered_at?: string | null;
  tracking_number?: string | null;
  courier_name?: string | null;
  tracking_url?: string | null;
  cancel_reason?: string | null;
  refund_amount?: string | number | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

const mapOrder = (row: OrderRow): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  customerName: row.customer_name || undefined,
  customerPhone: row.customer_phone || undefined,
  customerId: row.customer_id || undefined,
  items: (row.items || []) as CartItem[],
  subtotal: row.subtotal ? parseFloat(row.subtotal.toString()) : 0,
  total: row.total ? parseFloat(row.total.toString()) : 0,
  discountAmount: row.discount_amount ? parseFloat(row.discount_amount.toString()) : 0,
  shippingAmount: row.shipping_amount ? parseFloat(row.shipping_amount.toString()) : 0,
  discountCode: row.discount_code || undefined,
  status: row.status as Order['status'],
  notes: row.notes || undefined,
  staffNotes: row.staff_notes || undefined,
  statusLogs: (row.status_logs || []) as StatusLogItem[],
  reviewEmailPending: row.review_email_pending ?? false,
  deliveredAt: row.delivered_at || undefined,
  trackingNumber: row.tracking_number || undefined,
  courierName: row.courier_name || undefined,
  trackingUrl: row.tracking_url || undefined,
  cancelReason: row.cancel_reason || undefined,
  refundAmount: row.refund_amount ? parseFloat(row.refund_amount.toString()) : undefined,
  deletedAt: row.deleted_at || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const createOrder = async (order: {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  notes?: string;
}): Promise<Order> => {
  try {
    const supabase = await createClient();
    const session = await getCustomerSession();
    let customerId = session ? session.id : null;

    console.log('[orders] Step 1: customerId resolved to', customerId);

    // Auto-create/lookup guest customer record if phone is provided and they aren't logged in
    if (!customerId && (order.customerPhone || order.customerEmail)) {
      console.log('[orders] Step 2: looking up or creating customer');
      try {
        let existingCustomer = null;

        // 1. Try to find by email if email is provided
        if (order.customerEmail) {
          const { data } = await supabaseAdmin
            .from('customers')
            .select('id, phone, email')
            .eq('email', order.customerEmail.trim().toLowerCase())
            .maybeSingle();
          if (data) {
            existingCustomer = data;
          }
        }

        // 2. Try to find by phone if not found by email
        if (!existingCustomer && order.customerPhone) {
          const rawPhone = order.customerPhone.trim();
          const cleanPhone = rawPhone.replace(/\D/g, '');

          // Check raw phone
          let { data } = await supabaseAdmin
            .from('customers')
            .select('id, phone, email')
            .eq('phone', rawPhone)
            .maybeSingle();

          if (!data && cleanPhone) {
            // Check clean phone
            const { data: dataClean } = await supabaseAdmin
              .from('customers')
              .select('id, phone, email')
              .eq('phone', cleanPhone)
              .maybeSingle();
            data = dataClean;
          }
          
          if (data) {
            existingCustomer = data;
          }
        }

        if (existingCustomer) {
          customerId = existingCustomer.id;
          
          // Update customer fields if they changed or were empty
          const updates: Record<string, any> = {};
          if (order.customerEmail && existingCustomer.email !== order.customerEmail) {
            updates.email = order.customerEmail.trim().toLowerCase();
          }
          if (order.customerPhone && existingCustomer.phone !== order.customerPhone) {
            updates.phone = order.customerPhone.trim();
          }
          if (order.customerName && order.customerName !== 'Guest Customer') {
            updates.name = order.customerName;
          }

          if (Object.keys(updates).length > 0) {
            await supabaseAdmin
              .from('customers')
              .update(updates)
              .eq('id', customerId);
          }
        } else {
          // Create new customer record
          const { data: newCustomer, error: insertError } = await supabaseAdmin
            .from('customers')
            .insert({
              name: order.customerName || 'Guest Customer',
              phone: order.customerPhone ? order.customerPhone.trim() : null,
              email: order.customerEmail ? order.customerEmail.trim().toLowerCase() : null,
              password_hash: null
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('Error inserting customer:', insertError);
            // Fallback: if it still fails on unique email or phone, query again to link it
            if (order.customerEmail) {
              const { data } = await supabaseAdmin
                .from('customers')
                .select('id')
                .eq('email', order.customerEmail.trim().toLowerCase())
                .maybeSingle();
              if (data) customerId = data.id;
            }
            if (!customerId && order.customerPhone) {
              const { data } = await supabaseAdmin
                .from('customers')
                .select('id')
                .eq('phone', order.customerPhone.trim())
                .maybeSingle();
              if (data) customerId = data.id;
            }
          } else if (newCustomer) {
            customerId = newCustomer.id;
          }
        }
      } catch (err) {
        console.error('Failed to auto-create guest customer:', err);
      }
    }

    // Initialize the timeline with the creation event
    const initialLogs: StatusLogItem[] = [
      {
        id: crypto.randomUUID(),
        type: 'creation',
        message: 'Order created clicked by customer on WhatsApp',
        createdAt: new Date().toISOString()
      }
    ];

    // Check if the order is pre-paid (transfer/digital options selected at checkout)
    const notesText = order.notes || '';
    const lines = notesText.split('\n');
    let paymentMethod = '';
    lines.forEach(line => {
      const l = line.toLowerCase();
      if (l.startsWith('payment method:')) {
        paymentMethod = line.substring('payment method:'.length).trim();
      }
    });

    const isPaidOption = (() => {
      const pm = paymentMethod.toLowerCase();
      if (!pm) return false;
      if (pm.includes('cash') || pm.includes('cod') || pm.includes('delivery')) {
        return false;
      }
      if (pm.includes('transfer') || pm.includes('bank') || pm.includes('nayapay') || pm.includes('easypaisa') || pm.includes('jazzcash') || pm.includes('card') || pm.includes('online')) {
        return true;
      }
      return false;
    })();

    if (isPaidOption) {
      initialLogs.push({
        id: crypto.randomUUID(),
        type: 'payment',
        message: `Payment of Rs. ${order.total.toLocaleString()} processed via ${paymentMethod}`,
        notes: 'Status: Paid',
        createdAt: new Date().toISOString()
      });
    }

    // Retry up to 3 times on 23505 (duplicate order_number)
    let data: any;
    let insertAttempt = 0;
    const MAX_ATTEMPTS = 3;
    while (insertAttempt < MAX_ATTEMPTS) {
      insertAttempt++;
      const { data: result, error: insertError } = await supabase
        .from('orders')
        .insert({
          customer_name: order.customerName,
          customer_phone: order.customerPhone,
          customer_id: customerId,
          items: order.items,
          subtotal: order.subtotal,
          total: order.total,
          notes: order.notes,
          status: 'pending',
          status_logs: initialLogs
        })
        .select('*')
        .single();

      if (insertError) {
        const pgCode = (insertError as any)?.code;
        if (pgCode === '23505' && insertAttempt < MAX_ATTEMPTS) {
          console.warn(`[orders] 23505 duplicate order_number, retry ${insertAttempt}/${MAX_ATTEMPTS}`);
          await new Promise(r => setTimeout(r, 150));
          continue;
        }
        throw insertError;
      }
      data = result;
      break;
    }
    const mapped = mapOrder(data);

    // Await the email dispatch so the serverless function does not exit/freeze before delivery completes
    try {
      const { onOrderPlaced } = await import('@/lib/email/triggers');
      await onOrderPlaced(mapped, { email: order.customerEmail, name: order.customerName, phone: order.customerPhone });
    } catch (err) {
      console.error('[Email Trigger] failed in createOrder:', err);
    }

    return mapped;
  } catch (error) {
    console.error('[orders] createOrder failed:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('[orders] createOrder failed raw:', error);
    throw error;
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapOrder);
  } catch (error) {
    console.error('[orders] getOrders failed:', error);
    throw error;
  }
};

export const getOrdersByCustomerId = async (customerId: string): Promise<Order[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapOrder);
  } catch (error) {
    console.error('[orders] getOrdersByCustomerId failed:', error);
    throw error;
  }
};


export const updateOrderStatus = async (id: string, status: Order['status']): Promise<Order> => {
  try {
    const supabase = await createClient();

    // 1. Fetch current order to get its status logs
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, status_logs')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const oldStatus = currentOrder.status;
    const currentLogs = (currentOrder.status_logs || []) as StatusLogItem[];

    // 2. Add log entry if status changed
    let updatedLogs = currentLogs;
    if (oldStatus !== status) {
      const logEntry: StatusLogItem = {
        id: crypto.randomUUID(),
        type: 'status_change',
        message: `Order status changed from ${oldStatus.toUpperCase()} to ${status.toUpperCase()}`,
        status: status,
        createdAt: new Date().toISOString()
      };
      updatedLogs = [...currentLogs, logEntry];
    }

    // 3. Update order in database
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status,
        status_logs: updatedLogs
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    const mapped = mapOrder(data);

    // Await the email dispatch so the serverless function does not exit/freeze before delivery completes
    if (oldStatus !== status) {
      try {
        const { onOrderStatusChange } = await import('@/lib/email/triggers');
        await onOrderStatusChange(mapped, { name: mapped.customerName, phone: mapped.customerPhone }, status);
      } catch (err) {
        console.error('[Email Trigger] failed in updateOrderStatus trigger:', err);
      }
    }

    return mapped;
  } catch (error) {
    console.error('[orders] updateOrderStatus failed:', error);
    throw error;
  }
};

export const updateOrderDetails = async (
  id: string,
  updates: {
    items?: CartItem[];
    subtotal?: number;
    total?: number;
    discountAmount?: number;
    shippingAmount?: number;
    discountCode?: string;
    status?: Order['status'];
    staffNotes?: string;
    statusLogs?: StatusLogItem[];
    deliveredAt?: string;
    trackingNumber?: string;
    courierName?: string;
    trackingUrl?: string;
    cancelReason?: string;
    refundAmount?: number;
    reviewEmailPending?: boolean;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }
): Promise<Order> => {
  try {
    const supabase = await createClient();

    // Fetch current state before update to detect changes
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status, tracking_number')
      .eq('id', id)
      .single();
      
    const oldStatus = currentOrder?.status;
    const oldTracking = currentOrder?.tracking_number;

    const payload: any = {};
    if (updates.items !== undefined) payload.items = updates.items;
    if (updates.subtotal !== undefined) payload.subtotal = updates.subtotal;
    if (updates.total !== undefined) payload.total = updates.total;
    if (updates.discountAmount !== undefined) payload.discount_amount = updates.discountAmount;
    if (updates.shippingAmount !== undefined) payload.shipping_amount = updates.shippingAmount;
    if (updates.discountCode !== undefined) payload.discount_code = updates.discountCode;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.staffNotes !== undefined) payload.staff_notes = updates.staffNotes;
    if (updates.statusLogs !== undefined) payload.status_logs = updates.statusLogs;
    if (updates.deliveredAt !== undefined) payload.delivered_at = updates.deliveredAt;
    if (updates.trackingNumber !== undefined) payload.tracking_number = updates.trackingNumber;
    if (updates.courierName !== undefined) payload.courier_name = updates.courierName;
    if (updates.trackingUrl !== undefined) payload.tracking_url = updates.trackingUrl;
    if (updates.cancelReason !== undefined) payload.cancel_reason = updates.cancelReason;
    if (updates.refundAmount !== undefined) payload.refund_amount = updates.refundAmount;
    if (updates.reviewEmailPending !== undefined) payload.review_email_pending = updates.reviewEmailPending;
    if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
    if (updates.customerPhone !== undefined) payload.customer_phone = updates.customerPhone;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { data, error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    const mapped = mapOrder(data);

    // Call triggers if status changed OR if status is shipped/out_for_delivery and tracking details were added/updated
    const statusChanged = updates.status !== undefined && oldStatus !== updates.status;
    const trackingUpdated = ['shipped', 'out_for_delivery'].includes(mapped.status) && 
                            updates.trackingNumber !== undefined && 
                            oldTracking !== updates.trackingNumber;

    if (statusChanged || trackingUpdated) {
      try {
        const { onOrderStatusChange } = await import('@/lib/email/triggers');
        await onOrderStatusChange(mapped, { name: mapped.customerName, phone: mapped.customerPhone }, mapped.status);
      } catch (err) {
        console.error('[Email Trigger] failed in updateOrderDetails:', err);
      }
    }

    return mapped;
  } catch (error) {
    console.error('[orders] updateOrderDetails failed:', error);
    throw error;
  }
};

export const getDeletedOrders = async (): Promise<Order[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapOrder);
  } catch (error) {
    console.error('[orders] getDeletedOrders failed:', error);
    throw error;
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[orders] deleteOrder failed:', error);
    throw error;
  }
};

export const restoreOrder = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[orders] restoreOrder failed:', error);
    throw error;
  }
};

export const hardDeleteOrder = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[orders] hardDeleteOrder failed:', error);
    throw error;
  }
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      orderNumber: data.order_number,
      customerName: data.customer_name || undefined,
      customerPhone: data.customer_phone || undefined,
      customerId: data.customer_id || undefined,
      items: (data.items || []) as CartItem[],
      subtotal: data.subtotal ? parseFloat(data.subtotal.toString()) : 0,
      total: data.total ? parseFloat(data.total.toString()) : 0,
      status: data.status as Order['status'],
      notes: data.notes || undefined,
      staffNotes: data.staff_notes || undefined,
      statusLogs: (data.status_logs || []) as StatusLogItem[],
      reviewEmailPending: data.review_email_pending ?? false,
      deliveredAt: data.delivered_at || undefined,
      trackingNumber: data.tracking_number || undefined,
      courierName: data.courier_name || undefined,
      trackingUrl: data.tracking_url || undefined,
      cancelReason: data.cancel_reason || undefined,
      refundAmount: data.refund_amount ? parseFloat(data.refund_amount.toString()) : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('[orders] getOrderById failed:', error);
    return null;
  }
};
