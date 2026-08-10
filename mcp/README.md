# CulinaryOS MCP Server

Exposes CulinaryOS data and operations as tools for AI agents (Claude Desktop, Cursor, Windsurf, ShadowBot).

## Setup

```bash
cd mcp
npm install
npm run build
```

## Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "culinaryos": {
      "command": "node",
      "args": ["/path/to/CulinaryOS/mcp/dist/culinary-os-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:8080",
        "CULINARY_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|---|---|
| `get_recipe` | Fetch a recipe by ID or name |
| `scale_recipe` | Scale recipe to target servings |
| `get_inventory` | Current stock levels (optionally filter low-stock) |
| `update_inventory` | Update ingredient quantity |
| `get_open_orders` | List open/fired/completed orders |
| `fire_order` | Fire an order to the kitchen |
| `create_menu` | Create a new menu |
| `get_sales_report` | Daily sales summary |
| `get_nutritional_info` | Macro/micro breakdown for a recipe |
| `log_prep` | Log a kitchen prep activity |

## Satellite bridge servers

The hub also ships mirrored MCP servers that bridge standalone satellite products into CulinaryOS (same pattern as KitchenKit's recipe/prep servers). Build with `npm run build`, then launch the one you need:

| Server | Name | Bridges to | Env | Tools |
|---|---|---|---|---|
| `dist/src/culinaryops-server.js` | `culinaryops-mcp` | **CulinaryOps** operations satellite | `CULINARYOPS_URL` (`:3004`) | `get_labor_summary`, `get_food_cost`, `list_vendors`, `log_waste` |
| `dist/src/recipe-server.js` | `RecipeOS` | KitchenKit recipes | — | ratio scaling |
| `dist/src/prep-server.js` | `PrepEngine` | KitchenKit prep | — | prep lists |
| `dist/src/post-pilot-server.js` | `Post-Pilot` | Post-Pilot marketing | — | marketing |

> **Naming:** `culinaryops-mcp` (operations satellite: labor / food-cost / vendor / waste) is intentionally distinct from the core hub server `culinaryos-mcp` (`culinary-os-server.ts`) and from the first-party **CulinaryOps Central Dashboard** extension (`extensions/culinaryops/`). The operations satellite is registered separately via `extensions/culinaryops-ops/` and the `culinaryops` service in `packages/shared` (`CULINARYOPS_URL`).

Claude Desktop example for the ops satellite:

```json
{
  "mcpServers": {
    "culinaryops": {
      "command": "node",
      "args": ["/path/to/CulinaryOS/mcp/dist/src/culinaryops-server.js"],
      "env": {
        "CULINARYOPS_URL": "http://localhost:3004",
        "CULINARY_API_KEY": "your-api-key",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    }
  }
}
```
