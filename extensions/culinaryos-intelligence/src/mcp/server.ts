/**
 * Minimal MCP server over stdio (newline-delimited JSON-RPC 2.0).
 * No SDK dependency; speaks the MCP surface hosts expect:
 * initialize, tools/list+call, resources/list+read, prompts/list+get.
 */
import { createInterface } from 'node:readline';
import { listAgents, getAgent } from '../agents/agents.ts';
import type { CulinaryOSConnector } from '../connectors/contracts.ts';
import { routeIntent } from '../router/router.ts';
import { listSkills, getSkill, skillForIntent } from '../skills/registry.ts';
import { runSkill } from '../skills/runner.ts';
import { ApprovalQueue } from '../policies/approvals.ts';
import { AuditLog } from '../policies/audit.ts';
import { getWorkflow, BUILTIN_WORKFLOWS } from '../workflows/builtin.ts';
import { runWorkflow } from '../workflows/engine.ts';
import { capabilities, SERVER_NAME, SERVER_VERSION } from './capabilities.ts';

export interface McpContext {
  connector: CulinaryOSConnector;
  approvals: ApprovalQueue;
  audit: AuditLog;
  actor: string;
}

interface RpcMessage {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
}

const PROTOCOL_VERSION = '2024-11-05';

function fieldToJsonSchema(f: { name: string; type: string; required: boolean; enum?: string[]; description?: string }): Record<string, unknown> {
  const base: Record<string, unknown> = { description: f.description ?? f.name };
  if (f.type === 'string[]') {
    base.type = 'array';
    base.items = { type: 'string' };
  } else {
    base.type = f.type;
  }
  if (f.enum) base.enum = f.enum;
  return base;
}

function skillInputSchema(skillId: string): Record<string, unknown> {
  const skill = skillId === '*' ? undefined : getSkill(skillId);
  if (!skill) {
    return {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Skill id (see skill.list)' },
        input: { type: 'object', description: 'Skill input fields' },
        approvedId: { type: 'string', description: 'Approval id when resuming an approved write' },
      },
      required: ['id'],
    };
  }
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const f of skill.definition.schema.input) {
    properties[f.name] = fieldToJsonSchema(f);
    if (f.required) required.push(f.name);
  }
  return { type: 'object', properties, required };
}

function toolDefs(): Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> {
  const tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> = [
    {
      name: 'route',
      description: 'Fast intent router: map free text to intent, agent, risk, and minimum context.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    },
    {
      name: 'skill.list',
      description: 'List all skill definitions (id, inputs, outputs, permissions, risk).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'skill.run',
      description: 'Run any skill by id. May pause with approvalRequired; decide via approval.decide then retry with approvedId.',
      inputSchema: skillInputSchema('*'),
    },
    {
      name: 'approval.list',
      description: 'List pending approval requests.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'approval.decide',
      description: 'Approve or reject a pending approval request.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          approved: { type: 'boolean' },
          decidedBy: { type: 'string' },
        },
        required: ['id', 'approved'],
      },
    },
    {
      name: 'workflow.list',
      description: 'List built-in workflows.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'workflow.run',
      description: 'Run a built-in workflow by id.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          approvedByStep: { type: 'object', description: 'Map of step id -> approval id' },
        },
        required: ['id'],
      },
    },
  ];
  // One direct tool per skill for hosts that prefer explicit tools.
  for (const s of listSkills()) {
    tools.push({
      name: `skill.${s.definition.id}`,
      description: `${s.definition.title}: ${s.definition.description}`,
      inputSchema: skillInputSchema(s.definition.id),
    });
  }
  return tools;
}

function textResult(payload: unknown): Record<string, unknown> {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] };
}

async function handleCall(ctx: McpContext, name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (name) {
    case 'route':
      return textResult(routeIntent(String(args.text ?? '')));
    case 'skill.list':
      return textResult(listSkills().map((s) => s.definition));
    case 'skill.run': {
      const skill = getSkill(String(args.id ?? ''));
      if (!skill) return { ...textResult({ ok: false, error: `unknown skill: ${args.id}` }), isError: true };
      const result = await runSkill(
        skill,
        { connector: ctx.connector, approvals: ctx.approvals, audit: ctx.audit, actor: ctx.actor, approvedId: args.approvedId as string | undefined },
        (args.input as Record<string, unknown>) ?? {},
      );
      return textResult(result);
    }
    case 'approval.list':
      return textResult(ctx.approvals.pending());
    case 'approval.decide': {
      const req = ctx.approvals.decide(String(args.id), Boolean(args.approved), (args.decidedBy as string) ?? 'human');
      ctx.audit.record({ actor: ctx.actor, action: 'approval.decided', approvalId: req.id, ok: true, detail: { status: req.status } });
      return textResult(req);
    }
    case 'workflow.list':
      return textResult(BUILTIN_WORKFLOWS);
    case 'workflow.run': {
      const workflow = getWorkflow(String(args.id ?? ''));
      if (!workflow) return { ...textResult({ ok: false, error: `unknown workflow: ${args.id}` }), isError: true };
      const result = await runWorkflow(workflow, {
        connector: ctx.connector,
        approvals: ctx.approvals,
        audit: ctx.audit,
        actor: ctx.actor,
        approvedByStep: (args.approvedByStep as Record<string, string>) ?? {},
      });
      return textResult(result);
    }
    default: {
      if (name.startsWith('skill.')) {
        const skill = getSkill(name.slice('skill.'.length));
        if (!skill) return { ...textResult({ ok: false, error: `unknown tool: ${name}` }), isError: true };
        const { approvedId, ...input } = args;
        const result = await runSkill(
          skill,
          { connector: ctx.connector, approvals: ctx.approvals, audit: ctx.audit, actor: ctx.actor, approvedId: approvedId as string | undefined },
          input,
        );
        return textResult(result);
      }
      return { ...textResult({ ok: false, error: `unknown tool: ${name}` }), isError: true };
    }
  }
}

