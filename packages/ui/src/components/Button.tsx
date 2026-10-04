import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Canonical CulinaryOS Button.
 *
 * Implements the 6-state button engine (AGENTS.md §13):
 *   1. Idle          — resting state
 *   2. Hover         — per-variant hover tint
 *   3. Focus-Visible — 2px solid ring (keyboard / assistive tech)
 *   4. Active        — haptic physics `active:scale-[0.97]`
 *   5. Loading       — FIXED BOUNDS: content is visually hidden but keeps its
 *                      layout box; the spinner overlays centered so the button
 *                      never shifts layout while busy
 *   6. Disabled      — `opacity-50`, pointer events off
 * Plus a terminal Success state (check overlay, same fixed-bounds contract).
 *
 * Touch: prefer `size="touch"` (48px min target) or `size="lg"` for
 * handheld POS / kitchen-rail contexts.
 */
export const buttonVariants = cva(
  'relative inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold transition-all duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.97] cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/95',
        primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/95',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-xs active:bg-accent/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
        destructive: 'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:bg-destructive/95',
        amber: 'bg-[#f59e0b] text-[#090d16] font-extrabold shadow-xs hover:bg-[#d97706] active:bg-[#b45309]',
        ember: 'bg-[#ff6b35] text-white font-extrabold shadow-xs hover:bg-[#ea580c] active:bg-[#c2410c]',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800',
        warning: 'bg-[#f59e0b] text-[#090d16] shadow-xs hover:bg-[#d97706] active:bg-[#b45309]',
        brand: 'bg-[#0f172a] text-white shadow-xs hover:bg-[#182030] active:bg-[#000000] dark:bg-[#090d16]',
      },
      size: {
        default: 'h-12 min-h-[48px] min-w-[48px] px-4 py-2',
        sm: 'h-12 min-h-[48px] min-w-[48px] rounded-lg px-3 text-xs',
        lg: 'h-12 min-h-[48px] rounded-xl px-8 text-sm font-extrabold',
        icon: 'h-12 w-12 min-h-[48px] min-w-[48px] p-0',
        touch: 'h-12 min-h-[48px] min-w-[48px] px-6 text-sm font-black',
        fab: 'h-14 w-14 rounded-2xl shadow-lg',
        'kds-bump': 'h-16 min-h-[64px] min-w-[64px] rounded-xl px-6 text-base font-black tracking-wide',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Radix Slot support — allows rendering the button as a child component (e.g. Next Link / Router Link)
   */
  asChild?: boolean;
  /**
   * Loading state. The button is disabled, content keeps its layout box
   * (invisible), and a spinner overlays centered — no layout shift.
   */
  isLoading?: boolean;
  /**
   * Success state. Same fixed-bounds contract as loading; shows a check.
   * Takes effect only when not loading.
   */
  isSuccess?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, isSuccess, children, disabled, ...props }, ref) => {
    const busy = Boolean(isLoading || isSuccess);
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? true : undefined}
        {...props}
      >
        {/* Content stays in the layout box (invisible when busy) so the
            button's bounds never change between idle / loading / success. */}
        <span
          className={cn('inline-flex items-center justify-center gap-2', busy && 'opacity-0')}
        >
          {children}
        </span>
        {busy && (
          <span className="absolute inset-0 inline-flex items-center justify-center" aria-hidden="true">
            {isLoading ? <LoadingSpinner /> : <Check className="h-4 w-4" strokeWidth={3} />}
          </span>
        )}
        {isLoading && <span className="sr-only">Loading</span>}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
