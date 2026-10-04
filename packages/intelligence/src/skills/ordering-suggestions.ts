/**
 * ordering-suggestions: reorder quantities to bring shorts to par,
 * drafted as a purchase order. Purchase write -> APPROVAL REQUIRED.
 */
import type { SkillDefinition, SkillResult } from '../schemas/types.ts';
import type { PurchaseOrderLine } from '../connectors/contracts.ts';
import type { Skill, SkillContext } from './types.ts';
import { gateWrite } from './runner.ts';

const definition: SkillDefinition = {
  id: 'ordering-suggestions',
  title: 'Ordering Suggestions',
  description: 'Suggest reorder quantities for below-par items and draft a purchase order. Requires human approval.',
  agent: 'inventory-manager',
  inputs: ['supplier (optional)', 'bufferPct (optional)'],
  outputs: ['draftId', 'lines', 'totalEst'],
  permissions: ['purchase'],
  requiredTools: ['inventory.get', 'sales.summary', 'purchase_order.draft'],
  instructions:
    'Find items below par and compute order-up-to quantities with an optional buffer %. ' +
    'Group lines by supplier when possible and draft (never send) a purchase order. ' +
    'This skill always pauses for human approval before drafting.',
  schema: {
    input: [
      { name: 'supplier', type: 'string', required: false, description: 'Limit to one supplier' },
      { name: 'bufferPct', type: 'number', required: false, description: 'Extra buffer percent, e.g. 10' },
    ],
    output: ['draftId', 'lines', 'totalEst'],
  },
  risk: 'medium',
};

export const orderingSuggestions: Skill = {
  definition,

  async execute(ctx: SkillContext, input: Record<string, unknown>): Promise<SkillResult> {
    const { supplier, bufferPct } = input as { supplier?: string; bufferPct?: number };
    const items = await ctx.connector['inventory.get']();
    const buffer = 1 + (bufferPct ?? 0) / 100;
    const lines: PurchaseOrderLine[] = items
      .filter((i) => i.onHand < i.par && (!supplier || i.supplier === supplier))
      .map((i) => {
        const qty = Math.ceil((i.par - i.onHand) * buffer * 10) / 10;
        return { itemId: i.id, name: i.name, qty, unit: i.unit, estCost: Math.round(qty * i.unitCost * 100) / 100 };
      });
    if (lines.length === 0) {
      return { ok: true, skillId: definition.id, data: { lines: [], totalEst: 0 }, summary: 'nothing below par — no order needed' };
    }
    const totalEst = Math.round(lines.reduce((s, l) => s + l.estCost, 0) * 100) / 100;
    return gateWrite(
      { definition } as Skill,
      ctx,
      {
        action: 'purchase_order.draft',
        category: 'purchase',
        summary: `draft purchase order: ${lines.length} lines, est $${totalEst}${supplier ? ` (${supplier})` : ''}`,
        payload: { lines, totalEst, supplier },
      },
      () => ctx.connector['purchase_order.draft']({ lines, supplier }),
      (draft) => ({
        data: { draftId: draft.id, lines: draft.lines, totalEst: draft.totalEst },
        summary: `drafted purchase order ${draft.id}: ${lines.length} lines, est $${draft.totalEst}`,
      }),
    );
  },
};
