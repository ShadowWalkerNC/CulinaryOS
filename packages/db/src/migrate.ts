// ============================================================
// CulinaryOS — Owned migration runner (fresh PostgreSQL, no Supabase)
// Ordered, checksummed, transactional per file, advisory-locked.
// ============================================================

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool } from 'pg';

export interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
  appliedAt: string;
}

export interface MigrateOptions {
  dir?: string;
}

/** Session-level advisory lock key serializing migration runs. */
export const MIGRATION_ADVISORY_LOCK_KEY = '734512098776543211';

const FILE_RE = /^(\d{3})_([a-z0-9_]+)\.sql$/;

export function checksumSql(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export function defaultMigrationsDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
}

export function listMigrationFiles(dir: string): MigrationFile[] {
  const entries = readdirSync(dir).filter((f) => FILE_RE.test(f)).sort();
  const seen = new Set<string>();
  return entries.map((filename) => {
    const match = FILE_RE.exec(filename);
    if (!match) throw new Error(`Invalid migration filename: ${filename}`);
    const [, version, name] = match;
    if (version === undefined || name === undefined) {
      throw new Error(`Invalid migration filename: ${filename}`);
    }
    if (seen.has(version)) throw new Error(`Duplicate migration version: ${version}`);
    seen.add(version);
    const sql = readFileSync(join(dir, filename), 'utf8');
    if (!sql.trim()) throw new Error(`Empty migration file: ${filename}`);
    return { version, name, filename, sql, checksum: checksumSql(sql) };
  });
}

/**
 * Apply pending migrations in filename order. Each file runs in its own
 * transaction; applied files are skipped unless their checksum drifted, which
 * is a hard error. Holds a session advisory lock for the whole run.
 */
export async function applyMigrations(pool: Pool, options: MigrateOptions = {}): Promise<AppliedMigration[]> {
  const dir = options.dir ?? defaultMigrationsDir();
  const files = listMigrationFiles(dir);
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1::bigint)', [MIGRATION_ADVISORY_LOCK_KEY]);
    try {
      await client.query(
        `CREATE TABLE IF NOT EXISTS public.schema_migrations (
          version    text PRIMARY KEY,
          name       text NOT NULL,
          checksum   text NOT NULL,
          applied_by text NOT NULL DEFAULT current_user,
          applied_at timestamptz NOT NULL DEFAULT now()
        )`,
      );
      const applied = await client.query<{ version: string; checksum: string }>(
        'SELECT version, checksum FROM public.schema_migrations',
      );
      const appliedByVersion = new Map(applied.rows.map((r) => [r.version, r.checksum]));
      const newlyApplied: AppliedMigration[] = [];
      for (const file of files) {
        const existing = appliedByVersion.get(file.version);
        if (existing !== undefined) {
          if (existing !== file.checksum) {
            throw new Error(
              `Migration drift detected: ${file.filename} checksum changed ` +
                `(applied ${existing}, file ${file.checksum}). ` +
                'Migrations are immutable; add a new migration instead.',
            );
          }
          continue;
        }
        await client.query('BEGIN');
        try {
          await client.query(file.sql);
          const inserted = await client.query<{ applied_at: string }>(
            'INSERT INTO public.schema_migrations(version, name, checksum) VALUES ($1, $2, $3) RETURNING applied_at',
            [file.version, file.name, file.checksum],
          );
          await client.query('COMMIT');
          newlyApplied.push({
            version: file.version,
            name: file.name,
            checksum: file.checksum,
            appliedAt: String(inserted.rows[0]?.applied_at ?? ''),
          });
        } catch (error) {
          try {
            await client.query('ROLLBACK');
          } catch {
            // Surface the migration failure, not the rollback failure.
          }
          throw error;
        }
      }
      return newlyApplied;
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [MIGRATION_ADVISORY_LOCK_KEY]);
      } catch {
        // Unlock best-effort; the session release frees it regardless.
      }
    }
  } finally {
    client.release();
  }
}
