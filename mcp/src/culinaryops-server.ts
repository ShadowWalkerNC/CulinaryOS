import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// CulinaryOps — Operations satellite bridge.
// Exposes the CulinaryOps ops surface (labor / food cost / vendors / waste) to
// the CulinaryOS hub as an MCP server. This is DISTINCT from the core hub
// server `culinaryos-mcp` (mcp/culinary-os-server.ts): server name here is
// `culinaryops-mcp`, and it targets the standalone CulinaryOps service at
// CULINARYOPS_URL — mirroring how the KitchenKit recipe/prep servers bridge in.
const server = new Server(
  {
    name: "culinaryops-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_labor_summary",
        description: "Labor hours, cost, and cost-of-sales % for a date range",
        inputSchema: {
          type: "object",
          properties: {
            from: { type: "string", description: "Start date (ISO 8601)" },
            to: { type: "string", description: "End date (ISO 8601)" },
          },
        },
      },
      {
        name: "get_food_cost",
        description: "Food-cost report (theoretical vs actual) for a period",
        inputSchema: {
          type: "object",
          properties: {
            period: { type: "string", description: "e.g. '7d', '30d', 'mtd'" },
          },
        },
      },
      {
        name: "list_vendors",
        description: "List active vendors / suppliers and their terms",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "log_waste",
        description: "Log a waste / spoilage event against an inventory item",
        inputSchema: {
          type: "object",
          properties: {
            item: { type: "string", description: "Ingredient or item name/ID" },
            quantity: { type: "number", description: "Amount wasted" },
            unit: { type: "string", description: "Unit of measure (e.g. 'kg', 'each')" },
            reason: { type: "string", description: "Reason (spoilage, prep error, comp, etc.)" },
          },
          required: ["item", "quantity", "unit"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const API_URL = process.env.CULINARYOPS_URL || "http://localhost:3004";
  const TENANT_ID = process.env.VITE_TENANT_ID || "00000000-0000-0000-0000-000000000001";
  const API_KEY = process.env.CULINARY_API_KEY || process.env.INTERNAL_API_KEY || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-Id": TENANT_ID,
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const ok = (text: string) => ({ content: [{ type: "text", text }] });

  try {
    if (name === "get_labor_summary") {
      const { from, to } = args as { from?: string; to?: string };
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`${API_URL}/v1/labor/summary?${qs}`, { headers });
      if (!res.ok) throw new Error(`labor summary → ${res.status} ${await res.text()}`);
      const body = (await res.json()) as any;
      return ok(JSON.stringify(body.data ?? body, null, 2));
    }

    if (name === "get_food_cost") {
      const { period } = args as { period?: string };
      const qs = new URLSearchParams();
      if (period) qs.set("period", period);
      const res = await fetch(`${API_URL}/v1/food-cost?${qs}`, { headers });
      if (!res.ok) throw new Error(`food cost → ${res.status} ${await res.text()}`);
      const body = (await res.json()) as any;
      return ok(JSON.stringify(body.data ?? body, null, 2));
    }

    if (name === "list_vendors") {
      const res = await fetch(`${API_URL}/v1/vendors`, { headers });
      if (!res.ok) throw new Error(`vendors → ${res.status} ${await res.text()}`);
      const body = (await res.json()) as any;
      return ok(JSON.stringify(body.data ?? body, null, 2));
    }

    if (name === "log_waste") {
      const res = await fetch(`${API_URL}/v1/waste`, {
        method: "POST",
        headers,
        body: JSON.stringify(args),
      });
      if (!res.ok) throw new Error(`log waste → ${res.status} ${await res.text()}`);
      const body = (await res.json()) as any;
      return ok(`Waste logged on CulinaryOps: ${JSON.stringify(body.data ?? body)}`);
    }

    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CulinaryOps Operations MCP Server (culinaryops-mcp) running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting CulinaryOps MCP Server:", err);
  process.exit(1);
});
