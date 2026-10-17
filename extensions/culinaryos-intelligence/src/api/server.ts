/**
 * HTTP API + GUI dashboard server. Zero dependencies (node:http).
 * Local-first: binds 127.0.0.1 by default; pass host to expose.
 *
 * API:
 *   GET  /api/health            POST /api/route {text}
 *   GET  /api/skills            POST /api/skills/run {id,input,approvedId}
 *   GET  /api/agents            GET  /api/capabilities
 *   GET  /api/approvals         POST /api/approvals/decide {id,approved,decidedBy}
 *   GET  /api/workflows         POST /api/workflows/run {id,approvedByStep}
 * GUI: GET / (dashboard), /app.js, /styles.css
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAgents } from '../agents/agents.ts';
import type { CulinaryOSConnector } from '../connectors/contracts.ts';
import { ApprovalQueue } from '../policies/approvals.ts';
import { AuditLog } from '../policies/audit.ts';
import { routeIntent } from '../router/router.ts';
import { getSkill, listSkills } from '../skills/registry.ts';
import { runSkill } from '../skills/runner.ts';
import { getWorkflow, BUILTIN_WORKFLOWS } from '../workflows/builtin.ts';
import { runWorkflow } from '../workflows/engine.ts';
import { capabilities, SERVER_VERSION } from '../mcp/capabilities.ts';

export interface ServeOptions {
  port?: number;
  host?: string;
  connector: CulinaryOSConnector;
  approvals?: ApprovalQueue;
  audit?: AuditLog;
  actor?: string;
}

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const MAX_BODY = 1024 * 1024; // 1 MB

function readBody(req: { on(e: string, cb: (...a: never[]) => void): void }): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) reject(new Error('request body too large'));
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export async function serve(opts: ServeOptions): Promise<{ port: number; close: () => void }> {
  const approvals = opts.approvals ?? new ApprovalQueue(0, process.env.CULINARYOS_APPROVALS_FILE ?? './data/approvals.json');
  const audit = opts.audit ?? new AuditLog(process.env.CULINARYOS_AUDIT_FILE);
  const actor = opts.actor ?? 'api';
  const base = { connector: opts.connector, approvals, audit, actor };

  const server = createServer(async (req, res) => {
    const send = (status: number, payload: unknown, type = 'application/json; charset=utf-8') => {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      res.writeHead(status, { 'content-type': type, 'content-length': Buffer.byteLength(body) });
      res.end(body);
    };
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = url.pathname;

      // --- Static GUI ---
      if (req.method === 'GET' && !path.startsWith('/api/')) {
        const file = path === '/' ? 'index.html' : path.slice(1);
        if (file.includes('..') || file.includes('\\')) return send(400, 'bad path', 'text/plain');
        const full = join(PUBLIC_DIR, file);
        if (!existsSync(full)) return send(404, 'not found', 'text/plain');
        return send(200, readFileSync(full, 'utf8'), MIME[extname(full)] ?? 'text/plain');
      }

      // --- API ---
      if (req.method === 'GET' && path === '/api/health') {
        return send(200, { ok: true, version: SERVER_VERSION, mode: opts.connector.mode });
      }
      if (req.method === 'GET' && path === '/api/capabilities') {
        return send(200, capabilities(opts.connector.mode));
      }
      if (req.method === 'GET' && path === '/api/agents') {
        return send(200, listAgents());
      }
      if (req.method === 'GET' && path === '/api/skills') {
        return send(200, listSkills().map((s) => s.definition));
      }
      if (req.method === 'GET' && path === '/api/approvals') {
        return send(200, approvals.pending());
      }
      if (req.method === 'GET' && path === '/api/workflows') {
        return send(200, BUILTIN_WORKFLOWS);
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        const params = (body ? JSON.parse(body) : {}) as Record<string, unknown>;
        if (path === '/api/route') {
          return send(200, routeIntent(String(params.text ?? '')));
        }
        if (path === '/api/skills/run') {
          const skill = getSkill(String(params.id ?? ''));
          if (!skill) return send(404, { ok: false, error: `unknown skill: ${params.id}` });
          const result = await runSkill(
            skill,
            { ...base, approvedId: params.approvedId as string | undefined },
            (params.input as Record<string, unknown>) ?? {},
          );
          return send(200, result);
        }
        if (path === '/api/approvals/decide') {
          try {
            const r = approvals.decide(String(params.id), Boolean(params.approved), (params.decidedBy as string) ?? 'gui');
            audit.record({ actor, action: 'approval.decided', approvalId: r.id, ok: true, detail: { status: r.status } });
            return send(200, r);
          } catch (err) {
            return send(400, { ok: false, error: (err as Error).message });
          }
        }
        if (path === '/api/workflows/run') {
          const wf = getWorkflow(String(params.id ?? ''));
          if (!wf) return send(404, { ok: false, error: `unknown workflow: ${params.id}` });
          const result = await runWorkflow(wf, {
            ...base,
            approvedByStep: (params.approvedByStep as Record<string, string>) ?? {},
          });
          return send(200, result);
        }
      }
      return send(404, { ok: false, error: `unknown route: ${req.method} ${path}` });
    } catch (err) {
      return send(500, { ok: false, error: (err as Error).message });
    }
  });

  const port = opts.port ?? Number(process.env.PORT ?? 3100);
  const host = opts.host ?? process.env.HOST ?? '127.0.0.1';
  await new Promise<void>((resolve) => server.listen(port, host, resolve));
  console.log(`culinaryos-intelligence ${SERVER_VERSION} — API + GUI at http://${host}:${port} (mode: ${opts.connector.mode})`);
  return { port, close: () => server.close() };
}
