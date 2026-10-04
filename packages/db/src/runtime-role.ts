// ============================================================
// CulinaryOS — Runtime database-role startup guard (R2 follow-up).
//
// assertRuntimeDatabaseRole verifies, on a fresh pool checkout, that the
// authenticating login is the intended least-privilege runtime identity: a
// LOGIN role, member of culinaryos_app only. It rejects superusers,
// BYPASSRLS roles, public-table owners, and culinaryos_identity members
// before the process serves traffic. Attributes are read from session_user
// (the authenticating login), never from the pool configuration, and
// diagnostics carry role names, booleans, and a table count only — never
// connection strings, passwords, or tokens.
// ============================================================

import type { Pool } from 'pg';
import { CULINARYOS_APP_ROLE } from './postgres.js';

/** Non-login owner of every SECURITY DEFINER identity function. */
export const CULINARYOS_IDENTITY_ROLE = 'culinaryos_identity';

/** Safe startup diagnostics: role names, flags, and a count. No secrets. */
export interface RuntimeDatabaseRoleInfo {
  login: string;
  effectiveRole: string;
  superuser: boolean;
  bypassRls: boolean;
  canLogin: boolean;
  appMember: boolean;
  identityMember: boolean;
  ownedPublicTables: number;
}

interface RoleCheckRow {
  login: unknown;
  effective: unknown;
  login_superuser: unknown;
  login_bypassrls: unknown;
  login_canlogin: unknown;
  login_app_member: unknown;
  login_identity_member: unknown;
  login_owned_public_tables: unknown;
}

const ROLE_CHECK_SQL =
  'SELECT session_user AS login, current_user AS effective,' +
  ' (SELECT rolsuper FROM pg_roles WHERE rolname = session_user) AS login_superuser,' +
  ' (SELECT rolbypassrls FROM pg_roles WHERE rolname = session_user) AS login_bypassrls,' +
  ' (SELECT rolcanlogin FROM pg_roles WHERE rolname = session_user) AS login_canlogin,' +
  ' pg_has_role(session_user, $1, $2) AS login_app_member,' +
  ' pg_has_role(session_user, $3, $2) AS login_identity_member,' +
  ' (SELECT COUNT(*)::int FROM pg_class c' +
  '   JOIN pg_namespace n ON n.oid = c.relnamespace' +
  "  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')" +
  '    AND (pg_get_userbyid(c.relowner) = session_user OR pg_has_role(session_user, c.relowner, \'member\'))) AS login_owned_public_tables';

/**
 * Assert the pool authenticates as a restricted runtime login. Resolves with
 * safe diagnostics on success; throws (and releases the checkout) when the
 * login is a superuser, has BYPASSRLS, owns public tables, belongs to the
 * identity role, cannot log in, is not a member of the app role, or when the
 * checkout already carries an active role switch. Any unverifiable attribute
 * fails closed. Call once at startup on a fresh pool, before serving traffic.
 */
export async function assertRuntimeDatabaseRole(
  pool: Pick<Pool, 'connect'>,
): Promise<RuntimeDatabaseRoleInfo> {
  const client = await pool.connect();
  try {
    const found = await client.query(ROLE_CHECK_SQL, [CULINARYOS_APP_ROLE, 'member', CULINARYOS_IDENTITY_ROLE]);
    const row = (found.rows[0] ?? null) as RoleCheckRow | null;
    if (!row) {
      throw new Error('Runtime database role rejected: role check returned no rows (login "unknown")');
    }
    const login = typeof row.login === 'string' && row.login.length > 0 ? row.login : 'unknown';
    const effective = typeof row.effective === 'string' && row.effective.length > 0 ? row.effective : 'unknown';
    const reject = (reason: string): never => {
      throw new Error(`Runtime database role rejected: ${reason} (login "${login}")`);
    };
    if (effective !== login) {
      reject(`active role switch to "${effective}"; run the startup check on a fresh connection`);
    }
    if (row.login_superuser !== false) {
      reject('login is a superuser or superuser status is unverifiable; the runtime pool must use a restricted NOBYPASSRLS login');
    }
    if (row.login_bypassrls !== false) {
      reject('login has BYPASSRLS or the flag is unverifiable; the runtime pool must use a restricted NOBYPASSRLS login');
    }
    if (row.login_identity_member !== false) {
      reject(`login is a member of "${CULINARYOS_IDENTITY_ROLE}" or membership is unverifiable; the runtime login must never own identity functions`);
    }
    if (typeof row.login_owned_public_tables !== 'number' || !Number.isInteger(row.login_owned_public_tables)) {
      reject('public-table ownership is unverifiable');
    }
    if ((row.login_owned_public_tables as number) > 0) {
      reject(`login owns ${row.login_owned_public_tables as number} public table(s); the runtime login must own nothing`);
    }
    if (row.login_canlogin !== true) {
      reject('login cannot log in or the flag is unverifiable; the runtime pool needs its own LOGIN role');
    }
    if (row.login_app_member !== true) {
      reject(`login is not a member of "${CULINARYOS_APP_ROLE}" or membership is unverifiable; the runtime login must be granted the app role`);
    }
    return {
      login,
      effectiveRole: effective,
      superuser: false,
      bypassRls: false,
      canLogin: true,
      appMember: true,
      identityMember: false,
      ownedPublicTables: 0,
    };
  } finally {
    client.release();
  }
}
