// CulinaryOS Intelligence 0.3 journey packs: display grouping over the workflow catalog.
// Public brand is CulinaryOS Intelligence; Open Kitchen Toolkit is a recognized alias.
// Core 32 IDs per pack are fixed by the Interagency 0.3 library plan; every other
// existing workflow is assigned to exactly one audience-sensible pack, no duplicates.

export const BRAND = 'CulinaryOS Intelligence' as const;
export const BRAND_ALIAS = 'Open Kitchen Toolkit' as const;

export const PACK_IDS = [
  'home',
  'bakery',
  'food-truck',
  'bar-foh',
  'shops',
  'operations',
  'people',
  'care',
] as const;
export type PackId = (typeof PACK_IDS)[number];

export interface WorkflowPack {
  id: PackId;
  label: string;
  audience: string;
  summary: string;
  workflowIds: string[];
}

// 13 canonical workflows the library worker adds in Interagency 0.3 (105 -> 118).
export const EXPECTED_NEW_WORKFLOW_IDS = [
  'home-cooking-timeline',
  'recipe-equipment-adaptation',
  'dough-temperature-trial-log',
  'proofing-oven-calendar',
  'food-truck-event-go-no-go',
  'event-application-readiness',
  'beverage-batch-dilution',
  'draft-beer-yield-loss',
  'delivery-platform-net-margin',
  'product-recall-trace-drill',
  'multilingual-service-brief',
  'campaign-sales-review',
  'approved-diet-menu-screen',
] as const;

// New deterministic calculator tools root provides in Interagency 0.3.
// Journeys may treat these names as valid; no other unavailable tool may be added.
export const INTERAGENCY_CALCULATOR_TOOLS = [
  'calculate_menu_margins',
  'calculate_staffing_budget',
  'calculate_bakery_formula',
] as const;

// Exact 32 core IDs from the Interagency 0.3 library plan, four per pack.
export const PACK_CORE_IDS: Record<PackId, readonly string[]> = {
  home: [
    'home-cooking-timeline',
    'recipe-equipment-adaptation',
    'home-pantry-meal-plan',
    'household-meal-calendar',
  ],
  bakery: [
    'dough-temperature-trial-log',
    'proofing-oven-calendar',
    'preferment-flour-accounting',
    'bakery-preorder-consolidation',
  ],
  'food-truck': [
    'food-truck-event-go-no-go',
    'event-application-readiness',
    'food-truck-loadout',
    'food-truck-event-settlement',
  ],
  'bar-foh': [
    'beverage-batch-dilution',
    'draft-beer-yield-loss',
    'foh-service-brief',
    'table-turnover-pacing-plan',
  ],
  shops: [
    'delivery-platform-net-margin',
    'retail-pack-size-pricing',
    'invoice-reconciliation',
    'retail-markdown-review',
  ],
  operations: [
    'product-recall-trace-drill',
    'recipe-dependency-impact',
    'stock-variance',
    'menu-margin-review',
  ],
  people: [
    'multilingual-service-brief',
    'campaign-sales-review',
    'training-plan-generator',
    'social-media-content-generator',
  ],
  care: [
    'approved-diet-menu-screen',
    'dietary-requirements-tracker',
    'recipe-compliance-checker',
    'onboarding',
  ],
};

