// ============================================================
// CulinaryOS — FocusRing Component for TV Remote Navigation
// High-contrast, 3px solid focus ring with subtle glow for 10-foot viewing
// ============================================================

import React from 'react';

export interface FocusRingProps {
  isFocused: boolean;
  children: React.ReactNode;
  className?: string;
  focusClassName?: string;
  accentColor?: 'amber' | 'emerald' | 'blue' | 'white';
}

export const FocusRing: React.FC<FocusRingProps> = ({
  isFocused,
  children,
  className = '',
  focusClassName = '',
  accentColor = 'amber',
}) => {
  const accentBorder = {
    amber: 'ring-amber-400 border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.35)]',
    emerald: 'ring-emerald-400 border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.35)]',
    blue: 'ring-blue-400 border-blue-400 shadow-[0_0_24px_rgba(96,165,250,0.35)]',
    white: 'ring-white border-white shadow-[0_0_24px_rgba(255,255,255,0.4)]',
  }[accentColor];

  return (
    <div
      className={`transition-all duration-150 relative ${
        isFocused
          ? `ring-4 ring-offset-2 ring-offset-black scale-[1.02] z-10 ${accentBorder} ${focusClassName}`
          : 'ring-0'
      } ${className}`}
    >
      {children}
    </div>
  );
};
