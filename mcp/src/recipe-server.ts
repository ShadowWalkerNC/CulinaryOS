import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { scaleBlueprint } from "@culinaryos/ratio-engine";

const server = new Server(
  {
    name: "RecipeOS",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const MOCK_RECIPES = [
  {
    id: "r-1",
    name: "Sourdough Boule",
    baseYield: 1,
    yieldUnit: "loaf",
    ingredients: [
      { id: "flour", name: "Bread Flour", ratioWeight: 100, unit: "g" },
      { id: "water", name: "Water", ratioWeight: 75, unit: "ml" },
      { id: "starter", name: "Levain Starter", ratioWeight: 20, unit: "g" },
      { id: "salt", name: "Sea Salt", ratioWeight: 2, unit: "g" }
    ]
  },
  {
    id: "r-2",
    name: "Classic Smash Burger Patty",
    baseYield: 4,
    yieldUnit: "patties",
    ingredients: [
      { id: "beef", name: "Ground Beef 80/20", ratioWeight: 100, unit: "g" },
      { id: "salt", name: "Kosher Salt", ratioWeight: 1.5, unit: "g" },
      { id: "pepper", name: "Black Pepper", ratioWeight: 0.5, unit: "g" }
    ]
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scale_recipe",
        description: "Scale a RecipeOS ratio blueprint to a target serving quantity using ratio engine",
        inputSchema: {
          type: "object",
          properties: {
            recipeId: { type: "string", description: "Recipe ID (e.g. r-1 or r-2)" },
            targetYield: { type: "number", description: "Target yield quantity" }
          },
          required: ["recipeId", "targetYield"]
        }
      },
      {
        name: "get_ratio",
        description: "Get baker's percentage ratio breakdown for a recipe blueprint",
        inputSchema: {
          type: "object",
          properties: {
            recipeId: { type: "string", description: "Recipe ID" }
          },
          required: ["recipeId"]
        }
      },
      {
        name: "list_recipes",
        description: "Lists all available recipe blueprints in the system",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "generate_prep_list",
        description: "Generates an aggregated ingredient prep list based on target cover count",
        inputSchema: {
          type: "object",
          properties: {
            targetCovers: { type: "number", description: "Expected guest cover count for shift" }
          },
          required: ["targetCovers"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "scale_recipe") {
      const { recipeId, targetYield } = args as { recipeId: string; targetYield: number };
      const recipe = MOCK_RECIPES.find((r) => r.id === recipeId || r.name.toLowerCase().includes(recipeId.toLowerCase()));
      if (!recipe) throw new Error(`Recipe ${recipeId} not found`);

      const scaled = scaleBlueprint(recipe as any, targetYield);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              recipeName: recipe.name,
              targetYield,
              unit: recipe.yieldUnit,
              scaledIngredients: scaled
            }, null, 2)
          }
        ]
      };
    } else if (name === "get_ratio") {
      const { recipeId } = args as { recipeId: string };
      const recipe = MOCK_RECIPES.find((r) => r.id === recipeId || r.name.toLowerCase().includes(recipeId.toLowerCase()));
      if (!recipe) throw new Error(`Recipe ${recipeId} not found`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              recipeId: recipe.id,
              name: recipe.name,
              bakersRatios: recipe.ingredients.map(i => ({
                ingredient: i.name,
                ratioPercentage: `${i.ratioWeight}%`,
                unit: i.unit
              }))
            }, null, 2)
          }
        ]
      };
    } else if (name === "list_recipes") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(MOCK_RECIPES.map(r => ({ id: r.id, name: r.name, baseYield: r.baseYield, unit: r.yieldUnit })), null, 2)
          }
        ]
      };
    } else if (name === "generate_prep_list") {
      const { targetCovers } = args as { targetCovers: number };
      const scaleFactor = targetCovers / 50; // 50 covers baseline

      const prepItems = MOCK_RECIPES.map(recipe => ({
        recipe: recipe.name,
        targetBatches: Math.ceil(scaleFactor * recipe.baseYield),
        ingredientsNeeded: scaleBlueprint(recipe as any, Math.ceil(scaleFactor * recipe.baseYield))
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ targetCovers, prepItems }, null, 2)
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
  console.error("RecipeOS MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting RecipeOS MCP Server:", err);
  process.exit(1);
});
