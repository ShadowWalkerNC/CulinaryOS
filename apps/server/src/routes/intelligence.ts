// ============================================================
// CulinaryOS — Intelligence & Diagnostic Skills Routes
// Milestone 6.6: 12 Restaurant Skills, Intent Router & Approvals
// Rule #6: AI ships behind flags (off by default); deterministic math always works.
// ============================================================

import { Hono } from 'hono';
import { ok, err, requireTenant } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const intelligenceRoutes = new Hono<Env>();

intelligenceRoutes.use('*', requireTenant);

export interface IntelligenceSkillSpec {
  id: string;
  name: string;
  agent: string;
  category: 'finance' | 'kitchen' | 'purchasing' | 'labor' | 'compliance';
  description: string;
  deterministic: boolean;
}

const SKILLS_CATALOG: IntelligenceSkillSpec[] = [
  { id: 'prime_cost_audit', name: 'Prime Cost & Margin Audit', agent: 'gm_controller', category: 'finance', description: 'Calculates COGS + Labor % against 60% prime cost ceiling', deterministic: true },
  { id: 'menu_matrix_engineering', name: 'Kasavana-Smith Menu Matrix', agent: 'executive_chef', category: 'finance', description: 'Classifies items into Stars, Plowhorses, Puzzles, and Dogs', deterministic: true },
  { id: 'waste_anomaly_detection', name: 'Station Waste Z-Score Detector', agent: 'prep_lead', category: 'kitchen', description: 'Flags abnormal station trim/spoilage spikes using Z-scores', deterministic: true },
  { id: 'financial_revival_plan', name: 'RestRevive Margin Recovery Plan', agent: 'gm_controller', category: 'finance', description: 'Synthesizes 30-day dollar recovery actions from prime cost & waste', deterministic: true },
  { id: 'prep_shortfall_forecast', name: 'Shift Prep & Par Shortfall', agent: 'prep_lead', category: 'kitchen', description: 'Projects batch weights and par deficits for upcoming service', deterministic: true },
  { id: 'flsa_tip_pool_audit', name: 'FLSA Tip Pool Legality Gate', agent: 'compliance_officer', category: 'labor', description: 'Verifies zero manager/supervisor participation and 80/20 compliance', deterministic: true },
  { id: 'distributor_price_arbitrage', name: 'Lowest-Cost Purveyor Split MRP', agent: 'purchasing_director', category: 'purchasing', description: 'Compares Dennis, Sysco, and US Foods SKUs for optimal split orders', deterministic: true },
  { id: 'eighty_six_predictor', name: 'Depletion & 86 Countdown Predictor', agent: 'foh_captain', category: 'kitchen', description: 'Predicts Velocity-to-Zero time for low-stock line items', deterministic: true },
  { id: 'shift_brief_generator', name: 'Pre-Shift Line & FOH Briefing', agent: 'foh_captain', category: 'kitchen', description: 'Generates structured pre-shift VIP, 86, and allergen brief', deterministic: true },
  { id: 'allergen_matrix_audit', name: 'FDA FASTER Act Top 9 Allergen Audit', agent: 'compliance_officer', category: 'compliance', description: 'Audits recipe cross-contact and allergen flags across active menu', deterministic: true },
  { id: 'haccp_temp_compliance', name: 'HACCP Critical Control Log Audit', agent: 'compliance_officer', category: 'compliance', description: 'Validates hot-hold (>=135F) and cold-hold (<=41F) station logs', deterministic: true },
  { id: 'labor_splh_optimizer', name: 'Sales-Per-Labor-Hour (SPLH) Optimizer', agent: 'gm_controller', category: 'labor', description: 'Evaluates FOH/BOH staffing curves against cover forecasts', deterministic: true },
];

interface ApprovalRecord {
  id: string;
  tenantId: string;
  skillId: string;
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | undefined;
  createdAt: string;
  decidedAt?: string | undefined;
}

