/**
 * Canonical CulinaryOS Open-Source Core vs. Paid SaaS Tier & Resilience Matrix.
 *
 * Principle: Local restaurant operations (POS, KDS, Cash/Terminal payments, local ESC/POS
 * printing, FLSA tip pools, Z-reports, and deterministic Chef's Intelligence math) are
 * FREE FOREVER (MIT Open-Source) and 100% offline-capable.
 *
 * Paid SaaS subscriptions (Cloud Pro & Enterprise Multi-Unit) unlock optional hosted cloud
 * replication, commission-free public online ordering relay, generative AI Autopilot (behind
 * an off-by-default flag per Rule 6), and multi-unit central commissary orchestration.
 */

export type CulinaryTierId = 'free_opensource' | 'cloud_pro' | 'enterprise_multi_unit';

export type SaasAddonKey =
  | 'cloud_storage'
  | 'online_ordering'
  | 'ai_autopilot'
  | 'multi_unit_commissary';

export interface CulinaryTierSpec {
  id: CulinaryTierId;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  perTerminalFeeCents: 0;
  license: 'MIT Open-Source' | 'Commercial SaaS Subscription';
  offlineCapable: true;
  includedAddons: SaasAddonKey[];
  highlights: string[];
}

export const CULINARYOS_TIERS: Record<CulinaryTierId, CulinaryTierSpec> = {
  free_opensource: {
    id: 'free_opensource',
    name: 'CulinaryOS Core (Open-Source)',
    tagline: 'Complete local-first POS, KDS, Back-Office & Deterministic Kitchen Math — Free Forever',
    monthlyPriceCents: 0,
    perTerminalFeeCents: 0,
    license: 'MIT Open-Source',
    offlineCapable: true,
    includedAddons: [],
    highlights: [
      'Unlimited POS terminals, 2D floor plan, seat/course pacing, split checks & bar tabs',
      'Unlimited KDS kitchen station screens (Hot, Cold, Grill, Fry, Pastry, Bar, Expo) & 86 board',
      'Standalone Native Rust Workstation on Port 3000 with embedded local database',
      'Direct LAN TCP :9100 & USB ESC/POS receipt/impact printing + RJ11/RJ12 cash drawer kick',
      'Hardcoded FLSA 29 U.S.C. 203(m)(2)(B) tip pool engine, payroll CSV export & EOD Z-Reports',
      '39 deterministic Chef\'s Intelligence calculators (72% GP dish costing, 14-allergen matrix, WTR 11h rota audit, Baker\'s % scaling)',
      'Bring-Your-Own Stripe Connect Standard / Terminal with 0% CulinaryOS markup in self-hosted mode',
      'Full CLI (culinary) & TypeScript SDK (@culinaryos/sdk)',
    ],
  },
  cloud_pro: {
    id: 'cloud_pro',
    name: 'CulinaryOS Cloud Pro (SaaS)',
    tagline: 'Cloud backup bridge, commission-free online ordering relay & Beta AI Autopilot',
    monthlyPriceCents: 4900,
    perTerminalFeeCents: 0,
    license: 'Commercial SaaS Subscription',
    offlineCapable: true,
    includedAddons: ['cloud_storage', 'online_ordering', 'ai_autopilot'],
    highlights: [
      'Everything in CulinaryOS Core + 72-hour offline entitlement grace window',
      'Cloud Storage Bridge: encrypted offsite SQLite/Postgres replication & remote owner web dashboard',
      'Hosted Commission-Free Online Storefront & QR table ordering relayed directly into local POS/KDS',
      'Beta AI Autopilot (off-by-default): full 121-skill Chef\'s Intelligence generative workflows, predictive 86-ing, weather/daypart prep forecasts & OCR menu/invoice import',
      'Campaign Studio (Post-Pilot): automated social media scheduling & brand voice guard',
      'Per-tenant ai_prompt_log token cost & budget dashboard',
    ],
  },
  enterprise_multi_unit: {
    id: 'enterprise_multi_unit',
    name: 'CulinaryOS Enterprise & Commissary',
    tagline: 'Multi-location organization rollups, central commissary production & MRP split-order optimization',
    monthlyPriceCents: 14900,
    perTerminalFeeCents: 0,
    license: 'Commercial SaaS Subscription',
    offlineCapable: true,
    includedAddons: ['cloud_storage', 'online_ordering', 'ai_autopilot', 'multi_unit_commissary'],
    highlights: [
      'Everything in Cloud Pro across multi-unit restaurant groups',
      'Parent organization hierarchy (V17) with strict per-unit PostgreSQL RLS isolation',
      'Central Commissary production quota aggregation & inter-store transfer orders',
      'Multi-Distributor MRP Split-Order Optimizer (Sysco, US Foods, Dennis Food Service) & Electronic Invoice Price Variance (IPV) audit',
      'Dedicated priority SLA & custom webhook/ERP integrations',
    ],
  },
};

