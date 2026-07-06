'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/lib/hooks/useCart';

const CART_SESSION_KEY = 'zaynahs_cart_session';
const DEBOUNCE_MS = 2000; // wait 2s after last change before saving

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem(CART_SESSION_KEY);
  if (!sid) {
    sid = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(CART_SESSION_KEY, sid);
  }
  return sid;
}

interface AbandonedCartData {
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerApartment?: string;
  customerPostalCode?: string;
  items: any[];
  subtotal: number;
  currency: string;
}

/**
 * useAbandonedCartTracker
 * Automatically saves cart state to the abandoned_carts table.
 * Call updateContact() when the user fills in checkout details.
 * Call markOrdered() when order is placed to suppress the email.
 */
export function useAbandonedCartTracker(currency = 'PKR') {
  const items = useCart(s => s.items);
  const totalPrice = useCart(s => s.totalPrice());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contactRef = useRef<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    apartment?: string;
    city?: string;
    postalCode?: string;
  }>({});
  const sessionId = useRef<string>('');

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();
  }, []);

  const saveToServer = useCallback(async (data: AbandonedCartData) => {
    if (!data.sessionId || data.items.length === 0) return;
    try {
      await fetch('/api/abandoned-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.error('[AbandonedCartTracker] Save failed:', err);
    }
  }, []);

  // Debounced save on every cart change
  useEffect(() => {
    if (!sessionId.current) return;
    if (items.length === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToServer({
        sessionId: sessionId.current,
        customerName: contactRef.current.name,
        customerEmail: contactRef.current.email,
        customerPhone: contactRef.current.phone,
        customerAddress: contactRef.current.address,
        customerCity: contactRef.current.city,
        customerApartment: contactRef.current.apartment,
        customerPostalCode: contactRef.current.postalCode,
        items: items.map(item => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            images: item.product.images?.slice(0, 1),
          },
          quantity: item.quantity,
          price: item.unitPrice,
          selectedVariant: item.selectedVariant,
        })),
        subtotal: totalPrice,
        currency,
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [items, totalPrice, currency, saveToServer]);

  /** Call this when user fills in checkout contact details */
  const updateContact = useCallback((contact: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    apartment?: string;
    city?: string;
    postalCode?: string;
  }) => {
    contactRef.current = contact;
    if (!sessionId.current || items.length === 0) return;
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveToServer({
        sessionId: sessionId.current,
        customerName: contact.name,
        customerEmail: contact.email,
        customerPhone: contact.phone,
        customerAddress: contact.address,
        customerCity: contact.city,
        customerApartment: contact.apartment,
        customerPostalCode: contact.postalCode,
        items: items.map(item => ({
          product: {
            id: item.product.id,
            name: item.product.name,
            images: item.product.images?.slice(0, 1),
          },
          quantity: item.quantity,
          price: item.unitPrice,
          selectedVariant: item.selectedVariant,
        })),
        subtotal: totalPrice,
        currency,
      });
    }, DEBOUNCE_MS);
  }, [items, totalPrice, currency, saveToServer]);

  /** Call this immediately when order is placed to mark cart as recovered */
  const markOrdered = useCallback(async (orderId: string) => {
    if (!sessionId.current) return;
    try {
      await fetch('/api/abandoned-cart/mark-ordered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, orderId }),
      });
    } catch (err) {
      console.error('[AbandonedCartTracker] markOrdered failed:', err);
    }
  }, []);

  return { updateContact, markOrdered, sessionId: sessionId.current };
}
