// ============================================================
// CulinaryOS — Canonical station mapping (shared client + server)
// ============================================================

/** UI tab id → DB kitchen_tickets.station value(s) */
export const UI_STATION_TO_DB: Record<string, string[]> = {
  '1': ['grill', 'hot'],
  '2': ['cold'],
  '3': ['fry'],
  '4': ['bar'],
  grill: ['grill'],
  hot: ['hot'],
  cold: ['cold'],
  fry: ['fry'],
  bar: ['bar'],
  pastry: ['pastry'],
  sauce: ['sauce'],
  pass: ['pass'],
  expo: [],
  all: [],
};

/** DB station → primary UI tab id */
export const DB_STATION_TO_UI: Record<string, string> = {
  grill: '1',
  hot: '1',
  cold: '2',
  fry: '3',
  bar: '4',
  pastry: 'pastry',
  sauce: 'sauce',
  pass: 'pass',
};

export const STATION_LABELS: Record<string, string> = {
  '1': 'Hot Grill',
  grill: 'Hot Grill',
  hot: 'Hot Grill',
  '2': 'Cold Prep',
  cold: 'Cold Prep',
  '3': 'Fryer',
  fry: 'Fryer',
  '4': 'Bar',
  bar: 'Bar',
  pastry: 'Pastry',
  sauce: 'Sauce',
  pass: 'Pass',
  expo: 'Expo Pass',
  all: 'All Stations',
};

/** Statuses visible on active KDS boards (matches DB check constraint; no `ready`) */
export const KDS_ACTIVE_STATUSES = ['queued', 'fired', 'cooking'] as const;

export function resolveDbStations(stationId: string): string[] {
  return UI_STATION_TO_DB[stationId] ?? [stationId];
}

export function uiStationFromDb(station: string | undefined | null): string | undefined {
  if (!station) return undefined;
  return DB_STATION_TO_UI[station] ?? station;
}

export function stationLabel(stationOrUiId: string | undefined | null): string | undefined {
  if (!stationOrUiId) return undefined;
  return STATION_LABELS[stationOrUiId] ?? stationOrUiId;
}
