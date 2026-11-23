import {
  AGENT_CENTER_DEFAULTS,
  CircularDelegationError,
  ConcurrencyLimitError,
  DelegationDepthError,
  DuplicateTaskKeyError,
  type SpecialistSubtaskRequest,
  type TaskRecord,
  type TaskStatus,
  type TaskWriteScope,
  WriteConflictError,
} from '../types.js';

const ACTIVE_DEDUPE_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'pending_approval',
  'pending',
  'in_progress',
  'paused',
  'blocked',
  'escalated',
]);

const NON_TERMINAL_WRITE_STATUSES: ReadonlySet<TaskStatus> = new Set([
  'pending_approval',
  'pending',
  'in_progress',
  'paused',
  'blocked',
  'escalated',
]);

export function normalizeTaskKey(key: string): string {
  return key.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function assertNoCycle(
  tasks: Record<string, TaskRecord>,
  candidateParentId: string,
  candidateTaskId?: string,
): void {
  if (candidateTaskId && candidateParentId === candidateTaskId) {
    throw new CircularDelegationError(
      `Task "${candidateTaskId}" cannot declare itself as parent_task_id`,
    );
  }

  const visited = new Set<string>();
  if (candidateTaskId) {
    visited.add(candidateTaskId);
  }

  let currentId: string | null = candidateParentId;
  const maxSteps = Object.keys(tasks).length + 2;

  for (let step = 0; step < maxSteps && currentId !== null; step++) {
    if (visited.has(currentId)) {
      throw new CircularDelegationError(
        `Circular delegation chain detected involving task "${currentId}"`,
      );
    }
    visited.add(currentId);
    const parentRecord: TaskRecord | undefined = Object.hasOwn(tasks, currentId)
      ? tasks[currentId]
      : undefined;
    if (!parentRecord) {
      break;
    }
    currentId = parentRecord.parent_task_id;
  }
}

export function assertDelegationDepth(
  parentTask: TaskRecord,
  maxDepth: number = AGENT_CENTER_DEFAULTS.MAX_DELEGATION_DEPTH,
): number {
  const nextDepth = parentTask.delegation_depth + 1;
  if (nextDepth > maxDepth) {
    throw new DelegationDepthError(nextDepth, maxDepth);
  }
  return nextDepth;
}

export function assertNoDuplicateActiveKey(
  tasks: Record<string, TaskRecord>,
  missionId: string,
  activeTaskKey: string,
  ignoreTaskId?: string,
): void {
  const normalized = normalizeTaskKey(activeTaskKey);
  if (!normalized) {
    throw new DuplicateTaskKeyError(activeTaskKey, missionId);
  }
  for (const task of Object.values(tasks)) {
    if (ignoreTaskId && task.task_id === ignoreTaskId) {
      continue;
    }
    if (
      task.mission_id === missionId &&
      ACTIVE_DEDUPE_STATUSES.has(task.status) &&
      normalizeTaskKey(task.active_task_key) === normalized
    ) {
      throw new DuplicateTaskKeyError(activeTaskKey, missionId);
    }
  }
}

export function countInProgressTasks(tasks: Record<string, TaskRecord>): number {
  let count = 0;
  for (const task of Object.values(tasks)) {
    if (task.status === 'in_progress') {
      count += 1;
    }
  }
  return count;
}

export function assertConcurrencyWithinCap(
  tasks: Record<string, TaskRecord>,
  maxConcurrent: number = AGENT_CENTER_DEFAULTS.MAX_CONCURRENT_AGENTS,
): void {
  const activeCount = countInProgressTasks(tasks);
  if (activeCount >= maxConcurrent) {
    throw new ConcurrencyLimitError(activeCount, maxConcurrent);
  }
}

export function computeRetryDelayMs(
  retryNumber: number,
  baseDelayMs: number = AGENT_CENTER_DEFAULTS.RETRY_BASE_DELAY_MS,
  backoffFactor: number = AGENT_CENTER_DEFAULTS.RETRY_BACKOFF_FACTOR,
): number {
  const exponent = Math.max(0, retryNumber - 1);
  return baseDelayMs * Math.pow(backoffFactor, exponent);
}

export function normalizeOwnershipPath(rawPath: string): string {
  let normalized = rawPath.trim().replace(/\\/g, '/').replace(/\/+/g, '/');
  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (process.platform === 'win32') {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

function stripTrailingGlob(pattern: string): { base: string; recursive: boolean; singleDir: boolean } {
  if (pattern === '*' || pattern === '**' || pattern === '.') {
    return { base: '', recursive: true, singleDir: false };
  }
  if (pattern.endsWith('/**')) {
    return { base: pattern.slice(0, -3), recursive: true, singleDir: false };
  }
  if (pattern.endsWith('/*')) {
    return { base: pattern.slice(0, -2), recursive: false, singleDir: true };
  }
  return { base: pattern, recursive: false, singleDir: false };
}

function globMatchesLiteral(pattern: string, literalPath: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.__DOUBLE_STAR__.')
    .replace(/\*/g, '[^/]*')
    .replace(/\.__DOUBLE_STAR__\./g, '.*');
  const regex = new RegExp(`^${escaped}$`);
  return regex.test(literalPath);
}

export function pathsOverlap(pathA: string, pathB: string): boolean {
  const a = normalizeOwnershipPath(pathA);
  const b = normalizeOwnershipPath(pathB);
  if (!a || !b) {
    return false;
  }
  if (a === b || a === '*' || a === '**' || a === '.' || b === '*' || b === '**' || b === '.') {
    return true;
  }

  const infoA = stripTrailingGlob(a);
  const infoB = stripTrailingGlob(b);

  if (infoA.base === infoB.base) {
    return true;
  }

  // If either is a wildcard/glob pattern, test pattern-vs-literal & prefix containment
  if (a.includes('*') && globMatchesLiteral(a, b)) {
    return true;
  }
  if (b.includes('*') && globMatchesLiteral(b, a)) {
    return true;
  }

  // Directory / prefix overlap (e.g., 'packages/agent-center/src/**' vs 'packages/agent-center/src/runtime/x.ts')
  if (
    infoA.base.length > 0 &&
    (infoB.base === infoA.base || infoB.base.startsWith(`${infoA.base}/`))
  ) {
    if (!infoA.singleDir || !infoB.base.slice(infoA.base.length + 1).includes('/')) {
      return true;
    }
  }
  if (
    infoB.base.length > 0 &&
    (infoA.base === infoB.base || infoA.base.startsWith(`${infoB.base}/`))
  ) {
    if (!infoB.singleDir || !infoA.base.slice(infoB.base.length + 1).includes('/')) {
      return true;
    }
  }

  // If neither uses trailing /*, treat bare directory prefixes as overlapping with children
  if (!a.includes('*') && !b.includes('*')) {
    if (b.startsWith(`${a}/`) || a.startsWith(`${b}/`)) {
      return true;
    }
  }

  return false;
}

function hasIsolatedWorktree(scopeA: TaskWriteScope | undefined, scopeB: TaskWriteScope | undefined): boolean {
  const branchA = scopeA?.worktree_branch?.trim() ?? '';
  const pathA = scopeA?.worktree_path?.trim() ?? '';
  const branchB = scopeB?.worktree_branch?.trim() ?? '';
  const pathB = scopeB?.worktree_path?.trim() ?? '';

  if (!branchA || !pathA || !branchB || !pathB) {
    return false;
  }
  const normPathA = normalizeOwnershipPath(pathA);
  const normPathB = normalizeOwnershipPath(pathB);
  return branchA !== branchB && normPathA !== normPathB;
}

export function assertNoWriteConflict(
  tasks: Record<string, TaskRecord>,
  requests: Record<string, SpecialistSubtaskRequest>,
  candidate: {
    missionId: string;
    taskId?: string | undefined;
    requestId?: string | undefined;
    writeScope?: TaskWriteScope | undefined;
  },
): void {
  const scope = candidate.writeScope;
  if (!scope || scope.read_only === true) {
    return;
  }
  const candidatePaths = (scope.write_ownership_paths ?? []).filter(
    (p) => typeof p === 'string' && p.trim().length > 0,
  );
  if (candidatePaths.length === 0) {
    return;
  }

  for (const existing of Object.values(tasks)) {
    if (existing.mission_id !== candidate.missionId) {
      continue;
    }
    if (candidate.taskId && existing.task_id === candidate.taskId) {
      continue;
    }
    if (!NON_TERMINAL_WRITE_STATUSES.has(existing.status)) {
      continue;
    }
    const existingScope = existing.write_scope;
    if (!existingScope || existingScope.read_only === true) {
      continue;
    }
    const existingPaths = (existingScope.write_ownership_paths ?? []).filter(
      (p) => typeof p === 'string' && p.trim().length > 0,
    );
    if (existingPaths.length === 0) {
      continue;
    }
    if (hasIsolatedWorktree(scope, existingScope)) {
      continue;
    }

    for (const pA of candidatePaths) {
      for (const pB of existingPaths) {
        if (pathsOverlap(pA, pB)) {
          throw new WriteConflictError(
            `Write ownership conflict between candidate path "${pA}" and active task "${existing.task_id}" path "${pB}" (assign distinct worktree_branch + worktree_path or mark read_only)`,
          );
        }
      }
    }
  }

  for (const req of Object.values(requests)) {
    if (req.mission_id !== candidate.missionId || req.status !== 'pending_approval') {
      continue;
    }
    if (candidate.requestId && req.request_id === candidate.requestId) {
      continue;
    }
    const reqScope = req.write_scope;
    if (!reqScope || reqScope.read_only === true) {
      continue;
    }
    const reqPaths = (reqScope.write_ownership_paths ?? []).filter(
      (p) => typeof p === 'string' && p.trim().length > 0,
    );
    if (reqPaths.length === 0) {
      continue;
    }
    if (hasIsolatedWorktree(scope, reqScope)) {
      continue;
    }

    for (const pA of candidatePaths) {
      for (const pB of reqPaths) {
        if (pathsOverlap(pA, pB)) {
          throw new WriteConflictError(
            `Write ownership conflict between candidate path "${pA}" and pending subtask request "${req.request_id}" path "${pB}" (assign distinct worktree_branch + worktree_path or mark read_only)`,
          );
        }
      }
    }
  }
}
