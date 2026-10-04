#!/usr/bin/env node
/**
 * MCP server entry: `culinaryos-mcp` or `node dist/mcp/serve.js`.
 * Env: CULINARYOS_MODE, CULINARYOS_DATA_DIR, CULINARYOS_API_URL,
 *      CULINARYOS_API_TOKEN, CULINARYOS_AUDIT_FILE, CULINARYOS_ACTOR
 */
import { createConnector } from '../connectors/index.ts';
import { ApprovalQueue } from '../policies/approvals.ts';
import { AuditLog } from '../policies/audit.ts';
import { startStdioServer } from './server.ts';

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

const connector = createConnector({
  mode: (flag('--mode') ?? process.env.CULINARYOS_MODE ?? 'mock') as 'mock' | 'file' | 'api',
  dataDir: flag('--data-dir') ?? process.env.CULINARYOS_DATA_DIR,
  baseUrl: flag('--api-url') ?? process.env.CULINARYOS_API_URL,
  token: process.env.CULINARYOS_API_TOKEN,
});

const ctx = {
  connector,
  approvals: new ApprovalQueue(0, process.env.CULINARYOS_APPROVALS_FILE ?? './data/approvals.json'),
  audit: new AuditLog(process.env.CULINARYOS_AUDIT_FILE ?? './data/audit.log.jsonl'),
  actor: process.env.CULINARYOS_ACTOR ?? 'mcp-host',
};

await startStdioServer(ctx);
