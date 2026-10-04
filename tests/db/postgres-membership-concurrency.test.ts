import { describe, expect, it, afterAll } from 'bun:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { withAppTransaction, withVerifiedTenantTransaction } from '../../packages/db/src/postgres.ts';
import { applyMigrations, listMigrationFiles } from '../../packages/db/src/migrate.ts';

// R2 follow-up: last-owner concurrency race + identity CREATE revoke.
//
// Static suites (no services): the 001-008 chain order, the shared
// same-tenant advisory lock placed BEFORE any membership role check or owner
// count in both add/remove paths, preserved manager provenance and the
// last-owner guard, and the end-of-008 CREATE revoke with ownership/EXECUTE
// retained.
//
// Live suites run only when TEST_DATABASE_URL is explicitly set (disposable
// database, operator-owned): the child environment must be loaded from the
// private temp cluster/test-env.json without printing it. Two concurrent
// removals through real restricted runtime sessions must leave exactly one
// owner — never zero. Passwords are random per run and never logged. Role
// names are run-tagged so parallel live suites never collide.

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'db', 'migrations');

function readMigration(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
}

const LOCK_LINE =
  "PERFORM pg_advisory_xact_lock(hashtext('tenant_membership:' || COALESCE(p_tenant_id::text, 'null')));";

function functionChunk(sql: string, name: string): string {
  const at = sql.indexOf(`FUNCTION public.${name}(`);
  if (at < 0) throw new Error(`008 is missing FUNCTION public.${name}`);
  const end = sql.indexOf('$$;', at);
  if (end < 0) throw new Error(`008 has unterminated body for ${name}`);
  return sql.slice(at, end);
}

describe('008 static audit', () => {
  const filenames = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const eight = readMigration('008_membership_serialization.sql');
  const code = eight.replace(/--[^\n]*/g, '');

  it('ships 001-008 in order', () => {
    expect(filenames).toEqual([
      '001_foundation.sql',
      '002_identity.sql',
      '003_menus_orders.sql',
      '004_kitchen_events.sql',
      '005_payments_closeout.sql',
      '006_identity_hardening.sql',
      '007_token_derived_rls.sql',
      '008_membership_serialization.sql',
    ]);
    expect(listMigrationFiles(MIGRATIONS_DIR).map((f) => f.version)).toEqual([
      '001',
      '002',
      '003',
      '004',
      '005',
      '006',
      '007',
      '008',
    ]);
  });

  it('serializes add and remove on the same per-tenant lock before any membership check', () => {
    const add = functionChunk(eight, 'add_tenant_member');
    const remove = functionChunk(eight, 'remove_tenant_member');
    for (const [label, body] of [['add', add], ['remove', remove]] as const) {
      expect(body).toContain(LOCK_LINE);
      const lockAt = body.indexOf(LOCK_LINE);
      const checkAt = body.indexOf('identity_session');
      expect(checkAt > 0).toBe(true);
      expect(lockAt < checkAt).toBe(true);
    }
    // The identical key expression in both paths is what makes add/remove
    // pairs mutually exclusive per tenant.
    expect(code.split(LOCK_LINE).length - 1).toBe(2);
    expect(remove.indexOf(LOCK_LINE) < remove.indexOf('last owner')).toBe(true);
  });

  it('preserves manager provenance and the last-owner guard', () => {
    const add = functionChunk(eight, 'add_tenant_member');
    expect(add).toContain('bootstrap is migration-owner only');
    expect(add).toMatch(/v_role NOT IN \('owner', 'manager'\)/);
    expect(add).toContain('INSERT INTO public.tenant_users');
    const remove = functionChunk(eight, 'remove_tenant_member');
    expect(remove).toMatch(/v_role NOT IN \('owner', 'manager'\)/);
    expect(remove).toContain('RETURN false');
    expect(remove).toContain('cannot remove the last owner');
    expect(remove).toContain('DELETE FROM public.tenant_users');
  });

  it('keeps definer hygiene and ownership while revoking surgery CREATE', () => {
    const signatures: Record<string, string> = {
      add_tenant_member: '\\(text, uuid, uuid, text\\)',
      remove_tenant_member: '\\(text, uuid, uuid\\)',
    };
    for (const [name, sig] of Object.entries(signatures)) {
      const body = functionChunk(eight, name);
      expect(body).toContain('SECURITY DEFINER');
      expect(body).toContain('SET search_path = public');
      expect(code).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}${sig} FROM PUBLIC`));
      expect(code).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}${sig} TO culinaryos_app`));
    }
    // Surgery runs under SET ROLE while the 007 grant still exists; the
    // revoke is last, and 008 grants nothing back.
    expect(code).toContain('REVOKE CREATE ON SCHEMA public FROM culinaryos_identity');
    expect(code).not.toContain('GRANT CREATE ON SCHEMA public TO culinaryos_identity');
    expect(code).not.toMatch(/OWNER TO (?!culinaryos_identity)/);
    const setAt = code.indexOf('SET LOCAL ROLE culinaryos_identity');
    const resetAt = code.indexOf('RESET ROLE');
    const revokeAt = code.indexOf('REVOKE CREATE ON SCHEMA public FROM culinaryos_identity');
    expect(setAt > 0 && resetAt > setAt && revokeAt > resetAt).toBe(true);
    expect(code.indexOf('FUNCTION public.add_tenant_member') > setAt).toBe(true);
    expect(code.indexOf('FUNCTION public.remove_tenant_member') > setAt).toBe(true);
  });

  it('adds no tables, policies, or Supabase-coupled constructs', () => {
    expect(code).not.toMatch(/CREATE TABLE/);
    expect(code).not.toMatch(/CREATE POLICY/);
    for (const banned of [
      /auth\.uid\s*\(/,
      /auth\.jwt\s*\(/,
      /TO\s+anon\b/,
      /service_role/,
      /supabase_realtime/,
      /uuid-ossp/,
      /uuid_generate_v4/,
    ]) {
      expect(code).not.toMatch(banned);
    }
  });
});