export const WORKFLOW_PACKS: WorkflowPack[] = [
  {
    id: 'home',
    label: 'Home',
    audience: 'Home kitchen',
    summary: 'Everyday home cooking, pantry meals and household planning.',
    workflowIds: [
      ...PACK_CORE_IDS.home,
      'cook-once-component-plan',
      'freezer-inventory-plan',
      'household-grocery-budget',
      'leftover-reuse-plan',
      'recipe-troubleshooting-log',
    ],
  },
  {
    id: 'bakery',
    label: 'Bakery',
    audience: 'Bakery / home baker',
    summary: 'Bakery formulas, proofing, oven plans and preorders.',
    workflowIds: [
      ...PACK_CORE_IDS.bakery,
      'bakers-percentage-formula',
      'bakery-batch-traceability',
      'bakery-display-sellthrough',
      'bakery-oven-load-sequence',
      'custom-cake-order-specification',
      'dough-production-yield-plan',
    ],
  },
  {
    id: 'food-truck',
    label: 'Food truck / catering',
    audience: 'Food truck / catering',
    summary: 'Food-truck service, events, catering quotes and settlement.',
    workflowIds: [
      ...PACK_CORE_IDS['food-truck'],
      'food-truck-commissary-handoff',
      'food-truck-power-water-plan',
      'food-truck-throughput-menu',
      'mobile-service-contingency-plan',
      'banquet-event-order',
      'canape-reception-planner',
      'catering-quotation',
      'corporate-event-menu-planner',
      'event-catering-brief',
      'event-equipment-kit-list',
      'event-run-of-show',
      'event-staffing-plan',
      'food-truck-event-profitability',
      'post-event-report',
      'private-dining-setup-guide',
      'wedding-catering-checklist',
    ],
  },
  {
    id: 'bar-foh',
    label: 'Bar / front of house',
    audience: 'Bar / front of house',
    summary: 'Drinks, batching, guest service and dining-room pacing.',
    workflowIds: [
      ...PACK_CORE_IDS['bar-foh'],
      'complaint-handling-resolution-log',
      'guest-feedback-analyser',
      'upselling-training-script',
      'vip-special-guest-brief',
      'wine-beverage-pairing-guide',
      'bar-cocktail-recipe-builder',
    ],
  },
  {
    id: 'shops',
    label: 'Shops',
    audience: 'Deli / independent shop',
    summary: 'Small-shop stock, pack pricing, delivery margins and daily close.',
    workflowIds: [
      ...PACK_CORE_IDS.shops,
      'counter-service-combo-costing',
      'deli-display-replenishment',
      'small-shop-cash-close',
      'small-shop-reorder-round',
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    audience: 'Restaurant / professional kitchen',
    summary: 'Back-of-house operations: prep, costing, suppliers, safety and capacity.',
    workflowIds: [
      ...PACK_CORE_IDS.operations,
      'agency-chef-onboarding-generator',
      'allergen-management-system',
      'capacity-aware-prep',
      'coshh-chemical-safety',
      'daily-brief-generator',
      'daily-close-review',
      'equipment-maintenance-log',
      'food-safety-incident-report',
      'haccp-checklist-generator',
      'kitchen-ethos-doc-generator',
      'ordering-proposals',
      'prep-planning',
      'recipe-costing',
      'recipe-documentation',
      'recipe-scaling',
      'rota-builder',
      'station-setup-checklist',
      'usable-yield-verification',
      'waste-review',
      'equipment-downtime-replan',
      'multi-station-pickup-plan',
      'production-batch-record',
      'service-bottleneck-review',
      'shift-handover-board',
      'data-reconciliation',
      'kitchen-budget-planner',
      'partnership-growth-finder',
      'price-increase-impact-calculator',
      'purchase-price-review',
      'stock-take-template-generator',
      'supplier-performance-scorecard',
      'supplier-substitution-review',
      'tender-brief-new-suppliers',
      'dish-development-brief',
      'seasonal-menu-planner',
      'tasting-menu-builder',
    ],
  },
  {
    id: 'people',
    label: 'People / marketing',
    audience: 'Restaurant / food business teams',
    summary: 'Hiring, training, wellbeing, reviews and honest marketing.',
    workflowIds: [
      ...PACK_CORE_IDS.people,
      'apprenticeship-tracker',
      'disciplinary-documentation-helper',
      'sop-drafting',
      'staff-performance-review',
      'team-meeting-agenda-builder',
      'trial-shift-assessment',
      'burnout-stress-risk-assessment',
      'chef-personal-brand-builder',
      'chef-wellbeing-check-in',
      'kitchen-culture-health-check',
      'menu-description-writer',
      'plate-photography-brief',
    ],
  },
  {
    id: 'care',
    label: 'Care',
    audience: 'Assisted living / care kitchen',
    summary: 'Care-kitchen menus against approved diet specifications, with review.',
    workflowIds: [
      ...PACK_CORE_IDS.care,
      'nutritional-information-calculator',
    ],
  },
];

const PACK_BY_WORKFLOW = new Map<string, WorkflowPack>();
for (const pack of WORKFLOW_PACKS) {
  for (const id of pack.workflowIds) {
    if (!PACK_BY_WORKFLOW.has(id)) PACK_BY_WORKFLOW.set(id, pack);
  }
}

export function isPackId(value: unknown): value is PackId {
  return typeof value === 'string' && (PACK_IDS as readonly string[]).includes(value);
}

export function packForWorkflow(workflowId: string): WorkflowPack | undefined {
  return PACK_BY_WORKFLOW.get(workflowId);
}

export function packIdForWorkflow(workflowId: string): PackId | undefined {
  return PACK_BY_WORKFLOW.get(workflowId)?.id;
}

export function audienceForWorkflow(workflowId: string): string | undefined {
  return PACK_BY_WORKFLOW.get(workflowId)?.audience;
}

export function allPackWorkflowIds(): string[] {
  return WORKFLOW_PACKS.flatMap((p) => p.workflowIds);
}
