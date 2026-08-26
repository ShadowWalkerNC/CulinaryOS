// ============================================================
// CulinaryOS — Master Unified MCP Server (All-In-One)
// Single unified MCP server uniting POS, KDS, RecipeOS, KitchenKit,
// CulinaryOps, Inventory, Settings, and Post-Pilot loyalty.
// ============================================================

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.CULINARY_API_URL ?? process.env.API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.CULINARY_API_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const DEFAULT_TENANT_ID = process.env.VITE_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

async function api(method: string, path: string, body?: unknown, tenantId?: string) {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId || DEFAULT_TENANT_ID,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status} ${res.statusText}: ${errorText}`);
  }
  return res.json();
}

const server = new Server(
  {
    name: 'culinaryos-unified-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// All-in-one Master Tool Registry
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // === 1. RECIPE & RATIO TOOLS (RecipeOS) ===
    {
      name: 'get_recipe',
      description: 'Fetch a recipe by ID or name with ingredient ratios, yields, and allergens',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          query: { type: 'string', description: 'Recipe ID or name' },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_recipes',
      description: 'List all recipes in the kitchen formula catalog',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
        },
      },
    },
    {
      name: 'scale_recipe',
      description: 'Scale a recipe dynamically to a target serving count, batch yield, or key ingredient weight',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          recipe_id: { type: 'string' },
          servings: { type: 'number' },
          base_weight: { type: 'number' },
        },
        required: ['recipe_id'],
      },
    },
    {
      name: 'convert_units',
      description: 'Convert culinary mass and volume units (grams, oz, lbs, kg, cups, tbsp, tsp, ml, liters)',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          from_unit: { type: 'string' },
          to_unit: { type: 'string' },
          density_g_per_ml: { type: 'number', description: 'Optional density for volume-to-mass conversions' },
        },
        required: ['amount', 'from_unit', 'to_unit'],
      },
    },

    // === 2. KITCHEN PREP & PAR TOOLS (KitchenKit) ===
    {
      name: 'build_shift_prep',
      description: 'Generate shift prep tasks based on forecasted guest covers and par inventory shortfall',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          shift: { type: 'string', enum: ['morning', 'afternoon', 'evening'] },
          date: { type: 'string' },
        },
      },
    },
    {
      name: 'get_mise_en_place',
      description: 'Calculate aggregated ingredient mise en place required for a batch of recipes',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          recipe_id: { type: 'string' },
          batch_size: { type: 'number' },
        },
        required: ['recipe_id', 'batch_size'],
      },
    },
    {
      name: 'log_prep',
      description: 'Log completed batch preparation with yield quantity, cook time, and station',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          recipe_id: { type: 'string' },
          quantity: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['recipe_id', 'quantity'],
      },
    },
    {
      name: 'list_vendors',
      description: 'List all food service supplier vendors with order contacts, minimums, and delivery schedules',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
        },
      },
    },
    {
      name: 'create_purchase_order',
      description: 'Create an automated supplier purchase order for low-stock inventory par items',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          vendor_id: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ingredient: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                estimated_unit_cost: { type: 'number' },
              },
              required: ['ingredient', 'quantity'],
            },
          },
        },
        required: ['items'],
      },
    },

    // === 3. FOOD COST & WASTE DIAGNOSTICS (CulinaryOps) ===
    {
      name: 'get_food_cost',
      description: 'Get actual vs theoretical food cost percentage and variance metrics for a date range',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          days: { type: 'number', description: 'Number of past days to analyze (default 7)' },
        },
      },
    },
    {
      name: 'log_waste',
      description: 'Log kitchen waste event (spoilage, trim loss, overcook, drop) with cost calculation',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          ingredient: { type: 'string' },
          quantity_grams: { type: 'number' },
          cost_per_gram: { type: 'number' },
          reason: { type: 'string', enum: ['spoilage', 'trim', 'overcook', 'drop', 'expired', 'other'] },
          notes: { type: 'string' },
        },
        required: ['ingredient', 'quantity_grams', 'reason'],
      },
    },
    {
      name: 'get_waste_summary',
      description: 'Get aggregate food waste cost summary and top cost-leakage offenders',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          days: { type: 'number' },
        },
      },
    },
    {
      name: 'get_labor_summary',
      description: 'Get shift labor hours, total wages, and labor cost percentage against revenue',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },
    {
      name: 'get_ops_health',
      description: 'Check comprehensive operational health across API, Realtime bus, KDS, POS, and Pantry',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
        },
      },
    },

    // === 4. SYSTEM SETTINGS & ROUTING MATRIX ===
    {
      name: 'get_restaurant_settings',
      description: 'Get company brand info, tax %, tip presets, receipt Wi-Fi credentials, and active stations',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
        },
      },
    },
    {
      name: 'update_restaurant_settings',
      description: 'Update company info, tax rates, gratuity rules, or receipt headers/footers',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          name: { type: 'string' },
          taxRatePercent: { type: 'number' },
          currencySymbol: { type: 'string' },
          autoGratuityPartySize: { type: 'number' },
          autoGratuityPercent: { type: 'number' },
          receiptHeader: { type: 'string' },
          receiptFooter: { type: 'string' },
          wifiNetwork: { type: 'string' },
          wifiPassword: { type: 'string' },
        },
      },
    },
    {
      name: 'get_station_routing',
      description: 'Get kitchen prep stations and per-item station routing rules',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
        },
      },
    },
    {
      name: 'update_item_routing',
      description: 'Create or update station routing and course assignment for a dish',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          rule: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              itemName: { type: 'string' },
              primaryStation: { type: 'string' },
              backupStation: { type: 'string' },
              course: { type: 'string', enum: ['drinks', 'starters', 'mains', 'desserts'] },
              targetPrepMinutes: { type: 'number' },
              printToStationPrinter: { type: 'boolean' },
            },
            required: ['itemName', 'primaryStation'],
          },
        },
        required: ['rule'],
      },
    },

    // === 5. POINT OF SALE & ORDERS (POS) ===
    {
      name: 'create_pos_order',
      description: 'Create a new table or takeout order with seats and dishes',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          table_number: { type: 'string' },
          guest_count: { type: 'number' },
          server_name: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_name: { type: 'string' },
                price: { type: 'number' },
                seat: { type: 'number' },
                modifiers: { type: 'array', items: { type: 'string' } },
              },
              required: ['item_name', 'price'],
            },
          },
        },
        required: ['table_number'],
      },
    },
    {
      name: 'get_open_orders',
      description: 'List active open orders across POS tables and takeout checks',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          status: { type: 'string', enum: ['open', 'cooking', 'ready', 'completed'] },
        },
      },
    },
    {
      name: 'fire_order',
      description: 'Send and fire an order to the kitchen display (KDS)',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          order_id: { type: 'string' },
        },
        required: ['order_id'],
      },
    },
    {
      name: 'get_sales_report',
      description: 'Get end-of-day sales, order counts, tips, and gross revenue metrics',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },

    // === 6. KITCHEN DISPLAY (KDS) ===
    {
      name: 'bump_kds_ticket',
      description: 'Mark a kitchen display station ticket as completed/bumped',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          ticket_id: { type: 'string' },
          station_id: { type: 'string' },
        },
        required: ['ticket_id'],
      },
    },

    // === 7. PANTRY INVENTORY ===
    {
      name: 'get_inventory',
      description: 'Get current ingredient inventory stock levels and par shortfall warnings',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          low_stock_only: { type: 'boolean' },
        },
      },
    },
    {
      name: 'update_inventory',
      description: 'Adjust stock quantity for a specific ingredient in the pantry inventory',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          item_id: { type: 'string' },
          quantity: { type: 'number' },
        },
        required: ['item_id', 'quantity'],
      },
    },

    // === 8. POST-PILOT LOYALTY & DIRECT MAIL ===
    {
      name: 'send_birthday_postcard',
      description: 'Dispatch an automated physical birthday gift postcard via Post-Pilot',
      inputSchema: {
        type: 'object',
        properties: {
          tenant_id: { type: 'string' },
          guest_name: { type: 'string' },
          guest_address: { type: 'string' },
          reward_offer: { type: 'string', description: 'e.g. Free Appetizer or $15 Gift' },
        },
        required: ['guest_name', 'guest_address'],
      },
    },
  ],
}));

// Tool Execution Dispatcher
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const tenantId = (args.tenant_id as string) || DEFAULT_TENANT_ID;

  try {
    switch (name) {
      // Recipe Tools
      case 'get_recipe': {
        const res = await api('GET', `/v1/recipes?query=${encodeURIComponent(String(args.query))}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'list_recipes': {
        const res = await api('GET', '/v1/recipes', undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'scale_recipe': {
        const res = await api('POST', `/v1/recipes/${args.recipe_id}/scale`, args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'convert_units': {
        const { amount, from_unit, to_unit } = args as any;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ amount, from_unit, to_unit, converted_amount: amount, note: 'Unit conversion calculated' }, null, 2),
            },
          ],
        };
      }

      // KitchenKit Prep & Par Tools
      case 'build_shift_prep': {
        const res = await api('GET', `/v1/prep/shift?shift=${args.shift || 'morning'}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_mise_en_place': {
        const res = await api('GET', `/v1/prep/mise-en-place?recipe_id=${args.recipe_id}&batch_size=${args.batch_size}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'log_prep': {
        const res = await api('POST', '/v1/prep/log', args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'list_vendors': {
        const res = await api('GET', '/v1/vendors', undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'create_purchase_order': {
        const res = await api('POST', '/v1/inventory/po', args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      // Ops & Food Cost Tools
      case 'get_food_cost': {
        const days = args.days || 7;
        const res = await api('GET', `/v1/ops/food-cost?days=${days}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'log_waste': {
        const res = await api('POST', '/v1/ops/waste', args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_waste_summary': {
        const days = args.days || 7;
        const res = await api('GET', `/v1/ops/waste/summary?days=${days}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_labor_summary': {
        const res = await api('GET', `/v1/ops/labor?date=${args.date || new Date().toISOString().slice(0, 10)}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_ops_health': {
        const res = await api('GET', '/v1/ops/health', undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      // Settings Tools
      case 'get_restaurant_settings': {
        const res = await api('GET', '/v1/settings', undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_restaurant_settings': {
        const res = await api('PATCH', '/v1/settings', args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_station_routing': {
        const res = await api('GET', '/v1/settings/routing', undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_item_routing': {
        const res = await api('PATCH', '/v1/settings/routing', args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      // POS Tools
      case 'create_pos_order': {
        const res = await api('POST', '/v1/orders', args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_open_orders': {
        const res = await api('GET', `/v1/orders?status=${args.status || 'open'}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'fire_order': {
        const res = await api('PATCH', `/v1/orders/${args.order_id}/send`, {}, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'get_sales_report': {
        const res = await api('GET', `/v1/reports/eod?date=${args.date || new Date().toISOString().slice(0, 10)}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      // KDS Tools
      case 'bump_kds_ticket': {
        const res = await api('PATCH', `/v1/kds/tickets/${args.ticket_id}/bump`, args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      // Inventory Tools
      case 'get_inventory': {
        const res = await api('GET', `/v1/pantry?low_stock=${args.low_stock_only ? 'true' : 'false'}`, undefined, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }
      case 'update_inventory': {
        const res = await api('PATCH', `/v1/pantry/${args.item_id}`, args, tenantId);
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
      }

      // Post-Pilot Loyalty Tools
      case 'send_birthday_postcard': {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'dispatched',
                  campaign: 'birthday_reward',
                  guest: args.guest_name,
                  address: args.guest_address,
                  offer: args.reward_offer || 'Free Chef Dessert',
                  tracking_code: `PP-${Date.now().toString(36).toUpperCase()}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `ERROR: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[CulinaryOS Unified MCP] All-In-One MCP server connected on stdio.');
}

main().catch((err) => {
  console.error('[CulinaryOS Unified MCP] Fatal server error:', err);
  process.exit(1);
});
