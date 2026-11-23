import * as path from 'node:path';
import {
  type MissionRecord,
  type ProductionFixApproval,
  type SpecialistSubtaskRequest,
  type TaskRecord,
  ValidationError,
} from '../types.js';
import {
  assertSafeIdentifier,
  atomicWriteJson,
  atomicWriteText,
  readJsonSafe,
  readTextSafe,
} from '../storage/atomic-fs.js';
import { withStoreLock } from '../storage/lock.js';
import { BudgetController, type BudgetStatus } from '../budget/budget-controller.js';
import { GovernanceGuard } from '../governance/permissions.js';
import {
  type CompetitorComparisonPayload,
  type DefectPayload,
  type DifferentiationOpportunityPayload,
  type EvidencePayload,
  type FeatureInventoryPayload,
  type FixRegressionPayload,
  type LedgerEntry,
  type MissingCapabilityPayload,
  type PositiveFindingPayload,
  type RecommendationPayload,
  type UsabilityDifficultyPayload,
} from './categories.js';
import { IntelligenceLedger } from './intelligence-ledger.js';

export const SUMMARY_MARKER_START = '<!-- AGENT_CENTER_SUMMARY_START -->';
export const SUMMARY_MARKER_END = '<!-- AGENT_CENTER_SUMMARY_END -->';

function neutralizeSummaryMarkers(text: string): string {
  return text.replace(/<!--/g, '&lt;!--').replace(/-->/g, '--&gt;');
}

function truncateUtf8Codepoints(text: string, maxBytes: number): string {
  if (maxBytes <= 0) {
    return '';
  }
  let used = 0;
  let out = '';
  for (const ch of text) {
    const chBytes = Buffer.byteLength(ch, 'utf8');
    if (used + chBytes > maxBytes) {
      break;
    }
    out += ch;
    used += chBytes;
  }
  return out;
}

function truncateUtf8WithSuffix(text: string, maxBytes: number): string {
  if (!Number.isFinite(maxBytes) || maxBytes < 0) {
    throw new ValidationError('exportMarkdown maxBytes must be a finite non-negative number');
  }
  if (maxBytes === 0) {
    return '';
  }
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) {
    return text;
  }
  const suffix = '\n...(truncated)\n';
  const suffixBytes = Buffer.byteLength(suffix, 'utf8');
  if (maxBytes <= suffixBytes) {
    return truncateUtf8Codepoints(text, maxBytes);
  }
  return truncateUtf8Codepoints(text, maxBytes - suffixBytes) + suffix;
}

export interface DashboardSnapshot {
  generated_at: string;
  mission: MissionRecord;
  live_operations: {
    active_tasks: TaskRecord[];
    pending_tasks: TaskRecord[];
    paused_tasks: TaskRecord[];
    blocked_tasks: TaskRecord[];
    failed_tasks: TaskRecord[];
    completed_tasks: TaskRecord[];
    pending_subtask_requests: SpecialistSubtaskRequest[];
  };
  product_quality: {
    features_count: number;
    feature_inventory: LedgerEntry<'feature_inventory'>[];
    positive_findings_count: number;
    defects_by_severity: Record<'blocker' | 'high' | 'medium' | 'low', number>;
    defects: LedgerEntry<'defects'>[];
    usability_difficulties_count: number;
    average_usability_scores: {
      usability: number;
      clarity: number;
      efficiency: number;
      reliability: number;
      business_value: number;
    } | null;
    missing_capabilities: LedgerEntry<'missing_capabilities'>[];
    fix_regressions: LedgerEntry<'fix_regression'>[];
  };
  competitive_intelligence: {
    comparisons: LedgerEntry<'competitor_comparisons'>[];
    differentiation_opportunities: LedgerEntry<'differentiation_opportunities'>[];
  };
  resource_usage: BudgetStatus;
  approvals_decisions: {
    recommendations: LedgerEntry<'recommendations'>[];
    production_fix_approvals: ProductionFixApproval[];
    pending_subtask_requests: SpecialistSubtaskRequest[];
  };
  evidence: LedgerEntry<'evidence'>[];
}

export interface ExportMarkdownOptions {
  maxBytes?: number | undefined;
  includeEvidenceLinks?: boolean | undefined;
}

