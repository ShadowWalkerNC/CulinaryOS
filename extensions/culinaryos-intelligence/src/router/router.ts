/**
 * System-1 intent router: fast, deterministic, no model calls.
 * Scores keyword patterns per intent and returns the minimum context
 * domains needed, keeping token use low.
 */
import type { ContextDomain, IntentRoute, RiskLevel } from '../schemas/types.ts';

interface IntentPattern {
  intent: string;
  agent: string;
  risk: RiskLevel;
  context: ContextDomain[];
  /** Weighted keywords/phrases. Multi-word entries match as phrases. */
  keywords: string[];
}

const INTENTS: IntentPattern[] = [
  {
    intent: 'recipe.cost',
    agent: 'executive-chef',
    risk: 'low',
    context: ['recipes', 'inventory', 'menu'],
    keywords: ['recipe cost', 'cost a recipe', 'cost the', 'cost this', 'cost my', 'costing', 'plate cost', 'portion cost', 'dish cost', 'food cost %', 'food cost', 'recipe price', 'price a recipe'],
  },
  {
    intent: 'menu.margin',
    agent: 'cost-controller',
    risk: 'low',
    context: ['menu', 'recipes', 'sales'],
    keywords: ['menu margin', 'margin analysis', 'menu engineering', 'stars dogs puzzles plowhorses', 'menu mix', 'contribution margin', 'pricing'],
  },
  {
    intent: 'prep.list',
    agent: 'kitchen-manager',
    risk: 'low',
    context: ['prep', 'sales', 'recipes', 'inventory'],
    keywords: ['prep list', 'prep sheet', 'mise en place', 'morning prep', 'prep tasks', 'par cooking', 'batch prep'],
  },
  {
    intent: 'production.forecast',
    agent: 'kitchen-manager',
    risk: 'low',
    context: ['sales', 'menu', 'inventory', 'prep'],
    keywords: ['forecast', 'how much to prep', 'production plan', 'covers tonight', 'expected covers', 'demand forecast', 'how many covers'],
  },
  {
    intent: 'inventory.par',
    agent: 'inventory-manager',
    risk: 'low',
    context: ['inventory'],
    keywords: ['par level', 'par check', 'below par', 'stock check', 'on hand', 'stockout', 'running low', 'inventory count'],
  },
  {
    intent: 'order.suggest',
    agent: 'inventory-manager',
    risk: 'medium',
    context: ['inventory', 'purchasing', 'sales'],
    keywords: ['order suggestion', 'purchase order', 'what to order', 'reorder', 'supplier order', 'place an order', 'order guide'],
  },
  {
    intent: 'waste.analyze',
    agent: 'cost-controller',
    risk: 'low',
    context: ['waste', 'inventory', 'sales'],
    keywords: ['waste', 'shrink', 'spoilage', 'trim loss', 'compost', 'overproduction', 'waste log'],
  },
  {
    intent: 'haccp.sop',
    agent: 'compliance-manager',
    risk: 'low',
    context: ['compliance', 'prep'],
    keywords: ['haccp', 'sop', 'standard operating procedure', 'food safety plan', 'critical control', 'ccp', 'compliance checklist'],
  },
  {
    intent: 'temps.review',
    agent: 'compliance-manager',
    risk: 'low',
    context: ['temps', 'compliance'],
    keywords: ['temperature log', 'temp log', 'fridge temp', 'cooler temp', 'danger zone', 'calibration', 'thermometer'],
  },
  {
    intent: 'schedule.analyze',
    agent: 'general-manager',
    risk: 'low',
    context: ['schedule', 'labor', 'sales'],
    keywords: ['schedule', 'staffing', 'labor cost', 'overtime', 'rota', 'shift coverage', 'labor %', 'clock-in'],
  },
  {
    intent: 'event.plan',
    agent: 'executive-chef',
    risk: 'low',
    context: ['events', 'recipes', 'inventory'],
    keywords: ['banquet', 'catering', 'event quantities', 'party of', 'wedding', 'private dining', 'function sheet', 'beo'],
  },
  {
    intent: 'shift.handoff',
    agent: 'general-manager',
    risk: 'low',
    context: ['sales', 'prep', 'schedule', 'temps'],
    keywords: ['handoff', 'hand-off', 'shift notes', 'shift summary', 'service recap', 'pass-down', 'passdown', 'eo day', 'end of day'],
  },
];

const FALLBACK: IntentRoute = {
  intent: 'general.assist',
  agent: 'general-manager',
  risk: 'low',
  context: [],
  confidence: 0,
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s%$.-]/g, ' ');
}

export function routeIntent(text: string): IntentRoute {
  const norm = ` ${normalize(text)} `;
  let best: IntentPattern | null = null;
  let bestScore = 0;
  let bestHits = 0;

  for (const candidate of INTENTS) {
    let score = 0;
    let hits = 0;
    for (const kw of candidate.keywords) {
      if (norm.includes(kw)) {
        hits += 1;
        // Longer, more specific phrases score higher.
        score += 1 + kw.split(' ').length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestHits = hits;
      best = candidate;
    }
  }

  if (!best) return { ...FALLBACK };

  // Confidence: saturate quickly; 1 hit on a specific phrase ≈ 0.6.
  const confidence = Math.min(0.99, 0.35 + bestHits * 0.25 + bestScore * 0.04);
  return {
    intent: best.intent,
    agent: best.agent,
    risk: best.risk,
    context: [...best.context],
    confidence: Math.round(confidence * 100) / 100,
  };
}

export function listIntents(): Array<Pick<IntentPattern, 'intent' | 'agent' | 'risk' | 'context'>> {
  return INTENTS.map(({ intent, agent, risk, context }) => ({ intent, agent, risk, context }));
}
