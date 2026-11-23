import * as path from 'node:path';
import {
  type ActorContext,
  type AgentRole,
  EPISTEMIC_TAGS,
  type EpistemicTag,
  LEDGER_CATEGORIES,
  type LedgerCategory,
  STAGES,
  SelfVerificationDeniedError,
  type StageId,
  ValidationError,
} from '../types.js';
import {
  appendJsonl,
  assertSafeIdentifier,
  assertValidActorContext,
  atomicWriteJson,
  generateId,
  readJsonSafe,
  readJsonlSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';
import { GovernanceGuard, IMMUTABLE_LEDGER_CATEGORIES } from '../governance/permissions.js';
import {
  type AnyLedgerEntry,
  type DefectSeverity,
  type FixRegressionPayload,
  type LedgerEntry,
  type NewLedgerEntryInput,
  isLedgerCategory,
  validateLedgerPayload,
} from './categories.js';

export interface LedgerQueryFilter {
  mission_id: string;
  categories?: LedgerCategory[] | undefined;
  task_id?: string | undefined;
  stage?: StageId | undefined;
  actor_role?: AgentRole | undefined;
  severity?: DefectSeverity | undefined;
  epistemic_tag?: EpistemicTag | undefined;
  since?: string | undefined;
  until?: string | undefined;
  search?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface AnnotationInput<C extends LedgerCategory = LedgerCategory> {
  task_id: string;
  stage: StageId;
  category?: C | undefined;
  epistemic_tag: EpistemicTag;
  evidence_links: string[];
  payload: NewLedgerEntryInput<C>['payload'];
  mode: 'supersede' | 'challenge' | 'validate';
}

interface LedgerIndex {
  mission_id: string;
  total_entries: number;
  category_counts: Record<string, number>;
  updated_at: string;
}

export class IntelligenceLedger {
  private readonly dataDir: string;
  private readonly governance: GovernanceGuard;

  constructor(dataDir: string, governance?: GovernanceGuard) {
    this.dataDir = dataDir;
    this.governance = governance ?? new GovernanceGuard(dataDir);
  }

  private ledgerDir(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId, 'ledger');
  }

  private categoryPath(missionId: string, category: LedgerCategory): string {
    return path.join(this.ledgerDir(missionId), `${category}.jsonl`);
  }

  private indexPath(missionId: string): string {
    return path.join(this.ledgerDir(missionId), 'index.json');
  }

  public async append<C extends LedgerCategory>(
    actor: ActorContext,
    input: NewLedgerEntryInput<C>,
  ): Promise<LedgerEntry<C>> {
    const normalizedActorAgent = assertValidActorContext(actor);
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new ValidationError('Ledger entry input must be an object');
    }
    assertSafeIdentifier(input.mission_id, 'mission_id');
    if (typeof input.task_id !== 'string' || input.task_id.trim().length === 0) {
      throw new ValidationError('Ledger entry task_id must be a non-empty string');
    }
    if (!(STAGES as readonly string[]).includes(input.stage)) {
      throw new ValidationError(`Invalid ledger stage "${String(input.stage)}"`);
    }
    if (!(LEDGER_CATEGORIES as readonly string[]).includes(input.category)) {
      throw new ValidationError(`Invalid ledger category "${String(input.category)}"`);
    }
    if (!(EPISTEMIC_TAGS as readonly string[]).includes(input.epistemic_tag)) {
      throw new ValidationError(`Invalid epistemic_tag "${String(input.epistemic_tag)}"`);
    }
    if (!Array.isArray(input.evidence_links)) {
      throw new ValidationError('Ledger entry evidence_links must be an array');
    }

    try {
      validateLedgerPayload(input.category, input.payload);
    } catch (err) {
      if (input.category === 'fix_regression' && err instanceof ValidationError) {
        const defectId =
          typeof (input.payload as { defect_id?: unknown } | null)?.defect_id === 'string'
            ? (input.payload as { defect_id: string }).defect_id
            : undefined;
        await this.governance.recordAudit(
          input.mission_id,
          actor,
          'record_fix',
          'denied',
          err.message,
          defectId,
        );
      }
      throw err;
    }

    await this.governance.assertLedgerWriteAllowed(
      actor,
      input.mission_id,
      input.category,
      input.payload,
    );

    return withStoreLock(this.dataDir, `ledger_${input.mission_id}`, async () => {
      if (input.category === 'fix_regression') {
        const fixPayload = input.payload as FixRegressionPayload;
        if (fixPayload.retest_status === 'passed' || fixPayload.retest_status === 'failed') {
          const existingFixes = await readJsonlSafe<LedgerEntry<'fix_regression'>>(
            this.categoryPath(input.mission_id, 'fix_regression'),
          );
          const targetDefectId = fixPayload.defect_id.trim();
          const priorFixesForDefect = existingFixes.filter(
            (e) => e.payload.defect_id.trim() === targetDefectId,
          );
          const effectiveRetester = (fixPayload.retested_by ?? normalizedActorAgent).trim();
          const selfVerifiedFix = priorFixesForDefect.find((e) => {
            const entryFixedBy = e.payload.fixed_by.trim();
            if (entryFixedBy === effectiveRetester || entryFixedBy === normalizedActorAgent) {
              return true;
            }
            if (e.payload.retest_status === 'pending_retest') {
              const entryActorAgent = e.actor_agent.trim();
              if (
                entryActorAgent === effectiveRetester ||
                entryActorAgent === normalizedActorAgent
              ) {
                return true;
              }
            }
            return false;
          });
          if (selfVerifiedFix) {
            await this.governance.recordAudit(
              input.mission_id,
              actor,
              'verify_independent_retest',
              'denied',
              `Retester "${effectiveRetester}" / actor "${normalizedActorAgent}" matches fix author "${selfVerifiedFix.payload.fixed_by}" / "${selfVerifiedFix.actor_agent}"`,
              fixPayload.defect_id,
            );
            throw new SelfVerificationDeniedError(effectiveRetester);
          }
        }
      }

      const entry: LedgerEntry<C> = {
        entry_id: generateId('LED'),
        mission_id: input.mission_id,
        task_id: input.task_id,
        stage: input.stage,
        category: input.category,
        actor_agent: normalizedActorAgent,
        actor_role: actor.role,
        epistemic_tag: input.epistemic_tag,
        evidence_links: [...input.evidence_links],
        payload: input.payload,
        created_at: new Date().toISOString(),
        supersedes_entry_id: input.supersedes_entry_id ?? null,
        target_entry_id: input.target_entry_id ?? null,
      };

      await appendJsonl(this.categoryPath(input.mission_id, input.category), entry);

      const index = await readJsonSafe<LedgerIndex>(this.indexPath(input.mission_id), {
        mission_id: input.mission_id,
        total_entries: 0,
        category_counts: {},
        updated_at: entry.created_at,
      });
      index.total_entries += 1;
      index.category_counts[input.category] =
        (Object.hasOwn(index.category_counts, input.category)
          ? (index.category_counts[input.category] ?? 0)
          : 0) + 1;
      index.updated_at = entry.created_at;
      await atomicWriteJson(this.indexPath(input.mission_id), index);

      return entry;
    });
  }

  public async mutateEntry(
    actor: ActorContext,
    missionId: string,
    category: LedgerCategory,
    entryId: string,
  ): Promise<never> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    if (typeof category !== 'string' || !isLedgerCategory(category)) {
      throw new ValidationError(`Invalid ledger category "${String(category)}"`);
    }
    if (typeof entryId !== 'string' || entryId.trim().length === 0) {
      throw new ValidationError('entryId must be a non-empty string');
    }
    if (IMMUTABLE_LEDGER_CATEGORIES.has(category)) {
      return this.governance.assertImmutableEntryCannotBeMutated(
        actor,
        missionId,
        category,
        entryId,
      );
    }
    await this.governance.recordAudit(
      missionId,
      actor,
      'ledger_mutate_immutable',
      'denied',
      `Ledger is append-only; use annotateOrChallenge instead of mutating ${category}:${entryId}`,
      entryId,
    );
    throw new ValidationError(
      `Ledger is append-only; "${category}" entry "${entryId}" cannot be edited in place. Use annotateOrChallenge().`,
    );
  }

  public async deleteEntry(
    actor: ActorContext,
    missionId: string,
    category: LedgerCategory,
    entryId: string,
  ): Promise<never> {
    return this.mutateEntry(actor, missionId, category, entryId);
  }

  public async getEntryById(missionId: string, entryId: string): Promise<AnyLedgerEntry | null> {
    for (const category of LEDGER_CATEGORIES) {
      const entries = await readJsonlSafe<AnyLedgerEntry>(this.categoryPath(missionId, category));
      const found = entries.find((e) => e.entry_id === entryId);
      if (found) {
        return found;
      }
    }
    return null;
  }

  public async annotateOrChallenge<C extends LedgerCategory>(
    actor: ActorContext,
    missionId: string,
    targetEntryId: string,
    annotation: AnnotationInput<C>,
  ): Promise<LedgerEntry<C>> {
    assertValidActorContext(actor);
    assertSafeIdentifier(missionId, 'mission_id');
    if (typeof targetEntryId !== 'string' || targetEntryId.trim().length === 0) {
      throw new ValidationError('targetEntryId must be a non-empty string');
    }
    if (!annotation || typeof annotation !== 'object' || Array.isArray(annotation)) {
      throw new ValidationError('Ledger annotation must be an object');
    }
    const target = await this.getEntryById(missionId, targetEntryId);
    if (!target) {
      throw new ValidationError(
        `Target entry "${targetEntryId}" not found in mission "${missionId}"`,
      );
    }

    const category = (annotation.category ?? target.category) as C;
    return this.append(actor, {
      mission_id: missionId,
      task_id: annotation.task_id,
      stage: annotation.stage,
      category,
      epistemic_tag: annotation.epistemic_tag,
      evidence_links: annotation.evidence_links,
      payload: annotation.payload,
      supersedes_entry_id: annotation.mode === 'supersede' ? targetEntryId : null,
      target_entry_id: targetEntryId,
    });
  }

  public async query(
    filter: LedgerQueryFilter,
  ): Promise<{ entries: AnyLedgerEntry[]; total: number }> {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
      throw new ValidationError('Ledger query filter must be an object');
    }
    assertSafeIdentifier(filter.mission_id, 'mission_id');
    if (filter.search !== undefined && typeof filter.search !== 'string') {
      throw new ValidationError('Ledger query filter.search must be a string when provided');
    }
    if (filter.categories !== undefined) {
      if (!Array.isArray(filter.categories)) {
        throw new ValidationError('Ledger query filter.categories must be an array');
      }
      for (const cat of filter.categories) {
        if (typeof cat !== 'string' || !isLedgerCategory(cat)) {
          throw new ValidationError(`Invalid ledger category "${String(cat)}"`);
        }
      }
    }
    const targetCategories =
      filter.categories && filter.categories.length > 0 ? filter.categories : [...LEDGER_CATEGORIES];

    const all: AnyLedgerEntry[] = [];
    for (const cat of targetCategories) {
      const rows = await readJsonlSafe<AnyLedgerEntry>(
        this.categoryPath(filter.mission_id, cat),
      );
      all.push(...rows);
    }

    const searchLower = filter.search?.trim().toLowerCase();
    const filtered = all.filter((entry) => {
      if (filter.task_id && entry.task_id !== filter.task_id) return false;
      if (filter.stage && entry.stage !== filter.stage) return false;
      if (filter.actor_role && entry.actor_role !== filter.actor_role) return false;
      if (filter.epistemic_tag && entry.epistemic_tag !== filter.epistemic_tag) return false;
      if (filter.since && entry.created_at < filter.since) return false;
      if (filter.until && entry.created_at > filter.until) return false;
      if (filter.severity) {
        const sev = (entry.payload as { severity?: unknown }).severity;
        if (sev !== filter.severity) return false;
      }
      if (searchLower) {
        const haystack = JSON.stringify(entry).toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => a.created_at.localeCompare(b.created_at));

    const total = filtered.length;
    const offset = Math.max(0, filter.offset ?? 0);
    const limit = filter.limit !== undefined ? Math.max(0, filter.limit) : total;
    const entries = filtered.slice(offset, offset + limit);

    return { entries, total };
  }
}
