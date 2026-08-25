import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/80',
        outline: 'text-foreground border-border',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold',
        warning: 'border-amber-200 bg-amber-50 text-amber-700 font-bold',
        info: 'border-blue-200 bg-blue-50 text-blue-700 font-bold',
        brand: 'border-slate-800/20 bg-slate-900 text-white font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ className, variant, pulse, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {pulse && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-ping" />}
      {children}
    </div>
  );
}
