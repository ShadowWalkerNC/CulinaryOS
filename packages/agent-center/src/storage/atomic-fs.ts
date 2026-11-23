import { randomBytes } from 'node:crypto';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { AGENT_CENTER_DEFAULTS, type ActorContext, CorruptStoreError, ValidationError } from '../types.js';

const SAFE_IDENTIFIER_RE = /^[A-Za-z0-9._-]+$/;
const STRICT_ISO_8601_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-](\d{2}):(\d{2}))$/;

export function assertValidActorContext(actor: ActorContext): string {
  if (
    !actor ||
    typeof actor !== 'object' ||
    typeof actor.agent !== 'string' ||
    actor.agent.trim().length === 0
  ) {
    throw new ValidationError('actor.agent must be a non-empty string');
  }
  return actor.agent.trim();
}

export function parseStrictIsoDateMs(val: unknown, field: string): number {
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new ValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }
  const match = STRICT_ISO_8601_RE.exec(val);
  if (!match) {
    throw new ValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const tzHour = match[9] !== undefined ? Number(match[9]) : 0;
  const tzMinute = match[10] !== undefined ? Number(match[10]) : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59 ||
    tzHour > 23 ||
    tzMinute > 59
  ) {
    throw new ValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }

  const cal = new Date(0);
  cal.setUTCFullYear(year, month - 1, day);
  cal.setUTCHours(hour, minute, second, 0);
  if (
    cal.getUTCFullYear() !== year ||
    cal.getUTCMonth() !== month - 1 ||
    cal.getUTCDate() !== day ||
    cal.getUTCHours() !== hour ||
    cal.getUTCMinutes() !== minute ||
    cal.getUTCSeconds() !== second
  ) {
    throw new ValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }

  const parsedMs = Date.parse(val);
  if (Number.isNaN(parsedMs) || !Number.isFinite(parsedMs)) {
    throw new ValidationError(`${field} must be a valid ISO-8601 timestamp`);
  }
  return parsedMs;
}

export function assertValidIsoDate(val: unknown, field: string): string {
  parseStrictIsoDateMs(val, field);
  return val as string;
}

export function assertSafeIdentifier(id: string, label: string): string {
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    id.startsWith('.') ||
    id.includes('..') ||
    id.includes('/') ||
    id.includes('\\') ||
    !SAFE_IDENTIFIER_RE.test(id)
  ) {
    throw new ValidationError(
      `Invalid ${label} "${String(id)}": must match ^[A-Za-z0-9._-]+$ without leading ".", "..", "/", or "\\"`,
    );
  }
  return id;
}

let tempCounter = 0;

const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

export interface AtomicWriteOptions {
  maxRenameAttempts?: number | undefined;
  baseDelayMs?: number | undefined;
  renameFn?: ((fromPath: string, toPath: string) => Promise<void>) | undefined;
}

export function resolveDataDir(explicitDir?: string): string {
  const trimmedExplicit = explicitDir?.trim();
  if (trimmedExplicit) {
    return path.resolve(trimmedExplicit);
  }
  const envDir = process.env[AGENT_CENTER_DEFAULTS.DATA_DIR_ENV]?.trim();
  if (envDir) {
    return path.resolve(envDir);
  }
  return path.resolve(process.cwd(), AGENT_CENTER_DEFAULTS.DEFAULT_DATA_DIR);
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function mkTempDataDir(
  prefix = 'agent-center-test-',
  fallbackBaseDir?: string,
): Promise<string> {
  const candidates = [
    os.tmpdir(),
    fallbackBaseDir ? path.join(fallbackBaseDir, '.tmp') : undefined,
    path.join(process.cwd(), '.tmp'),
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);

  let lastErr: unknown;
  for (const base of candidates) {
    try {
      await ensureDir(base);
      const created = await fs.mkdtemp(path.join(base, prefix));
      return created;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to create temporary data directory');
}

export function stripUtf8Bom(raw: string): string {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

export async function readTextSafe(filePath: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return stripUtf8Bom(raw);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  const raw = await readTextSafe(filePath);
  if (raw === null) {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CorruptStoreError(filePath, 'JSON store file is empty');
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new CorruptStoreError(filePath, `Invalid JSON: ${msg}`);
  }
}

export async function readJsonlSafe<T>(filePath: string): Promise<T[]> {
  const raw = await readTextSafe(filePath);
  if (raw === null) {
    return [];
  }
  const results: T[] = [];
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';
    if (line.length === 0) {
      continue;
    }
    try {
      results.push(JSON.parse(line) as T);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CorruptStoreError(filePath, `Invalid JSONL at line ${i + 1}: ${msg}`);
    }
  }
  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function renameWithRetry(
  tmpPath: string,
  targetPath: string,
  options?: AtomicWriteOptions,
): Promise<void> {
  const maxAttempts = Math.max(1, options?.maxRenameAttempts ?? 8);
  const baseDelayMs = Math.max(1, options?.baseDelayMs ?? 10);
  const renameFn = options?.renameFn ?? ((src: string, dst: string) => fs.rename(src, dst));

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await renameFn(tmpPath, targetPath);
      return;
    } catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (!code || !RETRYABLE_RENAME_CODES.has(code) || attempt === maxAttempts) {
        throw err;
      }
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = Math.min(250, baseDelayMs * Math.pow(2, attempt - 1) + jitter);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function bestEffortDirSync(dirPath: string): Promise<void> {
  if (process.platform === 'win32') {
    return;
  }
  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(dirPath, 'r');
    await handle.sync();
  } catch {
    // Directory fsync is unsupported on some filesystems; best-effort only.
  } finally {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
  }
}

export async function atomicWriteText(
  filePath: string,
  content: string,
  options?: AtomicWriteOptions,
): Promise<void> {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  await ensureDir(dir);

  tempCounter = (tempCounter + 1) % 1_000_000_000;
  const randHex = randomBytes(6).toString('hex');
  const tmpPath = `${resolved}.${process.pid}.${tempCounter}.${randHex}.tmp`;

  let handle: fs.FileHandle | undefined;
  let renamed = false;
  try {
    handle = await fs.open(tmpPath, 'w', 0o600);
    await handle.writeFile(content, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;

    await renameWithRetry(tmpPath, resolved, options);
    renamed = true;
    await bestEffortDirSync(dir);
  } finally {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
    if (!renamed) {
      await fs.unlink(tmpPath).catch(() => undefined);
    }
  }
}

export async function atomicWriteJson(
  filePath: string,
  data: unknown,
  options?: AtomicWriteOptions,
): Promise<void> {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  await atomicWriteText(filePath, serialized, options);
}

export async function appendJsonl(filePath: string, entry: unknown): Promise<void> {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  await ensureDir(dir);
  const line = `${JSON.stringify(entry)}\n`;

  let handle: fs.FileHandle | undefined;
  try {
    handle = await fs.open(resolved, 'a', 0o600);
    await handle.writeFile(line, 'utf8');
    await handle.sync();
  } finally {
    if (handle) {
      await handle.close().catch(() => undefined);
    }
  }
}

export function fileExistsSync(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}

export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString('hex');
  return `${prefix}-${ts}-${rand}`;
}
