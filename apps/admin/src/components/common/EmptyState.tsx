import React from 'react';
import { Sparkles } from '@culinaryos/ui';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  sampleDataLoader?: {
    label: string;
    onLoadSample: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  sampleDataLoader,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto my-6 space-y-4 shadow-2xs">
      <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
        {icon}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
          {description}
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-xs active:scale-[0.97] transition-all"
          >
            {actionLabel}
          </button>
        )}

        {secondaryLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs active:scale-[0.97] transition-all"
          >
            {secondaryLabel}
          </button>
        )}
      </div>

      {sampleDataLoader && (
        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={sampleDataLoader.onLoadSample}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{sampleDataLoader.label}</span>
          </button>
        </div>
      )}
    </div>
  );
}
