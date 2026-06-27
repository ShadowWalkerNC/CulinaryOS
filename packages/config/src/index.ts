// @culinaryos/config
// Env schema validation, shared constants, feature flags.
// TODO(phase-0): add zod env validation

export const KDS_TICKET_AGE_WARN_SECONDS = 300;   // 5 min — yellow
export const KDS_TICKET_AGE_CRIT_SECONDS = 600;   // 10 min — red
export const PO_AUTO_APPROVE_THRESHOLD_USD = 500;  // POs under $500 auto-approve
export const MENU_CACHE_TTL_SECONDS = 60;

export const SUPPORTED_CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR'] as const;
export type Currency = typeof SUPPORTED_CURRENCIES[number];
