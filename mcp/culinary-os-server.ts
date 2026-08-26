import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.CULINARY_API_URL ?? process.env.API_URL ?? 'http://localhost:3000';
const API_KEY  = process.env.CULINARY_API_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function api(method: string, path: string, body?: unknown, tenantId?: string) {
  const init: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : { 'X-Tenant-Id': '00000000-0000-0000-0000-000000000001' }),
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

const server = new Server(
  { name: 'culinaryos-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_recipe',
      description: 'Fetch a recipe by ID or name with ingredient ratios',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, query: { type: 'string', description: 'Recipe ID or name' } }, required: ['query'] },
    },
    {
      name: 'scale_recipe',
      description: 'Scale a recipe to a target serving count or base ingredient weight',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, recipe_id: { type: 'string' }, servings: { type: 'number' }, base_weight: { type: 'number' } }, required: ['recipe_id'] },
    },
    {
      name: 'list_recipes',
      description: 'List all available recipes in the kitchen catalog',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' } } },
    },
    {
      name: 'build_shift_prep',
      description: 'Generate a shift prep plan comparing par levels and current stock',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, shift: { type: 'string', enum: ['morning', 'afternoon', 'evening'] }, date: { type: 'string' } } },
    },
    {
      name: 'get_mise_en_place',
      description: 'Calculate ingredient mise en place required for a batch of recipes',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, recipe_id: { type: 'string' }, batch_size: { type: 'number' } }, required: ['recipe_id', 'batch_size'] },
    },
    {
      name: 'get_inventory',
      description: 'Get current ingredient stock levels and par alerts for a tenant',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, low_stock_only: { type: 'boolean' } } },
    },
    {
      name: 'update_inventory',
      description: 'Update stock quantity for a specific ingredient in pantry',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, item_id: { type: 'string' }, quantity: { type: 'number' } }, required: ['item_id', 'quantity'] },
    },
    {
      name: 'get_open_orders',
      description: 'List active orders across POS and KDS',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, status: { type: 'string', enum: ['open', 'cooking', 'ready', 'completed'] } } },
    },
    {
      name: 'fire_order',
      description: 'Send and fire an order to the kitchen display (KDS)',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, order_id: { type: 'string' } }, required: ['order_id'] },
    },
    {
      name: 'bump_kds_ticket',
      description: 'Mark a kitchen display station ticket as completed/bumped',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, ticket_id: { type: 'string' }, station_id: { type: 'string' } }, required: ['ticket_id'] },
    },
    {
      name: 'create_menu',
      description: 'Create a new digital menu for a restaurant tenant',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, name: { type: 'string' } }, required: ['name'] },
    },
    {
      name: 'get_sales_report',
      description: 'Get daily sales, order count, and revenue metrics',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } } },
    },
    {
      name: 'log_prep',
      description: 'Log a kitchen shift prep activity or batch production',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, recipe_id: { type: 'string' }, quantity: { type: 'number' }, notes: { type: 'string' } }, required: ['recipe_id', 'quantity'] },
    },
    {
      name: 'get_ops_health',
      description: 'Check full operational health across API, Realtime, KDS, POS, and Pantry',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' } } },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, any>;
  const tenantId = a.tenant_id ?? '00000000-0000-0000-0000-000000000001';

  try {
    switch (name) {
      case 'get_recipe': {
        const data = await api('GET', `/v1/pantry/recipes?q=${encodeURIComponent(a.query)}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'scale_recipe': {
        const data = await api('POST', `/v1/pantry/recipes/${a.recipe_id}/scale`, { servings: a.servings, base_weight: a.base_weight }, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'list_recipes': {
        const data = await api('GET', `/v1/pantry/recipes`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'build_shift_prep': {
        const shift = a.shift ?? 'morning';
        const date = a.date ?? new Date().toISOString().slice(0, 10);
        const data = await api('GET', `/v1/ops/prep-plans?shift=${shift}&date=${date}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_mise_en_place': {
        const data = await api('POST', `/v1/ops/mise-en-place`, { recipeId: a.recipe_id, batchSize: a.batch_size }, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_inventory': {
        const qs = a.low_stock_only ? '?filter=low' : '';
        const data = await api('GET', `/v1/pantry/ingredients${qs}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'update_inventory': {
        const data = await api('PATCH', `/v1/pantry/ingredients/${a.item_id}`, { quantity: a.quantity }, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_open_orders': {
        const status = a.status ?? 'open';
        const data = await api('GET', `/v1/orders?status=${status}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'fire_order': {
        const data = await api('PATCH', `/v1/orders/${a.order_id}/send`, {}, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'bump_kds_ticket': {
        const data = await api('PATCH', `/v1/kds/tickets/${a.ticket_id}/bump`, { stationId: a.station_id ?? 'expo' }, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'create_menu': {
        const data = await api('POST', `/v1/menus`, { name: a.name }, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_sales_report': {
        const date = a.date ?? new Date().toISOString().slice(0, 10);
        const data = await api('GET', `/v1/reports/sales?date=${date}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'log_prep': {
        const data = await api('POST', `/v1/ops/prep-log`, { recipeId: a.recipe_id, quantity: a.quantity, notes: a.notes }, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_ops_health': {
        const data = await api('GET', `/health`, undefined, tenantId);
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
console.error('CulinaryOS Unified MCP server running on stdio');

