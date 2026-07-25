import React from 'react';

export interface CulinaryCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const CulinaryCard: React.FC<CulinaryCardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  headerAction,
}) => {
  return (
    <div className={`bg-white border border-[#e5e7eb] rounded-2xl shadow-xs p-5 transition-all ${className}`}>
      {(title || headerAction) && (
        <div className="flex justify-between items-center mb-4 border-b border-[#f3f4f6] pb-3">
          <div>
            {title && <h3 className="text-xs font-black text-[#1f2937] uppercase tracking-wider">{title}</h3>}
            {subtitle && <p className="text-[10px] text-[#6b7280] mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
