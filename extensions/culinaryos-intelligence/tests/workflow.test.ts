import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockConnector } from '../src/connectors/mock.ts';
import { ApprovalQueue } from '../src/policies/approvals.ts';
import { AuditLog } from '../src/policies/audit.ts';
import { runWorkflow } from '../src/workflows/engine.ts';
import { dailyOpen } from '../src/workflows/builtin.ts';

describe('workflow engine', () => {
  it('runs daily-open end to end, threading forecast covers into prep', async () => {
    const r = await runWorkflow(dailyOpen, {
      connector: new MockConnector(),
      approvals: new ApprovalQueue(),
      audit: new AuditLog(),
      actor: 'test',
    });
    assert.equal(r.ok, true);
    assert.equal(r.steps.length, 3);
    const forecast = r.steps[0].result.data as Record<string, unknown>;
    const prep = r.steps[1].result.data as Record<string, unknown>;
    assert.equal(prep.expectedCovers, forecast.covers);
    assert.ok((prep.tasks as unknown[]).length > 0);
  });

  it('fails cleanly on unknown skills and bad refs', async () => {
    const base = { connector: new MockConnector(), approvals: new ApprovalQueue(), audit: new AuditLog(), actor: 'test' };
    const badSkill = await runWorkflow({ id: 'x', title: 'x', steps: [{ id: 's', skillId: 'nope' }] }, base);
    assert.equal(badSkill.ok, false);
    const badRef = await runWorkflow(
      { id: 'y', title: 'y', steps: [{ id: 's', skillId: 'inventory-par', from: { ids: 'bogus' } }] },
      base,
    );
    assert.equal(badRef.ok, false);
    assert.match(badRef.error!, /bad ref/);
  });
});
