/** Local executor shape mirroring peer `SqlExecutor` (no cross-project import). */
export interface NativeExecutor {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

export type NativeAuthKind = 'session' | 'device';

/** Database-verified identity. The database is authoritative; callers never supply these. */
export interface NativeVerifiedIdentity {
  kind: NativeAuthKind;
  tenantId: string;
  userId: string | null;
  role: string | null;
  deviceId: string | null;
  capabilities: string[];
}

/**
 * Injected tenant runner. Takes ONLY an opaque token hash: the runner must
 * resolve the identity from database state inside the transaction and fail
 * closed on unknown/revoked/expired credentials. There is deliberately no
 * caller-supplied tenant/user/role setting to forge.
 */
export type TenantRunner = <T>(
  tokenHash: string,
  callback: (tx: NativeExecutor, identity: NativeVerifiedIdentity) => Promise<T>,
) => Promise<T>;

/** Auth-plane runner for pre-authentication work (PIN lookup, session mint). No tenant scope. */
export type AuthRunner = <T>(callback: (tx: NativeExecutor) => Promise<T>) => Promise<T>;