const OWNER_URL = process.env.TEST_DATABASE_URL;

if (!OWNER_URL) {
  it('membership-concurrency live suite requires explicit TEST_DATABASE_URL (skipped)', () => {
    console.log('    live skipped: set TEST_DATABASE_URL to a disposable database to run the race proof');
  });
} else {
  describe('membership concurrency live (disposable database)', () => {
    const runTag = randomBytes(6).toString('hex');
    const RUNTIME_ROLE = `cmc_${runTag}_rt`;

    let owner: Pool | null = null;
    let runtime: Pool | null = null;
    let setupError: unknown = null;
    let tornDown = false;

    const fx = {
      tA: randomUUID(),
      tB: randomUUID(),
      o1: randomUUID(),
      o2: randomUUID(),
      mgr: randomUUID(),
      srv: randomUUID(),
      o3: randomUUID(),
      hO1: '',
      hO2: '',
      hMgr: '',
      hSrv: '',
      hO3: '',
      pinO1: '',
      pinO2: '',
      pinMgr: '',
      pinSrv: '',
      pinO3: '',
      survivor: '' as 'o1' | 'o2' | '',
    };

    function sha(seed: string): string {
      return createHash('sha256').update(seed).digest('hex');
    }

    function isoPlus(hours: number): string {
      return new Date(Date.now() + hours * 3600_000).toISOString();
    }

    function requireSetup(): void {
      if (setupError) throw setupError;
      if (!owner || !runtime) throw new Error('live setup did not complete');
    }

    async function ownerCount(tenantId: string): Promise<number> {
      const r = await (owner as Pool).query<{ n: string }>(
        "SELECT COUNT(*) AS n FROM public.tenant_users WHERE tenant_id = $1 AND role = 'owner'",
        [tenantId],
      );
      return Number(r.rows[0]?.n ?? -1);
    }

    async function teardown(): Promise<void> {
      if (tornDown) return;
      tornDown = true;
      if (runtime) {
        try {
          await runtime.end();
        } catch {
          // Teardown best-effort.
        }
        runtime = null;
      }
      if (owner) {
        try {
          await owner.query(
            'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = $1 AND pid <> pg_backend_pid()',
            [RUNTIME_ROLE],
          );
          await owner.query(`DROP ROLE IF EXISTS "${RUNTIME_ROLE}"`);
        } catch {
          // Teardown best-effort.
        }
        try {
          await owner.end();
        } catch {
          // Teardown best-effort.
        }
        owner = null;
      }
    }

    // Ordered first step (setup is an explicit step, matching the repo shim).
    it('00 provisions tenant, owners, manager, and restricted runtime login', async () => {
      try {
        fx.hO1 = sha(`o1-${runTag}`);
        fx.hO2 = sha(`o2-${runTag}`);
        fx.hMgr = sha(`mgr-${runTag}`);
        fx.hSrv = sha(`srv-${runTag}`);
        fx.hO3 = sha(`o3-${runTag}`);
        fx.pinO1 = sha(`pino1-${runTag}`);
        fx.pinO2 = sha(`pino2-${runTag}`);
        fx.pinMgr = sha(`pinmgr-${runTag}`);
        fx.pinSrv = sha(`pinsrv-${runTag}`);
        fx.pinO3 = sha(`pino3-${runTag}`);

        owner = new Pool({ connectionString: OWNER_URL, max: 4, statement_timeout: 15000 });
        await applyMigrations(owner);

        const oc = await owner.connect();
        try {
          await oc.query('INSERT INTO public.tenants(id, slug, name) VALUES ($1, $2, $3), ($4, $5, $6)', [
            fx.tA,
            `mc-a-${runTag}`,
            'Membership A',
            fx.tB,
            `mc-b-${runTag}`,
            'Membership B',
          ]);
          await oc.query(
            'INSERT INTO public.app_users(id, email, display_name) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ($10, $11, $12), ($13, $14, $15)',
            [
              fx.o1, `mco1-${runTag}@example.invalid`, 'Owner One',
              fx.o2, `mco2-${runTag}@example.invalid`, 'Owner Two',
              fx.mgr, `mcmgr-${runTag}@example.invalid`, 'Manager',
              fx.srv, `mcsrv-${runTag}@example.invalid`, 'Server',
              fx.o3, `mco3-${runTag}@example.invalid`, 'Owner B',
            ],
          );
          // Owner bootstrap ceremony: first memberships + PIN rows come from
          // the owner login, never through the runtime role.
          await oc.query(
            'INSERT INTO public.tenant_users(tenant_id, user_id, role) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9), ($10, $11, $12), ($13, $14, $15)',
            [
              fx.tA, fx.o1, 'owner',
              fx.tA, fx.o2, 'owner',
              fx.tA, fx.mgr, 'manager',
              fx.tA, fx.srv, 'server',
              fx.tB, fx.o3, 'owner',
            ],
          );
          await oc.query(
            'INSERT INTO public.staff_pins(tenant_id, user_id, pin_hash, pin_lookup_hash, display_name, active) VALUES ($1, $2, $3, $4, $5, true), ($6, $7, $8, $9, $10, true), ($11, $12, $13, $14, $15, true), ($16, $17, $18, $19, $20, true), ($21, $22, $23, $24, $25, true)',
            [
              fx.tA, fx.o1, 'argon2:fixture-o1', fx.pinO1, 'Owner One',
              fx.tA, fx.o2, 'argon2:fixture-o2', fx.pinO2, 'Owner Two',
              fx.tA, fx.mgr, 'argon2:fixture-mgr', fx.pinMgr, 'Manager',
              fx.tA, fx.srv, 'argon2:fixture-srv', fx.pinSrv, 'Server',
              fx.tB, fx.o3, 'argon2:fixture-o3', fx.pinO3, 'Owner B',
            ],
          );
        } finally {
          oc.release();
        }

        // Restricted runtime login: owns nothing, cannot bypass RLS, member
        // of the app role only. Password is random per run and never logged.
        const runtimePassword = randomBytes(24).toString('hex');
        const ac = await owner.connect();
        try {
          await ac.query(
            'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = $1 AND pid <> pg_backend_pid()',
            [RUNTIME_ROLE],
          );
          await ac.query(`DROP ROLE IF EXISTS "${RUNTIME_ROLE}"`);
          await ac.query(`CREATE ROLE "${RUNTIME_ROLE}" WITH LOGIN NOBYPASSRLS PASSWORD '${runtimePassword}'`);
          await ac.query(`GRANT culinaryos_app TO "${RUNTIME_ROLE}"`);
        } finally {
          ac.release();
        }
        const runtimeUrl = new URL(OWNER_URL);
        runtimeUrl.username = RUNTIME_ROLE;
        runtimeUrl.password = runtimePassword;
        runtime = new Pool({ connectionString: runtimeUrl.toString(), max: 4, statement_timeout: 10000 });

        // Every session is minted through the narrow function with PIN proof,
        // as the restricted app role — real runtime identities, no owner I/O.
        const mint = async (hash: string, user: string, tenant: string, pin: string): Promise<string> =>
          withAppTransaction(runtime as Pool, async (tx) => {
            const r = await tx.query<{ role: string }>(
              'SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7) AS role',
              [hash, user, tenant, null, isoPlus(2), pin, null],
            );
            return r.rows[0]?.role as string;
          });
        expect(await mint(fx.hO1, fx.o1, fx.tA, fx.pinO1)).toBe('owner');
        expect(await mint(fx.hO2, fx.o2, fx.tA, fx.pinO2)).toBe('owner');
        expect(await mint(fx.hMgr, fx.mgr, fx.tA, fx.pinMgr)).toBe('manager');
        expect(await mint(fx.hSrv, fx.srv, fx.tA, fx.pinSrv)).toBe('server');
        expect(await mint(fx.hO3, fx.o3, fx.tB, fx.pinO3)).toBe('owner');
        expect(await ownerCount(fx.tA)).toBe(2);
      } catch (err) {
        setupError = err;
        throw err;
      }
    });

    afterAll(async () => {
      await teardown();
    });

    it('leaves exactly one owner under concurrent removals — never zero', async () => {
      requireSetup();
      // Both removals run through the manager session so both caller sessions
      // stay live no matter who wins: the loser deterministically reaches the
      // last-owner guard (proving serialization) instead of failing on its
      // own deleted membership (which would mask the guard under test).
      const removeO1 = withAppTransaction(runtime as Pool, async (tx) =>
        tx.query('SELECT public.remove_tenant_member($1, $2, $3)', [fx.hMgr, fx.tA, fx.o1]),
      );
      const removeO2 = withAppTransaction(runtime as Pool, async (tx) =>
        tx.query('SELECT public.remove_tenant_member($1, $2, $3)', [fx.hMgr, fx.tA, fx.o2]),
      );
      const [s1, s2] = await Promise.allSettled([removeO1, removeO2]);
      const wins = [s1, s2].filter((s) => s.status === 'fulfilled');
      const losses = [s1, s2].filter((s) => s.status === 'rejected');
      expect(wins).toHaveLength(1);
      expect(losses).toHaveLength(1);
      expect(String((losses[0] as PromiseRejectedResult).reason)).toMatch(/last owner/);
      const winRows = (wins[0] as PromiseFulfilledResult<{ rows: unknown[] }>).value.rows;
      expect(winRows).toEqual([{ remove_tenant_member: true }]);
      fx.survivor = s1.status === 'fulfilled' ? 'o2' : 'o1';
      expect(await ownerCount(fx.tA)).toBe(1);
    });

    it('keeps the survivor live and retires the removed session', async () => {
      requireSetup();
      expect(fx.survivor === 'o1' || fx.survivor === 'o2').toBe(true);
      const liveHash = fx.survivor === 'o1' ? fx.hO1 : fx.hO2;
      const deadHash = fx.survivor === 'o1' ? fx.hO2 : fx.hO1;
      const identity = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: liveHash }, async ({ identity }) => identity);
      expect(identity.role).toBe('owner');
      expect(identity.tenantId).toBe(fx.tA);
      await expect(
        withVerifiedTenantTransaction(runtime as Pool, { tokenHash: deadHash }, async () => 'unreached'),
      ).rejects.toThrow(/Authentication failed/);
      expect(await ownerCount(fx.tA)).toBe(1);
    });

    it('preserves manager/user provenance after serialization', async () => {
      requireSetup();
      // Non-manager sessions still cannot add (raise) or remove (false).
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hSrv, fx.tA, randomUUID(), 'server']),
        ),
      ).rejects.toThrow(/owner\/manager/);
      const denied = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ remove_tenant_member: boolean }>(
          'SELECT public.remove_tenant_member($1, $2, $3)',
          [fx.hSrv, fx.tA, fx.srv],
        );
        return r.rows[0]?.remove_tenant_member;
      });
      expect(denied).toBe(false);
      // Cross-tenant manager power does not exist.
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hMgr, fx.tB, randomUUID(), 'server']),
        ),
      ).rejects.toThrow(/owner\/manager/);
      const foreign = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ remove_tenant_member: boolean }>(
          'SELECT public.remove_tenant_member($1, $2, $3)',
          [fx.hMgr, fx.tB, fx.o3],
        );
        return r.rows[0]?.remove_tenant_member;
      });
      expect(foreign).toBe(false);
      // Unknown caller tokens remove nothing.
      const ghost = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ remove_tenant_member: boolean }>(
          'SELECT public.remove_tenant_member($1, $2, $3)',
          [sha(`ghost-${runTag}`), fx.tA, fx.srv],
        );
        return r.rows[0]?.remove_tenant_member;
      });
      expect(ghost).toBe(false);
      // Positive control: the manager round-trips a viewer add/remove.
      const viewer = randomUUID();
      const oc = await (owner as Pool).connect();
      try {
        await oc.query('INSERT INTO public.app_users(id, email, display_name) VALUES ($1, $2, $3)', [
          viewer,
          `mcv-${runTag}@example.invalid`,
          'Viewer',
        ]);
      } finally {
        oc.release();
      }
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hMgr, fx.tA, viewer, 'viewer']);
      });
      const removed = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ remove_tenant_member: boolean }>(
          'SELECT public.remove_tenant_member($1, $2, $3)',
          [fx.hMgr, fx.tA, viewer],
        );
        return r.rows[0]?.remove_tenant_member;
      });
      expect(removed).toBe(true);
      expect(await ownerCount(fx.tA)).toBe(1);
    });

    it('serializes concurrent adds without deadlock or false conflict', async () => {
      requireSetup();
      const v1 = randomUUID();
      const v2 = randomUUID();
      const oc = await (owner as Pool).connect();
      try {
        await oc.query('INSERT INTO public.app_users(id, email, display_name) VALUES ($1, $2, $3), ($4, $5, $6)', [
          v1,
          `mcv1-${runTag}@example.invalid`,
          'V1',
          v2,
          `mcv2-${runTag}@example.invalid`,
          'V2',
        ]);
      } finally {
        oc.release();
      }
      await Promise.all([
        withAppTransaction(runtime as Pool, async (tx) => {
          await tx.query('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hMgr, fx.tA, v1, 'viewer']);
        }),
        withAppTransaction(runtime as Pool, async (tx) => {
          await tx.query('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hMgr, fx.tA, v2, 'viewer']);
        }),
      ]);
      const members = await (owner as Pool).query<{ n: string }>(
        'SELECT COUNT(*) AS n FROM public.tenant_users WHERE tenant_id = $1 AND user_id IN ($2, $3)',
        [fx.tA, v1, v2],
      );
      expect(Number(members.rows[0]?.n ?? -1)).toBe(2);
      for (const v of [v1, v2]) {
        const removed = await withAppTransaction(runtime as Pool, async (tx) => {
          const r = await tx.query<{ remove_tenant_member: boolean }>(
            'SELECT public.remove_tenant_member($1, $2, $3)',
            [fx.hMgr, fx.tA, v],
          );
          return r.rows[0]?.remove_tenant_member;
        });
        expect(removed).toBe(true);
      }
      expect(await ownerCount(fx.tA)).toBe(1);
    });

    it('revokes identity CREATE while keeping ownership, EXECUTE, and runtime lookups', async () => {
      requireSetup();
      const privs = await (owner as Pool).query<{ c: boolean; u: boolean }>(
        "SELECT has_schema_privilege('culinaryos_identity', 'public', 'CREATE') AS c, has_schema_privilege('culinaryos_identity', 'public', 'USAGE') AS u",
      );
      expect(privs.rows[0]).toEqual({ c: false, u: true });
      const owners = await (owner as Pool).query<{ proname: string; owner: string }>(
        "SELECT p.proname, pg_get_userbyid(p.proowner) AS owner FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname IN ('add_tenant_member', 'remove_tenant_member')",
      );
      expect(owners.rows).toEqual([
        { proname: 'add_tenant_member', owner: 'culinaryos_identity' },
        { proname: 'remove_tenant_member', owner: 'culinaryos_identity' },
      ]);
      const exec = await (owner as Pool).query<{ a: boolean; r: boolean }>(
        "SELECT has_function_privilege('culinaryos_app', 'public.add_tenant_member(text, uuid, uuid, text)', 'EXECUTE') AS a, has_function_privilege('culinaryos_app', 'public.remove_tenant_member(text, uuid, uuid)', 'EXECUTE') AS r",
      );
      expect(exec.rows[0]).toEqual({ a: true, r: true });
      const pub = await (owner as Pool).query<{ n: string }>(
        "SELECT COUNT(*) AS n FROM information_schema.role_routine_grants WHERE grantee = 'PUBLIC' AND routine_schema = 'public' AND routine_name IN ('add_tenant_member', 'remove_tenant_member')",
      );
      expect(Number(pub.rows[0]?.n ?? -1)).toBe(0);
      // 008 is recorded in the ledger with a matching checksum.
      const files = listMigrationFiles(
        join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'db', 'migrations'),
      );
      const file008 = files.find((f) => f.version === '008');
      const ledger = await (owner as Pool).query<{ version: string; checksum: string }>(
        'SELECT version, checksum FROM public.schema_migrations WHERE version = $1',
        ['008'],
      );
      expect(ledger.rows[0]?.checksum).toBe(file008?.checksum);
      // Non-superuser runtime lookups still resolve after the revoke.
      const who = await withAppTransaction(runtime as Pool, async (tx) => {
        const whoami = await tx.query<{ session_user: string }>('SELECT session_user');
        const id = await tx.query<{ kind: string }>('SELECT kind FROM public.resolve_identity($1)', [fx.hMgr]);
        const pin = await tx.query<{ user_id: string }>('SELECT user_id FROM public.find_staff_pin($1, $2)', [fx.tA, fx.pinSrv]);
        return { user: whoami.rows[0]?.session_user, kind: id.rows[0]?.kind, pinUser: pin.rows[0]?.user_id };
      });
      expect(who.user).toBe(RUNTIME_ROLE);
      expect(who.kind).toBe('session');
      expect(who.pinUser).toBe(fx.srv);
      expect(await ownerCount(fx.tA)).toBe(1);
    });

    it('zz releases all database resources', async () => {
      await teardown();
      expect(tornDown).toBe(true);
    });
  });
}
