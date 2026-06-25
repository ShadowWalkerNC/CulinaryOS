import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "culinaryos-kds-server",
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
        name: "fetch_kds_tickets",
        description: "Fetches all active, uncompleted order tickets on the kitchen display queue",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "bump_kds_ticket",
        description: "Completes and removes an order ticket from the active kitchen display queue",
        inputSchema: {
          type: "object",
          properties: {
            ticketId: { type: "string", description: "ID of the ticket to bump (e.g. t-101)" }
          },
          required: ["ticketId"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "fetch_kds_tickets") {
      // Return mocked active KDS tickets structure conforming to types.ts
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                id: "t-101",
                orderId: "o-201",
                tableNumber: "Table 4",
                status: "queued",
                elapsedSeconds: 140,
                priority: "low",
                items: [
                  { id: "i-1", productName: "Sourdough Loaf", quantity: 1, price: 8.50 },
                  { id: "i-2", productName: "Espresso Double", quantity: 1, price: 3.25 }
                ]
              }
            ], null, 2)
          }
        ]
      };
    } else if (name === "bump_kds_ticket") {
      const { ticketId } = args as { ticketId: string };
      
      return {
        content: [
          {
            type: "text",
            text: `Success: Ticket ${ticketId} bumped. Status updated to 'bumped' in database.`
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
  console.error("CulinaryOS KDS MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting KDS MCP Server:", err);
  process.exit(1);
});
