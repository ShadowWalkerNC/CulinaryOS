import { describe, expect, it, afterAll } from 'bun:test';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import {
  CULINARYOS_IDENTITY_ROLE,
  assertRuntimeDatabaseRole,
} from '../../packages/db/src/runtime-role.ts';
import { CULINARYOS_APP_ROLE } from '../../packages/db/src/postgres.ts';
import { applyMigrations } from '../../packages/db/src/migrate.ts';

// R2 follow-up: startup guard proving the pool authenticates as a restricted
// LOGIN member of culinaryos_app — never a superuser, BYPASSRLS role, table
// owner, or identity-role member. Unit suites run on a fake pool. The live
// suite runs only when TEST_DATABASE_URL is explicitly set (disposable
// database, operator-owned): the child environment must be loaded from the
// private temp cluster/test-env.json without printing it. Passwords are
// random per run and never logged; diagnostics carry role names and flags
// only. Role names are run-tagged so parallel live suites never collide.

const SECRET_SENTINEL = 'pw-SENTINEL-9f2c-not-a-real-secret';

interface FakeRow {
  login: unknown;
  effective: unknown;
  login_superuser: unknown;
  login_bypassrls: unknown;
  login_canlogin: unknown;
  login_app_member: unknown;
  login_identity_member: unknown;
  login_owned_public_tables: unknown;
}

const GOOD_ROW: FakeRow = {
  login: 'culinaryos_runtime_test',
  effective: 'culinaryos_runtime_test',
  login_superuser: false,
  login_bypassrls: false,
  login_canlogin: true,
  login_app_member: true,
  login_identity_member: false,
  login_owned_public_tables: 0,
};

class FakeClient {
  released = 0;
  params: unknown[] | undefined;

  constructor(private readonly row: FakeRow | null, private readonly boom?: Error) {}

  async query(_text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    this.params = params;
    if (this.boom) throw this.boom;
    return this.row ? { rows: [this.row], rowCount: 1 } : { rows: [], rowCount: 0 };
  }

  release(): void {
    this.released += 1;
  }
}

function asPool(client: FakeClient): Pool {
  // Sentinel proves rejection paths never echo pool configuration: the
  // helper must not read or print pool options at all.
  return { connect: async () => client as unknown as never, options: { password: SECRET_SENTINEL } } as unknown as Pool;
}

describe('assertRuntimeDatabaseRole unit', () => {
  it('accepts a restricted LOGIN member of the app role', async () => {
    const client = new FakeClient({ ...GOOD_ROW });
    const info = await assertRuntimeDatabaseRole(asPool(client));
    expect(info).toEqual({
      login: 'culinaryos_runtime_test',
      effectiveRole: 'culinaryos_runtime_test',
      superuser: false,
      bypassRls: false,
      canLogin: true,
      appMember: true,
      identityMember: false,
      ownedPublicTables: 0,
    });
    expect(Object.keys(info).sort()).toEqual(
      ['appMember', 'bypassRls', 'canLogin', 'effectiveRole', 'identityMember', 'login', 'ownedPublicTables', 'superuser'],
    );
    expect(JSON.stringify(info)).not.toContain(SECRET_SENTINEL);
    expect(client.params).toEqual([CULINARYOS_APP_ROLE, 'member', CULINARYOS_IDENTITY_ROLE]);
    expect(client.released).toBe(1);
  });

  it('rejects a superuser login', async () => {
    const client = new FakeClient({ ...GOOD_ROW, login_superuser: true });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/superuser/);
    expect(client.released).toBe(1);
  });

  it('rejects a BYPASSRLS login', async () => {
    const client = new FakeClient({ ...GOOD_ROW, login_bypassrls: true });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/BYPASSRLS/);
    expect(client.released).toBe(1);
  });

  it('rejects an identity-role member', async () => {
    const client = new FakeClient({ ...GOOD_ROW, login_identity_member: true });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/culinaryos_identity/);
    expect(client.released).toBe(1);
  });

  it('rejects a public-table owner', async () => {
    const client = new FakeClient({ ...GOOD_ROW, login_owned_public_tables: 3 });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/owns 3 public table/);
    expect(client.released).toBe(1);
  });

  it('rejects a role that cannot log in', async () => {
    const client = new FakeClient({ ...GOOD_ROW, login: 'culinaryos_app', effective: 'culinaryos_app', login_canlogin: false });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/cannot log in/);
    expect(client.released).toBe(1);
  });

  it('rejects a login outside the app role', async () => {
    const client = new FakeClient({ ...GOOD_ROW, login_app_member: false });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/not a member of "culinaryos_app"/);
    expect(client.released).toBe(1);
  });

  it('rejects an active role switch', async () => {
    const client = new FakeClient({ ...GOOD_ROW, effective: 'culinaryos_app' });
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/active role switch/);
    expect(client.released).toBe(1);
  });

  it('fails closed on unverifiable attributes or empty results', async () => {
    for (const row of [
      { ...GOOD_ROW, login_superuser: null },
      { ...GOOD_ROW, login_bypassrls: null },
      { ...GOOD_ROW, login_identity_member: null },
      { ...GOOD_ROW, login_owned_public_tables: null },
      { ...GOOD_ROW, login_canlogin: null },
      { ...GOOD_ROW, login_app_member: null },
    ]) {
      const client = new FakeClient(row);
      await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/Runtime database role rejected/);
      expect(client.released).toBe(1);
    }
    const empty = new FakeClient(null);
    await expect(assertRuntimeDatabaseRole(asPool(empty))).rejects.toThrow(/no rows/);
    expect(empty.released).toBe(1);
  });

  it('releases the checkout when the check query throws, without leaking pool config', async () => {
    const client = new FakeClient({ ...GOOD_ROW }, new Error('connection reset'));
    await expect(assertRuntimeDatabaseRole(asPool(client))).rejects.toThrow(/connection reset/);
    expect(client.released).toBe(1);
    const denied = new FakeClient({ ...GOOD_ROW, login_superuser: true });
    try {
      await assertRuntimeDatabaseRole(asPool(denied));
      throw new Error('unreached: superuser must be rejected');
    } catch (err) {
      expect(String((err as Error).message)).not.toContain(SECRET_SENTINEL);
    }
  });
});

