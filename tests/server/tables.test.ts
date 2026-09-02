import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

describe('Table Operations & Assistance API (F1.2 & F1.4)', () => {
  it('1. POST /v1/tables/merge merges source tables into target table', async () => {
    const res = await app.request('/v1/tables/merge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        targetTableId: 'T1',
        sourceTableIds: ['T2', 'T3'],
        managerPin: '5678',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.targetTableId).toBe('T1');
    expect(body.data.mergedSourceTableIds).toEqual(['T2', 'T3']);
  });

  it('2. POST /v1/tables/split splits order into multiple guest check partitions', async () => {
    const res = await app.request('/v1/tables/split', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        orderId: 'order-test-123',
        splitType: 'seat',
        partitions: [
          { seatNumber: 1, itemIds: ['it-1', 'it-2'], guestLabel: 'Seat 1' },
          { seatNumber: 2, itemIds: ['it-3'], guestLabel: 'Seat 2' },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.newOrderIds).toHaveLength(2);
    expect(body.data.partitions).toHaveLength(2);
  });

  it('3. POST /v1/tables/transfer enforces manager PIN authorization', async () => {
    // Attempt with invalid PIN (1234 is server, not manager)
    const unauthorizedRes = await app.request('/v1/tables/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        tableId: '4',
        fromServerId: 'John Doe',
        toServerId: 'Jane Smith',
        managerPin: '1234',
      }),
    });
    expect(unauthorizedRes.status).toBe(403);

    // Attempt with valid Manager PIN (5678)
    const authorizedRes = await app.request('/v1/tables/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        tableId: '4',
        fromServerId: 'John Doe',
        toServerId: 'Jane Smith',
        toServerName: 'Jane Smith',
        managerPin: '5678',
      }),
    });
    expect(authorizedRes.status).toBe(200);
    const body = await authorizedRes.json();
    expect(body.ok).toBe(true);
    expect(body.data.tableId).toBe('4');
    expect(body.data.toServerName).toBe('Jane Smith');
  });

  it('4. Tableside Assistance Buzzer: Post, Active List, and Dismiss', async () => {
    // 1. Post assistance request from tableside QR
    const postRes = await app.request('/v1/tables/T4/assistance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        tableNumber: 'T4',
        type: 'water',
        note: 'Sparkling water refill please',
      }),
    });

    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.data.tableNumber).toBe('T4');
    expect(postBody.data.type).toBe('water');
    const notificationId = postBody.data.notificationId;
    expect(notificationId).toBeDefined();

    // 2. Query active assistance requests (terminal polling)
    const activeRes = await app.request('/v1/tables/assistance/active', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(activeRes.status).toBe(200);
    const activeList = (await activeRes.json()).data;
    expect(activeList.some((r: any) => r.id === notificationId)).toBe(true);

    // 3. Dismiss/acknowledge notification from POS terminal
    const dismissRes = await app.request(`/v1/tables/assistance/${notificationId}/dismiss`, {
      method: 'PATCH',
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(dismissRes.status).toBe(200);
    const dismissBody = await dismissRes.json();
    expect(dismissBody.data.status).toBe('resolved');
  });
});
