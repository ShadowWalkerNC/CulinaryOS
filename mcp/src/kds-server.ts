import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "KitchenKit",
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
            ticketId: { type: "string", description: "ID of the ticket to bump" }
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

  const API_URL = process.env.CULINARYOS_URL || "http://localhost:3000";
  const TENANT_ID = process.env.VITE_TENANT_ID || "00000000-0000-0000-0000-000000000001";

  try {
    if (name === "fetch_kds_tickets") {
      const res = await fetch(`${API_URL}/v1/kds/tickets`, {
        headers: {
          "X-Tenant-Id": TENANT_ID
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch tickets from API: ${await res.text()}`);
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
    } else if (name === "bump_kds_ticket") {
      const { ticketId } = args as { ticketId: string };
      
      const res = await fetch(`${API_URL}/v1/kds/tickets/${ticketId}/bump`, {
        method: "PATCH",
        headers: {
          "X-Tenant-Id": TENANT_ID
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to bump ticket: ${await res.text()}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Success: Ticket ${ticketId} bumped on KitchenKit.`
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
  console.error("KitchenKit KDS MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting KitchenKit MCP Server:", err);
  process.exit(1);
});
