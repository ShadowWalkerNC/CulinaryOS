#!/usr/bin/env node
/**
 * CulinaryOS Intelligence CLI — zero dependencies, runs from source:
 *   node src/cli.ts route "forecast production for tonight"
 * Or after build: culinaryos <command>
 */
import { listAgents } from './agents/agents.ts';
import { createConnector } from './connectors/index.ts';
import type { ConnectorMode } from './connectors/index.ts';
import { AuditLog } from './policies/audit.ts';
import { ApprovalQueue } from './policies/approvals.ts';
import { routeIntent } from './router/router.ts';
import { getSkill, listSkills } from './skills/registry.ts';
import { runSkill } from './skills/runner.ts';
import { getWorkflow, BUILTIN_WORKFLOWS } from './workflows/builtin.ts';
import { runWorkflow } from './workflows/engine.ts';
import { startStdioServer } from './mcp/server.ts';
import { capabilities } from './mcp/capabilities.ts';

const VERSION = '0.1.0';

interface GlobalOpts {
  mode: ConnectorMode;
  dataDir?: string;
  apiUrl?: string;
  actor: string;
  json: boolean;
}

function parseGlobal(args: string[]): { opts: GlobalOpts; rest: string[] } {
  const opts: GlobalOpts = {
    mode: (process.env.CULINARYOS_MODE as ConnectorMode) ?? 'mock',
    dataDir: process.env.CULINARYOS_DATA_DIR,
    apiUrl: process.env.CULINARYOS_API_URL,
    actor: process.env.CULINARYOS_ACTOR ?? 'cli',
    json: false,
  };
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--mode' && args[i + 1]) opts.mode = args[++i] as ConnectorMode;
    else if (a === '--data-dir' && args[i + 1]) opts.dataDir = args[++i];
    else if (a === '--api-url' && args[i + 1]) opts.apiUrl = args[++i];
    else if (a === '--actor' && args[i + 1]) opts.actor = args[++i];
    else if (a === '--json') opts.json = true;
    else rest.push(a);
  }
  return { opts, rest };
}

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function out(opts: GlobalOpts, payload: unknown, pretty?: string): void {
  if (opts.json || pretty === undefined) console.log(JSON.stringify(payload, null, 2));
  else console.log(pretty);
}

function summarizeResult(r: { ok: boolean; summary?: string; error?: string; approvalRequired?: boolean; approvalId?: string }): string {
  if (r.approvalRequired) return `⏸ approval required (${r.approvalId}): ${r.summary}`;
  if (!r.ok) return `✖ ${r.error}`;
  return `✔ ${r.summary ?? 'done'}`;
}

const HELP = `culinaryos-intelligence ${VERSION} — give any AI the skills to operate a restaurant.

Usage: culinaryos <command> [args] [options]

Commands:
  route "<text>"                 Route free text to intent/agent/risk/context
  skills                         List skills
  skill run <id> [--input JSON] [--approved-id ID]
                                 Run a skill (pauses when approval is needed)
  agents                         List role agents
  approvals                      List pending approvals
  approve <id> [--by NAME]       Approve a request
  reject <id> [--by NAME]        Reject a request
  workflows                      List workflows
  workflow run <id>              Run a workflow
  capabilities                   Print capability discovery document
  serve [--port N]               Start HTTP API + GUI dashboard (default 3100)
  mcp                            Start MCP stdio server (for AI hosts)

Options:
  --mode mock|file|api           Connector mode (default: mock, or CULINARYOS_MODE)
  --data-dir PATH                Data dir for file mode (CULINARYOS_DATA_DIR)
  --api-url URL                  CulinaryOS API base URL (CULINARYOS_API_URL)
  --actor NAME                   Audit actor name (default: cli)
  --json                         Always print raw JSON

Env: CULINARYOS_API_TOKEN (api mode), CULINARYOS_AUDIT_FILE, PORT
`;