export class LedgerExporter {
  private readonly dataDir: string;
  private readonly ledger: IntelligenceLedger;
  private readonly budget: BudgetController;
  private readonly governance: GovernanceGuard;

  constructor(
    dataDir: string,
    deps?: {
      ledger?: IntelligenceLedger | undefined;
      budget?: BudgetController | undefined;
      governance?: GovernanceGuard | undefined;
    },
  ) {
    this.dataDir = dataDir;
    this.governance = deps?.governance ?? new GovernanceGuard(dataDir);
    this.ledger = deps?.ledger ?? new IntelligenceLedger(dataDir, this.governance);
    this.budget = deps?.budget ?? new BudgetController(dataDir, this.ledger);
  }

  private missionDir(missionId: string): string {
    assertSafeIdentifier(missionId, 'mission_id');
    return path.join(this.dataDir, 'missions', missionId);
  }

  public async exportJsonSnapshot(
    missionId: string,
    opts?: { persist?: boolean | undefined },
  ): Promise<DashboardSnapshot> {
    const mission = await readJsonSafe<MissionRecord | null>(
      path.join(this.missionDir(missionId), 'mission.json'),
      null,
    );
    if (!mission) {
      throw new Error(`Mission "${missionId}" not found`);
    }

    const tasksMap = await readJsonSafe<Record<string, TaskRecord>>(
      path.join(this.missionDir(missionId), 'tasks.json'),
      {},
    );
    const tasks = Object.values(tasksMap);

    const requestsMap = await readJsonSafe<Record<string, SpecialistSubtaskRequest>>(
      path.join(this.missionDir(missionId), 'delegation_requests.json'),
      {},
    );
    const pendingRequests = Object.values(requestsMap).filter(
      (r) => r.status === 'pending_approval',
    );

    const { entries } = await this.ledger.query({ mission_id: missionId });
    const features = entries.filter(
      (e): e is LedgerEntry<'feature_inventory'> => e.category === 'feature_inventory',
    );
    const positives = entries.filter(
      (e): e is LedgerEntry<'positive_findings'> => e.category === 'positive_findings',
    );
    const defects = entries.filter(
      (e): e is LedgerEntry<'defects'> => e.category === 'defects',
    );
    const usability = entries.filter(
      (e): e is LedgerEntry<'usability_difficulties'> => e.category === 'usability_difficulties',
    );
    const missingCaps = entries.filter(
      (e): e is LedgerEntry<'missing_capabilities'> => e.category === 'missing_capabilities',
    );
    const comparisons = entries.filter(
      (e): e is LedgerEntry<'competitor_comparisons'> => e.category === 'competitor_comparisons',
    );
    const diffs = entries.filter(
      (e): e is LedgerEntry<'differentiation_opportunities'> =>
        e.category === 'differentiation_opportunities',
    );
    const recommendations = entries.filter(
      (e): e is LedgerEntry<'recommendations'> => e.category === 'recommendations',
    );
    const evidence = entries.filter(
      (e): e is LedgerEntry<'evidence'> => e.category === 'evidence',
    );
    const fixRegressions = entries.filter(
      (e): e is LedgerEntry<'fix_regression'> => e.category === 'fix_regression',
    );

    const defectsBySeverity: Record<'blocker' | 'high' | 'medium' | 'low', number> = {
      blocker: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const d of defects) {
      const sev = (d.payload as DefectPayload).severity;
      if (Object.hasOwn(defectsBySeverity, sev)) {
        defectsBySeverity[sev] += 1;
      }
    }

    let avgUsability: DashboardSnapshot['product_quality']['average_usability_scores'] = null;
    if (usability.length > 0) {
      const sum = { usability: 0, clarity: 0, efficiency: 0, reliability: 0, business_value: 0 };
      for (const u of usability) {
        const s = (u.payload as UsabilityDifficultyPayload).usability_scores;
        sum.usability += s.usability;
        sum.clarity += s.clarity;
        sum.efficiency += s.efficiency;
        sum.reliability += s.reliability;
        sum.business_value += s.business_value;
      }
      const n = usability.length;
      avgUsability = {
        usability: Number((sum.usability / n).toFixed(2)),
        clarity: Number((sum.clarity / n).toFixed(2)),
        efficiency: Number((sum.efficiency / n).toFixed(2)),
        reliability: Number((sum.reliability / n).toFixed(2)),
        business_value: Number((sum.business_value / n).toFixed(2)),
      };
    }

    const budgetStatus = await this.budget.getBudgetStatus(missionId);
    const approvals = await this.governance.listApprovals(missionId);

    const snapshot: DashboardSnapshot = {
      generated_at: new Date().toISOString(),
      mission,
      live_operations: {
        active_tasks: tasks.filter((t) => t.status === 'in_progress'),
        pending_tasks: tasks.filter((t) => t.status === 'pending' || t.status === 'pending_approval'),
        paused_tasks: tasks.filter((t) => t.status === 'paused'),
        blocked_tasks: tasks.filter((t) => t.status === 'blocked'),
        failed_tasks: tasks.filter((t) => t.status === 'failed'),
        completed_tasks: tasks.filter((t) => t.status === 'completed'),
        pending_subtask_requests: pendingRequests,
      },
      product_quality: {
        features_count: features.length,
        feature_inventory: features as LedgerEntry<'feature_inventory'>[],
        positive_findings_count: positives.length,
        defects_by_severity: defectsBySeverity,
        defects: defects as LedgerEntry<'defects'>[],
        usability_difficulties_count: usability.length,
        average_usability_scores: avgUsability,
        missing_capabilities: missingCaps as LedgerEntry<'missing_capabilities'>[],
        fix_regressions: fixRegressions as LedgerEntry<'fix_regression'>[],
      },
      competitive_intelligence: {
        comparisons: comparisons as LedgerEntry<'competitor_comparisons'>[],
        differentiation_opportunities: diffs as LedgerEntry<'differentiation_opportunities'>[],
      },
      resource_usage: budgetStatus,
      approvals_decisions: {
        recommendations: recommendations as LedgerEntry<'recommendations'>[],
        production_fix_approvals: approvals,
        pending_subtask_requests: pendingRequests,
      },
      evidence: evidence as LedgerEntry<'evidence'>[],
    };

    if (opts?.persist) {
      await atomicWriteJson(
        path.join(this.missionDir(missionId), 'exports', 'dashboard-snapshot.json'),
        snapshot,
      );
    }

    return snapshot;
  }

