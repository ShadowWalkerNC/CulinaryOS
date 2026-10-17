import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requiresApproval, assertAllowed } from '../src/policies/permissions.ts';
import { ApprovalQueue } from '../src/policies/approvals.ts';
import { AuditLog } from '../src/policies/audit.ts';
import { redact, REDACTED } from '../src/policies/redact.ts';

describe('permissions', () => {
  it('reads never need approval', () => {
    assert.equal(
      requiresApproval({ contracts: ['inventory.get'], categories: ['readonly'] }, 'low', ['inventory.get']),
      false,
    );
  });

  it('purchases, money, schedules, employees, destructive, inventory-sensitive writes need approval', () => {
    for (const category of ['purchase', 'money', 'schedule', 'employee', 'destructive', 'inventory-sensitive'] as const) {
      assert.equal(
        requiresApproval({ contracts: ['purchase_order.draft'], categories: [category] }, 'medium', ['purchase_order.draft']),
        true,
        category,
      );
    }
  });

  it('high-risk writes always need approval', () => {
    assert.equal(
      requiresApproval({ contracts: ['prep.create'], categories: ['operational-write'] }, 'high', ['prep.create']),
      true,
    );
  });

  it('routine operational writes do not need approval', () => {
    assert.equal(
      requiresApproval({ contracts: ['prep.create'], categories: ['operational-write'] }, 'low', ['prep.create']),
      false,
    );
  });

  it('denies contracts outside the grant', () => {
    assert.throws(() => assertAllowed({ contracts: ['inventory.get'], categories: [] }, 'purchase_order.draft'), /permission denied/);
  });
});

describe('approvals', () => {
  it('request -> approve lifecycle', () => {
    const q = new ApprovalQueue();
    const req = q.request({ skillId: 'ordering-suggestions', action: 'purchase_order.draft', category: 'purchase', risk: 'medium', summary: 's', payload: {} });
    assert.equal(req.status, 'pending');
    assert.equal(q.pending().length, 1);
    const decided = q.decide(req.id, true, 'tester');
    assert.equal(decided.status, 'approved');
    assert.equal(q.pending().length, 0);
  });

  it('rejects double decisions and unknown ids', () => {
    const q = new ApprovalQueue();
    const req = q.request({ skillId: 'x', action: 'a', category: 'money', risk: 'high', summary: 's', payload: {} });
    q.decide(req.id, false);
    assert.throws(() => q.decide(req.id, true), /already rejected/);
    assert.throws(() => q.decide('nope', true), /unknown approval/);
  });

  it('redacts secrets in stored payloads', () => {
    const q = new ApprovalQueue();
    const req = q.request({ skillId: 'x', action: 'a', category: 'money', risk: 'high', summary: 's', payload: { apiKey: 'sk-live-123', total: 5 } });
    assert.equal((req.payload as Record<string, unknown>).apiKey, REDACTED);
    assert.equal((req.payload as Record<string, unknown>).total, 5);
  });

  it('persists across instances via file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'coi-apr-'));
    const file = join(dir, 'approvals.json');
    const q1 = new ApprovalQueue(0, file);
    const req = q1.request({ skillId: 'x', action: 'a', category: 'money', risk: 'high', summary: 's', payload: {} });
    const q2 = new ApprovalQueue(0, file);
    assert.equal(q2.pending().length, 1);
    q2.decide(req.id, true, 'cli');
    const q3 = new ApprovalQueue(0, file);
    assert.equal(q3.pending().length, 0);
    assert.equal(q3.get(req.id)?.status, 'approved');
  });
});

describe('audit + redaction', () => {
  it('redacts sensitive keys, bearer tokens, and card numbers', () => {
    const out = redact({
      token: 'abc123',
      nested: { password: 'pw', ok: 'fine' },
      header: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload',
      card: '4111 1111 1111 1111',
    }) as Record<string, unknown>;
    assert.equal(out.token, REDACTED);
    assert.equal((out.nested as Record<string, unknown>).password, REDACTED);
    assert.equal((out.nested as Record<string, unknown>).ok, 'fine');
    assert.match(out.header as string, /\[redacted\]/);
    assert.equal(out.card, REDACTED);
  });

  it('audit log stores redacted entries', () => {
    const log = new AuditLog();
    const e = log.record({ actor: 't', action: 'a', ok: true, detail: { api_key: 'k', n: 1 } });
    assert.equal((e.detail as Record<string, unknown>).api_key, REDACTED);
    assert.equal(log.entries().length, 1);
  });
});
