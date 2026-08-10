/**
 * culinaryops-mcp — CulinaryOS hub bridge for the CulinaryOps satellite.
 *
 * Server name MUST be `culinaryops-mcp` (not `culinaryos-mcp`).
 * Production: spawn the CulinaryOps repo binary instead:
 *   node /path/to/CulinaryOps/mcp/culinaryops-mcp/dist/index.js
 *
 * This in-hub server provides the same tool surface for local demos / discovery
 * when the satellite repo is not checked out.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SERVER_NAME = "culinaryops-mcp";
const EXTENSION_ID = "com.culinaryos.ext.culinaryops";

const server = new Server(
  { name: SERVER_NAME, version: "0.3.0" },
  { capabilities: { tools: {} } }
);

const TOOLS = [
  {
    name: "get_labor_summary",
    description:
      "CulinaryOps: summarize labor cost (wages, hours, avg hourly) for a date range",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "YYYY-MM-DD" },
        date_to: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "get_food_cost",
    description: "CulinaryOps: food cost % and ingredient breakdown for a menu item",
    inputSchema: {
      type: "object",
      properties: {
        item_id: { type: "string", description: "menu_items UUID" },
      },
      required: ["item_id"],
    },
  },
  {
    name: "log_waste",
    description: "CulinaryOps: log a waste event",
    inputSchema: {
      type: "object",
      properties: {
        ingredient: { type: "string" },
        quantity_grams: { type: "number" },
        cost_per_gram: { type: "number" },
        reason: {
          type: "string",
          enum: ["spoilage", "trim", "overcook", "drop", "expired", "other"],
        },
        log_date: { type: "string" },
        notes: { type: "string" },
      },
      required: ["ingredient", "quantity_grams", "cost_per_gram", "reason"],
    },
  },
  {
    name: "get_waste_summary",
    description: "CulinaryOps: waste cost summary for a date range",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string" },
        date_to: { type: "string" },
      },
      required: ["date_from", "date_to"],
    },
  },
  {
    name: "list_vendors",
    description: "CulinaryOps: list vendors with open PO counts",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_purchase_order",
    description: "CulinaryOps: create a draft purchase order",
    inputSchema: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        order_date: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              unit_cost: { type: "number" },
            },
            required: ["name", "quantity", "unit"],
          },
        },
      },
      required: ["vendor_id", "items"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  const wrap = (data: unknown) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          { satellite: "CulinaryOps", extension_id: EXTENSION_ID, demo: true, ...((data as object) ?? {}) },
          null,
          2
        ),
      },
    ],
  });

  try {
    switch (name) {
      case "get_labor_summary":
        return wrap({
          date_from: a.date_from,
          date_to: a.date_to,
          total_hours: 16,
          total_cost: 336,
          avg_hourly: 21,
          shift_count: 2,
          coverage_by_role: { line: 8, prep: 8 },
          note: "Hub demo payload. Point CulinaryOS at CulinaryOps culinaryops-mcp for live data.",
        });
      case "get_food_cost":
        return wrap({
          item_id: a.item_id,
          name: "Demo Smash Burger",
          sale_price: 14,
          ingredient_cost: 4.15,
          food_cost_pct: 29.64,
          status: "good",
        });
      case "log_waste":
        return wrap({
          message: "Waste event accepted (hub demo — not persisted).",
          record: a,
          waste_cost:
            typeof a.quantity_grams === "number" && typeof a.cost_per_gram === "number"
              ? Math.round(a.quantity_grams * a.cost_per_gram * 100) / 100
              : 0,
        });
      case "get_waste_summary":
        return wrap({
          date_from: a.date_from,
          date_to: a.date_to,
          log_count: 2,
          total_cost: 14,
          total_grams: 240,
          top_offenders: [{ name: "salmon", total_cost: 10, grams: 200 }],
        });
      case "list_vendors":
        return wrap({
          vendor_count: 2,
          vendors: [
            { id: "00000000-0000-4000-8000-0000000000b1", name: "Sysco Demo", open_pos: 1 },
            { id: "00000000-0000-4000-8000-0000000000b2", name: "Local Produce Co", open_pos: 0 },
          ],
        });
      case "create_purchase_order": {
        const items = (a.items as Array<{ quantity: number; unit_cost?: number }>) ?? [];
        const estimated_total = items.reduce(
          (s, i) => s + i.quantity * (i.unit_cost ?? 0),
          0
        );
        return wrap({
          message: "Purchase order created (hub demo — not persisted).",
          po_id: "00000000-0000-4000-8000-0000000000c1",
          vendor_id: a.vendor_id,
          status: "draft",
          line_item_count: items.length,
          estimated_total: Math.round(estimated_total * 100) / 100,
        });
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(
  `[${SERVER_NAME}] CulinaryOS hub bridge ready (extension=${EXTENSION_ID})`
);
