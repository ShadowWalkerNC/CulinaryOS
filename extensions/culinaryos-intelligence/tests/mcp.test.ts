import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockConnector } from '../src/connectors/mock.ts';
import { ApprovalQueue } from '../src/policies/approvals.ts';
import { AuditLog } from '../src/policies/audit.ts';
import { handleMessage } from '../src/mcp/server.ts';

function ctx() {
  return { connector: new MockConnector(), approvals: new ApprovalQueue(), audit: new AuditLog(), actor: 'test' };
}

describe('mcp server', () => {
  it('initializes with tools/resources/prompts capabilities', async () => {
    const res = await handleMessage(ctx(), { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const result = res!.result as Record<string, unknown>;
    assert.equal((result.serverInfo as Record<string, unknown>).name, 'culinaryos-intelligence');
    assert.deepEqual(Object.keys(result.capabilities as object).sort(), ['prompts', 'resources', 'tools']);
  });

  it('lists tools including route, skill.run, and per-skill tools', async () => {
    const res = await handleMessage(ctx(), { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const names = ((res!.result as Record<string, unknown>).tools as Array<{ name: string }>).map((t) => t.name);
    assert.ok(names.includes('route'));
    assert.ok(names.includes('skill.run'));
    assert.ok(names.includes('skill.recipe-costing'));
    assert.ok(names.includes('approval.decide'));
  });

  it('calls the route tool', async () => {
    const res = await handleMessage(ctx(), {
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'route', arguments: { text: 'what is below par?' } },
    });
    const text = ((res!.result as Record<string, unknown>).content as Array<{ text: string }>)[0].text;
    assert.equal(JSON.parse(text).intent, 'inventory.par');
  });

  it('runs a skill through skill.run', async () => {
    const res = await handleMessage(ctx(), {
      jsonrpc: '2.0', id: 4, method: 'tools/call',
      params: { name: 'skill.run', arguments: { id: 'inventory-par', input: {} } },
    });
    const text = ((res!.result as Record<string, unknown>).content as Array<{ text: string }>)[0].text;
    assert.equal(JSON.parse(text).ok, true);
  });

  it('reads the capabilities resource', async () => {
    const res = await handleMessage(ctx(), {
      jsonrpc: '2.0', id: 5, method: 'resources/read', params: { uri: 'culinaryos://capabilities' },
    });
    const text = ((res!.result as Record<string, unknown>).contents as Array<{ text: string }>)[0].text;
    const caps = JSON.parse(text);
    assert.equal(caps.skills.length, 12);
    assert.equal(caps.agents.length, 6);
    assert.equal(caps.contracts.length, 11);
  });

  it('serves agent prompts', async () => {
    const list = await handleMessage(ctx(), { jsonrpc: '2.0', id: 6, method: 'prompts/list', params: {} });
    const prompts = (list!.result as Record<string, unknown>).prompts as Array<{ name: string }>;
    assert.equal(prompts.length, 6);
    const get = await handleMessage(ctx(), { jsonrpc: '2.0', id: 7, method: 'prompts/get', params: { name: 'agent.compliance-manager' } });
    const messages = (get!.result as Record<string, unknown>).messages as Array<{ content: { text: string } }>;
    assert.match(messages[0].content.text, /Compliance Manager/);
  });

  it('returns JSON-RPC errors for unknown methods and tools', async () => {
    const bad = await handleMessage(ctx(), { jsonrpc: '2.0', id: 8, method: 'nope', params: {} });
    assert.equal((bad!.error as { code: number }).code, -32601);
    const tool = await handleMessage(ctx(), {
      jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'nope', arguments: {} },
    });
    assert.equal((tool!.result as Record<string, unknown>).isError, true);
  });
});
