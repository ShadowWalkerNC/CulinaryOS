import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type ChefsIntelligenceSurface = 'admin' | 'kitchenkit' | 'ops';

export type ChefsIntelligenceTabId =
  | 'costing'
  | 'allergens'
  | 'rota-flsa'
  | 'catalog-tiers';

export type OperationalPackId =
  | 'operations'
  | 'bakery'
  | 'food-truck'
  | 'bar-foh'
  | 'shops'
  | 'people'
  | 'care'
  | 'home';

export interface ChefsIntelligenceHubProps {
  surface?: ChefsIntelligenceSurface;
  apiBase?: string;
  tenantId?: string;
  defaultTab?: ChefsIntelligenceTabId;
  className?: string;
}

export interface DishIngredientRow {
  id: string;
  name: string;
  weightGrams: number;
  bulkPricePerKg: number;
  trimYieldPct: number;
}

export interface DishCostBreakdownRow {
  name: string;
  weightGrams: number;
  bulkPricePerKg: number;
  trimYieldPct: string;
  portionCost: number;
  pctOfPlate: string;
}

export interface DishCostResult {
  dish: string;
  totalRawFoodCost: number;
  targetGp: string;
  minNetPrice: number;
  minMenuPriceGross: number;
  suggestedMenuPrice: number;
  dominantIngredientAlerts: string[];
  breakdown: DishCostBreakdownRow[];
  source: 'live_api' | 'deterministic_local';
}

export interface AllergenDefinition {
  id: string;
  label: string;
  regulation: 'FIR-14 + FDA-TOP-9' | 'FIR-14';
  keywords: string[];
}

export type AllergenStatus = 'free' | 'contains' | 'cross_contact';

export interface AuditedDishAllergens {
  id: string;
  dishName: string;
  station: string;
  ingredientsText: string;
  sharedFryer: boolean;
  sharedGrill: boolean;
  overrides: Record<string, AllergenStatus>;
}

export interface ShiftTurnaroundRow {
  id: string;
  staffId: string;
  staffName: string;
  role: 'server' | 'bartender' | 'line_cook' | 'prep_cook' | 'manager' | 'owner';
  previousShiftEnd: string;
  nextShiftStart: string;
  hoursWorked: number;
  nonTippedSideworkPct: number;
}

export interface CatalogSkillItem {
  id: string;
  name: string;
  pack: OperationalPackId;
  zone: string;
  tier: 'free_core' | 'saas_pro';
  deterministic: boolean;
  summary: string;
}

export interface ResilienceFallbackItem {
  key:
    | 'wanOutage'
    | 'printerDropOrJam'
    | 'paymentIdempotency'
    | 'saasTokenExpiry'
    | 'aiProviderDownOrDisabled';
  title: string;
  active: boolean;
  strategy: string;
  endpoint: string;
}

export const REGULATED_ALLERGEN_DEFINITIONS: AllergenDefinition[] = [
  {
    id: 'gluten',
    label: 'Gluten (Wheat/Barley/Rye)',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['wheat', 'flour', 'bread', 'brioche', 'pasta', 'barley', 'rye', 'oats', 'panko', 'crouton', 'gluten'],
  },
  {
    id: 'crustaceans',
    label: 'Crustaceans',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'langoustine'],
  },
  {
    id: 'eggs',
    label: 'Eggs',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['egg', 'mayo', 'mayonnaise', 'aioli', 'hollandaise', 'meringue', 'brioche'],
  },
  {
    id: 'fish',
    label: 'Fish',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['halibut', 'salmon', 'cod', 'anchovy', 'tuna', 'trout', 'sea bass', 'fish', 'worcestershire'],
  },
  {
    id: 'peanuts',
    label: 'Peanuts',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['peanut', 'groundnut', 'satay'],
  },
  {
    id: 'soybeans',
    label: 'Soybeans (Soya)',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['soy', 'soya', 'tofu', 'edamame', 'miso', 'tamari', 'shoyu'],
  },
  {
    id: 'milk',
    label: 'Milk (Dairy)',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['milk', 'butter', 'cream', 'cheese', 'cheddar', 'burrata', 'parmesan', 'mozzarella', 'whey', 'yogurt', 'ghee'],
  },
  {
    id: 'tree_nuts',
    label: 'Tree Nuts',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['almond', 'walnut', 'hazelnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'pine nut', 'praline'],
  },
  {
    id: 'celery',
    label: 'Celery',
    regulation: 'FIR-14',
    keywords: ['celery', 'celeriac', 'mirepoix'],
  },
  {
    id: 'mustard',
    label: 'Mustard',
    regulation: 'FIR-14',
    keywords: ['mustard', 'dijon', 'wholegrain mustard'],
  },
  {
    id: 'sesame',
    label: 'Sesame',
    regulation: 'FIR-14 + FDA-TOP-9',
    keywords: ['sesame', 'tahini', 'gomashio', 'sesame oil'],
  },
  {
    id: 'sulphites',
    label: 'Sulphites (SO2 >10mg/kg)',
    regulation: 'FIR-14',
    keywords: ['wine', 'vinegar', 'sulphite', 'sulfite', 'caper', 'shallot', 'dried apricot'],
  },
  {
    id: 'lupin',
    label: 'Lupin',
    regulation: 'FIR-14',
    keywords: ['lupin', 'lupini'],
  },
  {
    id: 'molluscs',
    label: 'Molluscs',
    regulation: 'FIR-14',
    keywords: ['oyster', 'mussel', 'clam', 'scallop', 'squid', 'calamari', 'octopus'],
  },
];

export const OPERATIONAL_PACKS_METADATA: Array<{
  id: OperationalPackId;
  label: string;
  skillCount: number;
  audience: string;
  summary: string;
}> = [
  {
    id: 'operations',
    label: 'Operations (BOH)',
    skillCount: 41,
    audience: 'Executive Chef & Kitchen Management',
    summary: 'Prep planning, 72% GP dish costing, HACCP logs, stock variance, and supplier scorecards.',
  },
  {
    id: 'bakery',
    label: 'Bakery & Pastry',
    skillCount: 10,
    audience: 'Artisan Bakery & Pastry Station',
    summary: 'Baker\'s percentage hydration math, preferment flour accounting, DDT trial logs, and oven calendars.',
  },
  {
    id: 'food-truck',
    label: 'Food Truck & Catering',
    skillCount: 20,
    audience: 'Mobile Units, Pop-Ups & BEO Catering',
    summary: 'Event go/no-go margin models, commissary loadout checklists, generator/water plans, and BEO settlement.',
  },
  {
    id: 'bar-foh',
    label: 'Bar & Front of House',
    skillCount: 10,
    audience: 'Bar Program & Dining Room Captains',
    summary: 'Beverage batch dilution, draft beer yield loss, pre-shift FOH service briefs, and turn pacing.',
  },
  {
    id: 'shops',
    label: 'Shops & Counter Deli',
    skillCount: 8,
    audience: 'Independent Delis, Counters & Bottle Shops',
    summary: 'Delivery platform net margin auditor, retail pack-size pricing, markdown review, and invoice reconciliation.',
  },
  {
    id: 'people',
    label: 'People & Growth',
    skillCount: 16,
    audience: 'GM, HR & Restaurant Marketing',
    summary: 'WTR 11h rota compliance, FLSA tip gates, multilingual briefs, onboarding SOPs, and campaign ROI review.',
  },
  {
    id: 'care',
    label: 'Care & Dietetics',
    skillCount: 7,
    audience: 'Care Kitchens & Institutional Dining',
    summary: 'IDDSI texture & approved diet menu screening, allergen compliance matrices, and nutritional auditing.',
  },
  {
    id: 'home',
    label: 'Home & Test Kitchen',
    skillCount: 9,
    audience: 'R&D Test Kitchen & Domestic Prep',
    summary: 'Multi-dish cooking timelines, equipment adaptation, pantry meal planning, and cook-once component reuse.',
  },
];

