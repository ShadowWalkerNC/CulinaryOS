import { describe, expect, it, afterAll } from 'bun:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import {
  assertTokenHash,
  closePostgresPool,
  getPostgresPool,
  withAppTransaction,
  withVerifiedTenantTransaction,
} from '../../packages/db/src/postgres.ts';
import {
  applyMigrations,
  checksumSql,
  defaultMigrationsDir,
  listMigrationFiles,
} from '../../packages/db/src/migrate.ts';

// R2 pg-foundation: adapter discipline, migration chain audit, and (when
// TEST_DATABASE_URL is explicitly set) real two-tenant proof against a
// disposable PostgreSQL database. Unit + static suites need no services.

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_A = '11111111-1111-1111-1111-111111111111';
const DEVICE_A = '22222222-2222-2222-2222-222222222222';
const GOOD_HASH = 'a'.repeat(64);

interface RecordedCall {
  text: string;
  params?: unknown[];
}

class FakeClient {
  calls: RecordedCall[] = [];
  released = 0;

  constructor(
    private readonly script: (text: string, params?: unknown[]) => { rows: unknown[]; rowCount: number },
  ) {}

  async query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number }> {
    this.calls.push({ text, params });
    return this.script(text, params);
  }

  release(): void {
    this.released += 1;
  }
}

function asPool(client: FakeClient, onConnect?: () => void): Pool {
  return {
    connect: async () => {
      onConnect?.();
      return client as unknown as never;
    },
  } as unknown as Pool;
}

function hasCall(client: FakeClient, needle: string): boolean {
  return client.calls.some((c) => c.text.includes(needle));
}

describe('postgres pool lifecycle', () => {
  it('throws when DATABASE_URL is unset', async () => {
    await closePostgresPool();
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(() => getPostgresPool()).toThrow(/DATABASE_URL/);
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
      await closePostgresPool();
    }
  });

  it('returns a lazy singleton without connecting', async () => {
    await closePostgresPool();
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/never_connects';
    try {
      const a = getPostgresPool();
      const b = getPostgresPool();
      expect(a === b).toBe(true);
      expect(a.totalCount).toBe(0);
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = saved;
      await closePostgresPool();
    }
  });
});

describe('token hash validation', () => {
  it('accepts 64 lowercase hex', () => {
    expect(() => assertTokenHash(GOOD_HASH)).not.toThrow();
  });

  it('rejects malformed hashes', () => {
    for (const bad of ['', 'xyz', 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64)]) {
      expect(() => assertTokenHash(bad)).toThrow(/tokenHash/);
    }
  });
});

describe('withVerifiedTenantTransaction', () => {
  const sessionRow = {
    kind: 'session',
    user_id: USER_A,
    tenant_id: TENANT_A,
    role: 'owner',
    device_id: null,
    capabilities: null,
  };

  it('rejects malformed hashes before checkout', async () => {
    let connected = 0;
    const client = new FakeClient(() => ({ rows: [], rowCount: 0 }));
    const pool = asPool(client, () => {
      connected += 1;
    });
    await expect(
      withVerifiedTenantTransaction(pool, { tokenHash: 'bogus' }, async () => 'unreached'),
    ).rejects.toThrow(/tokenHash/);
    expect(connected).toBe(0);
    expect(client.calls).toHaveLength(0);
  });

  it('fails closed on unknown credentials without running the callback', async () => {
    const client = new FakeClient(() => ({ rows: [], rowCount: 0 }));
    let called = false;
    await expect(
      withVerifiedTenantTransaction(asPool(client), { tokenHash: GOOD_HASH }, async () => {
        called = true;
        return 'unreached';
      }),
    ).rejects.toThrow(/Authentication failed/);
    expect(called).toBe(false);
    expect(hasCall(client, 'ROLLBACK')).toBe(true);
    expect(hasCall(client, 'COMMIT')).toBe(false);
    expect(client.released).toBe(1);
  });

  it('fails closed on malformed identity rows', async () => {
    const badRows = [
      { ...sessionRow, kind: 'superuser' },
      { ...sessionRow, tenant_id: 'not-a-uuid' },
      { ...sessionRow, role: 42 },
    ];
    for (const row of badRows) {
      const client = new FakeClient((text) =>
        text.includes('resolve_identity') ? { rows: [row], rowCount: 1 } : { rows: [], rowCount: 0 },
      );
      await expect(
        withVerifiedTenantTransaction(asPool(client), { tokenHash: GOOD_HASH }, async () => 'unreached'),
      ).rejects.toThrow(/Authentication failed/);
      expect(hasCall(client, 'ROLLBACK')).toBe(true);
      expect(client.released).toBe(1);
    }
  });

  it('sets only the opaque token hash; the database derives the tenant', async () => {
    const client = new FakeClient((text) =>
      text.includes('resolve_identity') ? { rows: [sessionRow], rowCount: 1 } : { rows: [], rowCount: 0 },
    );
    const result = await withVerifiedTenantTransaction(
      asPool(client),
      { tokenHash: GOOD_HASH },
      async ({ tx, identity }) => {
        expect(identity.tenantId).toBe(TENANT_A);
        expect(identity.role).toBe('owner');
        expect(identity.userId).toBe(USER_A);
        await tx.query('SELECT 1');
        return 'ok';
      },
    );
    expect(result).toBe('ok');
    const setCalls = client.calls.filter((c) => c.text.includes('set_config'));
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]?.text).toContain('app.token_hash');
    expect(setCalls[0]?.params).toEqual([GOOD_HASH]);
    for (const forged of ['app.tenant_id', 'app.user_id', 'app.role', 'app.device_id']) {
      expect(client.calls.some((c) => c.text.includes(forged))).toBe(false);
    }
    expect(client.calls[0]?.text).toBe('BEGIN');
    expect(hasCall(client, 'SET LOCAL ROLE culinaryos_app')).toBe(true);
    expect(hasCall(client, 'COMMIT')).toBe(true);
    expect(hasCall(client, 'ROLLBACK')).toBe(false);
    expect(client.released).toBe(1);
  });

  it('maps device identities with null role and verified capabilities', async () => {
    const deviceRow = {
      kind: 'device',
      user_id: null,
      tenant_id: TENANT_A,
      role: null,
      device_id: DEVICE_A,
      capabilities: ['kds:read'],
    };
    const client = new FakeClient((text) =>
      text.includes('resolve_identity') ? { rows: [deviceRow], rowCount: 1 } : { rows: [], rowCount: 0 },
    );
    await withVerifiedTenantTransaction(asPool(client), { tokenHash: GOOD_HASH }, async ({ identity }) => {
      expect(identity.kind).toBe('device');
      expect(identity.role).toBe(null);
      expect(identity.userId).toBe(null);
      expect(identity.capabilities).toEqual(['kds:read']);
    });
    const setCalls = client.calls.filter((c) => c.text.includes('set_config'));
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0]?.params).toEqual([GOOD_HASH]);
    expect(client.released).toBe(1);
  });

  it('rolls back and releases when the callback throws', async () => {
    const client = new FakeClient((text) =>
      text.includes('resolve_identity') ? { rows: [sessionRow], rowCount: 1 } : { rows: [], rowCount: 0 },
    );
    await expect(
      withVerifiedTenantTransaction(asPool(client), { tokenHash: GOOD_HASH }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow(/boom/);
    expect(hasCall(client, 'ROLLBACK')).toBe(true);
    expect(hasCall(client, 'COMMIT')).toBe(false);
    expect(client.released).toBe(1);
  });
});

