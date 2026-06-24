'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Review, Product } from '@/lib/types';
import StarRating from './StarRating';
import ReviewsList from './ReviewsList';
import ReviewForm from './ReviewForm';

interface ProductReviewsProps {
  product: Product;
  reviews: Review[];
  averageRating: { average: number; count: number };
}

export default function ProductReviews({
  product,
  reviews,
  averageRating
}: ProductReviewsProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleReviewSubmitted = () => {
    // Force Next.js to revalidate server component data
    startTransition(() => {
      router.refresh();
    });
  };

  const totalCount = reviews.length;
  const distribution = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0
  };

  reviews.forEach(review => {
    const r = Math.round(review.rating);
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5]++;
    }
  });

  const getPercentage = (starNum: 5 | 4 | 3 | 2 | 1) => {
    // If we have actual reviews in the DB, calculate percentages
    if (totalCount > 0) {
      return Math.round((distribution[starNum] / totalCount) * 100);
    }
    
    // Otherwise fallback/simulate based on product rating (fake rating)
    const rating = (averageRating.count > 0 ? averageRating.average : null) ?? product.rating ?? 5;
    const count = averageRating.count ?? product.reviewsCount ?? 0;
    
    if (count === 0) return 0;
    
    if (rating === 5) {
      return starNum === 5 ? 100 : 0;
    }
    if (rating >= 4.8) {
      if (starNum === 5) return 88;
      if (starNum === 4) return 9;
      if (starNum === 3) return 3;
      return 0;
    }
    if (rating >= 4.5) {
      if (starNum === 5) return 72;
      if (starNum === 4) return 21;
      if (starNum === 3) return 7;
      return 0;
    }
    if (rating >= 4.0) {
      if (starNum === 5) return 58;
      if (starNum === 4) return 28;
      if (starNum === 3) return 10;
      if (starNum === 2) return 4;
      return 0;
    }
    // Default fallback
    if (starNum === 5) return 45;
    if (starNum === 4) return 30;
    if (starNum === 3) return 15;
    if (starNum === 2) return 8;
    return 2;
  };

  // Always prefer live averageRating count (only approved reviews)
  const displayRating = (averageRating && averageRating.count > 0) ? averageRating.average : (product.rating ?? 5);
  const displayCount = averageRating ? averageRating.count : (product.reviewsCount ?? 0);

  return (
    <div className="space-y-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-[#16162a] p-6 md:p-8 rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-sm transition-colors duration-200">
        
        {/* Left: Scorecard info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1.5 min-w-[160px]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-405 text-gray-400">Customer Reviews</h3>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white">
              {displayRating > 0 ? displayRating.toFixed(1) : '5.0'}
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">out of 5</span>
          </div>
          <StarRating rating={displayRating} showText={false} starSize={18} />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Based on {displayCount} {displayCount === 1 ? 'rating' : 'ratings'}
          </span>
        </div>

        {/* Middle: Bars */}
        <div className="flex-1 max-w-sm space-y-2 w-full">
          {([5, 4, 3, 2, 1] as const).map((starNum) => {
            const pct = getPercentage(starNum);
            return (
              <div key={starNum} className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                <span className="w-10 text-right">{starNum} star</span>
                <div className="flex-1 mx-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-left text-gray-450 dark:text-gray-500">{pct}%</span>
              </div>
            );
          })}
        </div>

        {/* Right: Write Review Button */}
        <div className="flex items-center justify-center pt-2 md:pt-0">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/5 font-bold text-sm text-gray-800 dark:text-gray-200 transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
          >
            <span>Write a review</span>
          </button>
        </div>
      </div>

      {/* Form collapse/expand */}
      {showForm && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-850 shadow-md">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Share your experience</h4>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 text-xs font-bold uppercase"
            >
              Cancel
            </button>
          </div>
          <ReviewForm
            productId={product.id}
            onReviewSubmitted={() => {
              setShowForm(false);
              handleReviewSubmitted();
            }}
          />
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <ReviewsList reviews={reviews} loading={isPending} />
      </div>
    </div>
  );
}
