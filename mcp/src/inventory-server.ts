import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "Plated",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_inventory_levels",
        description: "Fetches current stock levels, par points, and unit details for pantry items",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "log_audit_count",
        description: "Logs a physical inventory count audit, reporting calculated variance and loss values",
        inputSchema: {
          type: "object",
          properties: {
            itemId: { type: "string", description: "ID of the inventory item" },
            physicalQty: { type: "number", description: "The physical quantity counted in store" }
          },
          required: ["itemId", "physicalQty"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const API_URL = process.env.CULINARYOS_URL || "http://localhost:3000";
  const TENANT_ID = process.env.VITE_TENANT_ID || "00000000-0000-0000-0000-000000000001";

  try {
    if (name === "get_inventory_levels") {
      const res = await fetch(`${API_URL}/v1/pantry`, {
        headers: {
          "X-Tenant-Id": TENANT_ID
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch inventory: ${await res.text()}`);
      }

      const body = await res.json() as any;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(body.data || [], null, 2)
          }
        ]
      };
    } else if (name === "log_audit_count") {
      const { itemId, physicalQty } = args as { itemId: string; physicalQty: number };

      // 1. Fetch current details to calculate variance
      const getRes = await fetch(`${API_URL}/v1/pantry/${itemId}`, {
        headers: {
          "X-Tenant-Id": TENANT_ID
        }
      });

      if (!getRes.ok) {
        throw new Error(`Item ${itemId} not found in inventory.`);
      }

      const getBody = await getRes.json() as any;
      const currentItem = getBody.data;

      const variance = physicalQty - (currentItem.stock_quantity ?? 0);
      const loss = Math.abs(variance * (currentItem.cost_per_unit ?? 0));

      // 2. Perform updates to pantry levels
      const updateRes = await fetch(`${API_URL}/v1/pantry/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": TENANT_ID
        },
        body: JSON.stringify({
          stockQuantity: physicalQty
        })
      });

      if (!updateRes.ok) {
        throw new Error(`Failed to log audit counts: ${await updateRes.text()}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Success: Audit logged for item ${currentItem.name || itemId} on Plated. Variance: ${variance.toFixed(3)}. Total Loss Calculated: $${(loss / 100).toFixed(2)}.`
          }
        ]
      };
    } else {
      throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Plated Inventory MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting Plated MCP Server:", err);
  process.exit(1);
});