describe('withAppTransaction', () => {
  it('runs auth-plane work with no tenant settings', async () => {
    const client = new FakeClient(() => ({ rows: [], rowCount: 0 }));
    const result = await withAppTransaction(asPool(client), async (tx) => {
      await tx.query('SELECT 1');
      return 7;
    });
    expect(result).toBe(7);
    expect(hasCall(client, 'set_config')).toBe(false);
    expect(hasCall(client, 'COMMIT')).toBe(true);
    expect(client.released).toBe(1);
  });

  it('rolls back and releases on failure', async () => {
    const client = new FakeClient(() => ({ rows: [], rowCount: 0 }));
    await expect(
      withAppTransaction(asPool(client), async () => {
        throw new Error('auth-plane boom');
      }),
    ).rejects.toThrow(/auth-plane boom/);
    expect(hasCall(client, 'ROLLBACK')).toBe(true);
    expect(client.released).toBe(1);
  });
});

describe('migration runner pure functions', () => {
  it('computes stable SHA-256 checksums', () => {
    expect(checksumSql('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(checksumSql('abc')).toBe(checksumSql('abc'));
    expect(checksumSql('abc') === checksumSql('abd')).toBe(false);
  });

  it('lists migration files in version order and ignores non-matching names', () => {
    const dir = mkdtempSync(join(tmpdir(), 'culinaryos-migrate-'));
    writeFileSync(join(dir, '002_beta.sql'), 'SELECT 2');
    writeFileSync(join(dir, '001_alpha.sql'), 'SELECT 1');
    writeFileSync(join(dir, '003_gamma.sql'), 'SELECT 3');
    writeFileSync(join(dir, 'README.md'), 'ignored');
    const files = listMigrationFiles(dir);
    expect(files.map((f) => f.version)).toEqual(['001', '002', '003']);
    expect(files[0]?.checksum).toBe(checksumSql('SELECT 1'));
  });

  it('rejects duplicate versions and empty files', () => {
    const dupDir = mkdtempSync(join(tmpdir(), 'culinaryos-migrate-dup-'));
    writeFileSync(join(dupDir, '001_alpha.sql'), 'SELECT 1');
    writeFileSync(join(dupDir, '001_beta.sql'), 'SELECT 2');
    expect(() => listMigrationFiles(dupDir)).toThrow(/Duplicate/);
    const emptyDir = mkdtempSync(join(tmpdir(), 'culinaryos-migrate-empty-'));
    writeFileSync(join(emptyDir, '001_alpha.sql'), '   \n');
    expect(() => listMigrationFiles(emptyDir)).toThrow(/Empty/);
  });

  it('resolves the owned migrations directory', () => {
    const dir = defaultMigrationsDir();
    expect(dir.replace(/\\/g, '/').endsWith('packages/db/migrations')).toBe(true);
    expect(readdirSync(dir).filter((f) => f.endsWith('.sql'))).toHaveLength(8);
  });
});

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'packages',
  'db',
  'migrations',
);

function readMigration(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), 'utf8');
}

function createdTables(sql: string): string[] {
  const out: string[] = [];
  const re = /CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) out.push(m[1] as string);
  return out;
}

