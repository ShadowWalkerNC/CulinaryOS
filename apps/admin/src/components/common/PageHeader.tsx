import React, { useState } from 'react';
import { Sparkles, HelpCircle, ChevronRight, X } from '@culinaryos/ui';

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  purpose: string;
  badge?: string;
  helpContext?: {
    summary: string;
    tips: string[];
  };
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
}

export function PageHeader({
  title,
  purpose,
  badge,
  helpContext,
  primaryAction,
  secondaryActions = [],
}: PageHeaderProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="mb-6 space-y-3">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                {badge}
              </span>
            )}
            {helpContext && (
              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors"
                title="Learn how this page works"
                aria-label="Learn how this page works"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {purpose}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {secondaryActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.97] flex items-center gap-1.5 ${
                action.variant === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-[0.97] flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Plain-Language Context Helper */}
      {showHelp && helpContext && (
        <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 text-xs text-slate-800 space-y-2 animate-fadeIn relative">
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 font-bold text-orange-900">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>How to use this area</span>
          </div>
          <p className="text-slate-700 leading-relaxed">{helpContext.summary}</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pt-1">
            {helpContext.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