  public async exportMarkdown(
    missionId: string,
    options?: ExportMarkdownOptions,
  ): Promise<string> {
    const snap = await this.exportJsonSnapshot(missionId);
    const dateStr = snap.generated_at.slice(0, 10);
    const includeEvidence = options?.includeEvidenceLinks ?? true;

    const lines: string[] = [
      `## ${dateStr} ${neutralizeSummaryMarkers(snap.mission.title)} (${neutralizeSummaryMarkers(snap.mission.mission_id)}) — ${snap.mission.status}`,
      `- Status: ${snap.mission.status} (Budget: $${snap.resource_usage.spent_usd.toFixed(4)} / $${snap.resource_usage.max_mission_usd.toFixed(2)}, State: ${snap.resource_usage.state})`,
      `- Key Results:`,
      `  1. **Tasks:** ${snap.live_operations.active_tasks.length} active, ${snap.live_operations.completed_tasks.length} completed, ${snap.live_operations.failed_tasks.length} failed, ${snap.live_operations.pending_tasks.length} pending`,
      `  2. **Quality Findings:** ${snap.product_quality.features_count} features inventoried, ${snap.product_quality.positive_findings_count} positive findings, ${snap.product_quality.defects.length} defects (blocker=${snap.product_quality.defects_by_severity.blocker}, high=${snap.product_quality.defects_by_severity.high}, medium=${snap.product_quality.defects_by_severity.medium}, low=${snap.product_quality.defects_by_severity.low})`,
      `  3. **Competitive & Value:** ${snap.competitive_intelligence.comparisons.length} competitor comparisons, ${snap.competitive_intelligence.differentiation_opportunities.length} differentiation opportunities, ${snap.product_quality.missing_capabilities.length} missing capabilities`,
      `  4. **Resource Honesty:** Metered actual=$${snap.resource_usage.metered_actual_usd.toFixed(4)}, Metered estimated=$${snap.resource_usage.metered_estimated_usd.toFixed(4)}, Subscription estimated=$${snap.resource_usage.subscription_estimated_usd.toFixed(4)}, Remaining operational=$${snap.resource_usage.remaining_operational_usd.toFixed(4)}`,
      `  5. **Approvals & Recommendations:** ${snap.approvals_decisions.recommendations.length} recommendations, ${snap.approvals_decisions.production_fix_approvals.length} owner approvals, ${snap.product_quality.fix_regressions.length} fix/regression records`,
    ];

    if (snap.product_quality.defects.length > 0) {
      lines.push(`- Defects Recorded:`);
      for (const d of snap.product_quality.defects) {
        const p = d.payload as DefectPayload;
        lines.push(`  - [${p.severity.toUpperCase()}] ${neutralizeSummaryMarkers(p.title)} (${d.entry_id})`);
      }
    }

    if (includeEvidence && snap.evidence.length > 0) {
      lines.push(`- Verification Evidence:`);
      for (const ev of snap.evidence) {
        const p = ev.payload as EvidencePayload;
        lines.push(
          `  - \`${neutralizeSummaryMarkers(p.kind)}\` ${neutralizeSummaryMarkers(p.relative_path)} (sha256: ${neutralizeSummaryMarkers(p.sha256.slice(0, 12))})`,
        );
      }
    }

    let markdown = neutralizeSummaryMarkers(`${lines.join('\n')}\n`);

    if (options?.maxBytes !== undefined) {
      markdown = truncateUtf8WithSuffix(markdown, options.maxBytes);
    }

    return markdown;
  }

