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
