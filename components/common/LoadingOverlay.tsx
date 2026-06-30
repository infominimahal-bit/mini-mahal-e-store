import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingOverlayProps {
  isLoading: boolean;
  text?: string;
  spinnerClass?: string;
}

export function LoadingOverlay({ isLoading, text, spinnerClass = "h-5 w-5" }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] overflow-hidden pointer-events-none z-10">
      <div className="absolute inset-0 bg-black/10 dark:bg-white/10 animate-pulse"></div>
      <div className="flex items-center gap-2 relative z-10">
        <RefreshCw className={`animate-spin ${spinnerClass}`} />
        {text && <span className="font-bold text-sm">{text}</span>}
      </div>
    </div>
  );
}