describe('migration chain static audit', () => {
  const filenames = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const corpus = filenames.map(readMigration).join('\n');
  const code = corpus.replace(/--[^\n]*/g, '');

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

  it('enables and forces RLS on every created table', () => {
    for (const filename of filenames) {
      const sql = readMigration(filename);
      for (const table of createdTables(sql)) {
        expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
        expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${table} FORCE ROW LEVEL SECURITY`));
      }
    }
    expect(readMigration('001_foundation.sql')).toMatch(
      /ALTER TABLE public\.schema_migrations FORCE ROW LEVEL SECURITY/,
    );
  });

  it('contains no Supabase-coupled constructs', () => {
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

  it('repairs every historical composite ON DELETE SET NULL and adds none', () => {
    // 001-005 are immutable, so the two 003 defects remain in history; 006
    // must drop each by name and replace it with a same-tenant trigger.
    const history = filenames
      .filter((f) => f !== '006_identity_hardening.sql')
      .map(readMigration)
      .join('\n')
      .replace(/--[^\n]*/g, '');
    const defects = [
      ...history.matchAll(
        /CONSTRAINT (\w+) FOREIGN KEY\s*\([^)]*,[^)]*\)\s*REFERENCES\s+public\.\w+\([^)]*\)\s*ON DELETE SET NULL/g,
      ),
    ].map((m) => m[1] as string);
    expect(defects.sort()).toEqual(['fk_lim_modifier', 'fk_pos_orders_tab']);
    const hardening = readMigration('006_identity_hardening.sql');
    for (const name of defects) {
      expect(hardening).toMatch(new RegExp(`DROP CONSTRAINT IF EXISTS ${name}`));
      expect(hardening).toMatch(new RegExp(`ADD CONSTRAINT ${name} FOREIGN KEY \\(\\w+\\)`));
    }
    expect(hardening).toMatch(/trg_pos_orders_tab_tenant/);
    expect(hardening).toMatch(/trg_lim_modifier_tenant/);
    const hardeningCode = hardening.replace(/--[^\n]*/g, '');
    expect(hardeningCode).not.toMatch(
      /FOREIGN KEY\s*\([^)]*,[^)]*\)\s*REFERENCES\s+public\.\w+\([^)]*\)\s*ON DELETE SET NULL/,
    );
  });

  it('keeps SECURITY DEFINER hygiene on every identity function', () => {
    const granted = [
      'resolve_identity',
      'find_staff_pin',
      'mint_session',
      'revoke_session',
      'register_device_key',
      'revoke_device_key',
      'add_tenant_member',
      'remove_tenant_member',
      'set_staff_pin',
    ];
    for (const name of [...granted, 'identity_session']) {
      const at = code.indexOf(`FUNCTION public.${name}`);
      expect(at >= 0).toBe(true);
      const window = code.slice(at, at + 1500);
      expect(window).toMatch(/SECURITY DEFINER/);
      expect(window).toMatch(/SET search_path = public/);
      expect(code).toMatch(
        new RegExp(`ALTER FUNCTION public\\.${name}\\([^;]*?\\) OWNER TO culinaryos_identity`),
      );
      expect(code).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^;]*?\\) FROM PUBLIC`));
    }
    for (const name of granted) {
      expect(code).toMatch(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^;]*?\\) TO culinaryos_app`),
      );
    }
    expect(code).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.identity_session[^;]*TO culinaryos_app/);
  });

  it('keeps narrow lifecycle rules in the hardening migration', () => {
    const hardening = readMigration('006_identity_hardening.sql');
    expect(hardening).toMatch(/now\(\) \+ interval '30 days'/);
    expect(hardening).toMatch(/last owner/);
    expect(hardening).toMatch(/sync:replay/);
    expect(hardening).toMatch(/REVOKE ALL ON TABLE public\.auth_sessions FROM culinaryos_app/);
    expect(hardening).toMatch(/REVOKE ALL ON TABLE public\.device_keys FROM culinaryos_app/);
    expect(hardening).toMatch(/REVOKE ALL ON TABLE public\.staff_pins FROM culinaryos_app/);
  });

  it('rewrites every historical tenant policy to token-derived helpers', () => {
    const history = filenames
      .filter((f) => f !== '007_token_derived_rls.sql')
      .map(readMigration)
      .join('\n');
    const names = [...history.matchAll(/CREATE POLICY "([^"]+)" ON public\.\w+/g)].map((m) => m[1] as string);
    expect(names.length > 90).toBe(true);
    const keep = new Set([
      'schema_migrations_all',
      'app_users_insert',
      'organizations_insert',
      'sess_identity_select',
      'sess_identity_insert',
      'sess_identity_update',
      'dk_identity_select',
      'dk_identity_insert',
      'dk_identity_update',
      'tu_identity_select',
      'tu_identity_insert',
      'tu_identity_delete',
      'pins_identity_select',
      'pins_identity_insert',
      'pins_identity_update',
    ]);
    const seven = readMigration('007_token_derived_rls.sql');
    for (const name of names) {
      if (keep.has(name)) continue;
      expect(seven).toMatch(new RegExp(`DROP POLICY IF EXISTS "${name}"`));
      expect(seven).toMatch(new RegExp(`CREATE POLICY "${name}"`));
    }
    // Every rewritten definition derives from the verified token; nothing in
    // 007 reads a raw tenant/user setting, and the old helpers are dropped.
    for (const chunk of seven.split('CREATE POLICY ').slice(1)) {
      expect(chunk.includes('app_verified_tenant_id()') || chunk.includes('app_verified_user_id()')).toBe(true);
    }
    const sevenCode = seven.replace(/--[^\n]*/g, '');
    expect(sevenCode).not.toMatch(/app\.tenant_id|app\.user_id/);
    // The old helpers appear only in their own DROP statements.
    expect(sevenCode.match(/public\.app_(tenant|user)_id\(\)/g) ?? []).toHaveLength(2);
    expect(sevenCode.match(/DROP FUNCTION IF EXISTS public\.app_(tenant|user)_id\(\);/g) ?? []).toHaveLength(2);
  });

  it('scopes verified helpers to the token setting alone', () => {
    const seven = readMigration('007_token_derived_rls.sql');
    for (const name of ['app_verified_tenant_id', 'app_verified_user_id']) {
      const at = seven.indexOf(`FUNCTION public.${name}`);
      expect(at >= 0).toBe(true);
      const window = seven.slice(at, at + 800);
      expect(window).toMatch(/resolve_identity\(current_setting\('app\.token_hash', true\)\)/);
      expect(window).not.toMatch(/SECURITY DEFINER/);
      expect(seven).toMatch(
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\(\\) FROM PUBLIC`),
      );
    }
  });

  it('binds minting to authentication proof and owner-only bootstrap', () => {
    const seven = readMigration('007_token_derived_rls.sql');
    expect(seven).toMatch(/DROP FUNCTION IF EXISTS public\.mint_session\(text, uuid, uuid, uuid, timestamptz\)/);
    expect(seven).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.mint_session\(text, uuid, uuid, uuid, timestamptz, text, text\) TO culinaryos_app/,
    );
    expect(seven).toMatch(/exactly one of PIN proof or prior-session proof/);
    expect(seven).toMatch(/PIN proof invalid for this user and tenant/);
    expect(seven).toMatch(/prior session invalid for rotation/);
    expect(seven).toMatch(/bootstrap is migration-owner only/);
  });
});

const OWNER_URL = process.env.TEST_DATABASE_URL;

