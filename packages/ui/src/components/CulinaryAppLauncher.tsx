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
  telemetryOverrides?: Partial<Record<CulinaryAppId, { badge: string; isAlert?: boolean }>>;
}

const groupLabels = {
  operations: 'Core Operations & Live Service',
  guest: 'Inventory, Production & Guest',
  platform: 'Platform & Hardware Workstations',
} as const;

export const DEFAULT_APP_TELEMETRY: Record<CulinaryAppId, { badge: string; isAlert?: boolean }> = {
  pos: { badge: '14 Active Tables • $4.2k Gross' },
  kds: { badge: '6 Queued • 8m Avg Wait' },
  admin: { badge: '1 Location • 4 Pending Approvals' },
  kitchenkit: { badge: '3 Low Par Alerts', isAlert: true },
  ops: { badge: '28.4% COGS (Target 28%)' },
  web: { badge: '12 Pickup Orders' },
  recipeos: { badge: '142 Active Recipes' },
  desktop: { badge: '3 Devices Synced' },
};

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
  telemetryOverrides,
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
                    // Only show metrics supplied by the host; sample figures are not live evidence.
                    const telemetry = telemetryOverrides?.[app.id];
                    return (
                      <a
                        key={app.id}
                        href={resolveCulinaryAppHref(app.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'min-h-[82px] rounded-2xl border p-3.5 text-left transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.97] flex items-start gap-3 relative',
                          isActive
                            ? 'border-orange-500/80 bg-slate-900 text-white shadow-md ring-1 ring-orange-500/50'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                            isActive ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-slate-100 text-slate-700',
                          )}
                        >
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-1.5">
                            <span className="truncate text-xs font-black">{app.label}</span>
                            {isActive && (
                              <span className="rounded-full bg-orange-500 text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 shadow-xs">
                                Active Workspace
                              </span>
                            )}
                          </span>
                          <span className={cn('mt-0.5 block text-[11px] leading-snug', isActive ? 'text-slate-300' : 'text-slate-500')}>
                            {app.description}
                          </span>
                          {telemetry && (
                            <span className="mt-2 flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold font-mono tracking-tight',
                                  telemetry.isAlert
                                    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                    : isActive
                                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                                )}
                              >
                                <span className={cn('w-1.5 h-1.5 rounded-full', telemetry.isAlert ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500')} />
                                <span>{telemetry.badge}</span>
                              </span>
                            </span>
                          )}
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
