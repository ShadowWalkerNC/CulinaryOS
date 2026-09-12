import * as React from 'react';
import { Grid } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  CULINARY_APP_MODULES,
  resolveCulinaryAppHref,
  type CulinaryAppId,
  type CulinaryAppModule,
} from '../navigation';
import { Sheet, SheetTrigger, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './Sheet';

export interface CulinaryAppLauncherProps {
  activeApp: CulinaryAppId;
  label?: string;
  className?: string;
  tone?: 'dark' | 'light';
  appIds?: readonly CulinaryAppId[];
}

const groupLabels = {
  operations: 'Operations',
  guest: 'Guest and recipe',
  platform: 'Platform',
} as const;

const toneClasses = {
  dark: 'border-slate-700 bg-slate-800/80 text-slate-100 hover:bg-slate-700',
  light: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
} as const;

export function CulinaryAppLauncher({
  activeApp,
  label = 'Apps',
  className,
  tone = 'light',
  appIds,
}: CulinaryAppLauncherProps) {
  const [open, setOpen] = React.useState(false);
  const apps = appIds
    ? CULINARY_APP_MODULES.filter((app) => appIds.includes(app.id))
    : CULINARY_APP_MODULES;
  const groups = apps.reduce<Record<CulinaryAppModule['group'], CulinaryAppModule[]>>(
    (result, app) => {
      result[app.group].push(app);
      return result;
    },
    { operations: [], guest: [], platform: [] },
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
      <button
        type="button"
        aria-label="Open CulinaryOS applications"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'min-h-[48px] min-w-[48px] rounded-xl border px-3 text-xs font-bold transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 active:scale-[0.97] flex items-center justify-center gap-1.5',
          toneClasses[tone],
          className,
        )}
      >
        <Grid className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
      </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        aria-label="CulinaryOS application launcher"
        className="max-h-[88vh] rounded-t-3xl border-slate-200 bg-white p-0 text-slate-900"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />
        <SheetHeader className="px-5 pt-4 pr-14">
          <SheetTitle className="text-sm font-black uppercase tracking-wider text-slate-950">
            CulinaryOS applications
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Choose a CulinaryOS workspace.
          </SheetDescription>
        </SheetHeader>
        <div className="max-h-[64vh] space-y-5 overflow-y-auto px-4 pb-6">
          {(Object.keys(groupLabels) as CulinaryAppModule['group'][]).map((group) => {
            const groupApps = groups[group];
            if (groupApps.length === 0) return null;
            return (
              <section key={group} aria-label={groupLabels[group]}>
                <h3 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {groupLabels[group]}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {groupApps.map((app) => {
                    const Icon = app.icon;
                    const isActive = app.id === activeApp;
                    return (
                      <a
                        key={app.id}
                        href={resolveCulinaryAppHref(app.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'min-h-[76px] rounded-2xl border p-3 text-left transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.97] flex items-start gap-3',
                          isActive
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700',
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-xs font-black">{app.label}</span>
                            {isActive && (
                              <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide">
                                Current
                              </span>
                            )}
                          </span>
                          <span className={cn('mt-1 block text-[11px] leading-snug', isActive ? 'text-slate-300' : 'text-slate-500')}>
                            {app.description}
                          </span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
