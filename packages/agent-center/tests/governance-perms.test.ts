import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  type ActorContext,
  ImmutableEvidenceError,
  MissingApprovalGateError,
  SelfVerificationDeniedError,
  UnauthorizedActionError,
  ValidationError,
  createAgentCenter,
  mkTempDataDir,
  readJsonlSafe,
} from '../src/index.js';

const OWNER: ActorContext = { agent: 'nathaniel', role: 'owner' };
const ORCH: ActorContext = { agent: 'orch-1', role: 'orchestrator' };
const MUSE: ActorContext = { agent: 'muse-1', role: 'muse_visual_tester' };
const CLAUDE: ActorContext = { agent: 'claude-1', role: 'claude_tech_auditor' };
const CODEX: ActorContext = { agent: 'codex-1', role: 'codex_engineer' };

describe('Permissions & Governance Guards', () => {
  it('enforces evidence/defect immutability, owner-only production fix approval, and independent retest separation', async () => {
    const dir = await mkTempDataDir('ac-gov-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-GOV-01',
        title: 'Governance Isolation Test',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'gov-task',
        owner_agent: MUSE.agent,
        role: MUSE.role,
        provider: 'meta',
        model: 'muse-spark-1.3',
        title: 'Inspect and fix flow',
        acceptance_criteria: ['Governance rules enforced'],
        budget_allocation_usd: 3.0,
      });

      const defect = await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_4_EVALUATION',
        category: 'defects',
        epistemic_tag: 'observation',
        evidence_links: ['evidence/bug-1.png'],
        payload: {
          defect_id: 'DEF-500',
          title: 'Manager excluded check bypassed in mock UI',
          severity: 'blocker',
          repro_steps: ['Open Tip Pool', 'Add Manager'],
          expected: 'Manager blocked per FLSA',
          actual: 'Checkbox enabled',
          immutable_evidence: true,
          validation_status: 'confirmed',
        },
      });

      const evidence = await ac.ledger.append(MUSE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_3_EXECUTION',
        category: 'evidence',
        epistemic_tag: 'measurement',
        evidence_links: ['evidence/bug-1.png'],
        payload: {
          evidence_id: 'EV-500',
          kind: 'screenshot',
          relative_path: 'evidence/bug-1.png',
          sha256: 'b'.repeat(64),
          captured_at_utc: new Date().toISOString(),
          immutable_evidence: true,
        },
      });

      // Nobody (not even orchestrator or codex_engineer) can delete or mutate defects or evidence
      await assert.rejects(
        () => ac.ledger.deleteEntry(CODEX, mission.mission_id, 'defects', defect.entry_id),
        ImmutableEvidenceError,
      );
      await assert.rejects(
        () => ac.ledger.mutateEntry(ORCH, mission.mission_id, 'evidence', evidence.entry_id),
        ImmutableEvidenceError,
      );

      // Non-owner cannot issue production fix approval
      await assert.rejects(
        () =>
          ac.governance.issueProductionFixApproval(ORCH, {
            mission_id: mission.mission_id,
            scope: 'Bypass attempt',
            target_defect_ids: ['DEF-500'],
          }),
        UnauthorizedActionError,
      );

      // Muse cannot write fix_regression
      await assert.rejects(
        () =>
          ac.ledger.append(MUSE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: ['evidence/bug-1.png'],
            payload: {
              defect_id: 'DEF-500',
              approval_id: 'APR-FAKE',
              worktree_branch: 'fix/flsa',
              fixed_by: MUSE.agent,
              original_evidence_links: ['evidence/bug-1.png'],
              retest_status: 'pending_retest',
            },
          }),
        UnauthorizedActionError,
      );

      // codex_engineer cannot record fix without valid owner approval_id
      await assert.rejects(
        () =>
          ac.ledger.append(CODEX, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: ['evidence/bug-1.png'],
            payload: {
              defect_id: 'DEF-500',
              approval_id: 'APR-DOES-NOT-EXIST',
              worktree_branch: 'fix/flsa',
              fixed_by: CODEX.agent,
              original_evidence_links: ['evidence/bug-1.png'],
              retest_status: 'pending_retest',
            },
          }),
        MissingApprovalGateError,
      );

      // Owner issues approval
      const approval = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Enforce FLSA manager exclusion in Tip Pool UI',
        target_defect_ids: ['DEF-500'],
        worktree_branch: 'fix/flsa-tip-pool',
      });

      // codex_engineer CANNOT self-verify its own fix
      await assert.rejects(
        () =>
          ac.ledger.append(CODEX, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: ['evidence/bug-1.png'],
            payload: {
              defect_id: 'DEF-500',
              approval_id: approval.approval_id,
              worktree_branch: 'fix/flsa-tip-pool',
              fixed_by: CODEX.agent,
              original_evidence_links: ['evidence/bug-1.png'],
              retest_status: 'passed',
              retested_by: CODEX.agent,
            },
          }),
        SelfVerificationDeniedError,
      );

      // codex_engineer records pending_retest fix
      const fixEntry = await ac.ledger.append(CODEX, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'observation',
        evidence_links: ['evidence/bug-1.png'],
        payload: {
          defect_id: 'DEF-500',
          approval_id: approval.approval_id,
          worktree_branch: 'fix/flsa-tip-pool',
          commit_sha: 'deadbeef',
          fixed_by: CODEX.agent,
          original_evidence_links: ['evidence/bug-1.png'],
          retest_status: 'pending_retest',
        },
      });
      assert.deepEqual(fixEntry.payload.original_evidence_links, ['evidence/bug-1.png']);

      // Even claude_tech_auditor is rejected if retested_by === fixed_by
      await assert.rejects(
        () =>
          ac.ledger.append(CLAUDE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: ['evidence/retest-pass.png'],
            payload: {
              defect_id: 'DEF-500',
              approval_id: approval.approval_id,
              worktree_branch: 'fix/flsa-tip-pool',
              fixed_by: CODEX.agent,
              original_evidence_links: ['evidence/bug-1.png'],
              retest_status: 'passed',
              retested_by: CODEX.agent,
            },
          }),
        SelfVerificationDeniedError,
      );

      // Independent claude_tech_auditor verifies retest
      const retestEntry = await ac.ledger.append(CLAUDE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'measurement',
        evidence_links: ['evidence/retest-pass.png'],
        target_entry_id: fixEntry.entry_id,
        payload: {
          defect_id: 'DEF-500',
          approval_id: approval.approval_id,
          worktree_branch: 'fix/flsa-tip-pool',
          fixed_by: CODEX.agent,
          original_evidence_links: ['evidence/bug-1.png'],
          retest_status: 'passed',
          retested_by: CLAUDE.agent,
        },
      });
      assert.equal(retestEntry.payload.retest_status, 'passed');

      // Governance audit log persisted allowed + denied entries
      const auditEntries = await readJsonlSafe<{ outcome: string; action: string }>(
        path.join(dir, 'missions', mission.mission_id, 'governance_audit.jsonl'),
      );
      assert.ok(auditEntries.some((a) => a.outcome === 'allowed' && a.action === 'approve_production_fix'));
      assert.ok(auditEntries.some((a) => a.outcome === 'denied' && a.action === 'ledger_mutate_immutable'));
      assert.ok(auditEntries.some((a) => a.outcome === 'denied' && a.action === 'verify_independent_retest'));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('enforces approval defect/branch scope on codex and auditor fix_regression, blocks actor_agent self-verify spoofing, and audits blank worktree_branch', async () => {
    const dir = await mkTempDataDir('ac-gov-remed-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-GOV-REMED',
        title: 'Approval Scope & Spoof Protection',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'gov-scope',
        owner_agent: CODEX.agent,
        role: CODEX.role,
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Scope test',
        acceptance_criteria: ['Approval scope enforced'],
        budget_allocation_usd: 2.0,
      });

      const approval = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Scoped only to DEF-1 on fix/def-1',
        target_defect_ids: ['DEF-1'],
        worktree_branch: 'fix/def-1',
      });

      // Unapproved defect_id rejected with MissingApprovalGateError
      await assert.rejects(
        () =>
          ac.ledger.append(CODEX, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: [],
            payload: {
              defect_id: 'DEF-999',
              approval_id: approval.approval_id,
              worktree_branch: 'fix/def-1',
              fixed_by: CODEX.agent,
              original_evidence_links: [],
              retest_status: 'pending_retest',
            },
          }),
        MissingApprovalGateError,
      );

      // Wrong worktree_branch rejected with MissingApprovalGateError
      await assert.rejects(
        () =>
          ac.ledger.append(CODEX, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: [],
            payload: {
              defect_id: 'DEF-1',
              approval_id: approval.approval_id,
              worktree_branch: 'main',
              fixed_by: CODEX.agent,
              original_evidence_links: [],
              retest_status: 'pending_retest',
            },
          }),
        MissingApprovalGateError,
      );

      // Blank worktree_branch throws ValidationError AND records denied governance audit
      await assert.rejects(
        () =>
          ac.ledger.append(CODEX, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'observation',
            evidence_links: [],
            payload: {
              defect_id: 'DEF-1',
              approval_id: approval.approval_id,
              worktree_branch: '   ',
              fixed_by: CODEX.agent,
              original_evidence_links: [],
              retest_status: 'pending_retest',
            },
          }),
        ValidationError,
      );

      // Record legitimate fix where codex spoofs fixed_by: 'someone-else'
      await ac.ledger.append(CODEX, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-1',
          approval_id: approval.approval_id,
          worktree_branch: 'fix/def-1',
          fixed_by: 'someone-else',
          original_evidence_links: [],
          retest_status: 'pending_retest',
        },
      });

      // Auditor retest without valid active approval_id or matching defect scope rejected
      await assert.rejects(
        () =>
          ac.ledger.append(CLAUDE, {
            mission_id: mission.mission_id,
            task_id: task.task_id,
            stage: 'STAGE_7_FIX_AND_RETEST',
            category: 'fix_regression',
            epistemic_tag: 'measurement',
            evidence_links: [],
            payload: {
              defect_id: 'DEF-1',
              approval_id: 'APR-FAKE',
              worktree_branch: 'fix/def-1',
              fixed_by: 'someone-else',
              original_evidence_links: [],
              retest_status: 'passed',
              retested_by: CLAUDE.agent,
            },
          }),
        MissingApprovalGateError,
      );

      // Same agent (codex-1) acting under claude_tech_auditor role CANNOT pass its own fix even if fixed_by was spoofed
      await assert.rejects(
        () =>
          ac.ledger.append(
            { agent: CODEX.agent, role: 'claude_tech_auditor' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_7_FIX_AND_RETEST',
              category: 'fix_regression',
              epistemic_tag: 'measurement',
              evidence_links: [],
              payload: {
                defect_id: 'DEF-1',
                approval_id: approval.approval_id,
                worktree_branch: 'fix/def-1',
                fixed_by: 'someone-else',
                original_evidence_links: [],
                retest_status: 'passed',
                retested_by: 'independent-alias',
              },
            },
          ),
        SelfVerificationDeniedError,
      );

      // Genuine independent auditor with matching approval passes
      const verified = await ac.ledger.append(CLAUDE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'measurement',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-1',
          approval_id: approval.approval_id,
          worktree_branch: 'fix/def-1',
          fixed_by: 'someone-else',
          original_evidence_links: [],
          retest_status: 'passed',
          retested_by: CLAUDE.agent,
        },
      });
      assert.equal(verified.payload.retest_status, 'passed');

      const audits = await readJsonlSafe<{ action: string; outcome: string; detail: string }>(
        path.join(dir, 'missions', mission.mission_id, 'governance_audit.jsonl'),
      );
      assert.ok(
        audits.some(
          (a) => a.action === 'record_fix' && a.outcome === 'denied' && a.detail.includes('worktree_branch'),
        ),
      );
      assert.ok(
        audits.some(
          (a) => a.action === 'record_fix' && a.outcome === 'denied' && a.detail.includes('scope mismatch'),
        ),
      );
      assert.ok(
        audits.some(
          (a) => a.action === 'verify_independent_retest' && a.outcome === 'denied',
        ),
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('blocks whitespace self-verification, cross-approval defect_id self-verify, blank actors/defect_ids, and prototype approval keys', async () => {
    const dir = await mkTempDataDir('ac-gov-iter3-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-GOV-ITER3',
        title: 'Iteration 3 Self-Verify & Approval Edge Cases',
      });
      const task = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'gov-iter3',
        owner_agent: CODEX.agent,
        role: CODEX.role,
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Governance iter3',
        acceptance_criteria: ['All self-verify bypasses blocked'],
        budget_allocation_usd: 3.0,
      });

      // issueProductionFixApproval rejects empty element in target_defect_ids and trims valid ids
      await assert.rejects(
        () =>
          ac.governance.issueProductionFixApproval(OWNER, {
            mission_id: mission.mission_id,
            scope: 'Invalid blank defect id',
            target_defect_ids: ['DEF-WS', '   '],
          }),
        ValidationError,
      );

      const apr1 = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Trimmed defect IDs',
        target_defect_ids: [' DEF-WS ', ' DEF-CA '],
        worktree_branch: 'fix/iter3',
      });
      assert.deepEqual(apr1.target_defect_ids, ['DEF-WS', 'DEF-CA']);

      // Object.prototype keys must not match approvals
      assert.equal(await ac.governance.getProductionFixApproval(mission.mission_id, 'toString'), null);
      await assert.rejects(
        () => ac.governance.revokeProductionFixApproval(OWNER, mission.mission_id, 'constructor'),
        MissingApprovalGateError,
      );

      // Blank actor.agent or fixed_by or retested_by rejected
      await assert.rejects(
        () =>
          ac.ledger.append(
            { agent: '   ', role: 'codex_engineer' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_7_FIX_AND_RETEST',
              category: 'fix_regression',
              epistemic_tag: 'observation',
              evidence_links: [],
              payload: {
                defect_id: 'DEF-WS',
                approval_id: apr1.approval_id,
                worktree_branch: 'fix/iter3',
                fixed_by: 'codex-1',
                original_evidence_links: [],
                retest_status: 'pending_retest',
              },
            },
          ),
        ValidationError,
      );

      // 1. Whitespace-padded fixed_by ("claude-2 ") blocked when claude-2 retests
      await ac.ledger.append(
        { agent: 'codex-2', role: 'codex_engineer' },
        {
          mission_id: mission.mission_id,
          task_id: task.task_id,
          stage: 'STAGE_7_FIX_AND_RETEST',
          category: 'fix_regression',
          epistemic_tag: 'observation',
          evidence_links: [],
          payload: {
            defect_id: 'DEF-WS',
            approval_id: apr1.approval_id,
            worktree_branch: 'fix/iter3',
            fixed_by: 'claude-2 ',
            original_evidence_links: [],
            retest_status: 'pending_retest',
          },
        },
      );
      await assert.rejects(
        () =>
          ac.ledger.append(
            { agent: 'claude-2', role: 'claude_tech_auditor' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_7_FIX_AND_RETEST',
              category: 'fix_regression',
              epistemic_tag: 'measurement',
              evidence_links: [],
              payload: {
                defect_id: 'DEF-WS',
                approval_id: apr1.approval_id,
                worktree_branch: 'fix/iter3',
                fixed_by: 'other-bot',
                original_evidence_links: [],
                retest_status: 'passed',
              },
            },
          ),
        SelfVerificationDeniedError,
      );

      // 2. Whitespace-padded actor.agent (" codex-1 ") + retested_by spoof blocked
      await ac.ledger.append(CODEX, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-WS',
          approval_id: apr1.approval_id,
          worktree_branch: 'fix/iter3',
          fixed_by: 'other-bot',
          original_evidence_links: [],
          retest_status: 'pending_retest',
        },
      });
      await assert.rejects(
        () =>
          ac.ledger.append(
            { agent: ' codex-1 ', role: 'claude_tech_auditor' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_7_FIX_AND_RETEST',
              category: 'fix_regression',
              epistemic_tag: 'measurement',
              evidence_links: [],
              payload: {
                defect_id: 'DEF-WS',
                approval_id: apr1.approval_id,
                worktree_branch: 'fix/iter3',
                fixed_by: 'other-bot',
                original_evidence_links: [],
                retest_status: 'passed',
                retested_by: 'innocent-auditor',
              },
            },
          ),
        SelfVerificationDeniedError,
      );

      // 3. Cross-approval same defect_id self-verification blocked
      await ac.ledger.append(CODEX, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'observation',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-CA',
          approval_id: apr1.approval_id,
          worktree_branch: 'fix/iter3',
          fixed_by: CODEX.agent,
          original_evidence_links: [],
          retest_status: 'pending_retest',
        },
      });
      const apr2 = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Second approval for DEF-CA',
        target_defect_ids: ['DEF-CA'],
        worktree_branch: 'fix/iter3',
      });
      await assert.rejects(
        () =>
          ac.ledger.append(
            { agent: CODEX.agent, role: 'claude_tech_auditor' },
            {
              mission_id: mission.mission_id,
              task_id: task.task_id,
              stage: 'STAGE_7_FIX_AND_RETEST',
              category: 'fix_regression',
              epistemic_tag: 'measurement',
              evidence_links: [],
              payload: {
                defect_id: 'DEF-CA',
                approval_id: apr2.approval_id,
                worktree_branch: 'fix/iter3',
                fixed_by: 'other-bot',
                original_evidence_links: [],
                retest_status: 'passed',
              },
            },
          ),
        SelfVerificationDeniedError,
      );

      // Independent auditor who previously recorded 'failed' can still verify a later fix by another engineer
      const failedRetest = await ac.ledger.append(CLAUDE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'measurement',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-CA',
          approval_id: apr1.approval_id,
          worktree_branch: 'fix/iter3',
          fixed_by: CODEX.agent,
          original_evidence_links: [],
          retest_status: 'failed',
          retested_by: CLAUDE.agent,
        },
      });
      assert.equal(failedRetest.payload.retest_status, 'failed');

      await ac.ledger.append(
        { agent: 'codex-3', role: 'codex_engineer' },
        {
          mission_id: mission.mission_id,
          task_id: task.task_id,
          stage: 'STAGE_7_FIX_AND_RETEST',
          category: 'fix_regression',
          epistemic_tag: 'observation',
          evidence_links: [],
          payload: {
            defect_id: 'DEF-CA',
            approval_id: apr2.approval_id,
            worktree_branch: 'fix/iter3',
            fixed_by: 'codex-3',
            original_evidence_links: [],
            retest_status: 'pending_retest',
          },
        },
      );
      const passedRetest = await ac.ledger.append(CLAUDE, {
        mission_id: mission.mission_id,
        task_id: task.task_id,
        stage: 'STAGE_7_FIX_AND_RETEST',
        category: 'fix_regression',
        epistemic_tag: 'measurement',
        evidence_links: [],
        payload: {
          defect_id: 'DEF-CA',
          approval_id: apr2.approval_id,
          worktree_branch: 'fix/iter3',
          fixed_by: 'codex-3',
          original_evidence_links: [],
          retest_status: 'passed',
          retested_by: CLAUDE.agent,
        },
      });
      assert.equal(passedRetest.payload.retest_status, 'passed');
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects blank and non-string actor.agent or scope/worktree_branch in issueProductionFixApproval and governance guards without disk writes', async () => {
    const dir = await mkTempDataDir('ac-gov-iter4-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-GOV-ITER4',
        title: 'Iteration 4 Actor & Input Validation',
      });

      const badActors: ActorContext[] = [
        { agent: '   ', role: 'owner' },
        { agent: undefined as unknown as string, role: 'owner' },
        { agent: null as unknown as string, role: 'owner' },
        null as unknown as ActorContext,
      ];
      for (const badActor of badActors) {
        await assert.rejects(
          () =>
            ac.governance.issueProductionFixApproval(badActor, {
              mission_id: mission.mission_id,
              scope: 'Blank owner actor',
              target_defect_ids: ['DEF-1'],
            }),
          ValidationError,
        );
        await assert.rejects(
          () => ac.governance.revokeProductionFixApproval(badActor, mission.mission_id, 'APR-1'),
          ValidationError,
        );
        await assert.rejects(
          () => ac.governance.assertCanApproveSubtask(badActor, mission.mission_id),
          ValidationError,
        );
      }

      for (const badInput of [
        { scope: undefined as unknown as string },
        { scope: 123 as unknown as string },
        { scope: 'Valid scope', worktree_branch: 42 as unknown as string },
        { scope: 'Valid scope', worktree_branch: '   ' },
      ]) {
        await assert.rejects(
          () =>
            ac.governance.issueProductionFixApproval(OWNER, {
              mission_id: mission.mission_id,
              target_defect_ids: ['DEF-1'],
              ...badInput,
            }),
          ValidationError,
        );
      }

      assert.equal((await ac.governance.listApprovals(mission.mission_id)).length, 0);

      // Valid padded owner agent succeeds and trims approved_by_agent
      const valid = await ac.governance.issueProductionFixApproval(
        { agent: '  nathaniel  ', role: 'owner' },
        {
          mission_id: mission.mission_id,
          scope: '  Trimmed scope  ',
          target_defect_ids: [' DEF-1 '],
          worktree_branch: ' fix/iter4 ',
        },
      );
      assert.equal(valid.approved_by_agent, 'nathaniel');
      assert.equal(valid.scope, 'Trimmed scope');
      assert.deepEqual(valid.target_defect_ids, ['DEF-1']);
      assert.equal(valid.worktree_branch, 'fix/iter4');

      // Malformed scopeContext / null fix_regression payload throw ValidationError (no TypeError)
      for (const badCtx of [
        null,
        'invalid',
        { defect_id: 123 },
        { defect_id: null },
        { worktree_branch: 123 },
        { worktree_branch: null },
      ]) {
        await assert.rejects(
          () =>
            ac.governance.assertValidProductionFixApproval(
              mission.mission_id,
              valid.approval_id,
              CODEX,
              badCtx as unknown as Parameters<typeof ac.governance.assertValidProductionFixApproval>[3],
            ),
          ValidationError,
        );
      }
      await assert.rejects(
        () => ac.governance.assertLedgerWriteAllowed(CODEX, mission.mission_id, 'fix_regression', null),
        ValidationError,
      );
      await assert.rejects(
        () => ac.governance.assertLedgerWriteAllowed(CODEX, mission.mission_id, 'fix_regression', undefined),
        ValidationError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects non-string, blank, or omitted defect_id/worktree_branch on direct assertLedgerWriteAllowed across all roles and array inputs on approval/subtask guards', async () => {
    const dir = await mkTempDataDir('ac-gov-iter6-');
    try {
      const ac = createAgentCenter({ dataDir: dir });
      const mission = await ac.tasks.createMission(OWNER, {
        mission_id: 'MSN-GOV-ITER6',
        title: 'Direct assertLedgerWriteAllowed Scope Bypass Prevention',
      });
      const rootTask = await ac.tasks.createRootTask(ORCH, {
        mission_id: mission.mission_id,
        active_task_key: 'gov-iter6',
        owner_agent: CODEX.agent,
        role: CODEX.role,
        provider: 'openai',
        model: 'gpt-6.1-sol',
        title: 'Scope guard task',
        acceptance_criteria: ['Direct assertLedgerWriteAllowed enforces scope'],
        budget_allocation_usd: 3.0,
      });

      const approval = await ac.governance.issueProductionFixApproval(OWNER, {
        mission_id: mission.mission_id,
        scope: 'Scoped to DEF-P1 on fix/p1',
        target_defect_ids: ['DEF-P1'],
        worktree_branch: 'fix/p1',
      });

      const badValues: unknown[] = [123, null, [], {}, '', '   ', undefined];
      const rolesToTest: Array<{ actor: ActorContext; extra: Record<string, unknown> }> = [
        { actor: CODEX, extra: { retest_status: 'pending_retest' } },
        { actor: CLAUDE, extra: { retest_status: 'passed', retested_by: CLAUDE.agent } },
        { actor: OWNER, extra: { retest_status: 'pending_retest' } },
        {
          actor: { agent: 'chatgpt-1', role: 'chatgpt_supervisor' },
          extra: { retest_status: 'passed', retested_by: 'chatgpt-1' },
        },
      ];

      const auditPath = path.join(dir, 'missions', mission.mission_id, 'governance_audit.jsonl');
      let previousAuditCount = (await readJsonlSafe(auditPath)).length;

      for (const { actor, extra } of rolesToTest) {
        for (const badDefectId of badValues) {
          const payload: Record<string, unknown> = {
            approval_id: approval.approval_id,
            worktree_branch: 'fix/p1',
            fixed_by: 'other-engineer',
            ...extra,
          };
          if (badDefectId !== undefined) {
            payload.defect_id = badDefectId;
          }
          await assert.rejects(
            () =>
              ac.governance.assertLedgerWriteAllowed(
                actor,
                mission.mission_id,
                'fix_regression',
                payload,
              ),
            ValidationError,
          );
          const audits = await readJsonlSafe<{
            outcome: string;
            action: string;
            actor_role: string;
            detail: string;
          }>(auditPath);
          assert.equal(audits.length, previousAuditCount + 1);
          const latest = audits[audits.length - 1]!;
          assert.equal(latest.outcome, 'denied');
          assert.equal(latest.action, 'record_fix');
          assert.equal(latest.actor_role, actor.role);
          assert.ok(latest.detail.includes('defect_id'));
          previousAuditCount = audits.length;
        }

        for (const badBranch of badValues) {
          const payload: Record<string, unknown> = {
            defect_id: 'DEF-P1',
            approval_id: approval.approval_id,
            fixed_by: 'other-engineer',
            ...extra,
          };
          if (badBranch !== undefined) {
            payload.worktree_branch = badBranch;
          }
          await assert.rejects(
            () =>
              ac.governance.assertLedgerWriteAllowed(
                actor,
                mission.mission_id,
                'fix_regression',
                payload,
              ),
            ValidationError,
          );
          const audits = await readJsonlSafe<{
            outcome: string;
            action: string;
            actor_role: string;
            detail: string;
          }>(auditPath);
          assert.equal(audits.length, previousAuditCount + 1);
          const latest = audits[audits.length - 1]!;
          assert.equal(latest.outcome, 'denied');
          assert.equal(latest.action, 'record_fix');
          assert.equal(latest.actor_role, actor.role);
          assert.ok(latest.detail.includes('worktree_branch'));
          previousAuditCount = audits.length;
        }
      }

      // Valid direct calls succeed; mismatched defect/branch still fail scope check
      await ac.governance.assertLedgerWriteAllowed(CODEX, mission.mission_id, 'fix_regression', {
        defect_id: 'DEF-P1',
        approval_id: approval.approval_id,
        worktree_branch: 'fix/p1',
        fixed_by: CODEX.agent,
        retest_status: 'pending_retest',
      });
      await ac.governance.assertLedgerWriteAllowed(CLAUDE, mission.mission_id, 'fix_regression', {
        defect_id: 'DEF-P1',
        approval_id: approval.approval_id,
        worktree_branch: 'fix/p1',
        fixed_by: CODEX.agent,
        retest_status: 'passed',
        retested_by: CLAUDE.agent,
      });

      // Array inputs rejected cleanly with ValidationError (no TypeError)
      await assert.rejects(
        () =>
          ac.governance.issueProductionFixApproval(
            OWNER,
            [] as unknown as Parameters<typeof ac.governance.issueProductionFixApproval>[1],
          ),
        ValidationError,
      );
      await assert.rejects(
        () =>
          ac.governance.assertLedgerWriteAllowed(CODEX, mission.mission_id, 'fix_regression', []),
        ValidationError,
      );

      const req = await ac.tasks.requestSpecialistSubtask(CODEX, {
        mission_id: mission.mission_id,
        parent_task_id: rootTask.task_id,
        active_task_key: 'sub-array-guard',
        requested_role: 'claude_tech_auditor',
        requested_provider: 'anthropic',
        requested_model: 'claude-opus-5-5-high',
        title: 'Test array assignment guard',
        acceptance_criteria: ['Reject array assignment'],
        estimated_cost_usd: 0.5,
        rationale: 'Verify approveSubtaskRequest rejects array assignment',
      });
      await assert.rejects(
        () =>
          ac.tasks.approveSubtaskRequest(
            ORCH,
            mission.mission_id,
            req.request_id,
            [] as unknown as Parameters<typeof ac.tasks.approveSubtaskRequest>[3],
          ),
        ValidationError,
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
