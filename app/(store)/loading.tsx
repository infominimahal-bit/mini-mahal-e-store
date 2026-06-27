import React from 'react';
import { GridSkeleton } from '@/components/common/LoadingSkeleton';

export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 min-h-[80vh]">
      {/* Page header loading skeleton */}
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-9 w-48 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>

      {/* Grid of product cards */}
      <GridSkeleton count={8} />
    </div>
  );
}
