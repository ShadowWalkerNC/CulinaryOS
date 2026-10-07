/**
 * Approval queue: pending approvals with optional TTL, optionally
 * persisted to a JSON file so CLI, API, and GUI share one inbox.
 * Risky writes pause here until a human approves or rejects.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ApprovalCategory, ApprovalRequest, RiskLevel } from '../schemas/types.ts';
import { redact } from './redact.ts';

let counter = 0;

function newId(): string {
  counter += 1;
  return `apr-${Date.now().toString(36)}-${counter.toString(36)}`;
}

export interface ApprovalInput {
  skillId: string;
  action: string;
  category: ApprovalCategory;
  risk: RiskLevel;
  summary: string;
  payload: Record<string, unknown>;
}

export class ApprovalQueue {
  private items = new Map<string, ApprovalRequest>();
  private ttlMs: number;
  private filePath?: string;
  /**
   * @param ttlMs pending approvals expire after this long (ms, 0 = never)
   * @param filePath optional JSON file for shared persistence
   */
  constructor(
    ttlMs = 0,
    filePath?: string,
  ) {
    this.ttlMs = ttlMs;
    this.filePath = filePath;
    if (filePath && existsSync(filePath)) {
      try {
        const saved = JSON.parse(readFileSync(filePath, 'utf8')) as ApprovalRequest[];
        for (const r of saved) this.items.set(r.id, r);
      } catch {
        // Corrupt file: start empty rather than crash.
      }
    }
  }

  private save(): void {
    if (!this.filePath) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify([...this.items.values()], null, 2));
  }

  request(input: ApprovalInput): ApprovalRequest {
    const req: ApprovalRequest = {
      id: newId(),
      skillId: input.skillId,
      action: input.action,
      category: input.category,
      risk: input.risk,
      summary: input.summary,
      payload: redact(input.payload),
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    this.items.set(req.id, req);
    this.save();
    return req;
  }

  decide(id: string, approved: boolean, decidedBy = 'human'): ApprovalRequest {
    const req = this.items.get(id);
    if (!req) throw new Error(`unknown approval: ${id}`);
    if (req.status !== 'pending') throw new Error(`approval ${id} already ${req.status}`);
    req.status = approved ? 'approved' : 'rejected';
    req.decidedAt = new Date().toISOString();
    req.decidedBy = decidedBy;
    this.save();
    return req;
  }

  get(id: string): ApprovalRequest | undefined {
    const req = this.items.get(id);
    if (req) this.sweepOne(req);
    return req;
  }

  pending(): ApprovalRequest[] {
    return [...this.items.values()].filter((r) => {
      this.sweepOne(r);
      return r.status === 'pending';
    });
  }

  private sweepOne(req: ApprovalRequest): void {
    if (this.ttlMs > 0 && req.status === 'pending') {
      const age = Date.now() - Date.parse(req.requestedAt);
      if (age > this.ttlMs) {
        req.status = 'expired';
        req.decidedAt = new Date().toISOString();
      }
    }
  }
}