const OWNER_URL = process.env.TEST_DATABASE_URL;

if (!OWNER_URL) {
  it('runtime-role live suite requires explicit TEST_DATABASE_URL (skipped)', () => {
    console.log('    live skipped: set TEST_DATABASE_URL to a disposable database to run real role proof');
  });
} else {
  describe('assertRuntimeDatabaseRole live (disposable database)', () => {
    const runTag = randomBytes(6).toString('hex');
    const roleFor = (suffix: string): string => `cort_${runTag}_${suffix}`.slice(0, 60);
    const createdRoles: string[] = [];

    let owner: Pool | null = null;
    let good: Pool | null = null;
    let setupError: unknown = null;
    let tornDown = false;

    async function teardown(): Promise<void> {
      if (tornDown) return;
      tornDown = true;
      if (good) {
        try {
          await good.end();
        } catch {
          // Teardown best-effort.
        }
        good = null;
      }
      if (owner) {
        for (const role of createdRoles) {
          try {
            await owner.query(
              'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = $1 AND pid <> pg_backend_pid()',
              [role],
            );
            await owner.query(`DROP ROLE IF EXISTS "${role}"`);
          } catch {
            // Teardown best-effort.
          }
        }
        try {
          await owner.end();
        } catch {
          // Teardown best-effort.
        }
        owner = null;
      }
    }

    function loginUrl(role: string, password: string): string {
      const url = new URL(OWNER_URL as string);
      url.username = role;
      url.password = password;
      return url.toString();
    }

    async function makeLogin(role: string, attributes: string, grants: string[]): Promise<string> {
      if (!owner) throw new Error('owner pool missing');
      const password = randomBytes(24).toString('hex');
      const c = await owner.connect();
      try {
        await c.query(
          'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = $1 AND pid <> pg_backend_pid()',
          [role],
        );
        await c.query(`DROP ROLE IF EXISTS "${role}"`);
        await c.query(`CREATE ROLE "${role}" WITH ${attributes} PASSWORD '${password}'`);
        for (const grant of grants) {
          await c.query(grant.replaceAll('__ROLE__', `"${role}"`));
        }
      } finally {
        c.release();
      }
      createdRoles.push(role);
      return password;
    }

    // Ordered first step (setup is an explicit step, matching the repo shim).
    it('00 provisions a restricted login on the migrated chain', async () => {
      try {
        owner = new Pool({ connectionString: OWNER_URL, max: 4, statement_timeout: 15000 });
        await applyMigrations(owner);
        const role = roleFor('ok');
        const password = await makeLogin(role, 'LOGIN NOBYPASSRLS', [`GRANT ${CULINARYOS_APP_ROLE} TO __ROLE__`]);
        good = new Pool({ connectionString: loginUrl(role, password), max: 2, statement_timeout: 10000 });
      } catch (err) {
        setupError = err;
        throw err;
      }
    });

    afterAll(async () => {
      await teardown();
    });

    function requireSetup(): void {
      if (setupError) throw setupError;
      if (!owner || !good) throw new Error('live setup did not complete');
    }

    it('accepts the restricted LOGIN member of the app role', async () => {
      requireSetup();
      const info = await assertRuntimeDatabaseRole(good as Pool);
      expect(info.login).toBe(roleFor('ok'));
      expect(info.effectiveRole).toBe(roleFor('ok'));
      expect(info.superuser).toBe(false);
      expect(info.bypassRls).toBe(false);
      expect(info.canLogin).toBe(true);
      expect(info.appMember).toBe(true);
      expect(info.identityMember).toBe(false);
      expect(info.ownedPublicTables).toBe(0);
    });

    it('rejects the migration-owner login', async () => {
      requireSetup();
      // The owner necessarily violates at least one guard (superuser in the
      // verification cluster; table ownership plus identity membership in a
      // least-privilege deploy). Unit tests pin each reason separately.
      await expect(assertRuntimeDatabaseRole(owner as Pool)).rejects.toThrow(/superuser|identity|owns/);
    });

    it('rejects an identity-member login', async () => {
      requireSetup();
      const role = roleFor('idm');
      try {
        const password = await makeLogin(role, 'LOGIN NOBYPASSRLS', [
          `GRANT ${CULINARYOS_APP_ROLE} TO __ROLE__`,
          `GRANT ${CULINARYOS_IDENTITY_ROLE} TO __ROLE__`,
        ]);
        const pool = new Pool({ connectionString: loginUrl(role, password), max: 1, statement_timeout: 10000 });
        try {
          await expect(assertRuntimeDatabaseRole(pool)).rejects.toThrow(/culinaryos_identity/);
        } finally {
          await pool.end();
        }
      } catch (err) {
        if (/permission denied|insufficient_privilege|must be superuser|cannot grant/i.test(String((err as Error).message))) {
          console.log('    live skip: identity-member fixture needs grant privilege this owner lacks');
          return;
        }
        throw err;
      }
    });

    it('rejects a superuser login', async () => {
      requireSetup();
      const role = roleFor('sup');
      try {
        const password = await makeLogin(role, 'LOGIN SUPERUSER', [`GRANT ${CULINARYOS_APP_ROLE} TO __ROLE__`]);
        const pool = new Pool({ connectionString: loginUrl(role, password), max: 1, statement_timeout: 10000 });
        try {
          await expect(assertRuntimeDatabaseRole(pool)).rejects.toThrow(/superuser/);
        } finally {
          await pool.end();
        }
      } catch (err) {
        if (/permission denied|must be superuser/i.test(String((err as Error).message))) {
          console.log('    live skip: superuser fixture needs a superuser owner');
          return;
        }
        throw err;
      }
    });

    it('rejects a BYPASSRLS login', async () => {
      requireSetup();
      const role = roleFor('byp');
      try {
        const password = await makeLogin(role, 'LOGIN BYPASSRLS', [`GRANT ${CULINARYOS_APP_ROLE} TO __ROLE__`]);
        const pool = new Pool({ connectionString: loginUrl(role, password), max: 1, statement_timeout: 10000 });
        try {
          await expect(assertRuntimeDatabaseRole(pool)).rejects.toThrow(/BYPASSRLS/);
        } finally {
          await pool.end();
        }
      } catch (err) {
        if (/permission denied|must be superuser/i.test(String((err as Error).message))) {
          console.log('    live skip: BYPASSRLS fixture needs a superuser owner');
          return;
        }
        throw err;
      }
    });

    it('rejects a login that owns a public table', async () => {
      requireSetup();
      const role = roleFor('own');
      const table = `rr_scratch_${runTag}`;
      const oc = await (owner as Pool).connect();
      try {
        const password = await makeLogin(role, 'LOGIN NOBYPASSRLS', [`GRANT ${CULINARYOS_APP_ROLE} TO __ROLE__`]);
        await oc.query(`GRANT CREATE ON SCHEMA public TO "${role}"`);
        const pool = new Pool({ connectionString: loginUrl(role, password), max: 1, statement_timeout: 10000 });
        try {
          const c = await pool.connect();
          try {
            await c.query(`CREATE TABLE public."${table}" (id int PRIMARY KEY)`);
          } finally {
            c.release();
          }
          await expect(assertRuntimeDatabaseRole(pool)).rejects.toThrow(/owns 1 public table/);
        } finally {
          await pool.end();
        }
      } catch (err) {
        if (/permission denied|must be superuser/i.test(String((err as Error).message))) {
          console.log('    live skip: table-owner fixture needs schema-grant privilege this owner lacks');
          return;
        }
        throw err;
      } finally {
        try {
          await oc.query(`DROP TABLE IF EXISTS public."${table}"`);
          await oc.query(`REVOKE CREATE ON SCHEMA public FROM "${role}"`);
        } catch {
          // Fixture cleanup best-effort; teardown drops the role regardless.
        }
        oc.release();
      }
    });

    it('zz releases all database resources', async () => {
      await teardown();
      expect(tornDown).toBe(true);
    });
  });
}