export const FALLBACK_SKILLS_CATALOG: CatalogSkillItem[] = [
  {
    id: 'dish-costing-calculator',
    name: 'Dish Costing Calculator (72% GP Standard)',
    pack: 'operations',
    zone: 'Recipe & Cost Engineering',
    tier: 'free_core',
    deterministic: true,
    summary: 'Calculates AP/EP trim yield, raw food cost, minimum ex-VAT net price, and $0.50-rounded gross menu price.',
  },
  {
    id: 'allergen-matrix-builder',
    name: '14-Allergen & FDA Top-9 Matrix Auditor',
    pack: 'care',
    zone: 'Food Safety & Allergens',
    tier: 'free_core',
    deterministic: true,
    summary: 'Audits recipes across all 14 FIR / Natasha\'s Law allergens, FDA FASTER Act Top-9, and shared fryer cross-contact.',
  },
  {
    id: 'rota-builder',
    name: 'WTR 11-Hour Rota Rest & Turnaround Auditor',
    pack: 'operations',
    zone: 'Labor & Compliance',
    tier: 'free_core',
    deterministic: true,
    summary: 'Verifies UK WTR Reg 10 minimum 11-hour rest interval between consecutive shifts and flags clopenings.',
  },
  {
    id: 'flsa_tip_pool_audit',
    name: 'FLSA 29 U.S.C. 203(m)(2)(B) Tip Pool Legality Gate',
    pack: 'people',
    zone: 'Labor & Compliance',
    tier: 'free_core',
    deterministic: true,
    summary: 'Hard-blocks managers/owners from tip pools and validates FOH+BOH minimum wage and 80/20 compliance.',
  },
  {
    id: 'bakers-percentage-formula',
    name: 'Baker\'s Percentage & Hydration Scaling Engine',
    pack: 'bakery',
    zone: 'Bakery & Pastry',
    tier: 'free_core',
    deterministic: true,
    summary: 'Normalizes flour weight to 100% and computes hydration, levain inoculation, salt %, and batch scaling.',
  },
  {
    id: 'preferment-flour-accounting',
    name: 'Preferment & Poolish Flour Accounting',
    pack: 'bakery',
    zone: 'Bakery & Pastry',
    tier: 'free_core',
    deterministic: true,
    summary: 'Decomposes poolish, biga, and sourdough levain into net flour and water contributions for final dough mix.',
  },
  {
    id: 'food-truck-event-go-no-go',
    name: 'Food Truck Event Go/No-Go Profit Gate',
    pack: 'food-truck',
    zone: 'Mobile & Event Operations',
    tier: 'free_core',
    deterministic: true,
    summary: 'Models pitch fee, generator fuel, travel labor, and expected ticket velocity against break-even covers.',
  },
  {
    id: 'food-truck-loadout',
    name: 'Commissary-to-Truck Loadout & Par Verifier',
    pack: 'food-truck',
    zone: 'Mobile & Event Operations',
    tier: 'free_core',
    deterministic: true,
    summary: 'Reconciles cold-hold cambros, paper goods, propane, and cash float before mobile unit departure.',
  },
  {
    id: 'beverage-batch-dilution',
    name: 'Cocktail Batch Dilution & ABV Calculator',
    pack: 'bar-foh',
    zone: 'Bar & Beverage',
    tier: 'free_core',
    deterministic: true,
    summary: 'Calculates exact water dilution, sugar brix balance, and final ABV for pre-batched service cocktails.',
  },
  {
    id: 'draft-beer-yield-loss',
    name: 'Draft Keg Foam & Pour Yield Loss Auditor',
    pack: 'bar-foh',
    zone: 'Bar & Beverage',
    tier: 'free_core',
    deterministic: true,
    summary: 'Compares keg volume ounces against POS pint rings to quantify line-cleaning and foam pour shrinkage.',
  },
  {
    id: 'delivery-platform-net-margin',
    name: 'Third-Party Delivery Commission vs Direct Relay Audit',
    pack: 'shops',
    zone: 'Retail & Delivery Economics',
    tier: 'free_core',
    deterministic: true,
    summary: 'Exposes true net margin after 25-30% marketplace commissions vs CulinaryOS commission-free storefront relay.',
  },
  {
    id: 'invoice-reconciliation',
    name: 'Purveyor Invoice Price Variance (IPV) Auditor',
    pack: 'shops',
    zone: 'Purchasing & Receiving',
    tier: 'free_core',
    deterministic: true,
    summary: 'Flags SKU contract price creep, short-shipped cases, and catch-weight discrepancies at receiving.',
  },
  {
    id: 'approved-diet-menu-screen',
    name: 'Care Kitchen IDDSI & Therapeutic Diet Screener',
    pack: 'care',
    zone: 'Clinical & Care Dietetics',
    tier: 'free_core',
    deterministic: true,
    summary: 'Verifies cyclic menus against renal, low-sodium, dysphagia texture levels, and fortified calorie targets.',
  },
  {
    id: 'home-cooking-timeline',
    name: 'Multi-Course Reverse Prep & Oven Timeline',
    pack: 'home',
    zone: 'R&D & Domestic Prep',
    tier: 'free_core',
    deterministic: true,
    summary: 'Builds backward-scheduled oven, burner, and resting milestones so every component lands hot at service.',
  },
  {
    id: 'eighty_six_predictor',
    name: 'Predictive 86 & Velocity-to-Zero Autopilot',
    pack: 'operations',
    zone: 'AI Autopilot (Cloud Pro)',
    tier: 'saas_pro',
    deterministic: true,
    summary: 'Projects depletion countdown from live POS order velocity and alerts expo before station stockout.',
  },
  {
    id: 'distributor_price_arbitrage',
    name: 'Multi-Distributor MRP Split-Order Optimizer',
    pack: 'operations',
    zone: 'Enterprise Procurement',
    tier: 'saas_pro',
    deterministic: true,
    summary: 'Splits purchase orders across Sysco, US Foods, and Dennis Food Service to capture lowest landed SKU cost.',
  },
  {
    id: 'campaign-sales-review',
    name: 'Campaign Studio & POS Revenue Attribution',
    pack: 'people',
    zone: 'Growth & Marketing',
    tier: 'saas_pro',
    deterministic: true,
    summary: 'Correlates scheduled social promotions with same-store daypart cover lifts and gross margin contribution.',
  },
  {
    id: 'product-recall-trace-drill',
    name: 'Multi-Unit Lot Recall & Commissary Trace Drill',
    pack: 'operations',
    zone: 'Enterprise Food Safety',
    tier: 'saas_pro',
    deterministic: true,
    summary: 'Traces supplier lot numbers across central commissary batches and downstream unit walk-in inventories.',
  },
];