  public async writeMissionMarkdownReport(
    missionId: string,
    options?: ExportMarkdownOptions,
  ): Promise<string> {
    const md = await this.exportMarkdown(missionId, options);
    const outPath = path.join(this.missionDir(missionId), 'exports', 'report.md');
    await atomicWriteText(outPath, md);
    return outPath;
  }

  public async syncSharedLedgerSummary(
    missionId: string,
    sharedLedgerPath: string,
    options?: ExportMarkdownOptions,
  ): Promise<void> {
    const resolvedTarget = path.resolve(sharedLedgerPath);
    const rawBody = (await this.exportMarkdown(missionId, options)).trim();
    const summaryBody = neutralizeSummaryMarkers(rawBody);
    const boundedBlock = `${SUMMARY_MARKER_START}\n${summaryBody}\n${SUMMARY_MARKER_END}`;

    await withStoreLock(this.dataDir, `sync_md_${resolvedTarget}`, async () => {
      const existing = await readTextSafe(resolvedTarget);
      if (existing === null) {
        await atomicWriteText(resolvedTarget, `# CulinaryOS shared AI ledger\n\n${boundedBlock}\n`);
        return;
      }

      const startIdx = existing.indexOf(SUMMARY_MARKER_START);
      const endIdx =
        startIdx !== -1
          ? existing.indexOf(SUMMARY_MARKER_END, startIdx + SUMMARY_MARKER_START.length)
          : -1;

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const before = existing.slice(0, startIdx);
        const after = existing.slice(endIdx + SUMMARY_MARKER_END.length);
        const updated = `${before}${boundedBlock}${after}`;
        await atomicWriteText(resolvedTarget, updated);
        return;
      }

      // Insert after top-level `# ...` heading if present, otherwise prepend cleanly
      const firstNewline = existing.indexOf('\n');
      if (existing.startsWith('# ') && firstNewline !== -1) {
        const heading = existing.slice(0, firstNewline + 1);
        const rest = existing.slice(firstNewline + 1);
        const updated = `${heading}\n${boundedBlock}\n${rest.startsWith('\n') ? rest.slice(1) : rest}`;
        await atomicWriteText(resolvedTarget, updated);
      } else {
        await atomicWriteText(resolvedTarget, `${boundedBlock}\n\n${existing}`);
      }
    });
  }
}

// Re-export payload helper types used by exporters if needed
export type {
  CompetitorComparisonPayload,
  DifferentiationOpportunityPayload,
  FeatureInventoryPayload,
  FixRegressionPayload,
  MissingCapabilityPayload,
  PositiveFindingPayload,
  RecommendationPayload,
};
