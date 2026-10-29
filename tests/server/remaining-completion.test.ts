import { describe, it, expect } from 'bun:test';
import { handlers, handlePrepTaskCompleted } from '../../packages/event-bus/src/index.js';
import { intelligenceRoutes } from '../../apps/server/src/routes/intelligence.js';
import { marketingRoutes } from '../../apps/server/src/routes/marketing.js';
import { hardwareRoutes } from '../../apps/server/src/routes/hardware.js';
import { createClient } from '../../packages/sdk/src/index.js';
import { HardwarePrinterService } from '../../apps/pos/src/lib/hardware-printer.js';

describe('Stages 10-14: Final CulinaryOS Completion Verification', () => {
  it('Stage 10: registers prep.task.completed in event-bus and decrements raw ingredient inventory', async () => {
    const reg = handlers.find((h) => h.eventType === 'prep.task.completed');
    expect(reg).toBeDefined();
    expect(reg?.name).toBe('prep-task-completed');

    let updatedPayload: Record<string, any> | null = null;
    const mockSupabase = {
      from: (table: string) => {
        if (table === 'pantry_items') {
          return {
            select: () => ({
              eq: () => ({
                ilike: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'pantry-onions-1',
                      name: 'Diced Onions',
                      current_qty: 10,
                      reorder_at: 5,
                      unit: 'kg',
                    },
                  }),
                }),
              }),
            }),
            update: (payload: Record<string, any>) => {
              updatedPayload = payload;
              return {
                eq: () => ({
                  eq: async () => ({ error: null }),
                }),
              };
            },
          };
        }
        return {};
      },
    };

    await handlePrepTaskCompleted(
      {
        eventId: 'evt-prep-001',
        eventType: 'prep.task.completed' as any,
        tenantId: '00000000-0000-0000-0000-000000000001',
        source: 'prep-engine',
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          taskId: 'task-101',
          completedAt: new Date().toISOString(),
          decrements: [{ ingredient: 'Diced Onions', quantity: 3.5, unit: 'kg' }],
        },
      },
      mockSupabase
    );

    expect(updatedPayload).not.toBeNull();
    expect(updatedPayload!.current_qty).toBe(6.5);
  });

  it('Stage 11: serves /v1/intelligence skills, routing, execution, and approvals', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
    };

    const skillsRes = await intelligenceRoutes.request('/skills', { method: 'GET', headers });
    expect(skillsRes.status).toBe(200);
    const skillsBody: any = await skillsRes.json();
    expect(skillsBody.ok).toBe(true);
    expect(skillsBody.data.length).toBe(12);

    const routeRes = await intelligenceRoutes.request('/route', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'Check Sysco and Dennis purveyor MRP split pricing' }),
    });
    expect(routeRes.status).toBe(200);
    const routeBody: any = await routeRes.json();
    expect(routeBody.data.matchedSkillId).toBe('distributor_price_arbitrage');

    const runRes = await intelligenceRoutes.request('/skills/prime_cost_audit/run', {
      method: 'POST',
      headers,
      body: JSON.stringify({ revenueCents: 1000000, cogsCents: 280000, laborCents: 290000 }),
    });
    expect(runRes.status).toBe(200);
    const runBody: any = await runRes.json();
    expect(runBody.data.metrics.primeCostPct).toBe(57);
    expect(runBody.data.metrics.status).toBe('healthy');
  });

  it('Stage 11: serves /v1/marketing campaign scheduler and skills', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
    };

    const postRes = await marketingRoutes.request('/posts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        channel: 'instagram',
        content: 'Fresh Burrata & Heirloom Tomato special tonight!',
        scheduledAt: '2026-10-29T17:00:00.000Z',
        skill: 'special_post',
      }),
    });
    expect(postRes.status).toBe(201);
    const postBody: any = await postRes.json();
    expect(postBody.ok).toBe(true);
    expect(postBody.data.status).toBe('scheduled');
  });

  it('Stage 11 & 12: @culinaryos/sdk exposes displays and hardware bridge methods', () => {
    const sdk = createClient({
      baseUrl: 'http://localhost:3000',
      tenantId: '00000000-0000-0000-0000-000000000001',
    });
    expect(typeof sdk.displays.discover).toBe('function');
    expect(typeof sdk.displays.list).toBe('function');
    expect(typeof sdk.displays.pair).toBe('function');
    expect(typeof sdk.displays.switchMode).toBe('function');
    expect(typeof sdk.displays.launcherConfig).toBe('function');
    expect(typeof sdk.displays.bump).toBe('function');
    expect(typeof sdk.hardware.registry).toBe('function');
    expect(typeof sdk.hardware.print).toBe('function');
    expect(typeof sdk.hardware.kickDrawer).toBe('function');
  });

  it('Stage 12: /v1/hardware registry, loopback print, and honest cash drawer actuation status', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
    };

    const regRes = await hardwareRoutes.request('/registry', { method: 'GET', headers });
    expect(regRes.status).toBe(200);
    const regBody: any = await regRes.json();
    expect(regBody.data.some((d: any) => d.id === 'walmart-onn-4k-gtv' && d.verificationState === 'tested_on_device')).toBe(true);

    const loopbackDrawerRes = await hardwareRoutes.request('/kick-drawer', {
      method: 'POST',
      headers,
      body: JSON.stringify({ loopback: true, pin: 2 }),
    });
    expect(loopbackDrawerRes.status).toBe(200);
    const loopbackBody: any = await loopbackDrawerRes.json();
    expect(loopbackBody.data.status).toBe('sent');
    expect(loopbackBody.data.bytesSent).toBe(5);

    const unconfiguredDrawerRes = await hardwareRoutes.request('/kick-drawer', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const unconfiguredBody: any = await unconfiguredDrawerRes.json();
    expect(unconfiguredBody.data.status).toBe('unavailable');

    // Verify POS HardwarePrinterService reports honest unavailable status when no device is connected
    const posPrinter = HardwarePrinterService.getInstance();
    const drawerKick = await posPrinter.kickCashDrawer();
    expect(drawerKick.success).toBe(false);
    expect(drawerKick.message).toContain('unavailable');
  });
});
