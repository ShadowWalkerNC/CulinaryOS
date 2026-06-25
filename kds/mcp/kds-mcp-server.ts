import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE   = process.env.KDS_API_URL     ?? 'http://localhost:3002';
const KEY    = process.env.INTERNAL_API_KEY ?? '';
const TENANT = process.env.TENANT_ID        ?? 'demo';

async function kds(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'X-Tenant-Id': TENANT,
      'X-Caller-Service': 'kds',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

const server = new Server(
  { name: 'kds-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_tickets',
      description: 'Get active kitchen tickets, optionally filtered by station or status',
      inputSchema: {
        type: 'object',
        properties: {
          station: { type: 'string', description: 'hot | cold | grill | fry | sauce | pastry | pass | bar' },
          status:  { type: 'string', description: 'queued | fired | cooking | bumped' },
        },
      },
    },
    {
      name: 'get_ticket',
      description: 'Get full detail for a single kitchen ticket',
      inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' } }, required: ['ticket_id'] },
    },
    {
      name: 'fire_ticket',
      description: 'Fire a queued ticket to the kitchen display',
      inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' } }, required: ['ticket_id'] },
    },
    {
      name: 'bump_ticket',
      description: 'Bump (complete) a kitchen ticket when the food is ready',
      inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' } }, required: ['ticket_id'] },
    },
    {
      name: 'recall_ticket',
      description: 'Recall a bumped ticket back to cooking status',
      inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' } }, required: ['ticket_id'] },
    },
    {
      name: 'get_station_summary',
      description: 'Get active ticket count per kitchen station',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'rush_ticket',
      description: 'Mark a ticket as RUSH priority',
      inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' } }, required: ['ticket_id'] },
    },
    {
      name: 'void_ticket',
      description: 'Void a kitchen ticket (e.g. item cancelled by POS)',
      inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' }, reason: { type: 'string' } }, required: ['ticket_id'] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args as Record<string, any>;
  try {
    switch (name) {
      case 'get_tickets': {
        const qs = new URLSearchParams();
        if (a.station) qs.set('station', a.station);
        if (a.status)  qs.set('status', a.status);
        const data = await kds('GET', `/v1/tickets?${qs}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_ticket': {
        const data = await kds('GET', `/v1/tickets/${a.ticket_id}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'fire_ticket': {
        const data = await kds('PATCH', `/v1/tickets/${a.ticket_id}`, { status: 'fired', fired_at: new Date().toISOString() });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'bump_ticket': {
        const data = await kds('PATCH', `/v1/tickets/${a.ticket_id}`, { status: 'bumped', bumped_at: new Date().toISOString() });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'recall_ticket': {
        const data = await kds('PATCH', `/v1/tickets/${a.ticket_id}`, { status: 'cooking', bumped_at: null });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_station_summary': {
        const data = await kds('GET', '/v1/stations/summary');
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'rush_ticket': {
        const data = await kds('PATCH', `/v1/tickets/${a.ticket_id}`, { priority: 'rush' });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'void_ticket': {
        const data = await kds('PATCH', `/v1/tickets/${a.ticket_id}`, { status: 'voided', void_reason: a.reason });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('KDS MCP server running');