function resources(): Array<{ uri: string; name: string; description: string; mimeType: string }> {
  return [
    { uri: 'culinaryos://capabilities', name: 'capabilities', description: 'Full capability discovery document', mimeType: 'application/json' },
    { uri: 'culinaryos://agents', name: 'agents', description: 'Role agent definitions', mimeType: 'application/json' },
    { uri: 'culinaryos://skills', name: 'skills', description: 'Skill definitions', mimeType: 'application/json' },
    { uri: 'culinaryos://intents', name: 'intents', description: 'Router intents', mimeType: 'application/json' },
  ];
}

function resourceBody(ctx: McpContext, uri: string): unknown {
  switch (uri) {
    case 'culinaryos://capabilities':
      return capabilities(ctx.connector.mode);
    case 'culinaryos://agents':
      return listAgents();
    case 'culinaryos://skills':
      return listSkills().map((s) => s.definition);
    case 'culinaryos://intents':
      return listSkills().map((s) => ({ skill: s.definition.id, agent: s.definition.agent }));
    default:
      return undefined;
  }
}

function prompts(): Array<{ name: string; description: string }> {
  return listAgents().map((a) => ({ name: `agent.${a.id}`, description: `${a.title}: ${a.description}` }));
}

function promptBody(name: string): Array<{ role: string; content: { type: string; text: string } }> | undefined {
  if (!name.startsWith('agent.')) return undefined;
  const agent = getAgent(name.slice('agent.'.length));
  if (!agent) return undefined;
  const skillDocs = agent.skillIds
    .map((id) => {
      const s = getSkill(id);
      return s ? `- ${s.definition.id}: ${s.definition.description}\n  Instructions: ${s.definition.instructions}` : null;
    })
    .filter(Boolean)
    .join('\n');
  return [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `${agent.systemPrompt}\n\nYour skills:\n${skillDocs}`,
      },
    },
  ];
}

export async function handleMessage(ctx: McpContext, msg: RpcMessage): Promise<Record<string, unknown> | null> {
  const isNotification = msg.id === undefined;
  if (msg.method === 'notifications/initialized') return null;

  const respond = (result: unknown): Record<string, unknown> => ({ jsonrpc: '2.0', id: msg.id, result });
  const fail = (code: number, message: string): Record<string, unknown> => ({
    jsonrpc: '2.0',
    id: msg.id,
    error: { code, message },
  });

  try {
    switch (msg.method) {
      case 'initialize':
        return respond({
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        });
      case 'ping':
        return respond({});
      case 'tools/list':
        return respond({ tools: toolDefs() });
      case 'tools/call': {
        const params = msg.params ?? {};
        const result = await handleCall(ctx, String(params.name ?? ''), (params.arguments as Record<string, unknown>) ?? {});
        return respond(result);
      }
      case 'resources/list':
        return respond({ resources: resources() });
      case 'resources/read': {
        const uri = String(msg.params?.uri ?? '');
        const body = resourceBody(ctx, uri);
        if (body === undefined) return fail(-32002, `unknown resource: ${uri}`);
        return respond({ contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] });
      }
      case 'prompts/list':
        return respond({ prompts: prompts() });
      case 'prompts/get': {
        const messages = promptBody(String(msg.params?.name ?? ''));
        if (!messages) return fail(-32002, `unknown prompt: ${msg.params?.name}`);
        return respond({ messages });
      }
      default:
        if (isNotification) return null;
        return fail(-32601, `method not found: ${msg.method}`);
    }
  } catch (err) {
    if (isNotification) return null;
    return fail(-32603, (err as Error).message);
  }
}

export function skillForIntentExport(intent: string): string | undefined {
  return skillForIntent(intent)?.definition.id;
}

/** Start the stdio transport loop. Resolves when stdin closes. */
export async function startStdioServer(ctx: McpContext): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const text = line.trim();
    if (!text) continue;
    let msg: RpcMessage;
    try {
      msg = JSON.parse(text) as RpcMessage;
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }) + '\n');
      continue;
    }
    const res = await handleMessage(ctx, msg);
    if (res) process.stdout.write(JSON.stringify(res) + '\n');
  }
}