export async function main(argv: string[]): Promise<number> {
  const { opts, rest } = parseGlobal(argv);
  const [cmd, ...args] = rest;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return 0;
  }
  if (cmd === 'version' || cmd === '--version') {
    console.log(VERSION);
    return 0;
  }

  const connector = createConnector({
    mode: opts.mode,
    dataDir: opts.dataDir,
    baseUrl: opts.apiUrl,
    token: process.env.CULINARYOS_API_TOKEN,
  });
  const approvals = new ApprovalQueue(0, process.env.CULINARYOS_APPROVALS_FILE ?? './data/approvals.json');
  const audit = new AuditLog(process.env.CULINARYOS_AUDIT_FILE);
  const base = { connector, approvals, audit, actor: opts.actor };

  switch (cmd) {
    case 'route': {
      const text = args.join(' ');
      if (!text) {
        console.error('usage: culinaryos route "<text>"');
        return 1;
      }
      const r = routeIntent(text);
      out(opts, r, `intent=${r.intent} agent=${r.agent} risk=${r.risk} confidence=${r.confidence}\ncontext: ${r.context.join(', ') || '(none)'}`);
      return 0;
    }
    case 'skills': {
      const defs = listSkills().map((s) => s.definition);
      if (opts.json) {
        console.log(JSON.stringify(defs, null, 2));
        return 0;
      }
      for (const d of defs) console.log(`- ${d.id} [${d.agent}/${d.risk}] ${d.title}`);
      return 0;
    }
    case 'skill': {
      if (args[0] !== 'run' || !args[1]) {
        console.error('usage: culinaryos skill run <id> [--input JSON] [--approved-id ID]');
        return 1;
      }
      const skill = getSkill(args[1]);
      if (!skill) {
        console.error(`unknown skill: ${args[1]}`);
        return 1;
      }
      let input: Record<string, unknown> = {};
      const raw = flagValue(args, '--input');
      if (raw) {
        try {
          input = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          console.error('--input must be valid JSON');
          return 1;
        }
      }
      const result = await runSkill(skill, { ...base, approvedId: flagValue(args, '--approved-id') }, input);
      out(opts, result, `${summarizeResult(result)}\n${JSON.stringify(result.data ?? {}, null, 2)}`);
      return result.ok ? 0 : 2;
    }
    case 'agents': {
      const agents = listAgents();
      if (opts.json) {
        console.log(JSON.stringify(agents, null, 2));
        return 0;
      }
      for (const a of agents) console.log(`- ${a.id}: ${a.title} (skills: ${a.skillIds.join(', ')})`);
      return 0;
    }
    case 'approvals': {
      const pending = approvals.pending();
      out(opts, pending, pending.length === 0 ? 'no pending approvals' : pending.map((p) => `- ${p.id} [${p.skillId}/${p.category}] ${p.summary}`).join('\n'));
      return 0;
    }
    case 'approve':
    case 'reject': {
      if (!args[0]) {
        console.error(`usage: culinaryos ${cmd} <approval-id> [--by NAME]`);
        return 1;
      }
      try {
        const req = approvals.decide(args[0], cmd === 'approve', flagValue(args, '--by') ?? 'cli');
        out(opts, req, `${req.status}: ${req.id}`);
        return 0;
      } catch (err) {
        console.error((err as Error).message);
        return 1;
      }
    }
    case 'workflows': {
      const wfs = BUILTIN_WORKFLOWS;
      if (opts.json) {
        console.log(JSON.stringify(wfs, null, 2));
        return 0;
      }
      for (const w of wfs) console.log(`- ${w.id}: ${w.title}`);
      return 0;
    }
    case 'workflow': {
      if (args[0] !== 'run' || !args[1]) {
        console.error('usage: culinaryos workflow run <id>');
        return 1;
      }
      const wf = getWorkflow(args[1]);
      if (!wf) {
        console.error(`unknown workflow: ${args[1]}`);
        return 1;
      }
      const result = await runWorkflow(wf, base);
      out(
        opts,
        result,
        result.steps.map((s) => `${s.result.ok ? '✔' : '✖'} ${s.stepId} (${s.skillId}): ${s.result.summary ?? s.result.error}`).join('\n') +
          (result.approvalRequired ? `\n⏸ paused for approval ${result.approvalId}` : ''),
      );
      return result.ok ? 0 : 2;
    }
    case 'capabilities': {
      console.log(JSON.stringify(capabilities(connector.mode), null, 2));
      return 0;
    }
    case 'serve': {
      const { serve } = await import('./api/server.ts');
      const port = Number(flagValue(args, '--port') ?? process.env.PORT ?? 3100);
      await serve({ port, connector, approvals, audit, actor: opts.actor });
      return 0;
    }
    case 'mcp': {
      await startStdioServer(base);
      return 0;
    }
    default: {
      console.error(`unknown command: ${cmd}\n\n${HELP}`);
      return 1;
    }
  }
}

const invoked = process.argv[1]?.replace(/\\/g, '/').endsWith('/cli.ts') ?? false;
if (invoked) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error((err as Error).message);
      process.exit(1);
    },
  );
}
