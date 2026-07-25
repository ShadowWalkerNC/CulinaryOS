import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "PrepEngine",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const MOCK_STATION_PREP = {
  hot: [
    { item: "Caramelized Onions", qty: "2.5 kg", status: "completed", assignedTo: "Chef Marco" },
    { item: "Demi-Glace Reduction", qty: "3.0 L", status: "in_progress", assignedTo: "Chef Marco" },
    { item: "Seared Beef Stock", qty: "10.0 L", status: "pending", assignedTo: "Unassigned" }
  ],
  cold: [
    { item: "Washed Arugula & Greens", qty: "1.5 kg", status: "completed", assignedTo: "Prep Sarah" },
    { item: "House Caesar Dressing", qty: "2.0 L", status: "completed", assignedTo: "Prep Sarah" },
    { item: "Shaved Parmesan Crisp", qty: "500 g", status: "pending", assignedTo: "Prep Sarah" }
  ],
  fry: [
    { item: "Cut Russet Potatoes", qty: "15.0 kg", status: "in_progress", assignedTo: "Prep Alex" },
    { item: "Truffle Oil & Herb Blend", qty: "500 ml", status: "completed", assignedTo: "Prep Alex" }
  ],
  bar: [
    { item: "Fresh Squeezed Lime Juice", qty: "1.5 L", status: "completed", assignedTo: "Bar Josh" },
    { item: "Dehydrated Orange Wheels", qty: "100 pcs", status: "completed", assignedTo: "Bar Josh" }
  ]
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "build_shift_prep",
        description: "Builds a complete shift prep execution sheet based on target covers and shift type",
        inputSchema: {
          type: "object",
          properties: {
            shift: { type: "string", enum: ["morning", "evening"], description: "Shift type" },
            expectedCovers: { type: "number", description: "Expected covers for shift" }
          },
          required: ["shift", "expectedCovers"]
        }
      },
      {
        name: "get_mise_en_place",
        description: "Retrieves active mise en place prep items status for a specific station",
        inputSchema: {
          type: "object",
          properties: {
            stationId: { type: "string", description: "Station ID: hot, cold, fry, or bar" }
          },
          required: ["stationId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "build_shift_prep") {
      const { shift, expectedCovers } = args as { shift: "morning" | "evening"; expectedCovers: number };
      const multiplier = expectedCovers / 100;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              shift,
              expectedCovers,
              generatedAt: new Date().toISOString(),
              prepTasks: Object.entries(MOCK_STATION_PREP).flatMap(([station, items]) =>
                items.map(item => ({
                  station,
                  item: item.item,
                  adjustedQuantity: `${(parseFloat(item.qty) * multiplier).toFixed(1)} ${item.qty.split(" ")[1] || ""}`,
                  assignedTo: item.assignedTo
                }))
              )
            }, null, 2)
          }
        ]
      };
    } else if (name === "get_mise_en_place") {
      const { stationId } = args as { stationId: string };
      const key = stationId.toLowerCase() as keyof typeof MOCK_STATION_PREP;
      const prepList = MOCK_STATION_PREP[key] || MOCK_STATION_PREP.hot;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              stationId,
              miseEnPlaceList: prepList
            }, null, 2)
          }
        ]
      };
    } else {
      throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PrepEngine MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting PrepEngine MCP Server:", err);
  process.exit(1);
});
