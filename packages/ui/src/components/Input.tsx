import * as React from 'react';
import { cn } from '../lib/utils';
import { Label } from './Label';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Visible label rendered above the input (wired via htmlFor).
   * When set, the input is wrapped in a field container.
   */
  label?: React.ReactNode;
  /** Helper text shown below the input when there is no error. */
  hint?: React.ReactNode;
  /** Error message shown below the input; also switches the input to the
   *  destructive ring/border and sets aria-invalid + aria-describedby. */
  error?: React.ReactNode;
}

const baseInputClasses =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hint, error, id: idProp, ...props }, ref) => {
    const autoId = React.useId();
    const hasFieldChrome = label != null || hint != null || error != null;
    const id = idProp ?? (hasFieldChrome ? `culinary-input-${autoId}` : undefined);
    const errorId = error && id ? `${id}-error` : undefined;
    const hintId = hint && !error && id ? `${id}-hint` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

    const input = (
      <input
        type={type}
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          baseInputClasses,
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
    );

    // No label/hint/error: render the bare input exactly as before.
    if (!hasFieldChrome) return input;

    return (
      <div className="grid w-full gap-1.5">
        {label != null && <Label htmlFor={id}>{label}</Label>}
        {input}
        {error ? (
          <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : hint != null ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