export interface FeatureGateSpec {
  id: string;
  name: string;
  category: 'POS & Floor' | 'KDS & Kitchen' | 'Back-Office & Compliance' | 'Chef\'s Intelligence' | 'Cloud & Online' | 'Enterprise & Commissary';
  tier: CulinaryTierId;
  requiredAddon: SaasAddonKey | null;
  defaultEnabled: boolean;
  fallbackBehavior: string;
}

export const CULINARYOS_FEATURE_GATES: FeatureGateSpec[] = [
  {
    id: 'pos.terminal_core',
    name: 'POS Order Entry, Split Checks, Bar Tabs & 2D Floor Plan',
    category: 'POS & Floor',
    tier: 'free_opensource',
    requiredAddon: null,
    defaultEnabled: true,
    fallbackBehavior: 'Runs 100% locally against embedded Rust store or local Postgres outbox.',
  },
  {
    id: 'kds.station_rails',
    name: 'KDS Multi-Station Ticket Routing, Course Pacing & 86 Sync',
    category: 'KDS & Kitchen',
    tier: 'free_opensource',
    requiredAddon: null,
    defaultEnabled: true,
    fallbackBehavior: 'Routes directly over local LAN Port 3000 without cloud round-trip.',
  },
  {
    id: 'compliance.flsa_tips_zreport',
    name: 'FLSA Manager-Excluded Tip Pools & End-of-Day Z-Report Closeout',
    category: 'Back-Office & Compliance',
    tier: 'free_opensource',
    requiredAddon: null,
    defaultEnabled: true,
    fallbackBehavior: 'Enforced deterministically in Rust and TypeScript with integer-cent accuracy.',
  },
  {
    id: 'hardware.escpos_lan_usb',
    name: 'Direct TCP :9100 / USB ESC/POS Printing & RJ11 Cash Drawer Kick',
    category: 'POS & Floor',
    tier: 'free_opensource',
    requiredAddon: null,
    defaultEnabled: true,
    fallbackBehavior: 'Fails over to secondary backup printer IP and mirrors alert onto KDS screen.',
  },
  {
    id: 'intelligence.deterministic_core',
    name: 'Deterministic Chef\'s Intelligence Calculators (72% GP, 14-Allergens, WTR Rota, Baker\'s %)',
    category: 'Chef\'s Intelligence',
    tier: 'free_opensource',
    requiredAddon: null,
    defaultEnabled: true,
    fallbackBehavior: 'Pure local math engine; zero external API calls or LLM tokens required.',
  },
  {
    id: 'cloud.offsite_storage_sync',
    name: 'Encrypted Offsite Cloud Backup & Remote Owner Dashboard',
    category: 'Cloud & Online',
    tier: 'cloud_pro',
    requiredAddon: 'cloud_storage',
    defaultEnabled: false,
    fallbackBehavior: 'Queues encrypted deltas in local sync_outbox; local POS/KDS continues unaffected.',
  },
  {
    id: 'cloud.online_ordering_relay',
    name: 'Hosted Commission-Free Online Storefront & QR Table Relay',
    category: 'Cloud & Online',
    tier: 'cloud_pro',
    requiredAddon: 'online_ordering',
    defaultEnabled: false,
    fallbackBehavior: 'Local QR on restaurant Wi-Fi routes directly to Port 3000 /menu/ when WAN drops.',
  },
  {
    id: 'intelligence.ai_autopilot',
    name: 'Beta AI Autopilot (121-Skill Generative Workflows, Predictive 86-ing & Campaign Studio)',
    category: 'Chef\'s Intelligence',
    tier: 'cloud_pro',
    requiredAddon: 'ai_autopilot',
    defaultEnabled: false,
    fallbackBehavior: 'Automatically falls back to deterministic local Chef\'s Intelligence templates and math with zero AI spend.',
  },
  {
    id: 'enterprise.multi_unit_commissary',
    name: 'Multi-Unit Organization Rollups, Central Commissary & Multi-Vendor MRP Split Optimizer',
    category: 'Enterprise & Commissary',
    tier: 'enterprise_multi_unit',
    requiredAddon: 'multi_unit_commissary',
    defaultEnabled: false,
    fallbackBehavior: 'Degrades gracefully to single-location par-level PO generation and CSV export.',
  },
];

export interface FailureModeFallbackSpec {
  id: string;
  failureScenario: string;
  competitorPainPoint: string;
  culinaryOsFallback: string;
  verificationEndpoint: string;
}

