import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MockConnector } from '../src/connectors/mock.ts';
import { FileConnector } from '../src/connectors/file.ts';

describe('mock connector', () => {
  it('returns seed data for all read contracts', async () => {
    const c = new MockConnector();
    assert.equal((await c['inventory.get']()).length, 8);
    assert.equal((await c['recipes.search']({})).length, 2);
    assert.equal((await c['recipes.search']({ query: 'risotto' })).length, 1);
    assert.equal((await c['sales.summary']()).covers, 1240);
    assert.equal((await c['schedule.read']()).length, 4);
    assert.equal((await c['temps.read']()).length, 4);
    assert.equal((await c['events.read']()).length, 1);
    assert.equal((await c['menu.cost']()).length, 2);
  });

  it('creates prep lists and drafts with ids', async () => {
    const c = new MockConnector();
    const prep = await c['prep.create']({ date: '2026-09-26', tasks: [{ item: 'x', qty: 1, unit: 'pcs' }] });
    assert.match(prep.id, /^prep-/);
    const po = await c['purchase_order.draft']({ lines: [{ itemId: 'a', name: 'a', qty: 1, unit: 'kg', estCost: 2 }] });
    assert.equal(po.status, 'draft');
  });
});

describe('file connector', () => {
  it('reads JSON files and stages writes to outbox', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coi-file-'));
    writeFileSync(join(dir, 'inventory.json'), JSON.stringify([{ id: 'a', name: 'A', unit: 'kg', onHand: 1, par: 5, unitCost: 2 }]));
    const c = new FileConnector({ dir });
    const inv = await c['inventory.get']();
    assert.equal(inv.length, 1);
    assert.equal(c.mode, 'file');

    const prep = await c['prep.create']({ date: '2026-09-26', tasks: [] });
    assert.match(prep.id, /^prep-/);
    assert.equal(c.outboxFiles().length, 1);

    // Missing files degrade to empty, never crash.
    const empty = new FileConnector({ dir: mkdtempSync(join(tmpdir(), 'coi-empty-')) });
    assert.deepEqual(await empty['inventory.get'](), []);
  });
});
