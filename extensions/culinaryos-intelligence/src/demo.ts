/**
 * Local demo: router + skills + approval flow + workflow against the
 * mock connector. Zero installs: `node src/demo.ts`
 */
import { MockConnector } from './connectors/mock.ts';
import { ApprovalQueue } from './policies/approvals.ts';
import { AuditLog } from './policies/audit.ts';
import { routeIntent } from './router/router.ts';
import { getSkill } from './skills/registry.ts';
import { runSkill } from './skills/runner.ts';
import { dailyOpen } from './workflows/builtin.ts';
import { runWorkflow } from './workflows/engine.ts';

const connector = new MockConnector();
const approvals = new ApprovalQueue();
const audit = new AuditLog();
const base = { connector, approvals, audit, actor: 'demo' };

console.log('=== 1. Router (System-1, no model calls) ===');
for (const q of ['forecast production for tonight', 'cost the margherita recipe', 'draft a purchase order']) {
  console.log(`"${q}" ->`, JSON.stringify(routeIntent(q)));
}

console.log('\n=== 2. Recipe costing ===');
console.log((await runSkill(getSkill('recipe-costing')!, base, { recipeId: 'margherita' })).summary);

console.log('\n=== 3. Inventory / par ===');
console.log((await runSkill(getSkill('inventory-par')!, base, {})).summary);

console.log('\n=== 4. Ordering (approval gate) ===');
const paused = await runSkill(getSkill('ordering-suggestions')!, base, {});
console.log('first run:', paused.summary);
approvals.decide(paused.approvalId!, true, 'demo-human');
const resumed = await runSkill(getSkill('ordering-suggestions')!, { ...base, approvedId: paused.approvalId }, {});
console.log('after approval:', resumed.summary);

console.log('\n=== 5. Workflow: daily-open ===');
const wf = await runWorkflow(dailyOpen, base);
for (const s of wf.steps) console.log(`- ${s.stepId}: ${s.result.summary}`);

console.log(`\n=== 6. Audit trail (${audit.entries().length} entries) ===`);
for (const e of audit.entries().slice(0, 5)) console.log(`- ${e.action} ok=${e.ok}`);
console.log('\nDemo complete. Try the CLI (`node src/cli.ts --help`) or GUI (`node src/cli.ts serve`).');
