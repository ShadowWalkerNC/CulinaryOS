import * as React from 'react';
import { X, Delete, Check } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

export interface KeypadModalProps {
  /** Controls visibility of the keypad modal */
  open: boolean;
  /** Callback fired when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Header title, e.g. "Enter Tip Amount", "Split Check", "Enter PIN" */
  title?: string;
  /** Header description or secondary context */
  subtitle?: string;
  /** Formatting mode: 'currency' | 'decimal' | 'integer' | 'pin' */
  mode?: 'currency' | 'decimal' | 'integer' | 'pin';
  /** Initial or controlled raw value string */
  value?: string;
  /** Subtotal in integer cents, used to compute percentage amounts */
  subtotalCents?: number;
  /** Quick-preset percentage chips, e.g. [15, 18, 20, 25] or split counts [2, 3, 4, 5] */
  presets?: number[];
  /** Label unit for presets, defaults to '%' */
  presetUnit?: string;
  /** Currency symbol, defaults to '$' */
  currencySymbol?: string;
  /** Maximum character length */
  maxDigits?: number;
  /** Callback fired upon confirming input (returns string and numeric cents) */
  onConfirm: (val: string, cents?: number) => void;
  /** Callback fired upon cancel / dismiss */
  onCancel?: () => void;
}

export const KeypadModal: React.FC<KeypadModalProps> = ({
  open,
  onOpenChange,
  title = 'Enter Amount',
  subtitle,
  mode = 'currency',
  value: initialValue = '',
  subtotalCents,
  presets = [15, 18, 20, 25],
  presetUnit = '%',
  currencySymbol = '$',
  maxDigits = 8,
  onConfirm,
  onCancel,
}) => {
  const [inputStr, setInputStr] = React.useState<string>(initialValue);
  const [selectedPreset, setSelectedPreset] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open) {
      setInputStr(initialValue);
      setSelectedPreset(null);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleDigit = (digit: string) => {
    setSelectedPreset(null);
    if (inputStr.length >= maxDigits) return;

    if (mode === 'currency') {
      // Currency mode interprets numeric input as cents
      const cleaned = inputStr.replace(/\D/g, '');
      const next = cleaned === '0' ? digit : cleaned + digit;
      setInputStr(next);
    } else if (mode === 'decimal') {
      if (digit === '.' && inputStr.includes('.')) return;
      setInputStr((prev) => prev + digit);
    } else {
      setInputStr((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setSelectedPreset(null);
    if (mode === 'currency') {
      const cleaned = inputStr.replace(/\D/g, '');
      setInputStr(cleaned.slice(0, -1));
    } else {
      setInputStr((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setSelectedPreset(null);
    setInputStr('');
  };

  const handleSelectPreset = (preset: number) => {
    setSelectedPreset(preset);
    if (mode === 'currency' && subtotalCents !== undefined && presetUnit === '%') {
      const tipCents = Math.round((subtotalCents * preset) / 100);
      setInputStr(String(tipCents));
    } else {
      setInputStr(String(preset));
    }
  };

  const getDisplayValue = (): string => {
    if (mode === 'currency') {
      const cents = parseInt(inputStr.replace(/\D/g, '') || '0', 10);
      return `${currencySymbol}${(cents / 100).toFixed(2)}`;
    }
    if (mode === 'pin') {
      return '•'.repeat(inputStr.length) || ' ';
    }
    return inputStr || '0';
  };

  const handleConfirm = () => {
    if (mode === 'currency') {
      const cents = parseInt(inputStr.replace(/\D/g, '') || '0', 10);
      onConfirm(inputStr, cents);
    } else {
      const parsedNum = parseFloat(inputStr) || 0;
      onConfirm(inputStr, Math.round(parsedNum * 100));
    }
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn select-none"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keypad-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 dark:border-white/10 bg-card text-card-foreground p-6 shadow-2xl space-y-5 animate-scale-spring"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 id="keypad-modal-title" className="text-base font-black uppercase tracking-wider text-foreground">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97]"
            aria-label="Close Keypad"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Readout */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-right">
          <div className="text-3xl font-black font-mono tracking-tight text-foreground truncate">
            {getDisplayValue()}
          </div>
          {subtotalCents !== undefined && mode === 'currency' && (
            <div className="text-[11px] text-muted-foreground font-semibold mt-1">
              Subtotal: {currencySymbol}{(subtotalCents / 100).toFixed(2)}
              {selectedPreset !== null && (
                <span className="text-amber-500 font-bold ml-1.5">
                  ({selectedPreset}{presetUnit})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preset Percentage Chips */}
        {presets.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset;
              let chipCalculated = '';
              if (mode === 'currency' && subtotalCents !== undefined && presetUnit === '%') {
                const dollars = ((subtotalCents * preset) / 100 / 100).toFixed(2);
                chipCalculated = `${currencySymbol}${dollars}`;
              }

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    'min-h-[48px] h-12 rounded-lg border font-bold text-xs flex flex-col items-center justify-center transition-transform duration-75 ease-out select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer',
                    isSelected
                      ? 'bg-[#f59e0b] text-[#090d16] border-[#f59e0b] shadow-xs'
                      : 'bg-card hover:bg-muted/60 border-border text-foreground'
                  )}
                >
                  <span className="font-extrabold">{preset}{presetUnit}</span>
                  {chipCalculated && (
                    <span className={cn('text-[9px] font-mono', isSelected ? 'text-black/80' : 'text-muted-foreground')}>
                      {chipCalculated}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 48px Tactile Numeric Keypad Grid */}
        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 min-h-[48px] min-w-[48px] rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground font-black text-lg transition-transform duration-75 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Clear (C), 0, Backspace */}
          <button
            type="button"
            onClick={handleClear}
            className="h-13 min-h-[48px] min-w-[48px] rounded-xl border border-border bg-card hover:bg-destructive/10 hover:border-destructive/40 text-muted-foreground hover:text-destructive font-black text-sm uppercase tracking-wider transition-transform duration-75 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
          >
            C
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 min-h-[48px] min-w-[48px] rounded-xl border border-border bg-card hover:bg-muted/60 text-foreground font-black text-lg transition-transform duration-75 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 min-h-[48px] min-w-[48px] rounded-xl border border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center transition-transform duration-75 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs cursor-pointer"
            aria-label="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={handleDismiss}
            className="w-full text-xs uppercase tracking-wider font-extrabold"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="amber"
            size="touch"
            onClick={handleConfirm}
            className="w-full text-xs uppercase tracking-wider font-black flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Confirm</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
KeypadModal.displayName = 'KeypadModal';