export const CULINARYOS_FAILURE_MODES: FailureModeFallbackSpec[] = [
  {
    id: 'wan_isp_outage',
    failureScenario: 'ISP / WAN Internet Cut During Friday Peak Dinner Rush',
    competitorPainPoint: 'Toast & Square cloud outages isolate handhelds from terminals/KDS or lock authorization screens.',
    culinaryOsFallback: 'Native Rust Workstation runs on local LAN Port 3000 (embedded-local-db). Every local tablet, KDS screen, and printer on the restaurant router stays 100% synchronized locally.',
    verificationEndpoint: 'GET /health -> engine: embedded-local-db',
  },
  {
    id: 'kitchen_printer_jam_or_drop',
    failureScenario: 'Primary Kitchen ESC/POS Printer Jammed, Out of Paper, or Unplugged',
    competitorPainPoint: 'Cloud print proxies silently drop kitchen chits or require manual category re-routing.',
    culinaryOsFallback: 'Bounded TCP :9100 socket check automatically reroutes the ESC/POS payload to the designated backup/expo printer with a *** REROUTED FROM STATION *** banner and flashes an alert on the KDS rail.',
    verificationEndpoint: 'POST /v1/hardware/print',
  },
  {
    id: 'double_tap_or_network_retry_payment',
    failureScenario: 'Server Double-Taps Charge or Wi-Fi Flickers During Payment Submission',
    competitorPainPoint: 'Duplicate tab charges or orphaned half-paid checks in EOD reports.',
    culinaryOsFallback: 'Mandatory client UUID operationId idempotency key persisted in applied_operations set; duplicate submissions return the original settled transaction with zero double-charge.',
    verificationEndpoint: 'POST /v1/payments/cash & POST /v1/pos/sync-deltas',
  },
  {
    id: 'saas_subscription_or_token_expiry',
    failureScenario: 'SaaS Cloud Entitlement Token Expires While Restaurant Is Offline',
    competitorPainPoint: 'Proprietary SaaS POS terminals lock out staff until billing server is reached.',
    culinaryOsFallback: '72-hour offline HMAC-SHA256 grace window. Even after expiry, only cloud add-ons pause; local POS, KDS, drawer kick, and Z-Reports never lock out the restaurant.',
    verificationEndpoint: 'GET /v1/cloud/status',
  },
  {
    id: 'llm_provider_down_or_flag_off',
    failureScenario: 'AI Provider Outage, Quota Exhausted, or AI Flag Disabled (Default)',
    competitorPainPoint: 'AI-wrapper tools fail with 500 errors or hallucinate food cost percentages.',
    culinaryOsFallback: 'AI is off-by-default (Rule 6). All 121 Chef\'s Intelligence skills execute deterministic local math (72% GP costing, 14-allergen matrix, WTR 11h rota audit, Baker\'s %) with zero LLM dependency.',
    verificationEndpoint: 'POST /v1/intelligence/cost-dish & GET /v1/intelligence/skills',
  },
];

export function evaluateFeatureEntitlement(
  featureId: string,
  options?: {
    activeAddons?: SaasAddonKey[];
    aiFlagEnabled?: boolean;
  },
): {
  featureId: string;
  entitled: boolean;
  mode: 'full_active' | 'deterministic_local_fallback';
  tier: CulinaryTierId;
  requiredAddon: SaasAddonKey | null;
  reason: string;
  fallbackBehavior: string;
} {
  const gate = CULINARYOS_FEATURE_GATES.find((g) => g.id === featureId);
  if (!gate) {
    return {
      featureId,
      entitled: false,
      mode: 'deterministic_local_fallback',
      tier: 'free_opensource',
      requiredAddon: null,
      reason: 'Unknown feature gate ID; defaulting to safe local fallback.',
      fallbackBehavior: 'Local core mode active.',
    };
  }

  if (gate.tier === 'free_opensource' || !gate.requiredAddon) {
    return {
      featureId: gate.id,
      entitled: true,
      mode: 'full_active',
      tier: gate.tier,
      requiredAddon: null,
      reason: 'Included free forever in CulinaryOS Open-Source Core.',
      fallbackBehavior: gate.fallbackBehavior,
    };
  }

  const addons = new Set(options?.activeAddons || []);
  const hasAddon = addons.has(gate.requiredAddon);

  if (gate.requiredAddon === 'ai_autopilot' && options?.aiFlagEnabled === false) {
    return {
      featureId: gate.id,
      entitled: false,
      mode: 'deterministic_local_fallback',
      tier: gate.tier,
      requiredAddon: gate.requiredAddon,
      reason: 'AI Autopilot feature flag is disabled (off-by-default per Rule 6); running deterministic local Chef\'s Intelligence fallback.',
      fallbackBehavior: gate.fallbackBehavior,
    };
  }

  if (!hasAddon) {
    return {
      featureId: gate.id,
      entitled: false,
      mode: 'deterministic_local_fallback',
      tier: gate.tier,
      requiredAddon: gate.requiredAddon,
      reason: `Requires active ${gate.tier} SaaS subscription (${gate.requiredAddon} add-on); running deterministic local fallback.`,
      fallbackBehavior: gate.fallbackBehavior,
    };
  }

  return {
    featureId: gate.id,
    entitled: true,
    mode: 'full_active',
    tier: gate.tier,
    requiredAddon: gate.requiredAddon,
    reason: `Unlocked via active ${gate.requiredAddon} SaaS entitlement.`,
    fallbackBehavior: gate.fallbackBehavior,
  };
}