if (!OWNER_URL) {
  it('integration suite requires explicit TEST_DATABASE_URL (skipped)', () => {
    console.log('    integration skipped: set TEST_DATABASE_URL to a disposable database to run live proof');
  });
} else {
  describe('postgres integration (disposable database)', () => {
    const RUNTIME_ROLE = 'culinaryos_runtime_test';
    const runTag = randomBytes(6).toString('hex');

    let owner: Pool | null = null;
    let runtime: Pool | null = null;
    let setupError: unknown = null;
    let tornDown = false;

    const fx = {
      tA: randomUUID(),
      tB: randomUUID(),
      mgrA: randomUUID(),
      srvA: randomUUID(),
      usrB: randomUUID(),
      hMA: '',
      hSA: '',
      hMB: '',
      hDev: '',
      hPinMgr: '',
      hPinSrv: '',
      hPinB: '',
      devA: '',
      menuA: randomUUID(),
      menuB: randomUUID(),
      sectionA: randomUUID(),
      itemA: randomUUID(),
      orderA: randomUUID(),
      orderB: randomUUID(),
    };

    function sha(seed: string): string {
      return createHash('sha256').update(seed).digest('hex');
    }

    function isoPlus(hours: number): string {
      return new Date(Date.now() + hours * 3600_000).toISOString();
    }

    function requireSetup(): void {
      if (setupError) throw setupError;
      if (!owner || !runtime) throw new Error('integration setup did not complete');
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
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = '${RUNTIME_ROLE}' AND pid <> pg_backend_pid()`,
          );
          await owner.query(`DROP ROLE IF EXISTS ${RUNTIME_ROLE}`);
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

    // Ordered first step (the repo's node test shim does not run beforeAll
    // hooks registered after the first test, so setup is an explicit step).
    it('00 provisions disposable fixtures', async () => {
      try {
        fx.hMA = sha(`ma-${runTag}`);
        fx.hSA = sha(`sa-${runTag}`);
        fx.hMB = sha(`mb-${runTag}`);
        fx.hDev = sha(`dev-${runTag}`);
        fx.hPinMgr = sha(`pinmgr-${runTag}`);
        fx.hPinSrv = sha(`pinsrv-${runTag}`);
        fx.hPinB = sha(`pinb-${runTag}`);

        owner = new Pool({ connectionString: OWNER_URL, max: 4, statement_timeout: 15000 });
        await applyMigrations(owner);

        // Guard: re-create the read policy if a previously crashed run left it dropped.
        const pol = await owner.query(
          "SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'menus' AND policyname = 'menus_select'",
        );
        if ((pol.rowCount ?? 0) === 0) {
          await owner.query(
            'CREATE POLICY "menus_select" ON public.menus FOR SELECT USING (tenant_id = public.app_verified_tenant_id())',
          );
        }

        const oc = await owner.connect();
        try {
          await oc.query('INSERT INTO public.tenants(id, slug, name) VALUES ($1, $2, $3), ($4, $5, $6)', [
            fx.tA,
            `rg-a-${runTag}`,
            'Region A',
            fx.tB,
            `rg-b-${runTag}`,
            'Region B',
          ]);
          await oc.query('INSERT INTO public.app_users(id, email, display_name) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)', [
            fx.mgrA,
            `mgr-${runTag}@example.invalid`,
            'Manager A',
            fx.srvA,
            `srv-${runTag}@example.invalid`,
            'Server A',
            fx.usrB,
            `usr-${runTag}@example.invalid`,
            'User B',
          ]);
          await oc.query(
            "INSERT INTO public.menus(id, tenant_id, name, status) VALUES ($1, $2, 'Menu A', 'active'), ($3, $4, 'Menu B', 'active')",
            [fx.menuA, fx.tA, fx.menuB, fx.tB],
          );
          await oc.query('INSERT INTO public.menu_sections(id, menu_id, tenant_id, name) VALUES ($1, $2, $3, $4)', [
            fx.sectionA,
            fx.menuA,
            fx.tA,
            'Mains',
          ]);
          await oc.query(
            "INSERT INTO public.menu_items(id, section_id, tenant_id, name, price, station) VALUES ($1, $2, $3, 'Burger', 1299, 'grill')",
            [fx.itemA, fx.sectionA, fx.tA],
          );
          await oc.query("INSERT INTO public.pos_orders(id, tenant_id, status) VALUES ($1, $2, 'open'), ($3, $4, 'open')", [
            fx.orderA,
            fx.tA,
            fx.orderB,
            fx.tB,
          ]);
          // Owner bootstrap ceremony: first memberships + PIN rows are
          // inserted by the owner login, never through the runtime role.
          await oc.query('INSERT INTO public.tenant_users(tenant_id, user_id, role) VALUES ($1, $2, $3), ($4, $5, $6)', [
            fx.tA,
            fx.mgrA,
            'owner',
            fx.tB,
            fx.usrB,
            'owner',
          ]);
          await oc.query(
            'INSERT INTO public.staff_pins(tenant_id, user_id, pin_hash, pin_lookup_hash, display_name, active) VALUES ($1, $2, $3, $4, $5, true), ($6, $7, $8, $9, $10, true), ($11, $12, $13, $14, $15, true)',
            [
              fx.tA, fx.mgrA, 'argon2:fixture-manager-pin', fx.hPinMgr, 'Manager A',
              fx.tA, fx.srvA, 'argon2:fixture-server-pin', fx.hPinSrv, 'Server A',
              fx.tB, fx.usrB, 'argon2:fixture-user-pin', fx.hPinB, 'User B',
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
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename = '${RUNTIME_ROLE}' AND pid <> pg_backend_pid()`,
          );
          await ac.query(`DROP ROLE IF EXISTS ${RUNTIME_ROLE}`);
          await ac.query(`CREATE ROLE ${RUNTIME_ROLE} WITH LOGIN NOBYPASSRLS PASSWORD '${runtimePassword}'`);
          await ac.query(`GRANT culinaryos_app TO ${RUNTIME_ROLE}`);
        } finally {
          ac.release();
        }
        const runtimeUrl = new URL(OWNER_URL);
        runtimeUrl.username = RUNTIME_ROLE;
        runtimeUrl.password = runtimePassword;
        runtime = new Pool({ connectionString: runtimeUrl.toString(), max: 8, statement_timeout: 10000 });

        // Identity fixtures go through the narrow functions as the app role.
        // Every mint carries PIN proof; membership/PIN rows came from the
        // owner ceremony above.
        await withAppTransaction(runtime, async (tx) => {
          const minted = await tx.query<{ role: string }>(
            'SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7) AS role',
            [fx.hMA, fx.mgrA, fx.tA, null, isoPlus(2), fx.hPinMgr, null],
          );
          if (minted.rows[0]?.role !== 'owner') throw new Error('first mint did not return owner role');
          await tx.query('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hMA, fx.tA, fx.srvA, 'server']);
          await tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
            fx.hSA,
            fx.srvA,
            fx.tA,
            null,
            isoPlus(2),
            fx.hPinSrv,
            null,
          ]);
          const dev = await tx.query<{ id: string }>(
            'SELECT public.register_device_key($1, $2, $3, $4, $5, $6) AS id',
            [fx.hMA, fx.hDev, fx.tA, 'kds-1', JSON.stringify(['kds:read', 'tickets:read']), null],
          );
          fx.devA = dev.rows[0]?.id ?? '';
          if (!fx.devA) throw new Error('device registration did not return an id');
          await tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
            fx.hMB,
            fx.usrB,
            fx.tB,
            null,
            isoPlus(2),
            fx.hPinB,
            null,
          ]);
        });
      } catch (err) {
        setupError = err;
        throw err;
      }
    });

    afterAll(async () => {
      await teardown();
    });

    it('binds tenant settings from the verified token and isolates tenants', async () => {
      requireSetup();
      const a = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: fx.hMA }, async ({ tx, identity }) => {
        expect(identity.tenantId).toBe(fx.tA);
        expect(identity.role).toBe('owner');
        expect(identity.kind).toBe('session');
        const s = await tx.query<{ th: string; tid: string }>(
          "SELECT current_setting('app.token_hash') AS th, public.app_verified_tenant_id() AS tid",
        );
        const orders = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders ORDER BY id');
        return { th: s.rows[0]?.th, tid: s.rows[0]?.tid, orderIds: orders.rows.map((r) => r.id) };
      });
      expect(a.th).toBe(fx.hMA);
      expect(a.tid).toBe(fx.tA);
      expect(a.orderIds).toEqual([fx.orderA]);
      const bIds = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: fx.hMB }, async ({ tx }) => {
        const orders = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders ORDER BY id');
        return orders.rows.map((r) => r.id);
      });
      expect(bIds).toEqual([fx.orderB]);
    });

    it('ignores forged tenant settings; the tenant follows only the live token', async () => {
      requireSetup();
      await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: fx.hMA }, async ({ tx }) => {
        // Legacy forgery: writing the old mutable settings changes nothing.
        await tx.query("SELECT set_config('app.tenant_id', $1, true)", [fx.tB]);
        await tx.query("SELECT set_config('app.user_id', $1, true)", [fx.usrB]);
        const stillA = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders ORDER BY id');
        expect(stillA.rows.map((r) => r.id)).toEqual([fx.orderA]);
        const tid = await tx.query<{ v: string }>('SELECT public.app_verified_tenant_id() AS v');
        expect(tid.rows[0]?.v).toBe(fx.tA);
        // The tenant follows the credential: presenting B's live token hash
        // re-scopes reads to B; an unknown hash denies everything.
        await tx.query("SELECT set_config('app.token_hash', $1, true)", [fx.hMB]);
        const nowB = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders ORDER BY id');
        expect(nowB.rows.map((r) => r.id)).toEqual([fx.orderB]);
        await tx.query("SELECT set_config('app.token_hash', $1, true)", [sha(`dead-${runTag}`)]);
        const none = await tx.query('SELECT id FROM public.pos_orders');
        expect(none.rowCount).toBe(0);
      });
    });

    it('denies cross-tenant writes inside a verified transaction', async () => {
      requireSetup();
      await expect(
        withVerifiedTenantTransaction(runtime as Pool, { tokenHash: fx.hMA }, async ({ tx }) =>
          tx.query('INSERT INTO public.pos_orders(tenant_id, status) VALUES ($1, $2)', [fx.tB, 'open']),
        ),
      ).rejects.toThrow(/row-level security/);
    });

    it('fails closed for unknown tokens', async () => {
      requireSetup();
      let called = false;
      await expect(
        withVerifiedTenantTransaction(runtime as Pool, { tokenHash: sha(`nope-${runTag}`) }, async () => {
          called = true;
        }),
      ).rejects.toThrow(/Authentication failed/);
      expect(called).toBe(false);
    });

    it('rejects revoked and expired sessions', async () => {
      requireSetup();
      const h = sha(`ephemeral-${runTag}-${randomUUID()}`);
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          h,
          fx.srvA,
          fx.tA,
          null,
          isoPlus(1),
          fx.hPinSrv,
          null,
        ]);
      });
      const revoked = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ v: boolean }>('SELECT public.revoke_session($1, $1) AS v', [h]);
        return r.rows[0]?.v;
      });
      expect(revoked).toBe(true);
      await expect(
        withVerifiedTenantTransaction(runtime as Pool, { tokenHash: h }, async () => 'unreached'),
      ).rejects.toThrow(/Authentication failed/);
      const again = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ v: boolean }>('SELECT public.revoke_session($1, $1) AS v', [h]);
        return r.rows[0]?.v;
      });
      expect(again).toBe(false);

      const hE = sha(`expired-${runTag}-${randomUUID()}`);
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          hE,
          fx.srvA,
          fx.tA,
          null,
          isoPlus(1),
          fx.hPinSrv,
          null,
        ]);
      });
      await (owner as Pool).query("UPDATE public.auth_sessions SET expires_at = now() - interval '1 hour' WHERE token_hash = $1", [hE]);
      await expect(
        withVerifiedTenantTransaction(runtime as Pool, { tokenHash: hE }, async () => 'unreached'),
      ).rejects.toThrow(/Authentication failed/);
    });

    it('stops device-bound sessions when the device is revoked', async () => {
      requireSetup();
      const hKey = sha(`devkey-${runTag}-${randomUUID()}`);
      const hSess = sha(`devsess-${runTag}-${randomUUID()}`);
      const devId = await withAppTransaction(runtime as Pool, async (tx) => {
        const d = await tx.query<{ id: string }>(
          'SELECT public.register_device_key($1, $2, $3, $4, $5, $6) AS id',
          [fx.hMA, hKey, fx.tA, 'temp-kds', JSON.stringify(['kds:read']), null],
        );
        return d.rows[0]?.id as string;
      });
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          hSess,
          fx.srvA,
          fx.tA,
          devId,
          isoPlus(1),
          fx.hPinSrv,
          null,
        ]);
      });
      const before = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: hSess }, async ({ identity }) => identity.deviceId);
      expect(before).toBe(devId);
      const revoked = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ v: boolean }>('SELECT public.revoke_device_key($1, $2) AS v', [fx.hMA, devId]);
        return r.rows[0]?.v;
      });
      expect(revoked).toBe(true);
      await expect(
        withVerifiedTenantTransaction(runtime as Pool, { tokenHash: hSess }, async () => 'unreached'),
      ).rejects.toThrow(/Authentication failed/);
      const rows = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query('SELECT * FROM public.resolve_identity($1)', [hKey]);
        return r.rowCount;
      });
      expect(rows).toBe(0);
    });

    it('gives device identities capabilities but never manager power', async () => {
      requireSetup();
      const identity = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: fx.hDev }, async ({ tx, identity }) => {
        const menus = await tx.query<{ id: string }>('SELECT id FROM public.menus ORDER BY id');
        expect(menus.rows.map((r) => r.id)).toEqual([fx.menuA]);
        return identity;
      });
      expect(identity.kind).toBe('device');
      expect(identity.role).toBe(null);
      expect(identity.userId).toBe(null);
      expect(identity.tenantId).toBe(fx.tA);
      expect(identity.capabilities).toEqual(['kds:read', 'tickets:read']);
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.register_device_key($1, $2, $3, $4, $5, $6)', [
            fx.hDev,
            sha(`rogue-${runTag}`),
            fx.tA,
            'rogue',
            JSON.stringify(['kds:read']),
            null,
          ]),
        ),
      ).rejects.toThrow(/owner\/manager/);
    });

    it('denies raw identity-table access to the runtime role', async () => {
      requireSetup();
      const c = await (runtime as Pool).connect();
      try {
        await c.query('BEGIN');
        await c.query('SET LOCAL ROLE culinaryos_app');
        // Each intentional failure rolls back to a savepoint so the
        // transaction stays usable for the next probe.
        async function denied(text: string, params: unknown[] = []): Promise<void> {
          await c.query('SAVEPOINT sp_denied');
          await expect(c.query(text, params)).rejects.toThrow(/permission denied/);
          await c.query('ROLLBACK TO SAVEPOINT sp_denied');
        }
        await denied(
          "INSERT INTO public.auth_sessions(token_hash, user_id, tenant_id, role, expires_at) VALUES ($1, $2, $3, 'owner', now() + interval '1 hour')",
          [`f${runTag}0000000000000000000000000000000000000000000000000000000`.slice(0, 64), fx.mgrA, fx.tA],
        );
        await denied('SELECT * FROM public.auth_sessions');
        await denied('INSERT INTO public.device_keys(key_hash, tenant_id) VALUES ($1, $2)', [
          `e${runTag}1`.padEnd(64, '0'),
          fx.tA,
        ]);
        await denied('SELECT * FROM public.device_keys');
        await denied('SELECT pin_hash FROM public.staff_pins');
        await denied("UPDATE public.tenant_users SET role = 'owner' WHERE user_id = $1", [fx.srvA]);
        await denied("INSERT INTO public.tenant_users(tenant_id, user_id, role) VALUES ($1, $2, 'owner')", [fx.tA, fx.srvA]);
        await denied('DELETE FROM public.tenant_users');
        // Retained narrow read: tenant-scoped staff listing, no secrets.
        await c.query("SELECT set_config('app.token_hash', $1, true)", [fx.hMA]);
        const members = await c.query('SELECT user_id FROM public.tenant_users');
        expect((members.rowCount ?? 0) >= 2).toBe(true);
        await c.query('ROLLBACK');
      } catch (err) {
        try {
          await c.query('ROLLBACK');
        } catch {
          // Release must never return a dirty connection to the pool.
        }
        throw err;
      } finally {
        c.release();
      }
    });

    it('resolves identity as a non-superuser under forced RLS', async () => {
      requireSetup();
      const c = await (runtime as Pool).connect();
      try {
        await c.query('BEGIN');
        await c.query('SET LOCAL ROLE culinaryos_app');
        const who = await c.query<{ session_user: string; current_user: string; super: boolean; bypass: boolean }>(
          'SELECT session_user, current_user, (SELECT rolsuper FROM pg_roles WHERE rolname = session_user) AS super, (SELECT rolbypassrls FROM pg_roles WHERE rolname = session_user) AS bypass',
        );
        expect(who.rows[0]?.session_user).toBe(RUNTIME_ROLE);
        expect(who.rows[0]?.current_user).toBe('culinaryos_app');
        expect(who.rows[0]?.super).toBe(false);
        expect(who.rows[0]?.bypass).toBe(false);
        const forced = await c.query<{ relname: string }>(
          "SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN ('auth_sessions', 'device_keys', 'tenant_users', 'staff_pins') AND c.relforcerowsecurity",
        );
        expect(forced.rows.map((r) => r.relname).sort()).toEqual(
          ['auth_sessions', 'device_keys', 'staff_pins', 'tenant_users'],
        );
        const found = await c.query('SELECT kind FROM public.resolve_identity($1)', [fx.hMA]);
        expect(found.rows[0]).toEqual({ kind: 'session' });
        const pin = await c.query('SELECT user_id FROM public.find_staff_pin($1, $2)', [fx.tA, fx.hPinSrv]);
        expect(pin.rows[0]).toEqual({ user_id: fx.srvA });
        await c.query('ROLLBACK');
      } catch (err) {
        try {
          await c.query('ROLLBACK');
        } catch {
          // Release must never return a dirty connection to the pool.
        }
        throw err;
      } finally {
        c.release();
      }
    });

    it('isolates pooled checkouts under concurrency', async () => {
      requireSetup();
      const jobs: Promise<void>[] = [];
      for (let i = 0; i < 24; i += 1) {
        const mine = i % 2 === 0 ? { hash: fx.hMA, tenant: fx.tA, order: fx.orderA } : { hash: fx.hMB, tenant: fx.tB, order: fx.orderB };
        jobs.push(
          withVerifiedTenantTransaction(runtime as Pool, { tokenHash: mine.hash }, async ({ tx, identity }) => {
            expect(identity.tenantId).toBe(mine.tenant);
            const s = await tx.query<{ tid: string }>('SELECT public.app_verified_tenant_id() AS tid');
            expect(s.rows[0]?.tid).toBe(mine.tenant);
            const orders = await tx.query<{ id: string }>('SELECT id FROM public.pos_orders');
            expect(orders.rows.map((r) => r.id)).toEqual([mine.order]);
          }),
        );
      }
      await Promise.all(jobs);
      const c = await (runtime as Pool).connect();
      try {
        await c.query('SET ROLE culinaryos_app');
        const s = await c.query<{ v: string | null }>("SELECT current_setting('app.token_hash', true) AS v");
        // PostgreSQL keeps '' (not unset) for a touched custom variable; both
        // mean "no credential" (resolve_identity yields no rows). The
        // isolation property is: no live token residue on a reused checkout.
        expect(s.rows[0]?.v === null || s.rows[0]?.v === '').toBe(true);
      } finally {
        await c.query('RESET ROLE');
        c.release();
      }
    });

    it('proves reads are policy-gated (negative control)', async () => {
      requireSetup();
      const oc = await (owner as Pool).connect();
      try {
        await oc.query('BEGIN');
        await oc.query('DROP POLICY "menus_select" ON public.menus');
        await oc.query('SET LOCAL ROLE culinaryos_app');
        await oc.query("SELECT set_config('app.token_hash', $1, true)", [fx.hMA]);
        const denied = await oc.query('SELECT id FROM public.menus');
        expect(denied.rowCount).toBe(0);
        await oc.query('ROLLBACK');
      } catch (err) {
        try {
          await oc.query('ROLLBACK');
        } catch {
          // Release must never return a dirty connection to the pool.
        }
        throw err;
      } finally {
        oc.release();
      }
      const visible = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: fx.hMA }, async ({ tx }) => {
        const r = await tx.query('SELECT id FROM public.menus');
        return r.rowCount;
      });
      expect(visible).toBe(1);
    });

    it('nulls only the link column on parent delete (SET NULL repair)', async () => {
      requireSetup();
      const oc = await (owner as Pool).connect();
      try {
        const multi = await oc.query<{ n: string }>(
          "SELECT COUNT(*) AS n FROM pg_constraint c JOIN LATERAL (SELECT COUNT(*) AS k FROM unnest(c.conkey) x) cols ON true WHERE c.contype = 'f' AND c.confdeltype = 'n' AND cols.k > 1 AND c.connamespace = 'public'::regnamespace",
        );
        expect(Number(multi.rows[0]?.n ?? -1)).toBe(0);

        const tabId = randomUUID();
        const orderId = randomUUID();
        await oc.query('INSERT INTO public.tabs(id, tenant_id, table_number) VALUES ($1, $2, $3)', [tabId, fx.tA, 'T7']);
        await oc.query('INSERT INTO public.pos_orders(id, tenant_id, tab_id, status) VALUES ($1, $2, $3, $4)', [orderId, fx.tA, tabId, 'open']);
        await oc.query('DELETE FROM public.tabs WHERE id = $1', [tabId]);
        const order = await oc.query<{ tab_id: string | null; tenant_id: string }>(
          'SELECT tab_id, tenant_id FROM public.pos_orders WHERE id = $1',
          [orderId],
        );
        expect(order.rows[0]?.tab_id).toBe(null);
        expect(order.rows[0]?.tenant_id).toBe(fx.tA);

        const groupId = randomUUID();
        const modId = randomUUID();
        const lineId = randomUUID();
        const limId = randomUUID();
        await oc.query('INSERT INTO public.modifier_groups(id, menu_item_id, tenant_id, name) VALUES ($1, $2, $3, $4)', [
          groupId,
          fx.itemA,
          fx.tA,
          'Size',
        ]);
        await oc.query('INSERT INTO public.modifiers(id, modifier_group_id, tenant_id, name) VALUES ($1, $2, $3, $4)', [
          modId,
          groupId,
          fx.tA,
          'Large',
        ]);
        await oc.query(
          "INSERT INTO public.pos_order_line_items(id, order_id, tenant_id, menu_item_id, name, unit_price, line_total, station) VALUES ($1, $2, $3, $4, 'Burger', 1299, 1299, 'grill')",
          [lineId, fx.orderA, fx.tA, fx.itemA],
        );
        await oc.query('INSERT INTO public.line_item_modifiers(id, line_item_id, tenant_id, modifier_id, name) VALUES ($1, $2, $3, $4, $5)', [
          limId,
          lineId,
          fx.tA,
          modId,
          'Large',
        ]);
        await oc.query('DELETE FROM public.modifiers WHERE id = $1', [modId]);
        const lim = await oc.query<{ modifier_id: string | null; tenant_id: string }>(
          'SELECT modifier_id, tenant_id FROM public.line_item_modifiers WHERE id = $1',
          [limId],
        );
        expect(lim.rows[0]?.modifier_id).toBe(null);
        expect(lim.rows[0]?.tenant_id).toBe(fx.tA);

        // Same-tenant triggers still reject cross-tenant links.
        const tabB = randomUUID();
        await oc.query('INSERT INTO public.tabs(id, tenant_id, table_number) VALUES ($1, $2, $3)', [tabB, fx.tB, 'T9']);
        await expect(
          oc.query('INSERT INTO public.pos_orders(id, tenant_id, tab_id, status) VALUES ($1, $2, $3, $4)', [
            randomUUID(),
            fx.tA,
            tabB,
            'open',
          ]),
        ).rejects.toThrow(/same tenant/);
      } finally {
        oc.release();
      }
    });

    it('keeps bootstrap migration-owner only', async () => {
      requireSetup();
      const tC = randomUUID();
      const u1 = randomUUID();
      const u2 = randomUUID();
      const h1 = sha(`t1-${runTag}-${randomUUID()}`);
      const pin1 = sha(`pinc-${runTag}`);
      // Owner ceremony for a fresh tenant: rows the runtime cannot create.
      const oc = await (owner as Pool).connect();
      try {
        await oc.query('INSERT INTO public.tenants(id, slug, name) VALUES ($1, $2, $3)', [tC, `rg-c-${runTag}`, 'Region C']);
        await oc.query('INSERT INTO public.app_users(id, email, display_name) VALUES ($1, $2, $3), ($4, $5, $6)', [
          u1,
          `u1-${runTag}@example.invalid`,
          'U1',
          u2,
          `u2-${runTag}@example.invalid`,
          'U2',
        ]);
        await oc.query('INSERT INTO public.tenant_users(tenant_id, user_id, role) VALUES ($1, $2, $3)', [tC, u1, 'owner']);
        await oc.query(
          'INSERT INTO public.staff_pins(tenant_id, user_id, pin_hash, pin_lookup_hash, display_name, active) VALUES ($1, $2, $3, $4, $5, true)',
          [tC, u1, 'argon2:fixture-c-owner', pin1, 'U1'],
        );
      } finally {
        oc.release();
      }
      const app = async <T>(text: string, params: unknown[]): Promise<T> =>
        withAppTransaction(runtime as Pool, async (tx) => (await tx.query<T>(text, params)).rows[0] as T);
      // Runtime NULL/bootstrap paths are rejected, not application-gated.
      await expect(app('SELECT public.add_tenant_member(NULL, $1, $2, $3)', [tC, u2, 'server'])).rejects.toThrow(
        /migration-owner only/,
      );
      await expect(
        app('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [h1, u1, tC, null, isoPlus(1), null, null]),
      ).rejects.toThrow(/exactly one/);
      // With the owner ceremony done, PIN-proof minting works like any login.
      const minted = await app<{ role: string }>(
        'SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7) AS role',
        [h1, u1, tC, null, isoPlus(1), pin1, null],
      );
      expect(minted?.role).toBe('owner');
      // Non-manager session cannot add members.
      await expect(app('SELECT public.add_tenant_member($1, $2, $3, $4)', [fx.hSA, fx.tA, u2, 'server'])).rejects.toThrow(
        /owner\/manager/,
      );
      await app('SELECT public.add_tenant_member($1, $2, $3, $4)', [h1, tC, u2, 'server']);
      await expect(app('SELECT public.remove_tenant_member($1, $2, $3)', [h1, tC, u1])).rejects.toThrow(/last owner/);
      const removed = await app<{ v: boolean }>('SELECT public.remove_tenant_member($1, $2, $3) AS v', [h1, tC, u2]);
      expect(removed?.v).toBe(true);
    });

    it('rotates sessions only with a live same-user prior token', async () => {
      requireSetup();
      const hR = sha(`rot-${runTag}-${randomUUID()}`);
      const minted = await withAppTransaction(runtime as Pool, async (tx) => {
        const r = await tx.query<{ role: string }>(
          'SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7) AS role',
          [hR, fx.srvA, fx.tA, null, isoPlus(1), null, fx.hSA],
        );
        return r.rows[0]?.role;
      });
      expect(minted).toBe('server');
      const identity = await withVerifiedTenantTransaction(runtime as Pool, { tokenHash: hR }, async ({ identity }) => identity);
      expect(identity.userId).toBe(fx.srvA);
      // Prior token of another user, or unknown, mints nothing.
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
            sha(`rotx-${runTag}`),
            fx.srvA,
            fx.tA,
            null,
            isoPlus(1),
            null,
            fx.hMA,
          ]),
        ),
      ).rejects.toThrow(/prior session invalid/);
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
            sha(`roty-${runTag}`),
            fx.srvA,
            fx.tA,
            null,
            isoPlus(1),
            null,
            sha(`nope-${runTag}`),
          ]),
        ),
      ).rejects.toThrow(/prior session invalid/);
      // Both proofs at once, or another user's PIN proof, are rejected.
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
            sha(`rotz-${runTag}`),
            fx.srvA,
            fx.tA,
            null,
            isoPlus(1),
            fx.hPinSrv,
            fx.hSA,
          ]),
        ),
      ).rejects.toThrow(/exactly one/);
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
            sha(`rotw-${runTag}`),
            fx.mgrA,
            fx.tA,
            null,
            isoPlus(1),
            fx.hPinSrv,
            null,
          ]),
        ),
      ).rejects.toThrow(/PIN proof invalid/);
    });

    it('scopes PIN lookup to active same-tenant rows', async () => {
      requireSetup();
      const app = async <T>(text: string, params: unknown[]): Promise<T[]> =>
        withAppTransaction(runtime as Pool, async (tx) => (await tx.query<T>(text, params)).rows as T[]);
      const hit = await app<{ user_id: string }>('SELECT user_id FROM public.find_staff_pin($1, $2)', [fx.tA, fx.hPinSrv]);
      expect(hit).toEqual([{ user_id: fx.srvA }]);
      const miss = await app('SELECT user_id FROM public.find_staff_pin($1, $2)', [fx.tB, fx.hPinSrv]);
      expect(miss).toEqual([]);
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.set_staff_pin($1, $2, $3, $4, $5, $6, $7)', [
          fx.hMA,
          fx.tA,
          fx.srvA,
          'argon2:fixture-server-pin',
          fx.hPinSrv,
          'Server A',
          false,
        ]);
      });
      const inactive = await app('SELECT user_id FROM public.find_staff_pin($1, $2)', [fx.tA, fx.hPinSrv]);
      expect(inactive).toEqual([]);
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.set_staff_pin($1, $2, $3, $4, $5, $6, $7)', [
          fx.hMA,
          fx.tA,
          fx.srvA,
          'argon2:fixture-server-pin',
          fx.hPinSrv,
          'Server A',
          true,
        ]);
      });
      // Non-member PIN owner is rejected.
      await expect(
        withAppTransaction(runtime as Pool, async (tx) =>
          tx.query('SELECT public.set_staff_pin($1, $2, $3, $4, $5, $6, $7)', [
            fx.hMA,
            fx.tA,
            fx.usrB,
            'argon2:x',
            sha(`pinx-${runTag}`),
            'Outsider',
            true,
          ]),
        ),
      ).rejects.toThrow(/not a member/);
    });

    it('enforces self-or-manager session revocation', async () => {
      requireSetup();
      const h = sha(`rev-${runTag}-${randomUUID()}`);
      await withAppTransaction(runtime as Pool, async (tx) => {
        await tx.query('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          h,
          fx.srvA,
          fx.tA,
          null,
          isoPlus(1),
          fx.hPinSrv,
          null,
        ]);
      });
      const app = async (caller: string, target: string): Promise<boolean> =>
        withAppTransaction(runtime as Pool, async (tx) => {
          const r = await tx.query<{ v: boolean }>('SELECT public.revoke_session($1, $2) AS v', [caller, target]);
          return r.rows[0]?.v as boolean;
        });
      // Non-manager cannot revoke someone else's session.
      expect(await app(fx.hSA, fx.hMA)).toBe(false);
      // Cross-tenant owner cannot revoke into another tenant.
      expect(await app(fx.hMB, h)).toBe(false);
      // Same-tenant manager can.
      expect(await app(fx.hMA, h)).toBe(true);
    });

    it('bounds mint and registration inputs', async () => {
      requireSetup();
      const appTx = async (text: string, params: unknown[]): Promise<void> => {
        await withAppTransaction(runtime as Pool, async (tx) => {
          await tx.query(text, params);
        });
      };
      await expect(
        appTx('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          sha(`b1-${runTag}`),
          fx.srvA,
          fx.tA,
          null,
          isoPlus(-1),
          fx.hPinSrv,
          null,
        ]),
      ).rejects.toThrow(/expiry/);
      await expect(
        appTx('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          sha(`b2-${runTag}`),
          fx.srvA,
          fx.tA,
          null,
          isoPlus(24 * 31),
          fx.hPinSrv,
          null,
        ]),
      ).rejects.toThrow(/expiry/);
      await expect(
        appTx('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          sha(`b3-${runTag}`),
          fx.usrB,
          fx.tA,
          null,
          isoPlus(1),
          fx.hPinSrv,
          null,
        ]),
      ).rejects.toThrow(/membership/);
      await expect(
        appTx('SELECT public.mint_session($1, $2, $3, $4, $5, $6, $7)', [
          sha(`b3p-${runTag}`),
          fx.srvA,
          fx.tA,
          null,
          isoPlus(1),
          'not-a-proof',
          null,
        ]),
      ).rejects.toThrow(/PIN proof must be/);
      await expect(
        appTx('SELECT public.register_device_key($1, $2, $3, $4, $5, $6)', [
          fx.hMA,
          sha(`b4-${runTag}`),
          fx.tA,
          'bad',
          JSON.stringify([]),
          null,
        ]),
      ).rejects.toThrow(/capabilities/);
      await expect(
        appTx('SELECT public.register_device_key($1, $2, $3, $4, $5, $6)', [
          fx.hMA,
          sha(`b5-${runTag}`),
          fx.tA,
          'bad',
          JSON.stringify(['kds:read', 'manager:all']),
          null,
        ]),
      ).rejects.toThrow(/allowlist/);
      await expect(
        appTx('SELECT public.register_device_key($1, $2, $3, $4, $5, $6)', [
          fx.hSA,
          sha(`b6-${runTag}`),
          fx.tA,
          'bad',
          JSON.stringify(['kds:read']),
          null,
        ]),
      ).rejects.toThrow(/owner\/manager/);
    });

    it('records migrations and locks down roles and grants', async () => {
      requireSetup();
      const ledger = await (owner as Pool).query<{ version: string; checksum: string }>(
        'SELECT version, checksum FROM public.schema_migrations ORDER BY version',
      );
      expect(ledger.rows.map((r) => r.version)).toEqual(['001', '002', '003', '004', '005', '006', '007', '008']);
      const files = listMigrationFiles(defaultMigrationsDir());
      for (const f of files) {
        const row = ledger.rows.find((r) => r.version === f.version);
        expect(row?.checksum).toBe(f.checksum);
      }
      const roles = await (owner as Pool).query<{ rolname: string; rolcanlogin: boolean; rolsuper: boolean; rolbypassrls: boolean }>(
        'SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname IN ($1, $2, $3)',
        ['culinaryos_app', 'culinaryos_identity', RUNTIME_ROLE],
      );
      const byName = new Map(roles.rows.map((r) => [r.rolname, r]));
      expect(byName.get('culinaryos_app')).toEqual({
        rolname: 'culinaryos_app',
        rolcanlogin: false,
        rolsuper: false,
        rolbypassrls: false,
      });
      expect(byName.get('culinaryos_identity')).toEqual({
        rolname: 'culinaryos_identity',
        rolcanlogin: false,
        rolsuper: false,
        rolbypassrls: false,
      });
      expect(byName.get(RUNTIME_ROLE)).toEqual({
        rolname: RUNTIME_ROLE,
        rolcanlogin: true,
        rolsuper: false,
        rolbypassrls: false,
      });
      const pubTables = await (owner as Pool).query<{ n: string }>(
        "SELECT COUNT(*) AS n FROM information_schema.role_table_grants WHERE grantee = 'PUBLIC' AND table_schema = 'public' AND table_name IN ('auth_sessions', 'device_keys', 'staff_pins', 'tenant_users')",
      );
      expect(Number(pubTables.rows[0]?.n ?? -1)).toBe(0);
      const pubFuncs = await (owner as Pool).query<{ n: string }>(
        "SELECT COUNT(*) AS n FROM information_schema.role_routine_grants WHERE grantee = 'PUBLIC' AND routine_schema = 'public' AND routine_name IN ('resolve_identity', 'find_staff_pin', 'mint_session', 'revoke_session', 'register_device_key', 'revoke_device_key', 'add_tenant_member', 'remove_tenant_member', 'set_staff_pin', 'identity_session')",
      );
      expect(Number(pubFuncs.rows[0]?.n ?? -1)).toBe(0);
    });

    it('derives every effective policy from the verified token', async () => {
      requireSetup();
      const rows = await (owner as Pool).query<{
        tablename: string;
        policyname: string;
        qual: string | null;
        with_check: string | null;
      }>(
        "SELECT tablename, policyname, qual, with_check FROM pg_policies WHERE schemaname = 'public'",
      );
      const skip = new Set([
        'schema_migrations_all',
        'app_users_insert',
        'organizations_insert',
        'sess_identity_select',
        'sess_identity_insert',
        'sess_identity_update',
        'dk_identity_select',
        'dk_identity_insert',
        'dk_identity_update',
        'tu_identity_select',
        'tu_identity_insert',
        'tu_identity_delete',
        'pins_identity_select',
        'pins_identity_insert',
        'pins_identity_update',
      ]);
      expect(rows.rows.length > 90).toBe(true);
      for (const r of rows.rows) {
        const def = `${r.qual ?? ''} ${r.with_check ?? ''}`;
        expect(
          def.includes('app_tenant_id') ||
            def.includes('app_user_id') ||
            def.includes('app.tenant_id') ||
            def.includes('app.user_id'),
        ).toBe(false);
        if (skip.has(r.policyname)) continue;
        expect(def.includes('app_verified_tenant_id()') || def.includes('app_verified_user_id()')).toBe(true);
      }
      // Every tenant-carrying table is covered by at least one policy.
      const tables = await (owner as Pool).query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'tenant_id'",
      );
      for (const t of tables.rows) {
        expect(rows.rows.some((r) => r.tablename === t.table_name)).toBe(true);
      }
    });

    it('zz releases all database resources', async () => {
      await teardown();
      expect(tornDown).toBe(true);
    });
  });
}
