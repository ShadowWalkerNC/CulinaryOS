import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "culinaryos-inventory-server",
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
            itemId: { type: "string", description: "ID of the inventory item (e.g. i1)" },
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

  try {
    if (name === "get_inventory_levels") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              { id: "i1", name: "Unbleached Bread Flour", stockQty: 12.5, parLevel: 50.0, unit: "kg", costPerUnit: 2.00 },
              { id: "i2", name: "Active Starter Culture", stockQty: 2.2, parLevel: 5.0, unit: "kg", costPerUnit: 1.50 }
            ], null, 2)
          }
        ]
      };
    } else if (name === "log_audit_count") {
      const { itemId, physicalQty } = args as { itemId: string; physicalQty: number };
      
      // Calculate simple mock variance
      const currentQty = 12.5; // bread flour mock current qty
      const costPerUnit = 2.00;
      const variance = physicalQty - currentQty;
      const loss = Math.abs(variance * costPerUnit);

      return {
        content: [
          {
            type: "text",
            text: `Success: Audit logged for item ${itemId}. Variance: ${variance.toFixed(3)}. Total Loss: $${loss.toFixed(2)}.`
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
  console.error("CulinaryOS Inventory MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting Inventory MCP Server:", err);
  process.exit(1);
});
