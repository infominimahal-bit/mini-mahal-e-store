import React from 'react';

export function CardSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#16162a] p-3 shadow-sm">
      <div className="aspect-square w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="w-full animate-pulse grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Left side: Images */}
      <div className="space-y-4">
        <div className="aspect-square w-full rounded-3xl bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
      {/* Right side: Details */}
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-11/12 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <hr className="border-gray-100 dark:border-gray-850" />
        <div className="space-y-4">
          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="flex gap-2">
            <div className="h-9 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-9 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-9 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="flex gap-2">
            <div className="h-9 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-9 w-16 rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="h-12 w-full rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

export function AdminStatsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#16162a] p-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-[#16162a] overflow-hidden animate-pulse">
      {/* Table Header */}
      <div className="border-b border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-[#0f0f1b] p-4 flex gap-4">
        <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-1/6 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700 ml-auto" />
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3.5 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-16 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
