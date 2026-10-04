import { DomainError, fingerprint, text } from './domain.js';
import type { NativeExecutor } from './executor.js';

export interface OperationReceipt {
  operationKey: string;
  requestHash: string;
  status: 'accepted' | 'applied' | 'conflict' | 'failed';
  result: Record<string, unknown>;
}

export function operationKey(value: unknown): string {
  const key = text(value, 'operation', 128);
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(key)) {
    throw new DomainError('VALIDATION_ERROR', 'operation must be an idempotency key (letters, digits, :, _, -)', 422);
  }
  return key;
}

export function requestFingerprint(payload: unknown): string {
  return fingerprint(payload);
}

interface ReceiptRow {
  operation_key: string;
  request_hash: string;
  status: string;
  result: unknown;
}

function toReceipt(row: ReceiptRow): OperationReceipt {
  const result = row.result && typeof row.result === 'object' && !Array.isArray(row.result)
    ? (row.result as Record<string, unknown>)
    : {};
  const status = row.status === 'applied' || row.status === 'conflict' || row.status === 'failed'
    ? row.status
    : 'accepted';
  return { operationKey: row.operation_key, requestHash: row.request_hash, status, result };
}

/**
 * Durable idempotency with atomic claims. Same key + same hash replays the
 * stored result; same key + different hash is a 409 conflict. The claim and
 * the business effects MUST run in one transaction: the unique
 * (tenant_id, operation_key) index serializes concurrent claimants (a rival
 * INSERT blocks until the owner commits or rolls back), so two different
 * payloads can never both execute and a stored receipt is never overwritten.
 * There is intentionally no overwrite path: receipts are write-once.
 */
export async function loadReceipt(
  tx: NativeExecutor,
  tenantId: string,
  key: string,
): Promise<OperationReceipt | null> {
  const result = await tx.query<ReceiptRow>(
    'SELECT operation_key, request_hash, status, result FROM public.operation_receipts WHERE tenant_id = $1 AND operation_key = $2',
    [tenantId, key],
  );
  const row = result.rows[0];
  return row ? toReceipt(row) : null;
}

export function assertReceiptCompatible(receipt: OperationReceipt, requestHash: string): OperationReceipt {
  if (receipt.requestHash !== requestHash) {
    throw new DomainError('CONFLICT', 'Operation ID was already used with a different payload', 409);
  }
  return receipt;
}

/**
 * Atomically claim an operation key. Returns `{ owned: true }` for the
 * caller that must execute the effects and then `finalizeReceipt`, or
 * `{ owned: false }` with the committed receipt for a replay (same hash)
 * or a 409 conflict (different hash). Never overwrites a stored receipt.
 */
export async function claimReceipt(
  tx: NativeExecutor,
  tenantId: string,
  key: string,
  requestHash: string,
): Promise<{ receipt: OperationReceipt; owned: boolean }> {
  const inserted = await tx.query<ReceiptRow>(
    `INSERT INTO public.operation_receipts (tenant_id, operation_key, request_hash, status, result)
     VALUES ($1, $2, $3, 'accepted', '{}')
     ON CONFLICT (tenant_id, operation_key) DO NOTHING
     RETURNING operation_key, request_hash, status, result`,
    [tenantId, key, requestHash],
  );
  const row = inserted.rows[0];
  if (row) return { receipt: toReceipt(row), owned: true };
  const existing = await loadReceipt(tx, tenantId, key);
  if (!existing) throw new DomainError('INTERNAL_ERROR', 'Operation claim was lost', 500);
  assertReceiptCompatible(existing, requestHash);
  return { receipt: existing, owned: false };
}

/** Record the owner's result. Only the claim owner may call this, in the same transaction. */
export async function finalizeReceipt(
  tx: NativeExecutor,
  tenantId: string,
  key: string,
  result: Record<string, unknown>,
): Promise<OperationReceipt> {
  const updated = await tx.query<ReceiptRow>(
    `UPDATE public.operation_receipts SET status = 'applied', result = $3
     WHERE tenant_id = $1 AND operation_key = $2
     RETURNING operation_key, request_hash, status, result`,
    [tenantId, key, JSON.stringify(result)],
  );
  const row = updated.rows[0];
  if (!row) throw new DomainError('INTERNAL_ERROR', 'Operation finalize was lost', 500);
  return toReceipt(row);
}
