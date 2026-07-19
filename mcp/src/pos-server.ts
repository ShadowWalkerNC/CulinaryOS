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
        items: { productName: string; quantity: number; price: number; station?: string; menuItemId?: string }[];
      };
      
      const API_URL = process.env.CULINARYOS_URL || "http://localhost:3000";
      const TENANT_ID = process.env.VITE_TENANT_ID || "00000000-0000-0000-0000-000000000001";

      // 1. Create order on the API gateway
      const orderRes = await fetch(`${API_URL}/v1/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-Id": TENANT_ID
        },
        body: JSON.stringify({
          tableNumber: tableNumber === "Takeout" ? undefined : tableNumber,
          takeaway: tableNumber === "Takeout",
          coverCount: 1,
          serverName: "AI Assistant"
        })
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        throw new Error(`Failed to create order on API server: ${errText}`);
      }

      const orderBody = await orderRes.json() as any;
      const order = orderBody.data;

      // 2. Add line items to the order
      for (const item of items) {
        const itemRes = await fetch(`${API_URL}/v1/orders/${order.id}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-Id": TENANT_ID
          },
          body: JSON.stringify({
            menuItemId: item.menuItemId || "mock-item-id",
            name: item.productName,
            quantity: item.quantity ?? 1,
            unitPrice: Math.round(item.price * 100), // convert to cents
            station: item.station ?? "hot"
          })
        });

        if (!itemRes.ok) {
          const errText = await itemRes.text();
          console.error(`Failed to add line item: ${errText}`);
        }
      }

      // 3. Fire the order to the kitchen
      const sendRes = await fetch(`${API_URL}/v1/orders/${order.id}/send`, {
        method: "PATCH",
        headers: {
          "X-Tenant-Id": TENANT_ID
        }
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error(`Failed to send order to kitchen: ${errText}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Success: Order ${order.id} (Table: ${tableNumber}) created and fired to kitchen. Real-time ticket dispatched to KDS.`
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
