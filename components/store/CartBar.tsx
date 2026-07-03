'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, ArrowRight } from '@/components/common/Icons';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils/whatsapp';

interface CartBarProps {
  currencySymbol?: string;
}

export default function CartBar({ currencySymbol = 'Rs.' }: CartBarProps) {
  const totalItems = useCartStore(state => state.totalItems());
  const totalPrice = useCartStore(state => state.totalPrice());
  const pathname = usePathname();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Hide on cart/checkout page
  if (!mounted || totalItems === 0 || pathname === '/cart') return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 px-4 py-2 bg-white/95 dark:bg-[#16162a]/95  border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden">
      <Link
        href="/cart"
        className="w-full flex items-center justify-between rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] active:scale-[0.98] text-white px-5 py-3 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e94560] text-[8px] font-bold text-white ring-1 ring-[#1a1a2e]">
              {totalItems}
            </span>
          </div>
          <span className="text-sm font-semibold">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold">
            {formatPrice(totalPrice, currencySymbol)}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 opacity-70" />
        </div>
      </Link>
    </div>
  );
}
