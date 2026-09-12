import * as React from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import { cn } from '../lib/utils';
import { partitionCompactNavigation, type CompactNavigationItem } from '../navigation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './Sheet';

export type CompactNavigationTone = 'dark' | 'light';

export interface CompactNavigationProps {
  items: readonly CompactNavigationItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
  tone?: CompactNavigationTone;
  maxPrimary?: number;
  className?: string;
}

const toneClasses: Record<CompactNavigationTone, { rail: string; inactive: string; active: string; trigger: string }> = {
  dark: {
    rail: 'bg-slate-950/80 border-slate-800',
    inactive: 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white',
    active: 'border-orange-500 bg-orange-600 text-white shadow-sm',
    trigger: 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700',
  },
  light: {
    rail: 'bg-slate-100/90 border-slate-200',
    inactive: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950',
    active: 'border-slate-900 bg-slate-900 text-white shadow-sm',
    trigger: 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100',
  },
};

export function CompactNavigation({
  items,
  activeId,
  onSelect,
  label,
  tone = 'light',
  maxPrimary = 4,
  className,
}: CompactNavigationProps) {
  const [open, setOpen] = React.useState(false);
  const opener = React.useRef<HTMLButtonElement | null>(null);
  const openSections = (event: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = event.currentTarget;
    setOpen(true);
  };
  const { primary, overflow } = partitionCompactNavigation(items, activeId, maxPrimary);
  const activeItem = items.find((item) => item.id === activeId);
  const styles = toneClasses[tone];

  const select = (id: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.disabled) return;
    onSelect(id);
    setOpen(false);
  };

  const navButtonClass = (item: CompactNavigationItem, compact = false) =>
    cn(
      'min-h-[48px] rounded-xl border text-xs font-bold transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
      compact ? 'w-full px-4 py-3 text-left flex items-center gap-3' : 'px-3.5 py-2 whitespace-nowrap flex items-center gap-1.5',
      item.id === activeId ? styles.active : styles.inactive,
    );

  return (
    <>
      <nav
        aria-label={label}
        className={cn('hidden xl:flex shrink-0 items-center gap-2 rounded-2xl border-2 p-1.5', styles.rail, className)}
      >
        {primary.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            disabled={item.disabled}
            aria-current={item.id === activeId ? 'page' : undefined}
            className={navButtonClass(item)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        {overflow.length > 0 && (
          <button
            type="button"
            onClick={openSections}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              'min-h-[48px] px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 active:scale-[0.97] flex items-center gap-1.5',
              styles.inactive,
            )}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>More</span>
          </button>
        )}
      </nav>

      <button
        type="button"
        onClick={openSections}
        aria-label={`${label}: ${activeItem?.label ?? 'choose section'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'xl:hidden min-h-[48px] max-w-[10.5rem] px-3 rounded-xl border text-xs font-bold transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 active:scale-[0.97] flex items-center gap-1.5 truncate',
          styles.trigger,
        )}
      >
        <span className="shrink-0">{activeItem?.icon ?? <MoreHorizontal className="h-4 w-4" aria-hidden="true" />}</span>
        <span className="min-w-0 truncate hidden sm:inline">{activeItem?.label ?? label}</span>
        <span className="sm:hidden">Sections</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          side="bottom"
          aria-label={label}
          className="max-h-[85vh] rounded-t-3xl border-slate-200 bg-white p-0 text-slate-900"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />
          <SheetHeader className="px-5 pt-4 pr-14">
            <SheetTitle className="text-sm font-black uppercase tracking-wider text-slate-950">{label}</SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Choose a section to continue.
            </SheetDescription>
          </SheetHeader>
          <nav aria-label={`${label} sections`} className="grid grid-cols-1 gap-2 overflow-y-auto px-4 pb-6 sm:grid-cols-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                disabled={item.disabled}
                aria-current={item.id === activeId ? 'page' : undefined}
                className={navButtonClass(item, true)}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.id === activeId && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">Current</span>
                )}
              </button>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
