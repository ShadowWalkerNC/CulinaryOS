import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  buildShiftPrep,
  getMiseEnPlace,
  projectBatchSize,
  emitPrepTaskCompleted,
  type PrepItem,
  type Recipe,
  type ShiftPrepPlan,
} from "@culinaryos/prep-engine";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export interface PrepServerDeps {
  buildShiftPrep?: typeof buildShiftPrep | null;
  getMiseEnPlace?: typeof getMiseEnPlace | null;
  projectBatchSize?: typeof projectBatchSize | null;
  emitPrepTaskCompleted?: typeof emitPrepTaskCompleted | null;
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
  const runGetMiseEnPlace =
    "getMiseEnPlace" in deps ? deps.getMiseEnPlace : getMiseEnPlace;
  const runProjectBatchSize =
    "projectBatchSize" in deps ? deps.projectBatchSize : projectBatchSize;
  const runEmitPrepTaskCompleted =
    "emitPrepTaskCompleted" in deps ? deps.emitPrepTaskCompleted : emitPrepTaskCompleted;

  const savedPlans: Array<ShiftPrepPlan & { planId: string; tenantId: string; savedAt: string }> = [];

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
          description: "Retrieves active mise en place prep items status for a specific station or scales a recipe batch",
          inputSchema: {
            type: "object",
            properties: {
              stationId: { type: "string", description: "Station ID: hot, cold, fry, or bar" },
              recipe: { type: "object", description: "Optional recipe definition to scale via @culinaryos/prep-engine" },
              targetBaseWeight: { type: "number", description: "Target base weight when scaling a recipe" },
            },
            required: ["stationId"]
          }
        },
        {
          name: "project_batch_size",
          description: "Projects total batch weight needed to cover a target guest count with waste factor",
          inputSchema: {
            type: "object",
            properties: {
              portionWeight: { type: "number", description: "Weight per portion (> 0)" },
              covers: { type: "number", description: "Expected cover count (> 0)" },
              wasteFactor: { type: "number", description: "Waste multiplier (>= 1.0, default 1.1)" },
              unit: { type: "string", description: "Unit of measure (default g)" },
            },
            required: ["portionWeight", "covers"],
          },
        },
        {
          name: "complete_prep_item",
          description: "Marks a prep task as completed and emits a prep.task.completed domain event with ingredient decrements",
          inputSchema: {
            type: "object",
            properties: {
              taskId: { type: "string", description: "Unique prep task ID" },
              tenantId: { type: "string", description: "Tenant UUID" },
              decrements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ingredient: { type: "string" },
                    quantity: { type: "number" },
                    unit: { type: "string" },
                  },
                  required: ["ingredient", "quantity"],
                },
              },
              recipeId: { type: "string" },
              recipeName: { type: "string" },
              completedBy: { type: "string" },
            },
            required: ["taskId", "tenantId", "decrements"],
          },
        },
        {
          name: "save_prep_plan",
          description: "Persists a validated shift prep plan for a tenant",
          inputSchema: {
            type: "object",
            properties: {
              tenantId: { type: "string", description: "Tenant UUID" },
              shift: { type: "string", enum: ALLOWED_SHIFTS },
              date: { type: "string", description: "YYYY-MM-DD" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ingredient: { type: "string" },
                    prepAmount: { type: "number" },
                    unit: { type: "string" },
                  },
                  required: ["ingredient", "prepAmount", "unit"],
                },
              },
            },
            required: ["tenantId", "shift", "date", "items"],
          },
        },
        {
          name: "update_stock",
          description: "Applies an inventory delta to a prep ingredient and returns updated stock and shortfall against par",
          inputSchema: {
            type: "object",
            properties: {
              ingredient: { type: "string" },
              currentStock: { type: "number" },
              delta: { type: "number" },
              parLevel: { type: "number" },
              unit: { type: "string" },
            },
            required: ["ingredient", "currentStock", "delta", "parLevel", "unit"],
          },
        },
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
        const { stationId, recipe, targetBaseWeight } = (args ?? {}) as {
          stationId?: string;
          recipe?: Recipe;
          targetBaseWeight?: number;
        };

        if (recipe && typeof targetBaseWeight === "number") {
          if (targetBaseWeight <= 0 || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
            throw new Error("Invalid recipe or targetBaseWeight for get_mise_en_place");
          }
          if (typeof runGetMiseEnPlace !== "function") {
            throw new Error("getMiseEnPlace engine unavailable");
          }
          const scaledList = runGetMiseEnPlace(recipe, targetBaseWeight);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  stationId: stationId ?? "recipe",
                  recipeName: recipe.name,
                  targetBaseWeight,
                  miseEnPlaceList: scaledList,
                }, null, 2),
              },
            ],
          };
        }

        if (typeof stationId !== "string" || stationId.trim().length === 0) {
          throw new Error("stationId is required for station mise en place lookup");
        }
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
      } else if (name === "project_batch_size") {
        const { portionWeight, covers, wasteFactor = 1.1, unit = "g" } = (args ?? {}) as {
          portionWeight?: unknown;
          covers?: unknown;
          wasteFactor?: unknown;
          unit?: unknown;
        };
        if (typeof portionWeight !== "number" || !Number.isFinite(portionWeight) || portionWeight <= 0) {
          throw new Error("Invalid portionWeight: expected a finite number > 0");
        }
        if (typeof covers !== "number" || !Number.isFinite(covers) || covers <= 0) {
          throw new Error("Invalid covers: expected a finite number > 0");
        }
        if (typeof wasteFactor !== "number" || !Number.isFinite(wasteFactor) || wasteFactor < 1) {
          throw new Error("Invalid wasteFactor: expected a finite number >= 1.0");
        }
        if (typeof runProjectBatchSize !== "function") {
          throw new Error("projectBatchSize engine unavailable");
        }
        const projectedBatchWeight = Number(runProjectBatchSize(portionWeight, covers, wasteFactor).toFixed(2));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                portionWeight,
                covers,
                wasteFactor,
                projectedBatchWeight,
                unit: typeof unit === "string" && unit.trim() ? unit.trim() : "g",
              }, null, 2),
            },
          ],
        };
      } else if (name === "complete_prep_item") {
        const { taskId, tenantId, decrements, recipeId, recipeName, completedBy } = (args ?? {}) as {
          taskId?: unknown;
          tenantId?: unknown;
          decrements?: unknown;
          recipeId?: string;
          recipeName?: string;
          completedBy?: string;
        };
        if (typeof taskId !== "string" || taskId.trim().length === 0) {
          throw new Error("Invalid taskId: expected non-empty string");
        }
        if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
          throw new Error("Invalid tenantId: expected non-empty string");
        }
        if (!Array.isArray(decrements) || decrements.length === 0) {
          throw new Error("Invalid decrements: expected non-empty array of ingredient decrements");
        }
        if (typeof runEmitPrepTaskCompleted !== "function") {
          throw new Error("emitPrepTaskCompleted engine unavailable");
        }
        const event = runEmitPrepTaskCompleted({
          taskId: taskId.trim(),
          tenantId: tenantId.trim(),
          decrements: decrements as Array<{ ingredient: string; quantity?: number; amount?: number; unit?: string }>,
          recipeId,
          recipeName,
          completedBy,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(event, null, 2) }],
        };
      } else if (name === "save_prep_plan") {
        const { tenantId, shift, date, items } = (args ?? {}) as {
          tenantId?: unknown;
          shift?: unknown;
          date?: unknown;
          items?: unknown;
        };
        if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
          throw new Error("Invalid tenantId: expected non-empty string");
        }
        if (typeof shift !== "string" || !ALLOWED_SHIFTS.includes(shift)) {
          throw new Error(`Invalid shift: expected one of ${ALLOWED_SHIFTS.join(", ")}`);
        }
        if (typeof date !== "string" || !isValidIsoDate(date)) {
          throw new Error("Invalid date: expected YYYY-MM-DD");
        }
        if (!Array.isArray(items)) {
          throw new Error("Invalid items: expected array of prep items");
        }
        const planId = `prep-plan-${savedPlans.length + 1}`;
        const savedAt = new Date().toISOString();
        const record = {
          planId,
          tenantId: tenantId.trim(),
          shift,
          date,
          items: items as ShiftPrepPlan["items"],
          savedAt,
        };
        savedPlans.push(record);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                saved: true,
                planId,
                tenantId: record.tenantId,
                shift,
                date,
                itemCount: record.items.length,
                savedAt,
              }, null, 2),
            },
          ],
        };
      } else if (name === "update_stock") {
        const { ingredient, currentStock, delta, parLevel, unit } = (args ?? {}) as {
          ingredient?: unknown;
          currentStock?: unknown;
          delta?: unknown;
          parLevel?: unknown;
          unit?: unknown;
        };
        if (typeof ingredient !== "string" || ingredient.trim().length === 0) {
          throw new Error("Invalid ingredient: expected non-empty string");
        }
        if (typeof currentStock !== "number" || !Number.isFinite(currentStock) || currentStock < 0) {
          throw new Error("Invalid currentStock: expected finite number >= 0");
        }
        if (typeof delta !== "number" || !Number.isFinite(delta)) {
          throw new Error("Invalid delta: expected finite number");
        }
        if (typeof parLevel !== "number" || !Number.isFinite(parLevel) || parLevel <= 0) {
          throw new Error("Invalid parLevel: expected finite number > 0");
        }
        if (typeof unit !== "string" || unit.trim().length === 0) {
          throw new Error("Invalid unit: expected non-empty string");
        }
        const updatedStock = Math.max(0, Number((currentStock + delta).toFixed(4)));
        const shortfall = Math.max(0, Number((parLevel - updatedStock).toFixed(4)));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ingredient: ingredient.trim(),
                previousStock: currentStock,
                delta,
                updatedStock,
                parLevel,
                shortfall,
                needsPrep: shortfall > 0,
                unit: unit.trim(),
              }, null, 2),
            },
          ],
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
