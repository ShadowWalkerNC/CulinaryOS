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
      },
      {
        name: 'get_recipe',
        description: 'Search recipes by name, ingredient, or category. Returns matching recipe objects.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Name or keyword to search for' },
            category: { type: 'string', description: 'Optional category filter' },
          },
          required: ['query'],
        },
      },
      {
        name: 'add_recipe',
        description: 'Add a new recipe to the vault.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            category_id: { type: 'string' },
            description: { type: 'string' },
            base_servings: { type: 'number' },
            difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
            tags: { type: 'array', items: { type: 'string' } },
            yield_amount: { type: 'number' },
            yield_unit: { type: 'string' },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_by_ingredient',
        description: 'Find all recipes that contain a specific ingredient.',
        inputSchema: {
          type: 'object',
          properties: {
            ingredient: { type: 'string', description: 'Ingredient name to search for' },
          },
          required: ['ingredient'],
        },
      },
      {
        name: 'get_pantry',
        description: 'Get current pantry stock levels. Optionally filter to low-stock items only.',
        inputSchema: {
          type: 'object',
          properties: {
            low_stock_only: { type: 'boolean', description: 'If true, return only items at or below reorder threshold' },
          },
        },
      },
      {
        name: 'update_pantry',
        description: 'Update the stock quantity for a pantry item by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            item_id: { type: 'string' },
            quantity: { type: 'number' },
          },
          required: ['item_id', 'quantity'],
        },
      },
      {
        name: 'get_shopping_list',
        description: 'Returns all pantry items that are at or below their reorder threshold.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'convert_units',
        description: 'Convert between weight and volume units for common baking ingredients (e.g. grams ↔ cups).',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'number', description: 'The numeric value to convert' },
            from_unit: { type: 'string', description: 'Source unit (e.g. g, grams, cups, cup)' },
            to_unit: { type: 'string', description: 'Target unit' },
            ingredient: { type: 'string', description: 'Ingredient name for density-based conversion (e.g. flour, sugar, butter)' },
          },
          required: ['value', 'from_unit', 'to_unit'],
        },
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
    } else if (['get_recipe', 'add_recipe', 'search_by_ingredient', 'get_pantry', 'update_pantry', 'get_shopping_list', 'convert_units'].includes(name)) {
      const BASE_URL = process.env.RECIPEOS_API_URL ?? 'https://recipeos.onrender.com';
      const API_KEY  = process.env.RECIPEOS_API_KEY ?? '';
      const headers = {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
      };
      let method = 'GET';
      let path = '';
      let body: any = undefined;
      let a = args as any;

      if (name === 'get_recipe') {
        const qs = `?q=${encodeURIComponent(a.query)}${a.category ? `&category=${a.category}` : ''}`;
        path = `/api/recipes${qs}`;
      } else if (name === 'add_recipe') {
        method = 'POST'; path = '/api/recipes'; body = a;
      } else if (name === 'search_by_ingredient') {
        path = `/api/recipes?ingredient=${encodeURIComponent(a.ingredient)}`;
      } else if (name === 'get_pantry') {
        path = `/api/pantry${a.low_stock_only ? '?filter=low' : ''}`;
      } else if (name === 'update_pantry') {
        method = 'PATCH'; path = `/api/pantry/${a.item_id}`; body = { quantity: a.quantity };
      } else if (name === 'get_shopping_list') {
        path = '/api/shopping-list';
      } else if (name === 'convert_units') {
        method = 'POST'; path = '/api/convert'; body = { value: a.value, fromUnit: a.from_unit, toUnit: a.to_unit, ingredient: a.ingredient };
      }

      const fetchOpts: any = { method, headers };
      if (body) fetchOpts.body = JSON.stringify(body);
      const res = await fetch(`${BASE_URL}${path}`, fetchOpts);
      if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
      const data = await res.json();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
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
