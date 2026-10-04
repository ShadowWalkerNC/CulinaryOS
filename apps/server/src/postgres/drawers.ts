import { DomainError, integer, text, uuid } from './domain.js';
import type { NativeExecutor, NativeVerifiedIdentity } from './executor.js';
import { managerGateNative } from './identity.js';

export interface DrawerSessionRow {
  id: string;
  tenant_id: string;
  drawer_name: string;
  status: string;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_float_cents: number;
  cash_sales_cents: number;
  paid_in_cents: number;
  paid_out_cents: number;
  counted_cents: number | null;
}

export async function openDrawer(
  tx: NativeExecutor,
  auth: NativeVerifiedIdentity,
  tenantId: string,
  input: { drawerName?: string; openingFloatCents?: number; notes?: string | null },
): Promise<DrawerSessionRow> {
  if (managerGateNative(auth) !== 'ok') {
    throw new DomainError('FORBIDDEN', 'Drawer sessions require a human manager session', 403);
  }
  const drawerName = input.drawerName === undefined ? 'main' : text(input.drawerName, 'drawer', 64);
  const openingFloat = input.openingFloatCents === undefined ? 0 : integer(input.openingFloatCents, 'float');
  if (!auth.userId) throw new DomainError('FORBIDDEN', 'Drawer sessions require an attributable user', 403);
  try {
    const inserted = await tx.query<DrawerSessionRow>(
      `INSERT INTO public.drawer_sessions (tenant_id, drawer_name, status, opened_by, opening_float_cents, notes)
       VALUES ($1, $2, 'open', $3, $4, $5) RETURNING *`,
      [tenantId, drawerName, auth.userId, openingFloat, input.notes === undefined ? null : text(input.notes, 'notes', 2000, true)],
    );
    const row = inserted.rows[0];
    if (!row) throw new DomainError('INTERNAL_ERROR', 'Drawer open failed', 500);
    return row;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('duplicate') || message.includes('unique')) {
      throw new DomainError('CONFLICT', 'Drawer already has an open session', 409);
    }
    throw error;
  }
}

export async function recordDrawerMovement(
  tx: NativeExecutor,
  auth: NativeVerifiedIdentity,
  tenantId: string,
  input: { drawerName?: string; kind: 'paid_in' | 'paid_out' | 'cash_sale'; amountCents: number },
): Promise<DrawerSessionRow> {
  if (managerGateNative(auth) !== 'ok') {
    throw new DomainError('FORBIDDEN', 'Cash movements require a human manager session', 403);
  }
  const drawerName = input.drawerName === undefined ? 'main' : text(input.drawerName, 'drawer', 64);
  const amount = integer(input.amountCents, 'amount', 1);
  const column = input.kind === 'paid_in' ? 'paid_in_cents' : input.kind === 'paid_out' ? 'paid_out_cents' : 'cash_sales_cents';
  const updated = await tx.query<DrawerSessionRow>(
    `UPDATE public.drawer_sessions SET ${column} = ${column} + $3
     WHERE tenant_id = $1 AND drawer_name = $2 AND status = 'open' RETURNING *`,
    [tenantId, drawerName, amount],
  );
  const row = updated.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'Open drawer session not found', 404);
  return row;
}

export async function closeDrawer(
  tx: NativeExecutor,
  auth: NativeVerifiedIdentity,
  tenantId: string,
  input: { drawerName?: string; countedCents: number },
): Promise<{ session: DrawerSessionRow; expectedCents: number; varianceCents: number }> {
  if (managerGateNative(auth) !== 'ok') {
    throw new DomainError('FORBIDDEN', 'Drawer close requires a human manager session', 403);
  }
  const drawerName = input.drawerName === undefined ? 'main' : text(input.drawerName, 'drawer', 64);
  const counted = integer(input.countedCents, 'counted');
  if (!auth.userId) throw new DomainError('FORBIDDEN', 'Drawer close requires an attributable user', 403);
  const locked = await tx.query<DrawerSessionRow>(
    `SELECT * FROM public.drawer_sessions WHERE tenant_id = $1 AND drawer_name = $2 AND status = 'open' FOR UPDATE`,
    [tenantId, drawerName],
  );
  const session = locked.rows[0];
  if (!session) throw new DomainError('NOT_FOUND', 'Open drawer session not found', 404);
  const expected = integer(session.opening_float_cents + session.cash_sales_cents + session.paid_in_cents - session.paid_out_cents, 'expected');
  const variance = counted - expected;
  const closed = await tx.query<DrawerSessionRow>(
    `UPDATE public.drawer_sessions SET status = 'closed', closed_by = $3, closed_at = now(), counted_cents = $4
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenantId, session.id, auth.userId, counted],
  );
  const row = closed.rows[0];
  if (!row) throw new DomainError('INTERNAL_ERROR', 'Drawer close failed', 500);
  return { session: row, expectedCents: expected, varianceCents: variance };
}

export async function getDrawer(
  tx: NativeExecutor,
  tenantId: string,
  drawerName: string,
  sessionId?: string,
): Promise<DrawerSessionRow> {
  const name = text(drawerName, 'drawer', 64);
  if (sessionId === undefined) {
    const result = await tx.query<DrawerSessionRow>(
      `SELECT * FROM public.drawer_sessions WHERE tenant_id = $1 AND drawer_name = $2 ORDER BY opened_at DESC LIMIT 1`,
      [tenantId, name],
    );
    const row = result.rows[0];
    if (!row) throw new DomainError('NOT_FOUND', 'Drawer session not found', 404);
    return row;
  }
  const id = uuid(sessionId, 'drawer session');
  const result = await tx.query<DrawerSessionRow>(
    'SELECT * FROM public.drawer_sessions WHERE tenant_id = $1 AND id = $2',
    [tenantId, id],
  );
  const row = result.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'Drawer session not found', 404);
  return row;
}
