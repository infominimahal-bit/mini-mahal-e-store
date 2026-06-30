'use client';

import React, { useState } from 'react';
import { Copy, Loader2 } from '@/components/common/Icons';
import { useRouter } from 'next/navigation';

interface DuplicateProductButtonProps {
  productId: string;
}

export default function DuplicateProductButton({ productId }: DuplicateProductButtonProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleDuplicate = () => {
    setIsNavigating(true);
    router.push(`/admin/products/new?duplicate=${productId}`);
  };

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={isNavigating}
      className={`inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#16162a] text-slate-700 dark:text-gray-200 text-xs font-bold transition-all shadow-sm ${
        isNavigating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-gray-800 cursor-pointer'
      }`}
    >
      {isNavigating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span>{isNavigating ? 'Duplicating...' : 'Duplicate'}</span>
    </button>
  );
}