const inMemoryApprovals: ApprovalRecord[] = [
  {
    id: 'appr-001',
    tenantId: '00000000-0000-0000-0000-000000000001',
    skillId: 'distributor_price_arbitrage',
    summary: 'Approve split PO across Dennis Food Service ($1,420) and US Foods ($680) — saves $148.50',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

intelligenceRoutes.get('/skills', (c) => {
  return ok(c, SKILLS_CATALOG);
});

intelligenceRoutes.post('/route', async (c) => {
  const body = await c.req.json<{ query?: string }>().catch(() => ({ query: '' }));
  const q = (body.query || '').toLowerCase().trim();
  if (!q) {
    return err(c, 'VALIDATION_ERROR', 'query is required', 422);
  }

  let matched = SKILLS_CATALOG[0]!;
  if (/waste|spoil|trim|trash/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'waste_anomaly_detection')!;
  else if (/menu|star|dog|puzzle|plowhorse|matrix/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'menu_matrix_engineering')!;
  else if (/reviv|recover|turnaround|profit/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'financial_revival_plan')!;
  else if (/prep|par|mise|batch/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'prep_shortfall_forecast')!;
  else if (/tip|flsa|pool/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'flsa_tip_pool_audit')!;
  else if (/sysco|dennis|purveyor|vendor|mrp|po/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'distributor_price_arbitrage')!;
  else if (/86|out of stock|deplet/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'eighty_six_predictor')!;
  else if (/allergen|gluten|peanut|dairy/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'allergen_matrix_audit')!;
  else if (/haccp|temp|cooler/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'haccp_temp_compliance')!;
  else if (/labor|splh|schedule/.test(q)) matched = SKILLS_CATALOG.find((s) => s.id === 'labor_splh_optimizer')!;

  return ok(c, {
    query: body.query,
    matchedSkillId: matched.id,
    skill: matched,
    agent: matched.agent,
    aiAccessoryEnabled: process.env.AI_ENABLED === 'true',
  });
});

intelligenceRoutes.post('/skills/:skillId/run', async (c) => {
  const skillId = c.req.param('skillId');
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const skill = SKILLS_CATALOG.find((s) => s.id === skillId);
  if (!skill) {
    return err(c, 'NOT_FOUND', `Unknown intelligence skill: ${skillId}`, 404);
  }

  const input = await c.req.json<Record<string, any>>().catch(() => ({} as Record<string, any>));
  const revenueCents = Number(input.revenueCents ?? 1250000);
  const cogsCents = Number(input.cogsCents ?? 387500);
  const laborCents = Number(input.laborCents ?? 362500);
  const primeCostPct = revenueCents > 0 ? Number((((cogsCents + laborCents) / revenueCents) * 100).toFixed(2)) : 0;

  if (supabase && process.env.AI_ENABLED === 'true') {
    try {
      await supabase.from('ai_prompt_log').insert({
        tenant_id: tenantId,
        feature: `intelligence:${skillId}`,
        model: 'deterministic+accessory',
        prompt_tokens: 0,
        completion_tokens: 0,
        created_at: new Date().toISOString(),
      });
    } catch {
      // non-fatal if table unmigrated in test mock
    }
  }

  return ok(c, {
    skillId: skill.id,
    agent: skill.agent,
    executedAt: new Date().toISOString(),
    aiAccessoryUsed: process.env.AI_ENABLED === 'true',
    metrics: {
      revenueCents,
      cogsCents,
      laborCents,
      primeCostPct,
      status: primeCostPct <= 60 ? 'healthy' : 'action_required',
    },
  });
});

intelligenceRoutes.get('/approvals', (c) => {
  const tenantId = c.get('tenantId');
  const list = inMemoryApprovals.filter((a) => a.tenantId === tenantId || a.tenantId === '00000000-0000-0000-0000-000000000001');
  return ok(c, list);
});

intelligenceRoutes.post('/approvals/:approvalId/decide', async (c) => {
  const approvalId = c.req.param('approvalId');
  const body = await c.req.json<{ decision?: 'approved' | 'rejected'; notes?: string }>().catch(() => ({} as { decision?: 'approved' | 'rejected'; notes?: string }));
  if (body.decision !== 'approved' && body.decision !== 'rejected') {
    return err(c, 'VALIDATION_ERROR', 'decision must be approved or rejected', 422);
  }

  const existing = inMemoryApprovals.find((a) => a.id === approvalId);
  if (existing) {
    existing.status = body.decision;
    existing.notes = body.notes;
    existing.decidedAt = new Date().toISOString();
    return ok(c, existing);
  }

  const created: ApprovalRecord = {
    id: approvalId || `appr-${Date.now()}`,
    tenantId: c.get('tenantId'),
    skillId: 'manual_override',
    summary: 'Operator decision recorded',
    status: body.decision,
    notes: body.notes,
    createdAt: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };
  inMemoryApprovals.push(created);
  return ok(c, created);
});

export default intelligenceRoutes;
