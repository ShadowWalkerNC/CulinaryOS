import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "culinaryos-pos-server",
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
        name: "create_order",
        description: "Creates a new POS checkout transaction and queues a KDS ticket",
        inputSchema: {
          type: "object",
          properties: {
            tableNumber: { type: "string", description: "Dining table number or 'Takeout'" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  quantity: { type: "number" },
                  price: { type: "number" }
                },
                required: ["productName", "quantity", "price"]
              }
            }
          },
          required: ["items"]
        }
      },
      {
        name: "apply_loyalty_points",
        description: "Applies loyalty point adjustments to a CRM customer account",
        inputSchema: {
          type: "object",
          properties: {
            customerId: { type: "string", description: "Customer UUID string" },
            pointsToAdjust: { type: "number", description: "Points to add or deduct" }
          },
          required: ["customerId", "pointsToAdjust"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "create_order") {
      const { tableNumber = "Takeout", items } = args as {
        tableNumber?: string;
        items: { productName: string; quantity: number; price: number }[];
      };
      
      const orderId = `o-${Math.floor(1000 + Math.random() * 9000)}`;
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        content: [
          {
            type: "text",
            text: `Success: Order ${orderId} created for ${tableNumber}. Subtotal: $${subtotal.toFixed(2)}. Ticket dispatched to KDS.`
          }
        ]
      };
    } else if (name === "apply_loyalty_points") {
      const { customerId, pointsToAdjust } = args as {
        customerId: string;
        pointsToAdjust: number;
      };

      return {
        content: [
          {
            type: "text",
            text: `Success: Customer ${customerId} account adjusted by ${pointsToAdjust} points.`
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
  console.error("CulinaryOS POS MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting POS MCP Server:", err);
  process.exit(1);
});
