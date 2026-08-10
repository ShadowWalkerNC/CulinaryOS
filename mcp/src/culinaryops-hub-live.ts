/**
 * CulinaryOS hub LIVE bridge for CulinaryOps tools.
 *
 * The satellite drop-in (`culinaryops-server.ts`) stays byte-synced with
 * CulinaryOps for CI drift checks. This hub entry prefers live `/v1/ops/*`
 * when the CulinaryOS API is reachable (Wedge A — agent-operable ops).
 *
 *   pnpm --filter culinaryos-mcp-servers run start-culinaryops-live
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { culinaryOsApiHeaders, culinaryOsBaseUrl } from "./api-headers.js";

const SERVER_NAME = "culinaryops-mcp";
const EXTENSION_ID = "com.culinaryos.ext.culinaryops";

const server = new Server(
  { name: SERVER_NAME, version: "0.4.0-hub-live" },
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

async function apiJson(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${culinaryOsBaseUrl()}${path}`, {
      ...init,
      headers: { ...culinaryOsApiHeaders(), ...(init?.headers as Record<string, string> | undefined) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (body as any)?.error?.message ?? res.statusText };
    }
    return { ok: true, data: (body as any).data ?? body };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  const wrap = (data: unknown, demo: boolean) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            satellite: "CulinaryOps",
            extension_id: EXTENSION_ID,
            hub_live: true,
            demo,
            ...((data as object) ?? {}),
          },
          null,
          2
        ),
      },
    ],
  });

  try {
    switch (name) {
      case "get_labor_summary":
        return wrap(
          {
            date_from: a.date_from,
            date_to: a.date_to,
            total_hours: 16,
            total_cost: 336,
            avg_hourly: 21,
            shift_count: 2,
            coverage_by_role: { line: 8, prep: 8 },
            note: "Labor remains satellite-owned; structured demo until CulinaryOps labor API is linked.",
          },
          true
        );

      case "get_food_cost": {
        const live = await apiJson(`/v1/ops/food-cost/${a.item_id}`);
        if (live.ok) return wrap(live.data, Boolean(live.data?.demo));
        return wrap(
          {
            item_id: a.item_id,
            name: "Demo Smash Burger",
            sale_price: 14,
            ingredient_cost: 4.15,
            food_cost_pct: 29.64,
            status: "good",
            fallback_reason: live.error,
          },
          true
        );
      }

      case "log_waste": {
        const live = await apiJson(`/v1/ops/waste`, {
          method: "POST",
          body: JSON.stringify(a),
        });
        if (live.ok) {
          return wrap(
            {
              message: live.data?.demo
                ? "Waste event accepted (API demo store)."
                : "Waste event persisted.",
              record: live.data,
              waste_cost: live.data?.waste_cost,
            },
            Boolean(live.data?.demo)
          );
        }
        const waste_cost =
          typeof a.quantity_grams === "number" && typeof a.cost_per_gram === "number"
            ? Math.round(a.quantity_grams * a.cost_per_gram * 100) / 100
            : 0;
        return wrap(
          {
            message: "Waste event accepted (hub offline fallback — not persisted).",
            record: a,
            waste_cost,
            fallback_reason: live.error,
          },
          true
        );
      }

      case "get_waste_summary": {
        const qs = new URLSearchParams({
          date_from: String(a.date_from ?? ""),
          date_to: String(a.date_to ?? ""),
        });
        const live = await apiJson(`/v1/ops/waste/summary?${qs}`);
        if (live.ok) return wrap(live.data, Boolean(live.data?.demo));
        return wrap(
          {
            date_from: a.date_from,
            date_to: a.date_to,
            log_count: 0,
            total_cost: 0,
            total_grams: 0,
            top_offenders: [],
            fallback_reason: live.error,
          },
          true
        );
      }

      case "list_vendors": {
        const live = await apiJson(`/v1/pantry/purchase-orders`);
        if (live.ok) {
          return wrap(
            {
              vendor_count: Array.isArray(live.data) ? live.data.length : 0,
              purchase_orders: live.data,
              note: "Derived from pantry POs on CulinaryOS hub.",
            },
            false
          );
        }
        return wrap(
          {
            vendor_count: 2,
            vendors: [
              { id: "00000000-0000-4000-8000-0000000000b1", name: "Sysco Demo", open_pos: 1 },
              { id: "00000000-0000-4000-8000-0000000000b2", name: "Local Produce Co", open_pos: 0 },
            ],
            fallback_reason: live.error,
          },
          true
        );
      }

      case "create_purchase_order": {
        const items = (a.items as Array<{ quantity: number; unit_cost?: number }>) ?? [];
        const estimated_total = items.reduce(
          (s, i) => s + i.quantity * (i.unit_cost ?? 0),
          0
        );
        const live = await apiJson(`/v1/pantry/purchase-orders`, {
          method: "POST",
          body: JSON.stringify({
            supplier: a.vendor_id,
            lines: a.items,
          }),
        });
        if (live.ok) {
          return wrap(
            {
              message: "Purchase order created on CulinaryOS pantry.",
              po: live.data,
              estimated_total: Math.round(estimated_total * 100) / 100,
            },
            false
          );
        }
        return wrap(
          {
            message: "Purchase order created (hub demo — not persisted).",
            po_id: "00000000-0000-4000-8000-0000000000c1",
            vendor_id: a.vendor_id,
            status: "draft",
            line_item_count: items.length,
            estimated_total: Math.round(estimated_total * 100) / 100,
            fallback_reason: live.error,
          },
          true
        );
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
  `[${SERVER_NAME}] hub-live ready — prefers CulinaryOS /v1/ops when API is up`
);