export const FALLBACK_RESILIENCE_MODES: ResilienceFallbackItem[] = [
  {
    key: 'wanOutage',
    title: 'WAN / ISP Outage Survival (Local LAN Port 3000)',
    active: true,
    strategy:
      'Single-port Native Rust gateway on 127.0.0.1:3000 keeps all local POS terminals, KDS screens, and printers synchronized without internet.',
    endpoint: 'GET /health -> engine: rust-embedded-sha256-envelope',
  },
  {
    key: 'printerDropOrJam',
    title: 'Kitchen ESC/POS Printer Drop or Paper Jam Failover',
    active: true,
    strategy:
      'Bounded TCP :9100 socket timeout automatically reroutes ESC/POS stream to designated backup/expo printer and mirrors alert on KDS rail.',
    endpoint: 'POST /v1/hardware/print',
  },
  {
    key: 'paymentIdempotency',
    title: 'Double-Tap & Wi-Fi Flicker Payment Idempotency Guard',
    active: true,
    strategy:
      'Mandatory client UUID operationId persisted in applied_operations set blocks duplicate charges on network retry.',
    endpoint: 'POST /v1/payments/cash & POST /v1/pos/sync-deltas',
  },
  {
    key: 'saasTokenExpiry',
    title: '72-Hour Offline SaaS Entitlement Grace Window',
    active: true,
    strategy:
      '72-hour offline HMAC-SHA256 grace window; local POS, KDS, drawer kick, and Z-Reports never lock out on billing expiry.',
    endpoint: 'GET /v1/cloud/status',
  },
  {
    key: 'aiProviderDownOrDisabled',
    title: 'AI Provider Outage or Off-By-Default Flag Fallback (Rule 6)',
    active: true,
    strategy:
      'All 121 Chef\'s Intelligence skills execute deterministic local math (72% GP costing, 14-allergen matrix, WTR 11h rota, Baker\'s %) with zero LLM dependency.',
    endpoint: 'POST /v1/intelligence/chefs-intelligence/cost-dish',
  },
];

export function computeLocalDishCost72GP(params: {
  dishName: string;
  targetGpPct: number;
  isVatRegistered: boolean;
  vatRatePct: number;
  ingredients: DishIngredientRow[];
}): DishCostResult {
  const targetGpPct = Number.isFinite(params.targetGpPct)
    ? Math.min(95, Math.max(10, params.targetGpPct))
    : 72;
  const vatRatePct = Number.isFinite(params.vatRatePct) ? Math.max(0, params.vatRatePct) : 20;

  let totalRawFoodCost = 0;
  const rawRows = params.ingredients.map((ing) => {
    const yieldPct = ing.trimYieldPct && ing.trimYieldPct > 0 ? Math.min(100, ing.trimYieldPct) : 100;
    const yieldFactor = yieldPct / 100;
    const effectiveCostPerKg = (Math.max(0, ing.bulkPricePerKg) || 0) / yieldFactor;
    const portionCost = effectiveCostPerKg * (Math.max(0, ing.weightGrams) / 1000);
    totalRawFoodCost += portionCost;
    return {
      name: ing.name || 'Ingredient',
      weightGrams: ing.weightGrams || 0,
      bulkPricePerKg: ing.bulkPricePerKg || 0,
      trimYieldPct: `${yieldPct.toFixed(0)}%`,
      portionCost,
    };
  });

  const targetFoodCostFactor = Math.max(0.01, (100 - targetGpPct) / 100);
  const minNetPrice = totalRawFoodCost / targetFoodCostFactor;
  const vatFactor = params.isVatRegistered ? 1 + vatRatePct / 100 : 1.0;
  const minMenuPriceGross = minNetPrice * vatFactor;
  const suggestedMenuPrice = Math.ceil(minMenuPriceGross * 2) / 2;

  const dominantIngredientAlerts = rawRows
    .filter((r) => totalRawFoodCost > 0 && r.portionCost / totalRawFoodCost > 0.4)
    .map(
      (r) =>
        `${r.name} accounts for ${((r.portionCost / totalRawFoodCost) * 100).toFixed(1)}% of raw plate cost (>40% single-SKU volatility threshold).`
    );

  const breakdown: DishCostBreakdownRow[] = rawRows.map((r) => ({
    ...r,
    portionCost: Number(r.portionCost.toFixed(2)),
    pctOfPlate:
      totalRawFoodCost > 0 ? `${((r.portionCost / totalRawFoodCost) * 100).toFixed(1)}%` : '0.0%',
  }));

  return {
    dish: params.dishName || 'Unnamed Dish',
    totalRawFoodCost: Number(totalRawFoodCost.toFixed(2)),
    targetGp: `${targetGpPct}%`,
    minNetPrice: Number(minNetPrice.toFixed(2)),
    minMenuPriceGross: Number(minMenuPriceGross.toFixed(2)),
    suggestedMenuPrice: Number(suggestedMenuPrice.toFixed(2)),
    dominantIngredientAlerts,
    breakdown,
    source: 'deterministic_local',
  };
}

export function detectAllergensForDish(dish: AuditedDishAllergens): Record<string, AllergenStatus> {
  const lowered = dish.ingredientsText.toLowerCase();
  const result: Record<string, AllergenStatus> = {};

  for (const def of REGULATED_ALLERGEN_DEFINITIONS) {
    const manual = dish.overrides[def.id];
    if (manual) {
      result[def.id] = manual;
      continue;
    }
    const matched = def.keywords.some((kw) => lowered.includes(kw));
    if (matched) {
      result[def.id] = 'contains';
    } else if (
      (dish.sharedFryer && (def.id === 'gluten' || def.id === 'crustaceans' || def.id === 'fish')) ||
      (dish.sharedGrill && (def.id === 'fish' || def.id === 'crustaceans' || def.id === 'sesame'))
    ) {
      result[def.id] = 'cross_contact';
    } else {
      result[def.id] = 'free';
    }
  }
  return result;
}

