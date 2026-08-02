import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.CULINARY_API_URL ?? 'http://localhost:8080';
const API_KEY  = process.env.CULINARY_API_KEY ?? '';

async function api(method: string, path: string, body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
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
      description: 'Fetch a recipe by ID or name',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, query: { type: 'string', description: 'Recipe ID or name' } }, required: ['tenant_id', 'query'] },
    },
    {
      name: 'scale_recipe',
      description: 'Scale a recipe to a target serving count',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, recipe_id: { type: 'string' }, servings: { type: 'number' } }, required: ['tenant_id', 'recipe_id', 'servings'] },
    },
    {
      name: 'get_inventory',
      description: 'Get current ingredient stock levels for a tenant',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, low_stock_only: { type: 'boolean' } }, required: ['tenant_id'] },
    },
    {
      name: 'update_inventory',
      description: 'Update stock quantity for a specific ingredient',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, item_id: { type: 'string' }, quantity: { type: 'number' } }, required: ['tenant_id', 'item_id', 'quantity'] },
    },
    {
      name: 'get_open_orders',
      description: 'List all open kitchen orders for a tenant',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, status: { type: 'string', enum: ['open', 'fired', 'completed'] } }, required: ['tenant_id'] },
    },
    {
      name: 'fire_order',
      description: 'Fire an order to the kitchen',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, order_id: { type: 'string' } }, required: ['tenant_id', 'order_id'] },
    },
    {
      name: 'create_menu',
      description: 'Create a new menu for a tenant',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, name: { type: 'string' } }, required: ['tenant_id', 'name'] },
    },
    {
      name: 'get_sales_report',
      description: 'Get a daily sales summary report',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['tenant_id'] },
    },
    {
      name: 'get_nutritional_info',
      description: 'Get macro/micro nutritional breakdown for a recipe',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, recipe_id: { type: 'string' } }, required: ['tenant_id', 'recipe_id'] },
    },
    {
      name: 'log_prep',
      description: 'Log a kitchen prep activity',
      inputSchema: { type: 'object', properties: { tenant_id: { type: 'string' }, recipe_id: { type: 'string' }, quantity: { type: 'number' }, notes: { type: 'string' } }, required: ['tenant_id', 'recipe_id', 'quantity'] },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = args as Record<string, any>;

  try {
    switch (name) {
      case 'get_recipe': {
        const data = await api('GET', `/api/tenants/${a.tenant_id}/recipes?q=${encodeURIComponent(a.query)}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'scale_recipe': {
        const data = await api('POST', `/api/tenants/${a.tenant_id}/recipes/${a.recipe_id}/scale`, { servings: a.servings });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_inventory': {
        const qs = a.low_stock_only ? '?filter=low' : '';
        const data = await api('GET', `/api/tenants/${a.tenant_id}/inventory${qs}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'update_inventory': {
        await api('PATCH', `/api/tenants/${a.tenant_id}/inventory/${a.item_id}`, { quantity: a.quantity });
        return { content: [{ type: 'text', text: `Stock updated: item ${a.item_id} → ${a.quantity}` }] };
      }
      case 'get_open_orders': {
        const status = a.status ?? 'open';
        const data = await api('GET', `/api/tenants/${a.tenant_id}/orders?status=${status}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'fire_order': {
        await api('POST', `/api/tenants/${a.tenant_id}/orders/${a.order_id}/fire`, {});
        return { content: [{ type: 'text', text: `Order ${a.order_id} fired to kitchen` }] };
      }
      case 'create_menu': {
        const data = await api('POST', `/api/tenants/${a.tenant_id}/menus`, { name: a.name });
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_sales_report': {
        const date = a.date ?? new Date().toISOString().slice(0, 10);
        const data = await api('GET', `/api/tenants/${a.tenant_id}/reports/sales?date=${date}`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'get_nutritional_info': {
        const data = await api('GET', `/api/tenants/${a.tenant_id}/recipes/${a.recipe_id}/nutrition`);
        return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
      }
      case 'log_prep': {
        const data = await api('POST', `/api/tenants/${a.tenant_id}/prep-log`, { recipeId: a.recipe_id, quantity: a.quantity, notes: a.notes });
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
console.error('CulinaryOS MCP server running on stdio');
