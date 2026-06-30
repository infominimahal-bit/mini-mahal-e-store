'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from '@/components/common/Icons';

type Variant = 'primary' | 'secondary' | 'outline' | 'accent' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantsMap: Record<Variant, string> = {
  primary:   'bg-primary hover:bg-primary-hover text-white shadow-btn active:scale-95',
  secondary: 'bg-secondary hover:bg-secondary-hover text-white active:scale-95',
  outline:   'border-2 border-primary text-primary hover:bg-primary-light active:scale-95',
  accent:    'bg-accent hover:bg-accent-hover text-white active:scale-95',
  ghost:     'hover:bg-surface-2 text-text active:scale-95',
  danger:    'bg-error hover:bg-error/90 text-white active:scale-95',
  whatsapp:  'bg-whatsapp hover:bg-[#128C7E] text-white active:scale-95',
};

const sizesMap: Record<Size, string> = {
  // Mobile first & touch-target minimum 44px always: we enforce 44px minimum height even for small buttons
  sm:   'px-3.5 py-2 text-sm rounded-btn min-h-[44px]',
  md:   'px-4 py-3 text-base rounded-btn min-h-[44px]',
  lg:   'px-6 py-4 text-lg rounded-btn min-h-[52px]',
  xl:   'px-8 py-5 text-xl rounded-btn min-h-[60px]',
  full: 'w-full px-4 py-4 text-base rounded-btn min-h-[52px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'relative overflow-hidden font-heading font-semibold transition-all duration-200 inline-flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none',
          variantsMap[variant],
          sizesMap[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            <RefreshCw className="h-5 w-5 animate-spin relative z-10" />
          </div>
        )}
        <div className={cn("inline-flex items-center justify-center gap-2 transition-opacity duration-200", isLoading ? "opacity-0" : "opacity-100")}>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </div>
      </button>
    );
  }
);

Button.displayName = 'Button';