export const ChefsIntelligenceHub: React.FC<ChefsIntelligenceHubProps> = ({
  surface = 'admin',
  apiBase = '',
  tenantId = '00000000-0000-0000-0000-000000000001',
  defaultTab = 'costing',
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState<ChefsIntelligenceTabId>(defaultTab);

  // ============================================================================
  // Panel A: 72% GP Dish Costing Engine State
  // ============================================================================
  const [dishName, setDishName] = React.useState('Pan-Seared Halibut, Brown Butter & Caper');
  const [targetGpPct, setTargetGpPct] = React.useState<number>(72);
  const [isVatRegistered, setIsVatRegistered] = React.useState<boolean>(false);
  const [vatRatePct] = React.useState<number>(20);
  const [ingredients, setIngredients] = React.useState<DishIngredientRow[]>([
    {
      id: 'ing-1',
      name: 'North Atlantic Halibut Fillet',
      weightGrams: 180,
      bulkPricePerKg: 28.5,
      trimYieldPct: 78,
    },
    {
      id: 'ing-2',
      name: 'Normandy Cultured Butter',
      weightGrams: 35,
      bulkPricePerKg: 11.2,
      trimYieldPct: 100,
    },
    {
      id: 'ing-3',
      name: 'Lilliput Capers, Shallot & Lemon',
      weightGrams: 30,
      bulkPricePerKg: 13.5,
      trimYieldPct: 90,
    },
    {
      id: 'ing-4',
      name: 'Herb Roasted Fingerling Potatoes',
      weightGrams: 140,
      bulkPricePerKg: 3.4,
      trimYieldPct: 92,
    },
  ]);
  const [costResult, setCostResult] = React.useState<DishCostResult>(() =>
    computeLocalDishCost72GP({
      dishName: 'Pan-Seared Halibut, Brown Butter & Caper',
      targetGpPct: 72,
      isVatRegistered: false,
      vatRatePct: 20,
      ingredients: [
        {
          id: 'ing-1',
          name: 'North Atlantic Halibut Fillet',
          weightGrams: 180,
          bulkPricePerKg: 28.5,
          trimYieldPct: 78,
        },
        {
          id: 'ing-2',
          name: 'Normandy Cultured Butter',
          weightGrams: 35,
          bulkPricePerKg: 11.2,
          trimYieldPct: 100,
        },
        {
          id: 'ing-3',
          name: 'Lilliput Capers, Shallot & Lemon',
          weightGrams: 30,
          bulkPricePerKg: 13.5,
          trimYieldPct: 90,
        },
        {
          id: 'ing-4',
          name: 'Herb Roasted Fingerling Potatoes',
          weightGrams: 140,
          bulkPricePerKg: 3.4,
          trimYieldPct: 92,
        },
      ],
    })
  );
  const [isCostingSyncing, setIsCostingSyncing] = React.useState(false);

  // Instant deterministic update on any input change
  React.useEffect(() => {
    const localCalc = computeLocalDishCost72GP({
      dishName,
      targetGpPct,
      isVatRegistered,
      vatRatePct,
      ingredients,
    });
    setCostResult(localCalc);
  }, [dishName, targetGpPct, isVatRegistered, vatRatePct, ingredients]);

  const handleRunRemoteCostDish = async () => {
    setIsCostingSyncing(true);
    const fallback = computeLocalDishCost72GP({
      dishName,
      targetGpPct,
      isVatRegistered,
      vatRatePct,
      ingredients,
    });
    try {
      const endpoint = `${apiBase}/v1/intelligence/chefs-intelligence/cost-dish`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          name: dishName,
          targetGpPct,
          isVatRegistered,
          vatRatePct,
          ingredients: ingredients.map((i) => ({
            name: i.name,
            weightGrams: i.weightGrams,
            bulkPricePerKg: i.bulkPricePerKg,
            trimYieldPct: i.trimYieldPct,
          })),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data ?? json;
        if (typeof payload.totalRawFoodCost === 'number') {
          setCostResult({
            dish: payload.dish || dishName,
            totalRawFoodCost: Number(payload.totalRawFoodCost),
            targetGp: payload.targetGp || `${targetGpPct}%`,
            minNetPrice: Number(payload.minNetPrice ?? fallback.minNetPrice),
            minMenuPriceGross: Number(payload.minMenuPriceGross ?? fallback.minMenuPriceGross),
            suggestedMenuPrice: Number(payload.suggestedMenuPrice ?? fallback.suggestedMenuPrice),
            dominantIngredientAlerts: fallback.dominantIngredientAlerts,
            breakdown: Array.isArray(payload.breakdown)
              ? payload.breakdown.map((b: any, idx: number) => ({
                  name: b.name,
                  weightGrams: Number(b.weightGrams),
                  bulkPricePerKg: Number(b.bulkPricePerKg),
                  trimYieldPct: String(b.trimYieldPct),
                  portionCost: Number(b.portionCost),
                  pctOfPlate: fallback.breakdown[idx]?.pctOfPlate || '0.0%',
                }))
              : fallback.breakdown,
            source: 'live_api',
          });
          setIsCostingSyncing(false);
          return;
        }
      }
    } catch {
      // Offline / standalone fallback
    }
    setCostResult(fallback);
    setIsCostingSyncing(false);
  };

  const addIngredientRow = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-${Date.now()}`,
        name: 'New Spec Ingredient',
        weightGrams: 50,
        bulkPricePerKg: 10.0,
        trimYieldPct: 95,
      },
    ]);
  };

  const updateIngredientRow = (
    id: string,
    field: keyof DishIngredientRow,
    value: string | number
  ) => {
    setIngredients((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeIngredientRow = (id: string) => {
    setIngredients((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  // ============================================================================
  // Panel B: 14-Allergen & FDA Top-9 Matrix Auditor State
  // ============================================================================
  const [auditedDishes, setAuditedDishes] = React.useState<AuditedDishAllergens[]>([
    {
      id: 'dish-1',
      dishName: 'Pan-Seared Halibut, Brown Butter & Caper',
      station: 'Fish / Saute',
      ingredientsText: 'halibut fish, butter milk, capers vinegar sulphite, fingerling potatoes',
      sharedFryer: false,
      sharedGrill: false,
      overrides: {},
    },
    {
      id: 'dish-2',
      dishName: 'Crispy Tempura Prawn & Sesame Aioli',
      station: 'Fry Station',
      ingredientsText: 'tiger prawn shrimp, wheat flour panko, egg mayo, sesame oil, soy tamari',
      sharedFryer: true,
      sharedGrill: false,
      overrides: {},
    },
    {
      id: 'dish-3',
      dishName: 'Chargrilled Prime Ribeye & Dijon Jus',
      station: 'Grill / Broiler',
      ingredientsText: 'beef ribeye, butter milk, dijon mustard, celery mirepoix, red wine sulphite',
      sharedFryer: false,
      sharedGrill: true,
      overrides: {},
    },
  ]);
  const [selectedDishId, setSelectedDishId] = React.useState<string>('dish-1');

  const activeAllergenDish =
    auditedDishes.find((d) => d.id === selectedDishId) || auditedDishes[0]!;
  const activeDishAllergenMap = detectAllergensForDish(activeAllergenDish);

  const cycleAllergenOverride = (allergenId: string) => {
    const current = activeDishAllergenMap[allergenId] || 'free';
    const next: AllergenStatus =
      current === 'free' ? 'contains' : current === 'contains' ? 'cross_contact' : 'free';
    setAuditedDishes((prev) =>
      prev.map((d) =>
        d.id === activeAllergenDish.id
          ? { ...d, overrides: { ...d.overrides, [allergenId]: next } }
          : d
      )
    );
  };

  const toggleSharedEquipment = (field: 'sharedFryer' | 'sharedGrill') => {
    setAuditedDishes((prev) =>
      prev.map((d) =>
        d.id === activeAllergenDish.id ? { ...d, [field]: !d[field] } : d
      )
    );
  };

  // ============================================================================
  // Panel C: WTR 11h Rota Rest & FLSA Tip Gate Auditor State
  // ============================================================================
  const [shiftRows, setShiftRows] = React.useState<ShiftTurnaroundRow[]>([
    {
      id: 'sh-1',
      staffId: 'EMP-101',
      staffName: 'Alex Rivera',
      role: 'server',
      previousShiftEnd: '2026-11-20T22:30',
      nextShiftStart: '2026-11-21T10:30',
      hoursWorked: 8.0,
      nonTippedSideworkPct: 12,
    },
    {
      id: 'sh-2',
      staffId: 'EMP-102',
      staffName: 'Jordan Vance',
      role: 'bartender',
      previousShiftEnd: '2026-11-20T23:45',
      nextShiftStart: '2026-11-21T08:00',
      hoursWorked: 7.5,
      nonTippedSideworkPct: 15,
    },
    {
      id: 'sh-3',
      staffId: 'EMP-103',
      staffName: 'Marcus Chen',
      role: 'line_cook',
      previousShiftEnd: '2026-11-20T22:00',
      nextShiftStart: '2026-11-21T10:00',
      hoursWorked: 8.5,
      nonTippedSideworkPct: 0,
    },
    {
      id: 'sh-4',
      staffId: 'EMP-001',
      staffName: 'Gabriel M. (GM / Manager)',
      role: 'manager',
      previousShiftEnd: '2026-11-20T21:00',
      nextShiftStart: '2026-11-21T09:00',
      hoursWorked: 9.0,
      nonTippedSideworkPct: 0,
    },
  ]);
  const [tipPoolDollars, setTipPoolDollars] = React.useState<number>(640);
  const [paysFullMinWageNoTipCredit, setPaysFullMinWageNoTipCredit] =
    React.useState<boolean>(true);
  const [tipMethod, setTipMethod] = React.useState<
    'hours-weighted' | 'points-role-weight' | 'percentage-tip-out' | 'keep-your-own'
  >('hours-weighted');

  const fixClopeningViolations = () => {
    setShiftRows((prev) =>
      prev.map((row) => {
        const endMs = new Date(row.previousShiftEnd).getTime();
        const startMs = new Date(row.nextShiftStart).getTime();
        const restHours = (startMs - endMs) / 3600000;
        if (restHours < 11 && Number.isFinite(endMs)) {
          const compliantStart = new Date(endMs + 11.5 * 3600000);
          const isoLocal = new Date(
            compliantStart.getTime() - compliantStart.getTimezoneOffset() * 60000
          )
            .toISOString()
            .slice(0, 16);
          return { ...row, nextShiftStart: isoLocal };
        }
        return row;
      })
    );
  };

  // ============================================================================
  // Panel D: 121-Skill & 8-Pack Catalog + SaaS Tier Matrix State
  // ============================================================================
  const [catalogSkills, setCatalogSkills] =
    React.useState<CatalogSkillItem[]>(FALLBACK_SKILLS_CATALOG);
  const [resilienceFallbacks, setResilienceFallbacks] = React.useState<ResilienceFallbackItem[]>(
    FALLBACK_RESILIENCE_MODES
  );
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [tierFilter, setTierFilter] = React.useState<'all' | 'free_core' | 'saas_pro'>('all');
  const [packFilter, setPackFilter] = React.useState<'all' | OperationalPackId>('all');
  const [selectedSkill, setSelectedSkill] = React.useState<CatalogSkillItem>(
    FALLBACK_SKILLS_CATALOG[0]!
  );
  const [activeTierStatus, setActiveTierStatus] = React.useState<string>(
    'CulinaryOS Core (Open-Source) — Local Deterministic Engine Active'
  );
  const [isCatalogSyncing, setIsCatalogSyncing] = React.useState<boolean>(false);

  const syncCatalogAndResilience = React.useCallback(async () => {
    setIsCatalogSyncing(true);
    try {
      const headers = { 'X-Tenant-Id': tenantId };
      const [skillsRes, tiersRes, resilienceRes] = await Promise.allSettled([
        fetch(`${apiBase}/v1/intelligence/skills`, { headers }),
        fetch(`${apiBase}/v1/intelligence/tiers`, { headers }),
        fetch(`${apiBase}/v1/system/resilience`, { headers }),
      ]);

      if (skillsRes.status === 'fulfilled' && skillsRes.value.ok) {
        const json = await skillsRes.value.json();
        const list = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        if (list.length > 0) {
          const mergedIds = new Set(FALLBACK_SKILLS_CATALOG.map((s) => s.id));
          const extra: CatalogSkillItem[] = [];
          for (const item of list) {
            if (item && item.id && !mergedIds.has(item.id)) {
              extra.push({
                id: item.id,
                name: item.name || item.title || item.id,
                pack: 'operations',
                zone: item.zone || item.category || 'Kitchen Operations',
                tier: item.tier === 'saas_pro' ? 'saas_pro' : 'free_core',
                deterministic: true,
                summary:
                  item.description ||
                  item.summary ||
                  'Deterministic restaurant operations workflow with offline local math execution.',
              });
            }
          }
          setCatalogSkills([...FALLBACK_SKILLS_CATALOG, ...extra]);
        }
      }

      if (tiersRes.status === 'fulfilled' && tiersRes.value.ok) {
        const json = await tiersRes.value.json();
        const payload = json.data ?? json;
        if (payload?.activeTier === 'cloud_pro') {
          setActiveTierStatus('CulinaryOS Cloud Pro ($49/mo) — Cloud Bridge & Grace Window Active');
        }
      }

      if (resilienceRes.status === 'fulfilled' && resilienceRes.value.ok) {
        const json = await resilienceRes.value.json();
        const payload = json.data ?? json;
        const fb = payload?.fallbacks;
        if (fb && typeof fb === 'object') {
          setResilienceFallbacks((prev) =>
            prev.map((item) => {
              const live = fb[item.key];
              if (live && typeof live === 'object') {
                return {
                  ...item,
                  active: Boolean(live.active ?? true),
                  strategy: String(live.strategy || item.strategy),
                };
              }
              return item;
            })
          );
        }
      }
    } catch {
      // Keep local deterministic catalog and resilience defaults
    }
    setIsCatalogSyncing(false);
  }, [apiBase, tenantId]);

  React.useEffect(() => {
    void syncCatalogAndResilience();
  }, [syncCatalogAndResilience]);

  const filteredSkills = catalogSkills.filter((skill) => {
    if (tierFilter !== 'all' && skill.tier !== tierFilter) return false;
    if (packFilter !== 'all' && skill.pack !== packFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        skill.id.toLowerCase().includes(q) ||
        skill.name.toLowerCase().includes(q) ||
        skill.zone.toLowerCase().includes(q) ||
        skill.summary.toLowerCase().includes(q) ||
        skill.pack.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Compute WTR & FLSA metrics
  const evaluatedShifts = shiftRows.map((row) => {
    const endMs = new Date(row.previousShiftEnd).getTime();
    const startMs = new Date(row.nextShiftStart).getTime();
    const restHours =
      Number.isFinite(endMs) && Number.isFinite(startMs)
        ? Number(((startMs - endMs) / 3600000).toFixed(1))
        : 12.0;
    const wtrBreach = restHours < 11;
    const isManagerOrOwner = row.role === 'manager' || row.role === 'owner';
    const isBoh = row.role === 'line_cook' || row.role === 'prep_cook';
    const tipEligible = !isManagerOrOwner && (!isBoh || paysFullMinWageNoTipCredit);
    const sideworkBreach = !isManagerOrOwner && !isBoh && row.nonTippedSideworkPct > 20;

    return {
      ...row,
      restHours,
      wtrBreach,
      isManagerOrOwner,
      isBoh,
      tipEligible,
      sideworkBreach,
    };
  });

  const totalEligibleHours = evaluatedShifts
    .filter((s) => s.tipEligible)
    .reduce((acc, s) => acc + Math.max(0, s.hoursWorked), 0);

  const totalPoolCents = Math.round(Math.max(0, tipPoolDollars) * 100);

  return (
    <section
      aria-label="Chef's Intelligence Operational Hub"
      data-surface={surface}
      className={cn(
        'w-full rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 p-4 md:p-6 space-y-6 shadow-xl font-sans',
        className
      )}
    >
      {/* Top Industrial Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
              <ChefHat className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Chef&apos;s Intelligence Hub</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>121 Skills &bull; 8 Operational Packs</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono">
              Surface: {surface.toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Deterministic Culinary Math, Food Safety &amp; Labor Compliance Engine
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-3xl">
            100% offline-capable kitchen engineering calculators: 72% Gross Profit dish costing,
            FIR 14-Allergen &amp; FDA Top-9 matrix auditing, UK WTR 11h turnaround checks, and
            FLSA 29 U.S.C. 203(m)(2)(B) manager tip-pool exclusion gates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void syncCatalogAndResilience()}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700 text-xs font-bold inline-flex items-center gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
          >
            <RefreshCw
              className={cn('w-4 h-4 text-amber-400', isCatalogSyncing && 'animate-spin')}
              aria-hidden="true"
            />
            <span>Sync Live Engine</span>
          </button>
        </div>
      </div>

      {/* 4 Primary Ergonomic Tabs (Rule 13: >=48px touch targets, 6-state button physics) */}
      <nav
        aria-label="Chef's Intelligence Modules"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 bg-slate-900/90 p-2 rounded-2xl border border-slate-800"
      >
        <button
          type="button"
          onClick={() => setActiveTab('costing')}
          aria-pressed={activeTab === 'costing'}
          className={cn(
            'min-h-[48px] px-4 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
            activeTab === 'costing'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <DollarSign className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>1. 72% GP Dish Costing</span>
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono uppercase',
              activeTab === 'costing'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-slate-800 text-slate-400'
            )}
          >
            28% COGS
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('allergens')}
          aria-pressed={activeTab === 'allergens'}
          className={cn(
            'min-h-[48px] px-4 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
            activeTab === 'allergens'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>2. 14-Allergen &amp; FDA Top-9</span>
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono uppercase',
              activeTab === 'allergens'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-slate-800 text-slate-400'
            )}
          >
            FIR / FDA
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rota-flsa')}
          aria-pressed={activeTab === 'rota-flsa'}
          className={cn(
            'min-h-[48px] px-4 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
            activeTab === 'rota-flsa'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>3. WTR 11h Rota &amp; FLSA Tips</span>
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono uppercase',
              activeTab === 'rota-flsa'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-slate-800 text-slate-400'
            )}
          >
            LEGAL GATE
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog-tiers')}
          aria-pressed={activeTab === 'catalog-tiers'}
          className={cn(
            'min-h-[48px] px-4 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
            activeTab === 'catalog-tiers'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>4. 121-Skill Catalog &amp; Tiers</span>
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-mono uppercase',
              activeTab === 'catalog-tiers'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-slate-800 text-slate-400'
            )}
          >
            8 PACKS
          </span>
        </button>
      </nav>

      {/* ===================================================================== */}
      {/* TAB 1: 72% GP DISH COSTING ENGINE                                     */}
      {/* ===================================================================== */}
      {activeTab === 'costing' && (
        <div className="space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Raw Food Cost
              </span>
              <p className="text-2xl font-black font-mono text-white mt-1">
                ${costResult.totalRawFoodCost.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">AP/EP trim yield adjusted</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Target GP %
              </span>
              <p className="text-2xl font-black font-mono text-amber-400 mt-1">
                {costResult.targetGp}
              </p>
              <span className="text-[11px] text-slate-400">
                Max Food Cost: {(100 - targetGpPct).toFixed(0)}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Minimum Net Price
              </span>
              <p className="text-2xl font-black font-mono text-slate-100 mt-1">
                ${costResult.minNetPrice.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">Ex-Tax / Ex-VAT baseline</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Gross Price
              </span>
              <p className="text-2xl font-black font-mono text-slate-100 mt-1">
                ${costResult.minMenuPriceGross.toFixed(2)}
              </p>
              <span className="text-[11px] text-slate-400">
                {isVatRegistered ? `Includes ${vatRatePct}% VAT` : 'No VAT applied'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Suggested $0.50-Rounded Price
              </span>
              <p className="text-2xl font-black font-mono text-emerald-400 mt-1">
                ${costResult.suggestedMenuPrice.toFixed(2)}
              </p>
              <span className="text-[11px] text-emerald-300/80">
                Engine: {costResult.source === 'live_api' ? 'LIVE API' : 'LOCAL MATH'}
              </span>
            </div>
          </div>

          {/* Dish Parameters Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label
                htmlFor="ci-dish-name"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Menu Dish Name
              </label>
              <input
                id="ci-dish-name"
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              />
            </div>

            <div>
              <label
                htmlFor="ci-target-gp"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Target Gross Profit %
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ci-target-gp"
                  type="number"
                  min={20}
                  max={95}
                  value={targetGpPct}
                  onChange={(e) => setTargetGpPct(Number(e.target.value) || 72)}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-amber-400 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setTargetGpPct(72)}
                  className="min-h-[48px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                >
                  72%
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsVatRegistered((v) => !v)}
                aria-pressed={isVatRegistered}
                className={cn(
                  'w-full min-h-[48px] px-4 rounded-xl text-xs font-extrabold border flex items-center justify-between active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                  isVatRegistered
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                )}
              >
                <span>VAT ({vatRatePct}%)</span>
                <span className="font-mono">{isVatRegistered ? 'ENABLED' : 'EXEMPT'}</span>
              </button>
            </div>
          </div>

          {/* Dominant Ingredient Volatility Alert */}
          {costResult.dominantIngredientAlerts.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs space-y-1">
                <p className="font-extrabold text-amber-300 uppercase tracking-wider">
                  Commodity Volatility Risk (&gt;40% Single-Ingredient Cost Concentration)
                </p>
                {costResult.dominantIngredientAlerts.map((alert) => (
                  <p key={alert} className="text-slate-200">
                    {alert}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Ingredient Spec Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  Recipe Ingredient Spec &amp; Trim Yield Breakdown
                </h2>
                <p className="text-xs text-slate-400">
                  Formula: Effective Cost/kg = Bulk Price/kg &divide; (Trim Yield % &divide; 100)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addIngredientRow}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold inline-flex items-center gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" aria-hidden="true" />
                  <span>Add Ingredient</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRunRemoteCostDish()}
                  disabled={isCostingSyncing}
                  className="min-h-[48px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black inline-flex items-center gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50 cursor-pointer"
                >
                  <Scale className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {isCostingSyncing ? 'Verifying with Server...' : 'Verify via Cost-Dish API'}
                  </span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Ingredient Name</th>
                    <th className="p-3">Portion Weight (g)</th>
                    <th className="p-3">Bulk Price ($/kg)</th>
                    <th className="p-3">Trim Yield (%)</th>
                    <th className="p-3">Net Portion Cost</th>
                    <th className="p-3">% of Plate</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ingredients.map((row, index) => {
                    const computedRow = costResult.breakdown[index];
                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5">
                          <input
                            type="text"
                            aria-label={`Ingredient ${index + 1} name`}
                            value={row.name}
                            onChange={(e) => updateIngredientRow(row.id, 'name', e.target.value)}
                            className="w-full min-w-[160px] min-h-[48px] px-3 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            aria-label={`Ingredient ${index + 1} weight in grams`}
                            min={0}
                            value={row.weightGrams}
                            onChange={(e) =>
                              updateIngredientRow(row.id, 'weightGrams', Number(e.target.value) || 0)
                            }
                            className="w-28 min-h-[48px] px-3 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            aria-label={`Ingredient ${index + 1} bulk price per kg`}
                            min={0}
                            step="0.1"
                            value={row.bulkPricePerKg}
                            onChange={(e) =>
                              updateIngredientRow(
                                row.id,
                                'bulkPricePerKg',
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-28 min-h-[48px] px-3 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            aria-label={`Ingredient ${index + 1} trim yield percentage`}
                            min={1}
                            max={100}
                            value={row.trimYieldPct}
                            onChange={(e) =>
                              updateIngredientRow(
                                row.id,
                                'trimYieldPct',
                                Number(e.target.value) || 100
                              )
                            }
                            className="w-24 min-h-[48px] px-3 rounded-lg bg-slate-950 border border-slate-700 text-amber-400 font-mono font-bold text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          />
                        </td>
                        <td className="p-2.5 font-mono font-bold text-white">
                          ${(computedRow?.portionCost ?? 0).toFixed(2)}
                        </td>
                        <td className="p-2.5 font-mono text-slate-300">
                          {computedRow?.pctOfPlate ?? '0.0%'}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeIngredientRow(row.id)}
                            aria-label={`Remove ${row.name}`}
                            className="min-h-[48px] min-w-[48px] rounded-lg bg-slate-950 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 inline-flex items-center justify-center active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: 14-ALLERGEN & FDA TOP-9 MATRIX AUDITOR                         */}
      {/* ===================================================================== */}
      {activeTab === 'allergens' && (
        <div className="space-y-6">
          {/* Dish Selector & Cross-Contact Equipment Controls */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  FIR 14 Regulated Allergens (Natasha&apos;s Law) &amp; US FDA FASTER Act Top-9 Matrix
                </h2>
                <p className="text-xs text-slate-400">
                  Select a dish to inspect ingredient keyword detection, toggle manual station
                  overrides, or flag shared fryer/grill cross-contact.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {auditedDishes.map((dish) => (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedDishId(dish.id)}
                    className={cn(
                      'min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                      dish.id === activeAllergenDish.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    )}
                  >
                    {dish.dishName}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
              <div className="lg:col-span-2">
                <label
                  htmlFor="ci-allergen-ingredients"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Verified Recipe Sub-Ingredients ({activeAllergenDish.station})
                </label>
                <input
                  id="ci-allergen-ingredients"
                  type="text"
                  value={activeAllergenDish.ingredientsText}
                  onChange={(e) =>
                    setAuditedDishes((prev) =>
                      prev.map((d) =>
                        d.id === activeAllergenDish.id
                          ? { ...d, ingredientsText: e.target.value }
                          : d
                      )
                    )
                  }
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 items-end">
                <button
                  type="button"
                  onClick={() => toggleSharedEquipment('sharedFryer')}
                  aria-pressed={activeAllergenDish.sharedFryer}
                  className={cn(
                    'min-h-[48px] px-3 py-2 rounded-xl text-xs font-extrabold border flex flex-col justify-center items-start active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                    activeAllergenDish.sharedFryer
                      ? 'bg-red-500/20 border-red-500/60 text-red-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  )}
                >
                  <span>Shared Fryer Oil</span>
                  <span className="text-[10px] font-mono">
                    {activeAllergenDish.sharedFryer ? 'CROSS-CONTACT RISK' : 'DEDICATED'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSharedEquipment('sharedGrill')}
                  aria-pressed={activeAllergenDish.sharedGrill}
                  className={cn(
                    'min-h-[48px] px-3 py-2 rounded-xl text-xs font-extrabold border flex flex-col justify-center items-start active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                    activeAllergenDish.sharedGrill
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  )}
                >
                  <span>Shared Chargrill</span>
                  <span className="text-[10px] font-mono">
                    {activeAllergenDish.sharedGrill ? 'CROSS-CONTACT RISK' : 'DEDICATED'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 14-Allergen Interactive Toggle Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
            {REGULATED_ALLERGEN_DEFINITIONS.map((def) => {
              const status = activeDishAllergenMap[def.id] || 'free';
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => cycleAllergenOverride(def.id)}
                  className={cn(
                    'min-h-[64px] p-3 rounded-xl border text-left flex flex-col justify-between active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                    status === 'contains'
                      ? 'bg-red-950/70 border-red-500 text-red-200'
                      : status === 'cross_contact'
                      ? 'bg-amber-950/70 border-amber-500 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300">
                      {def.regulation === 'FIR-14 + FDA-TOP-9' ? 'FDA-9 + FIR' : 'FIR-14'}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-black uppercase px-1.5 py-0.5 rounded',
                        status === 'contains'
                          ? 'bg-red-500 text-slate-950'
                          : status === 'cross_contact'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-emerald-500/20 text-emerald-400'
                      )}
                    >
                      {status === 'contains'
                        ? 'CONTAINS'
                        : status === 'cross_contact'
                        ? 'MAY CONTAIN'
                        : 'FREE'}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold mt-2 leading-tight">{def.label}</span>
                </button>
              );
            })}
          </div>

          {/* Full Menu Allergen Audit Matrix Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Active Menu 14-Allergen Compliance Matrix
              </h3>
              <span className="text-xs font-mono text-emerald-400">
                Standard: Natasha&apos;s Law (UK FIR) &amp; US FDA FASTER Act Top-9
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Menu Dish</th>
                    <th className="p-3">Station</th>
                    <th className="p-3">Contains (Direct)</th>
                    <th className="p-3">Cross-Contact (Shared Fryer/Grill)</th>
                    <th className="p-3">Sign-Off Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditedDishes.map((dish) => {
                    const map = detectAllergensForDish(dish);
                    const directList = REGULATED_ALLERGEN_DEFINITIONS.filter(
                      (d) => map[d.id] === 'contains'
                    ).map((d) => d.label.split(' ')[0]);
                    const crossList = REGULATED_ALLERGEN_DEFINITIONS.filter(
                      (d) => map[d.id] === 'cross_contact'
                    ).map((d) => d.label.split(' ')[0]);

                    return (
                      <tr key={dish.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{dish.dishName}</td>
                        <td className="p-3 text-slate-400">{dish.station}</td>
                        <td className="p-3">
                          {directList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {directList.map((item) => (
                                <span
                                  key={item}
                                  className="px-2 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-[11px]"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-400 font-bold">None Detected</span>
                          )}
                        </td>
                        <td className="p-3">
                          {crossList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {crossList.map((item) => (
                                <span
                                  key={item}
                                  className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[11px]"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Dedicated Surface</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>AUDITED</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: WTR 11H ROTA REST & FLSA TIP GATE AUDITOR                      */}
      {/* ===================================================================== */}
      {activeTab === 'rota-flsa' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  UK WTR Reg 10 Turnaround Gate
                </span>
                <Clock className="w-4 h-4 text-amber-400" aria-hidden="true" />
              </div>
              <p className="text-lg font-black text-white">
                Minimum 11.0h Uninterrupted Rest
              </p>
              <p className="text-xs text-slate-400">
                Flags late-close to early-open (&ldquo;clopening&rdquo;) shifts providing less than
                11 hours rest between consecutive duty periods.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  US FLSA 29 U.S.C. 203(m)(2)(B)
                </span>
                <Lock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              </div>
              <p className="text-lg font-black text-emerald-400">
                Manager &amp; Owner Exclusion Hardcoded
              </p>
              <p className="text-xs text-slate-400">
                Managers, supervisors, and owners with hiring/firing or scheduling authority are
                permanently blocked from receiving any tip pool share ($0.00).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <label
                htmlFor="ci-tip-pool-dollars"
                className="block text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                Daily Tip Pool to Distribute ($)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ci-tip-pool-dollars"
                  type="number"
                  min={0}
                  value={tipPoolDollars}
                  onChange={(e) => setTipPoolDollars(Number(e.target.value) || 0)}
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono font-bold text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setPaysFullMinWageNoTipCredit((v) => !v)}
                  className={cn(
                    'min-h-[48px] px-3.5 rounded-xl text-xs font-extrabold border shrink-0 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                    paysFullMinWageNoTipCredit
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  )}
                >
                  {paysFullMinWageNoTipCredit
                    ? 'Full Min Wage (FOH+BOH Pool Legal)'
                    : 'Tip Credit Taken (FOH-Only Pool)'}
                </button>
              </div>
            </div>
          </div>

          {/* Distribution Method Selector & Auto-Remediate Clopening Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                FLSA Distribution Policy:
              </span>
              {(
                [
                  { id: 'hours-weighted', label: 'Hours-Weighted (Default v1)' },
                  { id: 'points-role-weight', label: 'Role Points Weight' },
                  { id: 'percentage-tip-out', label: 'Percentage of Sales Tip-Out' },
                  { id: 'keep-your-own', label: 'Keep-Your-Own' },
                ] as const
              ).map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setTipMethod(policy.id)}
                  className={cn(
                    'min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                    tipMethod === policy.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  )}
                >
                  {policy.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fixClopeningViolations}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Auto-Fix &lt;11h Clopening Shifts</span>
            </button>
          </div>

          {/* Rota & FLSA Compliance Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Prev Shift End</th>
                    <th className="p-3">Next Shift Start</th>
                    <th className="p-3">WTR Rest Interval</th>
                    <th className="p-3">80/20 Side-Work</th>
                    <th className="p-3">FLSA Tip Gate</th>
                    <th className="p-3 text-right">Pool Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {evaluatedShifts.map((row) => {
                    const shareCents =
                      row.tipEligible && totalEligibleHours > 0
                        ? Math.round((totalPoolCents * row.hoursWorked) / totalEligibleHours)
                        : 0;

                    return (
                      <tr key={row.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{row.staffName}</td>
                        <td className="p-3 uppercase font-mono text-[11px] text-slate-300">
                          {row.role}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {row.previousShiftEnd.replace('T', ' ')}
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {row.nextShiftStart.replace('T', ' ')}
                        </td>
                        <td className="p-3">
                          {row.wtrBreach ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{row.restHours}h (BREACH &lt;11h)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{row.restHours}h (&ge;11h OK)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          {row.sideworkBreach ? (
                            <span className="text-amber-400 font-bold">
                              {row.nonTippedSideworkPct}% (&gt;20% Alert)
                            </span>
                          ) : (
                            <span className="text-slate-400">{row.nonTippedSideworkPct}% OK</span>
                          )}
                        </td>
                        <td className="p-3">
                          {row.isManagerOrOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950 border border-red-500/50 text-red-300 font-extrabold">
                              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>EXCLUDED (FLSA 203(m))</span>
                            </span>
                          ) : row.tipEligible ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                              <span>ELIGIBLE ({row.hoursWorked}h)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                              <span>BOH EXCLUDED (Tip Credit Active)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm">
                          {row.isManagerOrOwner ? (
                            <span className="text-red-400">$0.00</span>
                          ) : (
                            <span className="text-emerald-400">
                              ${(shareCents / 100).toFixed(2)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: 121-SKILL & 8-PACK CATALOG + SAAS TIER & RESILIENCE MATRIX      */}
      {/* ===================================================================== */}
      {activeTab === 'catalog-tiers' && (
        <div className="space-y-6">
          {/* 8 Operational Packs Grid */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                8 Operational Journey Packs (121 Total Kitchen &amp; Hospitality Skills)
              </h2>
              <span className="text-xs font-mono text-amber-400">{activeTierStatus}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {OPERATIONAL_PACKS_METADATA.map((pack) => {
                const isSelected = packFilter === pack.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => setPackFilter(isSelected ? 'all' : pack.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      'min-h-[88px] p-4 rounded-xl border text-left flex flex-col justify-between active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-xs uppercase tracking-wider text-amber-400">
                        {pack.label}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px] text-slate-300">
                        {pack.skillCount} Skills
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{pack.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Tier Filter Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search 121 Chef's Intelligence skills"
                placeholder="Search 121 skills by ID, name, pack, or kitchen station..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={cn(
                  'min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-extrabold border active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                  tierFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('free_core')}
                className={cn(
                  'min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-extrabold border active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                  tierFilter === 'free_core'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                )}
              >
                Free Open-Source Core ($0)
              </button>
              <button
                type="button"
                onClick={() => setTierFilter('saas_pro')}
                className={cn(
                  'min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-extrabold border active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                  tierFilter === 'saas_pro'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                )}
              >
                Cloud Pro ($49/mo)
              </button>
              {packFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setPackFilter('all')}
                  className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 active:scale-[0.97] transition-transform duration-75 ease-out cursor-pointer"
                >
                  Clear Pack ({packFilter})
                </button>
              )}
            </div>
          </div>

          {/* Interactive Skill List & Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredSkills.map((skill) => {
                const isSelected = selectedSkill.id === skill.id;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => setSelectedSkill(skill)}
                    className={cn(
                      'min-h-[72px] p-3.5 rounded-xl border text-left flex flex-col justify-between active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer',
                      isSelected
                        ? 'bg-slate-800 border-amber-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-900/70'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                        {skill.pack}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded',
                          skill.tier === 'free_core'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        )}
                      >
                        {skill.tier === 'free_core' ? 'Free Core ($0)' : 'Cloud Pro ($49/mo)'}
                      </span>
                    </div>
                    <p className="font-extrabold text-xs text-white mt-2">{skill.name}</p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{skill.summary}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected Skill Detail Card */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                    {selectedSkill.id}
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    Deterministic Fallback: ACTIVE
                  </span>
                </div>
                <h3 className="text-base font-black text-white">{selectedSkill.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedSkill.summary}</p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
                  <div className="text-slate-400">
                    Pack: <span className="text-white">{selectedSkill.pack}</span>
                  </div>
                  <div className="text-slate-400">
                    Zone: <span className="text-white">{selectedSkill.zone}</span>
                  </div>
                  <div className="text-slate-400">
                    Rule 6 Posture:{' '}
                    <span className="text-emerald-400">
                      AI Off-By-Default (Zero LLM Spend Required)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedSkill.id === 'dish-costing-calculator') setActiveTab('costing');
                    else if (selectedSkill.id === 'allergen-matrix-builder')
                      setActiveTab('allergens');
                    else if (
                      selectedSkill.id === 'rota-builder' ||
                      selectedSkill.id === 'flsa_tip_pool_audit'
                    )
                      setActiveTab('rota-flsa');
                  }}
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
                >
                  <Zap className="w-4 h-4" aria-hidden="true" />
                  <span>Open Interactive Calculator</span>
                </button>
              </div>
            </div>
          </div>

          {/* Open-Source Core vs Paid SaaS Tier Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-extrabold uppercase">
                  MIT Open-Source
                </span>
                <span className="text-xl font-black font-mono text-white">$0 / mo</span>
              </div>
              <h3 className="text-base font-black text-white">Free Open-Source Core ($0)</h3>
              <p className="text-xs text-slate-400">
                Unlimited POS terminals, KDS stations, ESC/POS LAN printing, FLSA tip pools, EOD
                Z-Reports, and 39 deterministic Chef&apos;s Intelligence calculators.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-extrabold uppercase">
                  Commercial SaaS
                </span>
                <span className="text-xl font-black font-mono text-amber-400">$49 / mo</span>
              </div>
              <h3 className="text-base font-black text-white">Cloud Pro ($49/mo)</h3>
              <p className="text-xs text-slate-400">
                Encrypted offsite Cloud Storage Bridge, commission-free online ordering relay, 72h
                offline grace window, and full 121-skill Beta AI Autopilot.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-extrabold uppercase">
                  Multi-Unit V17
                </span>
                <span className="text-xl font-black font-mono text-white">$149 / mo</span>
              </div>
              <h3 className="text-base font-black text-white">Enterprise &amp; Commissary</h3>
              <p className="text-xs text-slate-400">
                Multi-unit organization hierarchy with per-location RLS isolation, central
                commissary transfer orders, and multi-distributor MRP split-order optimization.
              </p>
            </div>
          </div>

          {/* 5 Active Failure-Mode Resilience Fallbacks */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  5 Active Failure-Mode Resilience Fallbacks
                </h3>
                <p className="text-xs text-slate-400">
                  Engineered to eliminate competitor cloud-outage, printer-drop, and billing-lockout
                  failure modes.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                5/5 FALLBACKS VERIFIED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
              {resilienceFallbacks.map((fb) => (
                <div
                  key={fb.key}
                  data-fallback-key={fb.key}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-amber-400 font-bold">
                        {fb.key}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        {fb.active ? 'ACTIVE' : 'STANDBY'}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-white leading-snug">{fb.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{fb.strategy}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-900 font-mono text-[10px] text-slate-500 truncate">
                    {fb.endpoint}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChefsIntelligenceHub;
