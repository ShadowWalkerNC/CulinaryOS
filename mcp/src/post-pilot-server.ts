import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "Post-Pilot",
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
        name: "send_marketing_postcard",
        description: "Dispatches a physical marketing postcard coupon to a customer address",
        inputSchema: {
          type: "object",
          properties: {
            customerName: { type: "string", description: "Name of the guest recipient" },
            address: { type: "string", description: "Mailing address of the guest" },
            discountPercent: { type: "number", description: "Coupon discount percentage (e.g. 15)" },
            couponMessage: { type: "string", description: "Message printed on the postcard" }
          },
          required: ["customerName", "address", "discountPercent"]
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "send_marketing_postcard") {
      const { customerName, address, discountPercent, couponMessage = "Thanks for dining!" } = args as {
        customerName: string;
        address: string;
        discountPercent: number;
        couponMessage?: string;
      };

      console.error(`[Post-Pilot] Dispatching postcard to ${customerName} at ${address}`);

      return {
        content: [
          {
            type: "text",
            text: `Success: Post-Pilot postcard queued for dispatch to ${customerName}. Code: SAVE${discountPercent}. Message: "${couponMessage}".`
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
  console.error("Post-Pilot Marketing MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting Post-Pilot MCP Server:", err);
  process.exit(1);
});
