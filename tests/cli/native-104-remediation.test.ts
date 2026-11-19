import assert from 'node:assert/strict';
import { test } from 'node:test';
import { posCommand } from '../../cli/src/commands/pos.ts';
import { kdsCommand } from '../../cli/src/commands/kds.ts';

test('native CLI rejects malformed cents and preserves HTTP failure status and retry keys', async () => {
  const originalFetch = globalThis.fetch;
  const originalExit = process.exitCode;
  const requests: Array<{ url: string; body: any }> = [];
  globalThis.fetch = (async (url, init) => {
    requests.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ error: 'denied' }), { status: 403 });
  }) as typeof fetch;
  try {
    for (const amount of ['100.9', '100abc', '9007199254740992']) {
      process.exitCode = 0;
      await posCommand.parseAsync(['refund', 'payment', amount, 'reason'], { from: 'user' });
      assert.equal(process.exitCode, 1);
    }
    assert.equal(requests.length, 0);
    process.exitCode = 0;
    await posCommand.parseAsync(['refund', 'payment', '100', 'reason', '--operation-id', 'retry-key'], { from: 'user' });
    assert.equal(process.exitCode, 1);
    assert.equal(requests[0]?.body.amountCents, 100);
    assert.equal(requests[0]?.body.operationId, 'retry-key');
    process.exitCode = 0;
    await kdsCommand.parseAsync(['bump', 'ticket'], { from: 'user' });
    assert.equal(process.exitCode, 1);
    assert.match(requests[1]?.body.operationId, /^cli-[0-9a-f-]{36}$/);
  } finally {
    globalThis.fetch = originalFetch;
    process.exitCode = originalExit;
  }
});

