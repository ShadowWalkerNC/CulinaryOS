import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE   = process.env.POS_API_URL      ?? 'http://localhost:3003';
const KEY    = process.env.INTERNAL_API_KEY ?? '';
const TENANT = process.env.TENANT_ID        ?? 'demo';

async function pos(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { 'Authorization': `Bearer ${KEY}`, 'X-Tenant-Id': TENANT, 'X-Caller-Service': 'pos', 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.json();
}

const server = new Server({ name: 'pos-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: 'list_orders',    description: 'List POS orders, optionally filtered by status',       inputSchema: { type:'object', properties: { status: { type:'string' } } } },
    { name: 'get_order',      description: 'Get full order details including line items',           inputSchema: { type:'object', properties: { order_id: { type:'string' } }, required:['order_id'] } },
    { name: 'create_order',   description: 'Create a new order',                                   inputSchema: { type:'object', properties: { table_number:{type:'string'}, cover_count:{type:'number'}, server_name:{type:'string'} } } },
    { name: 'add_item',       description: 'Add a menu item to an open order',                     inputSchema: { type:'object', properties: { order_id:{type:'string'}, menu_item_id:{type:'string'}, quantity:{type:'number'}, notes:{type:'string'} }, required:['order_id','menu_item_id'] } },
    { name: 'fire_order',     description: 'Fire an order to the kitchen (sends to KDS)',          inputSchema: { type:'object', properties: { order_id:{type:'string'} }, required:['order_id'] } },
    { name: 'void_order',     description: 'Void an order',                                        inputSchema: { type:'object', properties: { order_id:{type:'string'}, reason:{type:'string'} }, required:['order_id'] } },
    { name: 'get_menu',       description: 'Get the active menu with sections and items',          inputSchema: { type:'object', properties: {} } },
    { name: 'update_item_status', description: '86 or restore a menu item',                       inputSchema: { type:'object', properties: { item_id:{type:'string'}, status:{type:'string', description:'available|unavailable|86d'} }, required:['item_id','status'] } },
    { name: 'charge_order',   description: 'Process payment for an order',                        inputSchema: { type:'object', properties: { order_id:{type:'string'}, method:{type:'string'}, tip_amount:{type:'number'} }, required:['order_id','method'] } },
    { name: 'open_tab',       description: 'Open a guest tab for a table',                        inputSchema: { type:'object', properties: { table_number:{type:'string'}, cover_count:{type:'number'}, server_name:{type:'string'} } } },
    { name: 'list_open_tabs', description: 'List all open tabs',                                  inputSchema: { type:'object', properties: {} } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const a = args as Record<string, any>;
  try {
    switch (name) {
      case 'list_orders':        return { content: [{ type:'text', text: JSON.stringify(await pos('GET', `/v1/orders${a.status ? `?status=${a.status}` : ''}`), null, 2) }] };
      case 'get_order':          return { content: [{ type:'text', text: JSON.stringify(await pos('GET', `/v1/orders/${a.order_id}`), null, 2) }] };
      case 'create_order':       return { content: [{ type:'text', text: JSON.stringify(await pos('POST', '/v1/orders', a), null, 2) }] };
      case 'add_item':           return { content: [{ type:'text', text: JSON.stringify(await pos('POST', `/v1/orders/${a.order_id}/items`, a), null, 2) }] };
      case 'fire_order':         return { content: [{ type:'text', text: JSON.stringify(await pos('PATCH', `/v1/orders/${a.order_id}`, { status:'sent', fired_at: new Date().toISOString() }), null, 2) }] };
      case 'void_order':         return { content: [{ type:'text', text: JSON.stringify(await pos('PATCH', `/v1/orders/${a.order_id}`, { status:'voided', void_reason: a.reason }), null, 2) }] };
      case 'get_menu':           return { content: [{ type:'text', text: JSON.stringify(await pos('GET', '/v1/menu'), null, 2) }] };
      case 'update_item_status': return { content: [{ type:'text', text: JSON.stringify(await pos('PATCH', `/v1/menu/items/${a.item_id}`, { status: a.status }), null, 2) }] };
      case 'charge_order':       return { content: [{ type:'text', text: JSON.stringify(await pos('POST', '/v1/payments', a), null, 2) }] };
      case 'open_tab':           return { content: [{ type:'text', text: JSON.stringify(await pos('POST', '/v1/tabs', a), null, 2) }] };
      case 'list_open_tabs':     return { content: [{ type:'text', text: JSON.stringify(await pos('GET', '/v1/tabs?status=open'), null, 2) }] };
      default: throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return { content: [{ type:'text', text: `Error: ${err.message}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
console.error('POS MCP server running');
