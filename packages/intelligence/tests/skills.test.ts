import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockConnector } from '../src/connectors/mock.ts';
import { ApprovalQueue } from '../src/policies/approvals.ts';
import { AuditLog } from '../src/policies/audit.ts';
import { getSkill } from '../src/skills/registry.ts';
import { runSkill } from '../src/skills/runner.ts';

function ctx() {
  return { connector: new MockConnector(), approvals: new ApprovalQueue(), audit: new AuditLog(), actor: 'test' };
}

describe('recipe-costing', () => {
  it('computes margherita portion cost, food-cost %, and margin', async () => {
    const r = await runSkill(getSkill('recipe-costing')!, ctx(), { recipeId: 'margherita' });
    assert.equal(r.ok, true);
    const d = r.data as Record<string, unknown>;
    assert.equal(d.portionCost, 2.25);
    assert.equal(d.foodCostPct, 15.5);
    assert.equal(d.marginPct, 84.5);
    assert.equal((d.lines as unknown[]).length, 5);
  });

  it('suggests a price for a target food-cost %', async () => {
    const r = await runSkill(getSkill('recipe-costing')!, ctx(), { recipeId: 'margherita', targetFoodCostPct: 28 });
    assert.equal(r.ok, true);
    assert.equal((r.data as Record<string, unknown>).suggestedPrice, 8.04);
  });

  it('fails cleanly for unknown recipes', async () => {
    const r = await runSkill(getSkill('recipe-costing')!, ctx(), { recipeId: 'nope' });
    assert.equal(r.ok, false);
    assert.match(r.error!, /not found/);
  });
});

describe('prep-list', () => {
  it('creates dated tasks scaled to covers', async () => {
    const r = await runSkill(getSkill('prep-list')!, ctx(), { date: '2026-09-26', expectedCovers: 200 });
    assert.equal(r.ok, true);
    const d = r.data as Record<string, unknown>;
    assert.match(d.prepId as string, /^prep-2026-09-26-/);
    assert.equal((d.tasks as unknown[]).length, 3);
  });
});

describe('inventory-par', () => {
  it('flags below-par items sorted by urgency', async () => {
    const r = await runSkill(getSkill('inventory-par')!, ctx(), {});
    assert.equal(r.ok, true);
    const d = r.data as Record<string, unknown>;
    const shorts = d.shorts as Array<{ name: string; coveragePct: number }>;
    assert.equal(shorts.length, 5);
    assert.ok(shorts[0].coveragePct <= shorts[shorts.length - 1].coveragePct);
    assert.equal(d.coveragePct, 37.5);
  });
});

describe('ordering-suggestions approval flow', () => {
  it('pauses for approval, then drafts after approval', async () => {
    const c = ctx();
    const skill = getSkill('ordering-suggestions')!;
    const paused = await runSkill(skill, c, {});
    assert.equal(paused.ok, false);
    assert.equal(paused.approvalRequired, true);
    assert.ok(paused.approvalId);
    assert.equal(c.approvals.pending().length, 1);

    c.approvals.decide(paused.approvalId!, true, 'tester');
    const done = await runSkill(skill, { ...c, approvedId: paused.approvalId }, {});
    assert.equal(done.ok, true);
    const d = done.data as Record<string, unknown>;
    assert.match(d.draftId as string, /^po-draft-/);
    assert.ok(((d.lines as unknown[])?.length ?? 0) > 0);
  });
});

describe('least privilege', () => {
  it('blocks skills from undeclared contracts', async () => {
    const r = await runSkill(getSkill('inventory-par')!, ctx(), {});
    assert.equal(r.ok, true);
    // inventory-par declares only inventory.get; run a skill whose execute
    // would fail if it reached purchase_order.draft (proved by scoped proxy).
    const { scopedConnector } = await import('../src/skills/runner.ts');
    const scoped = scopedConnector(new MockConnector(), 'inventory-par', ['inventory.get']);
    assert.throws(() => (scoped as unknown as Record<string, unknown>)['purchase_order.draft'], /permission denied/);
  });
});

describe('other skills smoke', () => {
  it('menu-margin, forecast, waste, sop, temps, schedule, event, handoff all run', async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['menu-margin', {}],
      ['production-forecast', { date: '2026-10-03' }],
      ['waste-analysis', {}],
      ['haccp-sop', { topic: 'cooling' }],
      ['temps-review', {}],
      ['schedule-analysis', {}],
      ['event-planning', { eventId: 'evt-101' }],
      ['shift-handoff', { shift: 'dinner' }],
    ];
    for (const [id, input] of cases) {
      const r = await runSkill(getSkill(id)!, ctx(), input);
      assert.equal(r.ok, true, `${id}: ${r.error}`);
      assert.ok(r.summary);
    }
  });

  it('event uplift flows into the forecast', async () => {
    const r = await runSkill(getSkill('production-forecast')!, ctx(), { date: '2026-10-03' });
    assert.equal((r.data as Record<string, unknown>).eventUplift, 80);
  });

  it('temps review passes clean mock logs', async () => {
    const r = await runSkill(getSkill('temps-review')!, ctx(), {});
    assert.deepEqual((r.data as Record<string, unknown>).violations, []);
  });
});
