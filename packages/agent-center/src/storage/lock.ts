import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import * as path from 'node:path';
import { AGENT_CENTER_DEFAULTS, LockTimeoutError } from '../types.js';
import { ensureDir } from './atomic-fs.js';

export interface LockOptions {
  timeoutMs?: number | undefined;
  staleLockMs?: number | undefined;
  pollIntervalMs?: number | undefined;
}

interface LockFilePayload {
  pid: number;
  acquiredAt: number;
  nonce: string;
  key: string;
}

const inProcessQueues = new Map<string, Promise<void>>();

function canonicalLockKey(lockPath: string): string {
  const resolved = path.resolve(lockPath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function sanitizeKeyForFilename(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'default';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isPidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // EPERM means the process exists but belongs to another user/elevation level.
    return code === 'EPERM';
  }
}

async function enqueueInProcess<T>(canonicalKey: string, fn: () => Promise<T>): Promise<T> {
  const previous = inProcessQueues.get(canonicalKey) ?? Promise.resolve();
  let releaseNext!: () => void;
  const currentGate = new Promise<void>((resolve) => {
    releaseNext = resolve;
  });
  const tail = previous.then(() => currentGate);
  inProcessQueues.set(canonicalKey, tail);

  await previous;
  try {
    return await fn();
  } finally {
    releaseNext();
    if (inProcessQueues.get(canonicalKey) === tail) {
      inProcessQueues.delete(canonicalKey);
    }
  }
}

async function evictStaleGuardIfNeeded(guardPath: string, guardStaleMs: number): Promise<void> {
  try {
    const stat = await fs.stat(guardPath);
    const raw = await fs.readFile(guardPath, 'utf8').catch(() => '');
    let isDead = false;
    try {
      const parsed = JSON.parse(raw.trim()) as { pid?: unknown; acquiredAt?: unknown };
      if (typeof parsed.pid === 'number' && !isPidAlive(parsed.pid)) {
        isDead = true;
      }
    } catch {
      // Fall back to mtime age check
    }
    if (isDead || Date.now() - stat.mtimeMs > guardStaleMs) {
      const evictTmp = `${guardPath}.evict.${process.pid}.${randomBytes(6).toString('hex')}`;
      await fs.rename(guardPath, evictTmp).catch(() => undefined);
      await fs.unlink(evictTmp).catch(() => undefined);
    }
  } catch {
    // Ignore ENOENT or transient errors
  }
}

async function renameAndUnlinkStaleLock(lockPath: string): Promise<boolean> {
  const evictPath = `${lockPath}.evict.${process.pid}.${randomBytes(6).toString('hex')}`;
  try {
    await fs.rename(lockPath, evictPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return true;
    }
    return false;
  }
  await fs.unlink(evictPath).catch(() => undefined);
  return true;
}

async function tryEvictStaleLock(lockPath: string, staleLockMs: number): Promise<boolean> {
  const guardPath = `${lockPath}.evicting`;
  const guardStaleMs = Math.min(Math.max(staleLockMs, 1_000), 5_000);

  let guardHandle: fs.FileHandle | undefined;
  try {
    guardHandle = await fs.open(
      guardPath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY,
      0o600,
    );
    await guardHandle.writeFile(
      JSON.stringify({ pid: process.pid, acquiredAt: Date.now() }),
      'utf8',
    );
    await guardHandle.close();
    guardHandle = undefined;
  } catch (err) {
    if (guardHandle) {
      await guardHandle.close().catch(() => undefined);
    }
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') {
      await evictStaleGuardIfNeeded(guardPath, guardStaleMs);
    }
    return false;
  }

  try {
    let raw: string;
    let mtimeMs = 0;
    try {
      const stat = await fs.stat(lockPath);
      mtimeMs = stat.mtimeMs;
      raw = await fs.readFile(lockPath, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return true;
      }
      return false;
    }

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      // Another process may have just created the file before writing its payload.
      // Only evict an empty lockfile if its mtime is genuinely stale.
      if (Date.now() - mtimeMs > staleLockMs) {
        return await renameAndUnlinkStaleLock(lockPath);
      }
      return false;
    }

    let parsed: Partial<LockFilePayload> | null = null;
    try {
      parsed = JSON.parse(trimmed) as Partial<LockFilePayload>;
    } catch {
      if (Date.now() - mtimeMs > staleLockMs) {
        return await renameAndUnlinkStaleLock(lockPath);
      }
      return false;
    }

    const acquiredAt = typeof parsed.acquiredAt === 'number' ? parsed.acquiredAt : mtimeMs;
    const isAgeStale = Date.now() - acquiredAt > staleLockMs;
    const isDeadProcess = typeof parsed.pid === 'number' && !isPidAlive(parsed.pid);

    if (isAgeStale || isDeadProcess) {
      return await renameAndUnlinkStaleLock(lockPath);
    }
    return false;
  } finally {
    await fs.unlink(guardPath).catch(() => undefined);
  }
}

async function acquireFileLock(
  lockPath: string,
  key: string,
  options?: LockOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? AGENT_CENTER_DEFAULTS.DEFAULT_LOCK_TIMEOUT_MS;
  const staleLockMs = options?.staleLockMs ?? AGENT_CENTER_DEFAULTS.DEFAULT_STALE_LOCK_MS;
  const basePollMs = Math.max(5, options?.pollIntervalMs ?? 15);
  const nonce = randomBytes(8).toString('hex');
  const deadline = Date.now() + timeoutMs;

  await ensureDir(path.dirname(lockPath));

  while (true) {
    let handle: fs.FileHandle | undefined;
    try {
      handle = await fs.open(
        lockPath,
        fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY,
        0o600,
      );
      const payload: LockFilePayload = {
        pid: process.pid,
        acquiredAt: Date.now(),
        nonce,
        key,
      };
      await handle.writeFile(JSON.stringify(payload), 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      return nonce;
    } catch (err) {
      if (handle) {
        await handle.close().catch(() => undefined);
      }
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST' && code !== 'EPERM' && code !== 'EACCES') {
        throw err;
      }

      const evicted = await tryEvictStaleLock(lockPath, staleLockMs);
      if (evicted) {
        continue;
      }

      if (Date.now() >= deadline) {
        throw new LockTimeoutError(lockPath, timeoutMs);
      }

      const jitter = Math.floor(Math.random() * basePollMs);
      await sleep(basePollMs + jitter);
    }
  }
}

async function releaseFileLock(lockPath: string, nonce: string): Promise<void> {
  try {
    const raw = await fs.readFile(lockPath, 'utf8');
    const parsed = JSON.parse(raw.trim()) as Partial<LockFilePayload>;
    if (parsed.nonce === nonce) {
      await fs.unlink(lockPath);
    }
  } catch {
    // Lock already gone or replaced after timeout/eviction; do not unlink another owner's lock.
  }
}

export async function withStoreLock<T>(
  dataDir: string,
  lockKey: string,
  fn: () => Promise<T>,
  options?: LockOptions,
): Promise<T> {
  const locksDir = path.join(dataDir, 'locks');
  const lockPath = path.join(locksDir, `${sanitizeKeyForFilename(lockKey)}.lock`);
  const canonical = canonicalLockKey(lockPath);

  return enqueueInProcess(canonical, async () => {
    const nonce = await acquireFileLock(lockPath, lockKey, options);
    try {
      return await fn();
    } finally {
      await releaseFileLock(lockPath, nonce);
    }
  });
}
