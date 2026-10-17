/**
 * Append-only audit log (JSONL). All entries pass through redaction.
 * Safe to disable file output for tests by omitting the path.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AuditEntry } from '../schemas/types.ts';
import { redact } from './redact.ts';

export interface AuditInput {
  actor: string;
  action: string;
  skillId?: string;
  approvalId?: string;
  ok: boolean;
  detail?: Record<string, unknown>;
}

export class AuditLog {
  private memory: AuditEntry[] = [];
  constructor(private filePath?: string) {}

  record(input: AuditInput): AuditEntry {
    const entry: AuditEntry = redact({
      ts: new Date().toISOString(),
      ...input,
    });
    this.memory.push(entry);
    if (this.filePath) {
      mkdirSync(dirname(this.filePath), { recursive: true });
      appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
    }
    return entry;
  }

  /** In-memory entries (useful for tests and local inspection). */
  entries(): AuditEntry[] {
    return [...this.memory];
  }
}
