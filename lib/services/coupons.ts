'use server';

import { createClient } from '@/lib/supabase/server';
import { Coupon } from '@/lib/types';
import { revalidateTag } from 'next/cache';

interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  min_cart_amount?: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const mapCoupon = (row: CouponRow): Coupon => ({
  id: row.id,
  code: row.code,
  discountType: row.discount_type,
  value: Number(row.value),
  minCartAmount: row.min_cart_amount ? Number(row.min_cart_amount) : undefined,
  active: row.active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export const getCoupons = async (): Promise<Coupon[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapCoupon);
  } catch (error) {
    console.error('[coupons] getCoupons failed:', error);
    throw error;
  }
};

export const createCoupon = async (coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>): Promise<Coupon> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: coupon.code.trim().toUpperCase(),
        discount_type: coupon.discountType,
        value: coupon.value,
        min_cart_amount: coupon.minCartAmount || 0,
        active: coupon.active
      })
      .select('*')
      .single();

    if (error) throw error;
    (revalidateTag as any)('coupons');
    return mapCoupon(data);
  } catch (error) {
    console.error('[coupons] createCoupon failed:', error);
    throw error;
  }
};

export const updateCoupon = async (id: string, coupon: Partial<Coupon>): Promise<Coupon> => {
  try {
    const supabase = await createClient();
    const updatePayload: any = {};
    if (coupon.code !== undefined) updatePayload.code = coupon.code.trim().toUpperCase();
    if (coupon.discountType !== undefined) updatePayload.discount_type = coupon.discountType;
    if (coupon.value !== undefined) updatePayload.value = coupon.value;
    if (coupon.minCartAmount !== undefined) updatePayload.min_cart_amount = coupon.minCartAmount;
    if (coupon.active !== undefined) updatePayload.active = coupon.active;

    const { data, error } = await supabase
      .from('coupons')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    (revalidateTag as any)('coupons');
    return mapCoupon(data);
  } catch (error) {
    console.error('[coupons] updateCoupon failed:', error);
    throw error;
  }
};

export const deleteCoupon = async (id: string): Promise<void> => {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    (revalidateTag as any)('coupons');
  } catch (error) {
    console.error('[coupons] deleteCoupon failed:', error);
    throw error;
  }
};

export const validateCouponCode = async (code: string, subtotal: number): Promise<{ coupon: Coupon } | { error: string } | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle();

    if (error) return { error: 'Failed to validate coupon. Please try again.' };
    if (!data) return null;

    const coupon = mapCoupon(data);
    if (coupon.minCartAmount && subtotal < coupon.minCartAmount) {
      return { error: `Minimum order amount of Rs. ${coupon.minCartAmount} is required for this coupon.` };
    }

    return { coupon };
  } catch (error: any) {
    console.error('[coupons] validateCouponCode failed:', error);
    return { error: 'Failed to validate coupon. Please try again.' };
  }
};
