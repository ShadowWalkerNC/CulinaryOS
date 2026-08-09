import React from 'react';

export interface CulinaryBadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

export const CulinaryBadge: React.FC<CulinaryBadgeProps> = ({
  children,
  variant = 'brand',
  className = '',
}) => {
  const variants = {
    brand: 'bg-[#0f172a0d] text-[#0f172a] border-[#0f172a26]',
    success: 'bg-[#22c55e15] text-[#22c55e] border-[#22c55e30]',
    warning: 'bg-[#f59e0b15] text-[#f59e0b] border-[#f59e0b30]',
    danger: 'bg-red-50 text-red-500 border-red-200',
    neutral: 'bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
