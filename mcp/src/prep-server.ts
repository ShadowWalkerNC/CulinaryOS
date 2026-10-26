import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { buildShiftPrep, type PrepItem } from "@culinaryos/prep-engine";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export interface PrepServerDeps {
  buildShiftPrep?: typeof buildShiftPrep | null;
}

const ALLOWED_SHIFTS = [
  "morning",
  "afternoon",
  "evening",
  "AM",
  "PM",
  "Brunch",
  "Dinner",
  "Overnight",
  "Custom",
];

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

function isValidPrepItem(item: unknown): item is PrepItem {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate["ingredient"] === "string" &&
    candidate["ingredient"].trim().length > 0 &&
    typeof candidate["currentStock"] === "number" &&
    Number.isFinite(candidate["currentStock"]) &&
    candidate["currentStock"] >= 0 &&
    typeof candidate["parLevel"] === "number" &&
    Number.isFinite(candidate["parLevel"]) &&
    candidate["parLevel"] > 0 &&
    typeof candidate["unit"] === "string" &&
    candidate["unit"].trim().length > 0
  );
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function createPrepServer(deps: PrepServerDeps = {}): Server {
  const runBuildShiftPrep =
    "buildShiftPrep" in deps ? deps.buildShiftPrep : buildShiftPrep;

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

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "build_shift_prep",
          description: "Builds a complete shift prep execution sheet based on target covers and shift type",
          inputSchema: {
            type: "object",
            properties: {
              shift: {
                type: "string",
                enum: ["morning", "afternoon", "evening", "AM", "PM", "Brunch", "Dinner", "Overnight", "Custom"],
                description: "Shift to build the prep plan for",
              },
              prepItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ingredient: { type: "string", description: "Ingredient name" },
                    currentStock: { type: "number", description: "Current stock on hand" },
                    parLevel: { type: "number", description: "Par level target" },
                    unit: { type: "string", description: "Unit of measure" },
                  },
                  required: ["ingredient", "currentStock", "parLevel", "unit"],
                },
                description: "Prep items with current stock and par levels",
              },
              date: {
                type: "string",
                description: "ISO date for the prep plan (defaults to today)",
              },
            },
            required: ["shift", "prepItems"],
          },
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
        const { shift, prepItems, date } = (args ?? {}) as {
          shift?: unknown;
          prepItems?: unknown;
          date?: unknown;
        };

        if (typeof shift !== "string" || !ALLOWED_SHIFTS.includes(shift)) {
          throw new Error(
            `Invalid shift: expected one of ${ALLOWED_SHIFTS.join(", ")}`
          );
        }
        if (!Array.isArray(prepItems) || prepItems.length === 0 || !prepItems.every(isValidPrepItem)) {
          throw new Error(
            "Invalid or missing prepItems: expected a non-empty array of { ingredient, currentStock >= 0, parLevel > 0, unit }; refusing to fabricate shift prep from hardcoded demo data"
          );
        }
        if (date !== undefined && (typeof date !== "string" || !isValidIsoDate(date))) {
          throw new Error("Invalid date: expected a valid YYYY-MM-DD calendar date string");
        }
        if (typeof runBuildShiftPrep !== "function") {
          throw new Error("buildShiftPrep engine unavailable");
        }

        const normalizedItems: PrepItem[] = prepItems.map((item) => ({
          ingredient: item.ingredient.trim(),
          currentStock: item.currentStock,
          parLevel: item.parLevel,
          unit: item.unit.trim(),
        }));

        const plan = runBuildShiftPrep(
          normalizedItems,
          shift,
          typeof date === "string" ? date : new Date().toISOString().slice(0, 10)
        );
        if (!plan || !Array.isArray(plan.items)) {
          throw new Error("Prep engine returned an invalid shift prep plan");
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(plan, null, 2),
            },
          ],
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

  return server;
}

export const server = createPrepServer();

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PrepEngine MCP Server running on STDIO");
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Fatal error starting PrepEngine MCP Server:", err);
    process.exit(1);
  });
}
