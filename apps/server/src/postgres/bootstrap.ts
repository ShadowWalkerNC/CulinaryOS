import { createHash, createHmac, pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { escapeIdentifier, escapeLiteral, type Pool } from 'pg';
import { defaultMigrationsDir, listMigrationFiles, MIGRATION_ADVISORY_LOCK_KEY } from '@culinaryos/db/migrate';
import { hashPin } from '../lib/pin.js';
import { pinLookupHash } from './identity.js';

export class NativeBootstrapError extends Error {}

interface BootstrapInput {
  database: string;
  restaurantName: string;
  slug: string;
  ownerEmail: string;
  ownerDisplayName: string;
  ownerPin: string;
  runtimeRole: string;
  runtimePassword: string;
  pinLookupSecret: string;
}

function validate(input: unknown): BootstrapInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new NativeBootstrapError('Bootstrap requires a JSON object on stdin.');
  }
  const fields = input as Record<string, unknown>;
  function field(name: keyof BootstrapInput, pattern: RegExp): string {
    const value = fields[name];
    if (typeof value !== 'string' || value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value) || !pattern.test(value)) {
      throw new NativeBootstrapError(`Invalid bootstrap field: ${name}.`);
    }
    return value;
  }
  const database = field('database', /^[a-z][a-z0-9_]{2,62}$/u);
  if (['postgres', 'template0', 'template1'].includes(database)) {
    throw new NativeBootstrapError('Use a dedicated CulinaryOS database.');
  }
  const ownerPin = field('ownerPin', /^\d{8}$/u);
  if (/^(\d)\1{7}$/u.test(ownerPin) || ['12345678', '87654321'].includes(ownerPin)) {
    throw new NativeBootstrapError('Use a randomly generated eight-digit owner PIN.');
  }
  const runtimePassword = field('runtimePassword', /^[A-Za-z0-9_-]{32,128}$/u);
  const pinLookupSecret = field('pinLookupSecret', /^[A-Za-z0-9_-]{32,128}$/u);
  if (runtimePassword === pinLookupSecret || /placeholder/u.test(runtimePassword + pinLookupSecret)) {
    throw new NativeBootstrapError('Use two independent random runtime secrets.');
  }
  return {
    database, ownerPin, runtimePassword, pinLookupSecret,
    runtimeRole: field('runtimeRole', /^culinaryos_runtime_[a-z0-9][a-z0-9_]{0,41}$/u),
    slug: field('slug', /^(?=.{1,63}$)[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    restaurantName: field('restaurantName', /^.{1,120}$/u),
    ownerDisplayName: field('ownerDisplayName', /^.{1,120}$/u),
    ownerEmail: field('ownerEmail', /^(?=.{3,254}$)[^\s@]+@[^\s@]+\.[^\s@]+$/u),
  };
}

// Supply a PostgreSQL SCRAM verifier to CREATE ROLE; the cleartext password
// never becomes part of a SQL statement. Input is restricted to ASCII above.
function scramVerifier(password: string): string {
  const salt = randomBytes(16);
  const iterations = 4096;
  const salted = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const stored = createHash('sha256').update(clientKey).digest('base64');
  const server = createHmac('sha256', salted).update('Server Key').digest('base64');
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${stored}:${server}`;
}

/** Initialize an already migrated, empty database. Run only as the migration owner. */
export async function bootstrapNativeInstallation(pool: Pick<Pool, 'connect'>, raw: unknown) {
  const input = validate(raw);
  const expected = listMigrationFiles(defaultMigrationsDir());
  const tenantId = randomUUID();
  const ownerId = randomUUID();
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout = '5s'");
    const identity = await client.query<{ database: string; authorized: boolean }>(`
      SELECT current_database() AS database,
        (r.rolsuper OR r.rolbypassrls) AND current_user = session_user
        AND to_regclass('public.schema_migrations') IS NOT NULL
        AND EXISTS (SELECT 1 FROM pg_class WHERE oid = to_regclass('public.schema_migrations') AND relowner = r.oid)
        AS authorized
      FROM pg_roles r WHERE r.rolname = session_user
    `);
    if (identity.rows[0]?.database !== input.database) throw new NativeBootstrapError('Connected database does not match the bootstrap target.');
    if (identity.rows[0].authorized !== true) throw new NativeBootstrapError('Bootstrap requires the migration ledger owner with RLS bypass privileges.');

    await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [MIGRATION_ADVISORY_LOCK_KEY]);
    const applied = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM public.schema_migrations ORDER BY version',
    );
    if (expected.length === 0 || applied.rows.length !== expected.length || expected.some((file, index) =>
      file.version !== applied.rows[index]?.version || file.checksum !== applied.rows[index]?.checksum)) {
      throw new NativeBootstrapError('Migration ledger does not match this release. Apply or reconcile migrations first.');
    }

    await client.query('LOCK TABLE public.organizations, public.tenants, public.app_users IN SHARE ROW EXCLUSIVE MODE');
    const { rows: [state] } = await client.query<{ initialized: boolean; role_exists: boolean; app_role_safe: boolean }>(`
      SELECT (EXISTS (SELECT 1 FROM public.organizations) OR EXISTS (SELECT 1 FROM public.tenants)
        OR EXISTS (SELECT 1 FROM public.app_users)) AS initialized,
        EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS role_exists,
        EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = 'culinaryos_app'
          AND NOT (r.rolcanlogin OR r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication)
          AND NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)
          AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relowner = r.oid)) AS app_role_safe
    `, [input.runtimeRole]);
    if (!state || state.initialized !== false) throw new NativeBootstrapError('Database already contains restaurant or identity records.');
    if (state.role_exists !== false) throw new NativeBootstrapError('Runtime role already exists; choose a unique role name.');
    if (state.app_role_safe !== true) throw new NativeBootstrapError('Database app role failed the bootstrap privilege check.');

    const role = escapeIdentifier(input.runtimeRole);
    await client.query(`CREATE ROLE ${role} LOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION PASSWORD ${escapeLiteral(scramVerifier(input.runtimePassword))}`);
    await client.query(`GRANT culinaryos_app TO ${role}`);
    await client.query('INSERT INTO public.tenants (id, slug, name) VALUES ($1, $2, $3)', [tenantId, input.slug, input.restaurantName]);
    await client.query('INSERT INTO public.app_users (id, email, display_name) VALUES ($1, $2, $3)', [ownerId, input.ownerEmail, input.ownerDisplayName]);
    await client.query("INSERT INTO public.tenant_users (tenant_id, user_id, role) VALUES ($1, $2, 'owner')", [tenantId, ownerId]);
    await client.query('INSERT INTO public.staff_pins (tenant_id, user_id, pin_hash, pin_lookup_hash, display_name) VALUES ($1, $2, $3, $4, $5)', [
      tenantId, ownerId, hashPin(input.ownerPin), pinLookupHash(tenantId, input.ownerPin, input.pinLookupSecret), input.ownerDisplayName,
    ]);
    await client.query('COMMIT');
    return { tenantId, ownerId, runtimeRole: input.runtimeRole };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { discard = true; }
    if (error instanceof NativeBootstrapError) throw error;
    throw new NativeBootstrapError('Native bootstrap failed. Inspect private PostgreSQL diagnostics before retrying.');
  } finally {
    client.release(discard);
  }
}
