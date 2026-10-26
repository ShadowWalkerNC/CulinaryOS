// ============================================================
// CulinaryOS — StatusChip Component for 10-Foot Distance Viewing
// Bold color + label indicators for kitchen tickets, inventory & health
// ============================================================

import React from 'react';

export interface StatusChipProps {
  label: string;
  variant?: 'cooking' | 'ready' | 'held' | 'late' | 'alert' | 'success' | 'cheezies' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantStyles = {
    cooking: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    ready: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    held: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    late: 'bg-red-500/25 text-red-300 border-red-500/60 font-black animate-pulse',
    alert: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
    success: 'bg-green-500/20 text-green-300 border-green-500/50',
    cheezies: 'bg-amber-400 text-amber-950 border-amber-300 font-extrabold',
    neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  }[variant];

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 tracking-wider font-semibold',
    md: 'text-sm px-3.5 py-1 tracking-wider font-bold',
    lg: 'text-base px-4 py-1.5 tracking-wider font-extrabold',
    xl: 'text-xl px-5 py-2 tracking-widest font-black',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border uppercase ${variantStyles} ${sizeStyles} ${className}`}
    >
      {icon && <span className="inline-block">{icon}</span>}
      {label}
    </span>
  );
};
