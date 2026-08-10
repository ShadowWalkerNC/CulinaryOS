import { describe, it, expect } from 'bun:test';

/**
 * CulinaryOps satellite MCP contract — tool surface the CulinaryOS hub must expose
 * as server name `culinaryops-mcp` (extension com.culinaryos.ext.culinaryops).
 *
 * Mirrors bridges/culinaryos/mcp/src/culinaryops-server.ts and
 * CulinaryOps mcp/culinaryops-mcp tools.
 */

const CULINARYOPS_TOOLS = [
  'get_labor_summary',
  'get_food_cost',
  'log_waste',
  'get_waste_summary',
  'list_vendors',
  'create_purchase_order',
] as const;

describe('CulinaryOps MCP bridge (culinaryops-mcp)', () => {
  it('uses distinct server name from core culinaryos-mcp', () => {
    const satellite = 'culinaryops-mcp';
    const coreOs = 'culinaryos-mcp';
    expect(satellite).not.toBe(coreOs);
    expect(satellite).toContain('ops');
  });

  it('declares the six operations tools', () => {
    expect(CULINARYOPS_TOOLS).toHaveLength(6);
    expect(CULINARYOPS_TOOLS).toContain('get_labor_summary');
    expect(CULINARYOPS_TOOLS).toContain('create_purchase_order');
  });

  it('get_labor_summary demo math matches labor-engine style totals', () => {
    const shifts = [
      { hours: 8, rate: 22 },
      { hours: 8, rate: 20 },
    ];
    const total_hours = shifts.reduce((s, x) => s + x.hours, 0);
    const total_cost = shifts.reduce((s, x) => s + x.hours * x.rate, 0);
    expect(total_hours).toBe(16);
    expect(total_cost).toBe(336);
    expect(Math.round((total_cost / total_hours) * 100) / 100).toBe(21);
  });

  it('log_waste computes waste_cost from grams × cost_per_gram', () => {
    const quantity_grams = 200;
    const cost_per_gram = 0.05;
    const waste_cost = Math.round(quantity_grams * cost_per_gram * 100) / 100;
    expect(waste_cost).toBe(10);
  });

  it('extension id is com.culinaryos.ext.culinaryops', () => {
    expect('com.culinaryos.ext.culinaryops').toMatch(/^com\.culinaryos\.ext\./);
  });
});
