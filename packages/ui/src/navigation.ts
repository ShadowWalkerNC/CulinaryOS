import {
  BookOpen,
  ChefHat,
  Laptop,
  ShoppingBag,
  Tablet,
  TrendingUp,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export type CulinaryAppId =
  | 'pos'
  | 'kds'
  | 'admin'
  | 'kitchenkit'
  | 'ops'
  | 'web'
  | 'recipeos'
  | 'desktop';

export type CulinaryAppGroup = 'operations' | 'guest' | 'platform';

export interface CulinaryAppModule {
  id: CulinaryAppId;
  label: string;
  description: string;
  port: number;
  group: CulinaryAppGroup;
  icon: LucideIcon;
}

/**
 * Canonical client-surface registry. Client shells may compose this registry,
 * but should not maintain their own competing lists of CulinaryOS applications.
 */
export const CULINARY_APP_MODULES: readonly CulinaryAppModule[] = [
  {
    id: 'pos',
    label: 'POS Terminal',
    description: 'Orders, tables, tabs, and checkout',
    port: 5172,
    group: 'operations',
    icon: Tablet,
  },
  {
    id: 'kds',
    label: 'KDS Kitchen',
    description: 'Kitchen tickets, stations, and ticket timing',
    port: 5173,
    group: 'operations',
    icon: Tv,
  },
  {
    id: 'admin',
    label: 'Back-Office Admin',
    description: 'Menu, staff, inventory, and integrations',
    port: 5174,
    group: 'operations',
    icon: Laptop,
  },
  {
    id: 'kitchenkit',
    label: 'KitchenKit',
    description: 'Prep, recipes, pars, vendors, and shelf life',
    port: 5175,
    group: 'operations',
    icon: ChefHat,
  },
  {
    id: 'ops',
    label: 'CulinaryOps',
    description: 'Food cost, labor, vendors, and waste',
    port: 5177,
    group: 'operations',
    icon: TrendingUp,
  },
  {
    id: 'web',
    label: 'Guest Storefront',
    description: 'Public menu, ordering, and order tracking',
    port: 5176,
    group: 'guest',
    icon: ShoppingBag,
  },
  {
    id: 'recipeos',
    label: 'RecipeOS',
    description: 'Recipe vault and pantry workspace',
    port: 5178,
    group: 'guest',
    icon: BookOpen,
  },
  {
    id: 'desktop',
    label: 'Desktop Workstation',
    description: 'Local workstation shell and device tools',
    port: 5180,
    group: 'platform',
    icon: Laptop,
  },
];

export interface LocalAppLocation {
  protocol: string;
  hostname: string;
  port?: string;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export function getCulinaryAppModule(id: CulinaryAppId): CulinaryAppModule {
  const app = CULINARY_APP_MODULES.find((candidate) => candidate.id === id);
  if (!app) {
    throw new Error(`Unknown CulinaryOS application: ${id}`);
  }
  return app;
}

/**
 * Keeps local app switching on the host the operator already opened. In a
 * deployed unified shell, use the predictable relative route instead of a
 * localhost-only link.
 */
export function resolveCulinaryAppHref(
  id: CulinaryAppId,
  location?: LocalAppLocation,
): string {
  const app = getCulinaryAppModule(id);
  const currentLocation = location ?? (typeof window !== 'undefined' ? window.location : undefined);

  if (currentLocation && (isLoopbackHost(currentLocation.hostname) ||
    CULINARY_APP_MODULES.some((surface) => String(surface.port) === currentLocation.port))) {
    const hostname = currentLocation.hostname.includes(':') && !currentLocation.hostname.startsWith('[')
      ? `[${currentLocation.hostname}]` : currentLocation.hostname;
    return `${currentLocation.protocol}//${hostname}:${app.port}/`;
  }

  return `/${app.id}/`;
}

export interface CompactNavigationItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Keep this section visible in the desktop quick-access rail when possible. */
  primary?: boolean;
}

export interface CompactNavigationLayout {
  primary: CompactNavigationItem[];
  overflow: CompactNavigationItem[];
}

/**
 * Splits a long page list into a compact quick rail and an explicit overflow
 * sheet. The active page is always promoted into the quick rail, so it never
 * disappears behind an unlabeled overflow control.
 */
export function partitionCompactNavigation(
  items: readonly CompactNavigationItem[],
  activeId: string,
  maxPrimary = 4,
): CompactNavigationLayout {
  const limit = Math.max(1, Math.floor(maxPrimary));
  const preferredItems = items.filter((item) => item.primary);
  const candidates = preferredItems.length > 0 ? preferredItems : items;
  const primaryIds = candidates.slice(0, limit).map((item) => item.id);
  const activeItem = items.find((item) => item.id === activeId);

  if (activeItem && !activeItem.disabled && !primaryIds.includes(activeItem.id)) {
    if (primaryIds.length >= limit) {
      primaryIds[primaryIds.length - 1] = activeItem.id;
    } else {
      primaryIds.push(activeItem.id);
    }
  }

  const primaryIdSet = new Set(primaryIds);
  return {
    primary: primaryIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is CompactNavigationItem => item !== undefined),
    overflow: items.filter((item) => !primaryIdSet.has(item.id)),
  };
}
