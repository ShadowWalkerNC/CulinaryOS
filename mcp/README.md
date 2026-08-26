# CulinaryOS MCP Servers

Exposes CulinaryOS restaurant operations as tools for AI agents — Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

The MCP layer is **strictly additive**: every operation is also available via the REST API and web UIs. The system runs fully without MCP servers or an Anthropic API key.

---

## Setup

```bash
# From the monorepo root
pnpm install

# Build all MCP servers
cd mcp
pnpm run build
```

---

## Available Servers

CulinaryOS ships **9 specialized MCP servers** in `src/`:

| Server | Entrypoint | Domain |
|---|---|---|
| `culinaryops-server` | `src/culinaryops-server.ts` | Waste logging, food cost, plate economics |
| `culinaryops-hub-live` | `src/culinaryops-hub-live.ts` | Live shift performance dashboard |
| `recipe-server` | `src/recipe-server.ts` | Recipes — list, get, scale, create |
| `inventory-server` | `src/inventory-server.ts` | Pantry stock levels, audit counts |
| `kds-server` | `src/kds-server.ts` | Kitchen tickets — fetch, bump, fire |
| `pos-server` | `src/pos-server.ts` | Orders — create, send, loyalty |
| `prep-server` | `src/prep-server.ts` | Shift prep plans, batch projections |
| `post-pilot-server` | `src/post-pilot-server.ts` | Loyalty balances, postcards, campaigns |

---

## Connect to Claude Desktop

Add to `claude_desktop_config.json` (`~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows):

```json
{
  "mcpServers": {
    "culinaryos-ops": {
      "command": "node",
      "args": ["/absolute/path/to/CulinaryOS/mcp/dist/culinaryops-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:3000",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    },
    "culinaryos-kds": {
      "command": "node",
      "args": ["/absolute/path/to/CulinaryOS/mcp/dist/kds-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:3000",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    },
    "culinaryos-pos": {
      "command": "node",
      "args": ["/absolute/path/to/CulinaryOS/mcp/dist/pos-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:3000",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    }
  }
}
```

Make sure the API is running before connecting:

```bash
pnpm --filter @culinaryos/server dev
```

---

## Tool Reference

### culinaryops-server

| Tool | Description |
|---|---|
| `get_ops_summary` | Shift performance: covers, revenue, waste, food cost % |
| `log_waste` | Log a food waste event with cost and reason |
| `get_waste_summary` | Aggregated waste trends and top financial loss items |
| `get_plate_economics` | Theoretical vs actual food cost per menu item |
| `analyze_food_cost` | Cost variance against theoretical recipe cost |

### recipe-server

| Tool | Description |
|---|---|
| `list_recipes` | List all tenant recipes |
| `get_recipe` | Fetch a recipe by ID or name |
| `scale_recipe` | Scale recipe to target servings |
| `create_recipe` | Create a new recipe with ingredient tree |
| `get_recipe_cost` | Compute cost per serving and food cost % |

### kds-server

| Tool | Description |
|---|---|
| `fetch_kds_tickets` | List all active (non-bumped) kitchen tickets |
| `bump_kds_ticket` | Mark a ticket as complete |
| `fire_course` | Fire a held course for a multi-course order |
| `get_ticket_aging` | Aging stats across all open tickets |

### pos-server

| Tool | Description |
|---|---|
| `create_order` | Create a new POS order |
| `send_order_to_kitchen` | Fire an order via `PATCH /v1/orders/:id/send` |
| `void_order` | Void an open order (manager role required) |
| `apply_loyalty_points` | Adjust customer loyalty points |
| `get_open_orders` | List orders by status |

### inventory-server

| Tool | Description |
|---|---|
| `get_inventory_levels` | Current stock quantities and par values |
| `get_low_stock_alerts` | Items below par or out of stock |
| `log_audit_count` | Submit a physical audit count and record variance |
| `update_pantry_item` | Adjust stock quantity |

### prep-server

| Tool | Description |
|---|---|
| `generate_prep_list` | Mise en place task list for a shift |
| `get_prep_list` | Retrieve an existing prep plan |
| `project_batch_requirement` | Calculate batch weight for target covers |

### post-pilot-server

| Tool | Description |
|---|---|
| `get_loyalty_balance` | Look up customer loyalty points |
| `generate_postcard` | Generate a loyalty postcard or coupon |
| `send_loyalty_campaign` | Dispatch a batch loyalty campaign |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CULINARY_API_URL` | Base URL of the CulinaryOS API | `http://localhost:3000` |
| `VITE_TENANT_ID` | Tenant UUID for demo mode | `00000000-0000-0000-0000-000000000001` |
| `ANTHROPIC_API_KEY` | Claude API key (optional AI tools only) | *(unset)* |

---

## Full Documentation

See [`docs/mcp_architecture_spec.md`](../docs/mcp_architecture_spec.md) for the full JSON-RPC protocol spec, server architecture diagram, and examples.
