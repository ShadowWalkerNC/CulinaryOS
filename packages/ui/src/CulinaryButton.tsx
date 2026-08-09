import React from 'react';

export interface CulinaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const CulinaryButton: React.FC<CulinaryButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyle = 'font-black uppercase tracking-wider transition-all rounded-xl border flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 select-none';
  
  const variants = {
    primary: 'bg-[#0f172a] hover:bg-[#1e293b] text-white border-[#0f172a] shadow-xs',
    secondary: 'bg-[#1f2937] hover:bg-[#111827] text-white border-[#1f2937] shadow-xs',
    outline: 'bg-white hover:bg-[#f8f9fa] text-[#1f2937] border-[#e5e7eb]',
    danger: 'bg-red-500 hover:bg-red-600 text-white border-red-500 shadow-xs',
    ghost: 'bg-transparent hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#1f2937] border-transparent',
  };

  const sizes = {
    sm: 'text-[9px] px-2.5 py-1.5',
    md: 'text-[10px] px-4 py-2.5',
    lg: 'text-xs px-5 py-3.5',
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};
