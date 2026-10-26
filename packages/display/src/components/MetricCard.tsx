// ============================================================
// CulinaryOS — MetricCard Component for TV Wallboards
// High-visibility, distance-legible metrics for 10-foot viewing
// ============================================================

import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral' | 'alert';
  variant?: 'default' | 'accent' | 'alert' | 'success' | 'warning';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-[#0f172a]/90 border-slate-800 text-slate-100',
    accent: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
    alert: 'bg-red-950/40 border-red-500/50 text-red-200',
    success: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200',
    warning: 'bg-orange-950/40 border-orange-500/50 text-orange-200',
  }[variant];

  return (
    <div
      className={`p-6 rounded-2xl border flex flex-col justify-between shadow-lg ${variantStyles} ${className}`}
    >
      <span className="text-sm font-mono font-bold tracking-widest uppercase opacity-75">
        {label}
      </span>

      <div className="my-2">
        <span className="text-5xl font-black font-mono tracking-tight">{value}</span>
      </div>

      {subValue && (
        <span className="text-xs font-semibold tracking-wider opacity-80">{subValue}</span>
      )}
    </div>
  );
};
