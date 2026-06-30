'use client';

import React from 'react';
import { Send } from '@/components/common/Icons';
import { useCartStore } from '@/store/cartStore';
import { StoreSettings } from '@/lib/types';
import { generateWhatsAppMessage, buildWhatsAppURL, formatPrice } from '@/lib/utils/whatsapp';
import { createOrder } from '@/lib/services/orders';
import { toast } from 'sonner';

interface WhatsAppButtonProps {
  settings: StoreSettings;
  customerName: string;
  customerPhone: string;
  notes: string;
  disabled?: boolean;
}

export default function WhatsAppButton({
  settings,
  customerName,
  customerPhone,
  notes,
  disabled = false
}: WhatsAppButtonProps) {
  const items = useCartStore(state => state.items);
  const totalPrice = useCartStore(state => state.totalPrice());
  const appliedCoupon = useCartStore(state => state.appliedCoupon);
  const clearCart = useCartStore(state => state.clearCart);
  const [loading, setLoading] = React.useState(false);

  const handleOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!customerPhone.trim()) {
      toast.error('Please enter your WhatsApp phone number');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate coupon discount
      const couponDiscountAmount = (() => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.discountType === 'percentage') {
          return Math.round((totalPrice * appliedCoupon.value) / 100);
        } else {
          return Math.min(appliedCoupon.value, totalPrice);
        }
      })();

      const finalTotal = Math.max(0, totalPrice - couponDiscountAmount);

      // Calculate order sequence
      const orderData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items,
        subtotal: totalPrice,
        total: finalTotal,
        notes: [
          notes.trim(),
          couponDiscountAmount > 0 ? `Coupon Applied: ${appliedCoupon?.code} (-${formatPrice(couponDiscountAmount, settings.currencySymbol)})` : ''
        ].filter(Boolean).join('\n') || undefined
      };

      // 1. Create order in Supabase database
      const order = await createOrder(orderData);

      // 2. Generate WhatsApp message
      const message = generateWhatsAppMessage(items, settings);
      
      // Append customer details to the WhatsApp message
      const detailedMessage = [
        message,
        ``,
        `*Customer Details:*`,
        `• Name: ${customerName.trim()}`,
        `• Phone: ${customerPhone.trim()}`,
        notes.trim() ? `• Notes: ${notes.trim()}` : '',
        couponDiscountAmount > 0 ? `• Coupon Discount (${appliedCoupon?.code}): -${formatPrice(couponDiscountAmount, settings.currencySymbol)}` : '',
        `*Grand Total: ${formatPrice(finalTotal, settings.currencySymbol)}*`,
        ``,
        `• Order No: ${order.orderNumber}`
      ].filter(Boolean).join('\n');

      const whatsappUrl = buildWhatsAppURL(settings.whatsappNumber || '923001234567', detailedMessage);

      // 3. Clear local cart
      clearCart();

      // 4. Redirect to WhatsApp
      window.open(whatsappUrl, '_blank');
      toast.success('Order created! Redirecting to WhatsApp...');
    } catch (err) {
      console.error('Failed to process order:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleOrder}
      disabled={disabled || loading || !customerName.trim() || !customerPhone.trim()}
      className={`relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-xl transition-all duration-200 shadow-md cursor-pointer active:scale-98 text-white px-5 py-4 text-base font-bold ${
        disabled || loading || !customerName.trim() || !customerPhone.trim() 
          ? 'bg-gray-400 disabled:cursor-not-allowed' 
          : 'bg-[#10b981] hover:bg-[#059669]'
      }`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] pointer-events-none z-10 bg-inherit">
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          <div className="flex items-center gap-2 relative z-10">
            <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}
      <div className={`flex items-center gap-2 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>
        <Send className="h-5 w-5" />
        <span>Confirm Order via WhatsApp</span>
      </div>
    </button>
  );
}
