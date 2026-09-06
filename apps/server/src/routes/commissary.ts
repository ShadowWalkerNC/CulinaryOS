// ============================================================
// CulinaryOS — Multi-Unit Commissary & Stock Transfer API
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import {
  calculateStoreReplenishmentOrder,
  aggregateCommissaryProduction,
  generateCommissaryLotCode,
  calculateFranchiseRoyaltyLedger,
  generateTransferPackingSlip,
} from '@culinaryos/commissary-engine';
import type { Env } from '../types.js';

export const commissaryRoutes = new Hono<Env>();
commissaryRoutes.use('*', requireTenant);

// Memory store for demo / offline transfer orders
interface CommissaryTransferRecord {
  id: string;
  orderNumber: string;
  fromLocationId: string;
  toLocationId: string;
  status: 'requested' | 'approved' | 'batching' | 'shipped' | 'delivered';
  items: Array<{
    itemName: string;
    lotCode?: string;
    quantityRequested: number;
    quantityShipped?: number;
    unit: string;
  }>;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

let mockTransfers: CommissaryTransferRecord[] = [
  {
    id: 'tr-001',
    orderNumber: 'TR-20260902-001',
    fromLocationId: '00000000-0000-0000-0000-000000000000', // Central Commissary
    toLocationId: '00000000-0000-0000-0000-000000000001',   // The Golden Fork
    status: 'shipped',
    items: [
      { itemName: 'San Marzano Pizza Sauce Base', lotCode: 'LOT-20260902-SANM-8A91', quantityRequested: 50, quantityShipped: 50, unit: 'kg' },
      { itemName: 'Dry-Aged Burger Patties 8oz', lotCode: 'LOT-20260902-DRYA-4F22', quantityRequested: 100, quantityShipped: 100, unit: 'portions' },
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    shippedAt: new Date().toISOString(),
  },
];

// ---- Store Places Internal Stock Transfer Order ----
commissaryRoutes.post('/transfers/request', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const body = await c.req.json<{
    items: Array<{
      itemName: string;
      quantityRequested: number;
      unit: string;
    }>;
  }>();

  if (!body.items || body.items.length === 0) {
    return err(c, 'VALIDATION_ERROR', 'Transfer items required', 422);
  }

  const orderNumber = `TR-${new Date().toISOString().split('T')[0]!.replace(/-/g, '')}-${String(mockTransfers.length + 1).padStart(3, '0')}`;
  const newTransfer: CommissaryTransferRecord = {
    id: `tr-${Date.now()}`,
    orderNumber,
    fromLocationId: '00000000-0000-0000-0000-000000000000', // Central Commissary Kitchen
    toLocationId: tenantId,
    status: 'requested',
    items: body.items.map((i) => ({
      itemName: i.itemName,
      quantityRequested: i.quantityRequested,
      unit: i.unit,
    })),
    createdAt: new Date().toISOString(),
  };

  mockTransfers.push(newTransfer);
  return ok(c, newTransfer, 201);
});

// ---- List Transfers for Location ----
commissaryRoutes.get('/transfers', async (c) => {
  const tenantId = c.get('tenantId') as string;
  const matching = mockTransfers.filter(
    (t) => t.toLocationId === tenantId || t.fromLocationId === tenantId
  );
  return ok(c, { transfers: matching });
});

// ---- Generate Transfer Packing Slip ----
commissaryRoutes.get('/transfers/:id/packing-slip', async (c) => {
  const id = c.req.param('id');
  const transfer = mockTransfers.find((t) => t.id === id || t.orderNumber === id);
  if (!transfer) return err(c, 'NOT_FOUND', 'Transfer order not found', 404);

  const packingSlip = generateTransferPackingSlip({
    transferOrderId: transfer.orderNumber,
    sourceCommissaryName: 'Central Production Commissary Kitchen',
    destinationStoreId: transfer.toLocationId,
    destinationStoreName: 'The Golden Fork Flagship',
    items: transfer.items.map((i, idx) => ({
      ingredientId: `ing-${idx + 1}`,
      name: i.itemName,
      unit: i.unit,
      quantityRequested: i.quantityRequested,
      currentStoreStock: 0,
      parLevel: i.quantityRequested * 2,
    })),
    driverNotes: 'Maintain cold-chain refrigeration below 38°F during transit.',
  });

  return ok(c, packingSlip);
});

// ---- Fulfill & Dispatch Batch Transfer (Commissary Manager) ----
commissaryRoutes.patch('/transfers/:id/fulfill', async (c) => {
  const id = c.req.param('id');
  const transfer = mockTransfers.find((t) => t.id === id);
  if (!transfer) return err(c, 'NOT_FOUND', 'Transfer order not found', 404);

  transfer.status = 'shipped';
  transfer.shippedAt = new Date().toISOString();
  // Assign lot codes to batch lines
  transfer.items = transfer.items.map((i) => ({
    ...i,
    lotCode: i.lotCode || generateCommissaryLotCode(i.itemName),
    quantityShipped: i.quantityRequested,
  }));

  return ok(c, transfer);
});

// ---- Receive Transfer at Branch Store (Stock Check-in) ----
commissaryRoutes.patch('/transfers/:id/receive', async (c) => {
  const id = c.req.param('id');
  const transfer = mockTransfers.find((t) => t.id === id);
  if (!transfer) return err(c, 'NOT_FOUND', 'Transfer order not found', 404);

  transfer.status = 'delivered';
  transfer.deliveredAt = new Date().toISOString();

  return ok(c, {
    transfer,
    message: 'Transfer batch lots accepted and added to store active pantry stock.',
  });
});

// ---- Multi-Unit Franchise Royalty Consolidated Ledger ----
commissaryRoutes.get('/royalty-ledger', async (c) => {
  const from = c.req.query('from') ?? '2026-09-01';
  const to = c.req.query('to') ?? '2026-09-30';

  const ledger = calculateFranchiseRoyaltyLedger({
    organizationId: 'org-golden-fork-enterprise',
    periodStart: from,
    periodEnd: to,
    defaultRoyaltyRatePercent: 4.5,
    stores: [
      { storeId: 'loc-01', storeName: 'Golden Fork Downtown Flagship', grossSalesCents: 12500000 },
      { storeId: 'loc-02', storeName: 'Golden Fork West End Bistro', grossSalesCents: 8900000 },
      { storeId: 'loc-03', storeName: 'Golden Fork Airport Express', grossSalesCents: 14200000 },
    ],
  });

  return ok(c, ledger);
});
