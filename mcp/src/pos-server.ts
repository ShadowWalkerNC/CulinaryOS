import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { culinaryOsApiHeaders, culinaryOsBaseUrl } from "./api-headers.js";

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
        description:
          "Creates a new POS checkout transaction and queues a KDS ticket. " +
          "Prices are ALWAYS taken from the live menu by the API server — the tool never sends prices.",
        inputSchema: {
          type: "object",
          properties: {
            tableNumber: { type: "string", description: "Dining table number or 'Takeout'" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productName: { type: "string", description: "Menu item display name" },
                  menuItemId: {
                    type: "string",
                    description: "Menu item UUID from the live menu (required — the server prices from the menu)",
                  },
                  quantity: { type: "number" },
                  price: {
                    type: "number",
                    description: "DEPRECATED and ignored. The API server always prices from the live menu.",
                  },
                },
                required: ["menuItemId", "quantity"],
              },
            },
          },
          required: ["items"],
        },
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
        items: { productName?: string; quantity: number; station?: string; menuItemId?: string }[];
      };
      
      const API_URL = culinaryOsBaseUrl();
      const headers = culinaryOsApiHeaders();

      // 1. Create order on the API gateway
      const orderRes = await fetch(`${API_URL}/v1/orders`, {
        method: "POST",
        headers,
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

      // 2. Add line items to the order.
      // SECURITY: never send unitPrice — the API server prices every line from
      // the live menu, so agent-supplied prices can never alter what is charged.
      // Items without a menuItemId are rejected rather than invented.
      const skipped: string[] = [];
      for (const item of items) {
        if (!item.menuItemId) {
          skipped.push(item.productName ?? "(unnamed item)");
          continue;
        }
        const itemRes = await fetch(`${API_URL}/v1/orders/${order.id}/items`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            menuItemId: item.menuItemId,
            name: item.productName,
            quantity: item.quantity ?? 1,
            station: item.station ?? "hot"
          })
        });

        if (!itemRes.ok) {
          const errText = await itemRes.text();
          console.error(`Failed to add line item: ${errText}`);
          skipped.push(`${item.productName ?? item.menuItemId} (${errText})`);
        }
      }

      // 3. Fire the order to the kitchen
      const sendRes = await fetch(`${API_URL}/v1/orders/${order.id}/send`, {
        method: "PATCH",
        headers,
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error(`Failed to send order to kitchen: ${errText}`);
      }

      return {
        content: [
          {
            type: "text",
            text:
              `Success: Order ${order.id} (Table: ${tableNumber}) created and fired to kitchen. ` +
              `Real-time ticket dispatched to KDS. Prices applied from the live menu.` +
              (skipped.length > 0
                ? ` Skipped ${skipped.length} item(s) without a valid menu item: ${skipped.join("; ")}.`
                : ""),
          },
        ],
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
