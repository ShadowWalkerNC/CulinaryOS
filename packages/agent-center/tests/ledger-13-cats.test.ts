import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  type ActorContext,
  LEDGER_CATEGORIES,
  SUMMARY_MARKER_END,
  SUMMARY_MARKER_START,
  ValidationError,
  createAgentCenter,
  mkTempDataDir,
} from '../src/index.js';

const OWNER: ActorContext = { agent: 'nathaniel', role: 'owner' };
const ORCH: ActorContext = { agent: 'orch-1', role: 'orchestrator' };
const MUSE: ActorContext = { agent: 'muse-1', role: 'muse_visual_tester', provider: 'meta', model: 'muse-spark-1.3' };
const GEMINI: ActorContext = { agent: 'gemini-1', role: 'gemini_ux_auditor', provider: 'google', model: 'gemini-4-argon-high' };
const CLAUDE: ActorContext = { agent: 'claude-1', role: 'claude_tech_auditor', provider: 'anthropic', model: 'claude-opus-5-5-high' };
const CODEX: ActorContext = { agent: 'codex-1', role: 'codex_engineer', provider: 'openai', model: 'gpt-6.1-sol' };

describe('Shared Persistent Intelligence Ledger (13 Categories & Exporters)', () => {
  it('writes, queries, annotates, and exports all 13 categories plus bounded AI_SHARED_LEDGER sync', async () => {
    const dir = await mkTempDataDir('ac-ledger-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-LEDGER-01',
        title: 'POS Onboarding & KDS Verification',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'onboarding-e2e',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Run onboarding browser test',
        acceptance_criteria: ['User completes POS onboarding'],
        budget_allocation_usd: 4.0,
      });

      const approval = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Fix empty menu crash on POS checkout',
        target_defect_ids: ['DEF-001'],
        worktree_branch: 'fix/pos-empty-menu',
      });

      // 1. feature_inventory
      await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_1_DISCOVERY',
        category: 'feature_inventory',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          feature_id: 'pos-checkout',
          app_surface: 'apps/pos',
          tested_perspectives: ['first_time_user', 'staff'],
          coverage_status: 'verified',
        },
      });

      // 2. positive_findings
      await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'positive_findings',
        epistemic_tag: 'measurement',
        evidence_links: ['evidence/pos-flow.png'],
        payload: {
          workflow: 'Quick order send to KDS',
          perspective: 'staff',
          summary: 'Order reached KDS in under 300ms',
          measured_metrics: { duration_ms: 280, clicks: 4, steps: 3 },
        },
      });

      // 3. defects
      const defectEntry = await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_4_EVALUATION',
        category: 'defects',
        epistemic_tag: 'observation',
        evidence_links: ['evidence/empty-menu-crash.png'],
        payload: {
          defect_id: 'DEF-001',
          title: 'Checkout crashes when cart is empty',
          severity: 'high',
          repro_steps: ['Open POS', 'Click Checkout with 0 items'],
          expected: 'Disabled checkout button or friendly warning',
          actual: 'Unhandled error boundary',
          immutable_evidence: true,
          validation_status: 'unverified',
        },
      });

      // 4. usability_difficulties
      await ac.ledger.append(GEMINI, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_4_EVALUATION',
        category: 'usability_difficulties',
        epistemic_tag: 'observation',
        evidence_links: ['evidence/onboarding-step2.png'],
        payload: {
          workflow: 'Initial tax setup',
          perspective: 'first_time_user',
          friction_type: 'terminology',
          detail: 'Tax inclusive toggle lacks plain-language helper text',
          usability_scores: {
            usability: 7,
            clarity: 5,
            efficiency: 7,
            reliability: 8,
            business_value: 9,
          },
        },
      });

      // 5. missing_capabilities
      await ac.ledger.append(GEMINI, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_4_EVALUATION',
        category: 'missing_capabilities',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          capability: 'Offline Stripe Terminal queue indicator',
          operational_problem: 'Staff cannot tell when offline card payments are queued',
          claimed_vs_actual: 'stubbed',
        },
      });

      // 6. competitor_comparisons
      await ac.ledger.append(GEMINI, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_5_INDEPENDENT_REVIEW',
        category: 'competitor_comparisons',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          competitor: 'Toast',
          workflow: 'Menu 86ing from KDS',
          verdict: 'culinaryos_advantage',
          summary: 'CulinaryOS propagates 86 state across POS and KDS faster with flat per-location pricing',
          sources: ['https://pos.toasttab.com/pricing'],
        },
      });

      // 7. differentiation_opportunities
      await ac.ledger.append(GEMINI, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_5_INDEPENDENT_REVIEW',
        category: 'differentiation_opportunities',
        epistemic_tag: 'opinion',
        evidence_links: [],
        payload: {
          opportunity: 'Food-truck instant offline QR + KDS bundle',
          target_persona: 'Food truck owner',
          defensibility_rationale: 'Rust standalone SQLite server runs locally without cloud lock-in',
          impact_score: 9,
        },
      });

      // 8. recommendations
      await ac.ledger.append(CLAUDE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_6_REPORTING',
        category: 'recommendations',
        epistemic_tag: 'opinion',
        evidence_links: [],
        payload: {
          priority: 'P1',
          action: 'fix',
          title: 'Disable empty checkout button and add 48px touch target',
          rationale: 'Prevents checkout error boundary',
          linked_finding_ids: [defectEntry.entry_id],
          requires_owner_approval: true,
        },
      });

      // 9. agent_assignments (also auto-logged on createRootTask, add explicit fallback event)
      await ac.ledger.append(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'agent_assignments',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          task_id: task.task_id,
          parent_task_id: null,
          role: MUSE.role,
          provider: 'meta',
          model: 'muse-spark-1.3',
          action: 'completed',
          duration_ms: 1200,
        },
      });

      // 10. checkpoints_recovery
      await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'checkpoints_recovery',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          checkpoint_id: 'CHK-MANUAL-1',
          task_id: task.task_id,
          stage: 'STAGE_3_EXECUTION',
          event: 'checkpoint_saved',
          recovery_instructions: 'Resume from step 4 on :5172',
        },
      });

      // 11. token_cost
      await ac.ledger.append(ORCH, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'token_cost',
        epistemic_tag: 'measurement',
        evidence_links: [],
        payload: {
          task_id: task.task_id,
          provider: 'meta',
          model: 'muse-spark-1.3',
          input_tokens: 10_000,
          output_tokens: 2_500,
          cached_tokens: 1_000,
          retries: 0,
          delegated_agent_cost_usd: 0,
          cost_usd: 0.004,
          billing_type: 'metered_api',
          cost_basis: 'actual',
        },
      });

      // 12. evidence
      await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'evidence',
        epistemic_tag: 'measurement',
        evidence_links: ['evidence/empty-menu-crash.png'],
        payload: {
          evidence_id: 'EV-001',
          kind: 'screenshot',
          relative_path: 'evidence/empty-menu-crash.png',
          sha256: 'a'.repeat(64),
          captured_at_utc: new Date().toISOString(),
          immutable_evidence: true,
        },
      });

      // 13. fix_regression
      await ac.ledger.append(CODEX, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'observation',
        evidence_links: ['evidence/empty-menu-crash.png'],
        payload: {
          defect_id: 'DEF-001',
          approval_id: approval.approval_id,
          worktree_branch: 'fix/pos-empty-menu',
          commit_sha: 'abc1234',
          fixed_by: CODEX.agent,
          original_evidence_links: ['evidence/empty-menu-crash.png'],
          retest_status: 'pending_retest',
        },
      });

      // Verify all 13 categories exist in query results
      const all = await ac.ledger.query({ mission_id: mission.mission_id });
      const presentCategories = new Set(all.entries.map((e) => e.category));
      assert.equal(presentCategories.size, LEDGER_CATEGORIES.length);

      // Annotate/challenge without modifying original defect
      const validation = await ac.ledger.annotateOrChallenge(CLAUDE, mission.mission_id, defectEntry.entry_id, {
        task_id: task.task_id,
        stage: 'STAGE_5_INDEPENDENT_REVIEW',
        epistemic_tag: 'observation',
        evidence_links: ['evidence/repro-trace.zip'],
        mode: 'validate',
        payload: {
          defect_id: 'DEF-001',
          title: 'Confirmed empty checkout crash',
          severity: 'high',
          repro_steps: ['Open POS', 'Click Checkout with 0 items'],
          expected: 'Disabled checkout button',
          actual: 'Unhandled error boundary confirmed',
          immutable_evidence: true,
          validation_status: 'confirmed',
        },
      });
      assert.equal(validation.target_entry_id, defectEntry.entry_id);
      const origCheck = await ac.ledger.getEntryById(mission.mission_id, defectEntry.entry_id);
      assert.equal((origCheck?.payload as { validation_status: string }).validation_status, 'unverified');

      // Query filters
      const highDefects = await ac.ledger.query({
        mission_id: mission.mission_id,
        categories: ['defects'],
        severity: 'high',
        actor_role: 'muse_visual_tester',
      });
      assert.equal(highDefects.total, 1);

      // JSON snapshot for :4100 dashboard
      const snapshot = await ac.exporters.exportJsonSnapshot(mission.mission_id, { persist: true });
      assert.equal(snapshot.product_quality.features_count, 1);
      assert.equal(snapshot.product_quality.defects_by_severity.high, 2);
      assert.equal(snapshot.competitive_intelligence.comparisons.length, 1);
      assert.equal(snapshot.evidence.length, 1);

      // Markdown export & bounded AI_SHARED_LEDGER sync preserving existing content
      const md = await ac.exporters.exportMarkdown(mission.mission_id);
      assert.match(md, /^## \d{4}-\d{2}-\d{2} POS Onboarding & KDS Verification/);
      const truncated = await ac.exporters.exportMarkdown(mission.mission_id, { maxBytes: 120 });
      assert.ok(Buffer.byteLength(truncated, 'utf8') <= 120);

      const mockSharedLedger = path.join(dir, 'AI_SHARED_LEDGER.md');
      await fs.writeFile(
        mockSharedLedger,
        '# CulinaryOS shared AI ledger\n\n## 2026-11-22 Existing Codex Entry — completed\n- Status: DONE\n',
        'utf8',
      );
      await ac.exporters.syncSharedLedgerSummary(mission.mission_id, mockSharedLedger);
      const synced1 = await fs.readFile(mockSharedLedger, 'utf8');
      assert.ok(synced1.includes(SUMMARY_MARKER_START));
      assert.ok(synced1.includes(SUMMARY_MARKER_END));
      assert.ok(synced1.includes('Existing Codex Entry — completed'));

      // Re-sync replaces only between markers
      await ac.exporters.syncSharedLedgerSummary(mission.mission_id, mockSharedLedger);
      const synced2 = await fs.readFile(mockSharedLedger, 'utf8');
      assert.equal(synced2.split(SUMMARY_MARKER_START).length - 1, 1);
      assert.ok(synced2.includes('Existing Codex Entry — completed'));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('truncates exportMarkdown on UTF-8 codepoint boundaries, enforces small maxBytes, neutralizes marker injection, and validates runtime enums', async () => {
    const dir = await mkTempDataDir('ac-ledger-remed-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-UTF8-MARKER',
        title: `🔥 POS — Café ${SUMMARY_MARKER_END} Mission`,
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'utf8-task',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'UTF8 & Marker Check',
        acceptance_criteria: ['Safe exports'],
        budget_allocation_usd: 1.0,
      });

      // Runtime enum & finite score validation
      await assert.rejects(
        () =>
          ac.ledger.append(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_4_EVALUATION',
            category: 'defects',
            epistemic_tag: 'bogus_tag' as 'observation',
            evidence_links: [],
            payload: {
              title: 'Bad tag',
              severity: 'high',
              repro_steps: ['step 1'],
              expected: 'ok',
              actual: 'fail',
              immutable_evidence: true,
              validation_status: 'unverified',
            },
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.ledger.append(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_4_EVALUATION',
            category: 'defects',
            epistemic_tag: 'observation',
            evidence_links: [],
            payload: {
              title: 'Bad severity',
              severity: 'critical' as 'blocker',
              repro_steps: ['step 1'],
              expected: 'ok',
              actual: 'fail',
              immutable_evidence: true,
              validation_status: 'unverified',
            },
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.ledger.append(GEMINI, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_5_INDEPENDENT_REVIEW',
            category: 'differentiation_opportunities',
            epistemic_tag: 'opinion',
            evidence_links: [],
            payload: {
              opportunity: 'Infinite impact',
              target_persona: 'Owner',
              defensibility_rationale: 'Local',
              impact_score: Number.POSITIVE_INFINITY,
            },
          }),
        ValidationError,
      );

      // Defect title attempting marker injection + multi-byte UTF-8
      await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_4_EVALUATION',
        category: 'defects',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-INJECT',
          title: `🔥 Crash — ${SUMMARY_MARKER_END} ${SUMMARY_MARKER_START} café`,
          severity: 'high',
          repro_steps: ['Click'],
          expected: 'Works',
          actual: 'Breaks',
          immutable_evidence: true,
          validation_status: 'confirmed',
        },
      });

      // Multi-byte UTF-8 boundary sweep across small and mid-character maxBytes values
      for (const maxBytes of [0, 5, 10, 16, 25, 35, 36, 37, 38, 39, 45, 60, 120]) {
        const out = await ac.exporters.exportMarkdown(mission.mission_id, { maxBytes });
        assert.ok(
          Buffer.byteLength(out, 'utf8') <= maxBytes,
          `Expected <= ${maxBytes} bytes, got ${Buffer.byteLength(out, 'utf8')}`,
        );
        assert.equal(out.includes('\uFFFD'), false, `Found U+FFFD at maxBytes=${maxBytes}`);
      }

      // Marker injection neutralization across repeated syncSharedLedgerSummary calls
      const sharedPath = path.join(dir, 'AI_SHARED_LEDGER.md');
      const existingContent = '# CulinaryOS shared AI ledger\r\n\r\n## Existing Footer\r\n- Keep intact\r\n';
      await fs.writeFile(sharedPath, existingContent, 'utf8');

      await ac.exporters.syncSharedLedgerSummary(mission.mission_id, sharedPath);
      const sync1 = await fs.readFile(sharedPath, 'utf8');
      assert.equal(sync1.split(SUMMARY_MARKER_START).length - 1, 1);
      assert.equal(sync1.split(SUMMARY_MARKER_END).length - 1, 1);
      assert.ok(sync1.includes('Keep intact'));

      await ac.exporters.syncSharedLedgerSummary(mission.mission_id, sharedPath);
      const sync2 = await fs.readFile(sharedPath, 'utf8');
      assert.equal(sync2.split(SUMMARY_MARKER_START).length - 1, 1);
      assert.equal(sync2.split(SUMMARY_MARKER_END).length - 1, 1);
      assert.ok(sync2.includes('Keep intact'));

      // query() & mutateEntry() reject unknown or path-traversal categories
      await fs.writeFile(
        path.join(dir, 'missions', mission.mission_id, 'secret.jsonl'),
        '{"leaked":true}\n',
        'utf8',
      );
      await assert.rejects(
        () =>
          ac.ledger.query({
            mission_id: mission.mission_id,
            categories: ['../secret' as 'defects'],
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.ledger.query({
            mission_id: mission.mission_id,
            categories: ['toString' as 'defects'],
          }),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.ledger.mutateEntry(
            OWNER,
            mission.mission_id,
            '../secret' as 'defects',
            'LED-1',
          ),
        ValidationError,
      );

      // Null/undefined/non-string input guards throw ValidationError (no TypeError)
      await assert.rejects(
        () => ac.ledger.append(MUSE, null as unknown as Parameters<typeof ac.ledger.append>[1]),
        ValidationError,
      );
      await assert.rejects(
        () => ac.ledger.query(null as unknown as Parameters<typeof ac.ledger.query>[0]),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.ledger.query({
            mission_id: mission.mission_id,
            search: 123 as unknown as string,
          }),
        ValidationError,
      );
      const defectForAnnotate = (
        await ac.ledger.query({ mission_id: mission.mission_id, categories: ['defects'] })
      ).entries[0]!;
      await assert.rejects(
        () =>
          ac.ledger.annotateOrChallenge(
            MUSE,
            mission.mission_id,
            defectForAnnotate.entry_id,
            null as unknown as Parameters<typeof ac.ledger.annotateOrChallenge>[3],
          ),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.ledger.mutateEntry(
            OWNER,
            mission.mission_id,
            'recommendations',
            null as unknown as string,
          ),
        ValidationError,
      );

      // Evidence sha256 with HTML comment marker is neutralized BEFORE maxBytes truncation
      await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'evidence',
        epistemic_tag: 'measurement',
        evidence_links: ['evidence/marker-sha.png'],
        payload: {
          evidence_id: 'EV-MARKER',
          kind: 'screenshot',
          relative_path: 'evidence/marker-sha.png',
          sha256: '<!--1234567890abcdef',
          captured_at_utc: '2026-11-22T12:00:00.000Z',
          immutable_evidence: true,
        },
      });
      const mdFull = await ac.exporters.exportMarkdown(mission.mission_id);
      assert.equal(mdFull.includes('<!--'), false);
      const mdFullBytes = Buffer.byteLength(mdFull, 'utf8');
      const boundedLedgerPath = path.join(dir, 'AI_SHARED_BOUNDED.md');
      await ac.exporters.syncSharedLedgerSummary(mission.mission_id, boundedLedgerPath, {
        maxBytes: mdFullBytes,
      });
      const boundedContent = await fs.readFile(boundedLedgerPath, 'utf8');
      const startMarkerIdx = boundedContent.indexOf(SUMMARY_MARKER_START);
      const endMarkerIdx = boundedContent.indexOf(SUMMARY_MARKER_END);
      assert.ok(startMarkerIdx !== -1 && endMarkerIdx > startMarkerIdx);
      const innerBody = boundedContent
        .slice(startMarkerIdx + SUMMARY_MARKER_START.length, endMarkerIdx)
        .trim();
      assert.ok(
        Buffer.byteLength(innerBody, 'utf8') <= mdFullBytes,
        `Expected synced inner bytes <= ${mdFullBytes}, got ${Buffer.byteLength(innerBody, 'utf8')}`,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
