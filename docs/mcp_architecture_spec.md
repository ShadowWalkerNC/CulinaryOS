# CulinaryOS — MCP Architecture & Tool Reference

> Model Context Protocol (MCP) is the standard protocol that allows AI agents (Claude Desktop, Cursor, Windsurf, and any MCP-compatible client) to call tools against live systems.
>
> CulinaryOS exposes restaurant operations as MCP tools so agents can query tickets, fire orders, check inventory, analyze waste, and generate prep plans — all against the live Hono API.

---

## System Overview

```
┌──────────────────────┐    JSON-RPC 2.0 over STDIO    ┌──────────────────────┐
│                      │ ──────────────────────────────▶ │                      │
│   MCP Client         │   {"method": "tools/call", ...} │   MCP Server         │
│  (Claude Desktop,    │                                  │  (culinaryops,       │
│   Cursor, etc.)      │ ◀─────────────────────────────── │   recipe, kds, etc.) │
│                      │   {"result": {"content": [...]}} │                      │
└──────────────────────┘                                  └──────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   Hono REST API   │
                              │  localhost:3000   │
                              └──────────────────┘
```

### Transport Mechanisms

| Environment | Transport |
|---|---|
| Local development / Desktop App | STDIO (stdin/stdout) |
| Remote / Cloud deployment | SSE (Server-Sent Events) HTTP |

---

## MCP Servers

CulinaryOS ships **9 MCP servers** in `mcp/src/`. Each server is a standalone TypeScript process that wraps a domain of the Hono API.

---

### 1. CulinaryOps Server

**File:** `mcp/src/culinaryops-server.ts`
**Domain:** Operations analytics — waste, food cost, plate economics

| Tool | Description |
|---|---|
| `get_ops_summary` | Get shift performance summary (covers, revenue, waste, food cost %) |
| `log_waste` | Log a food waste event with cost and reason |
| `get_waste_summary` | Get aggregated waste trends and top financial loss items |
| `get_plate_economics` | Get theoretical vs actual food cost per menu item |
| `analyze_food_cost` | Run cost variance analysis against theoretical recipe cost |

---

### 2. CulinaryOps Hub Live

**File:** `mcp/src/culinaryops-hub-live.ts`
**Domain:** Live operations dashboard — real-time shift monitoring

| Tool | Description |
|---|---|
| `get_live_shift_status` | Current cover count, open tickets, revenue to date |
| `get_kds_performance` | Average ticket time, station throughput, aging distribution |
| `get_inventory_velocity` | Fastest-depleting items based on current service session |

---

### 3. Recipe Server

**File:** `mcp/src/recipe-server.ts`
**Domain:** Menu recipe management and scaling

| Tool | Description |
|---|---|
| `list_recipes` | List all recipes for the tenant |
| `get_recipe` | Fetch a recipe by ID or name |
| `scale_recipe` | Scale recipe to target servings using the ratio engine |
| `create_recipe` | Create a new recipe with ingredient tree |
| `get_recipe_cost` | Compute cost per serving and food cost % |

---

### 4. Inventory Server

**File:** `mcp/src/inventory-server.ts`
**Domain:** Pantry stock levels, audits, and par management

| Tool | Description |
|---|---|
| `get_inventory_levels` | Current stock quantities and par values for all items |
| `get_low_stock_alerts` | Items below par level or out of stock |
| `log_audit_count` | Submit a physical audit count and record variance |
| `update_pantry_item` | Adjust stock quantity |

---

### 5. KDS Server

**File:** `mcp/src/kds-server.ts`
**Domain:** Kitchen ticket queue management

| Tool | Description |
|---|---|
| `fetch_kds_tickets` | List all active (non-bumped) kitchen tickets |
| `bump_kds_ticket` | Mark a ticket as complete |
| `fire_course` | Fire a held course for a multi-course order |
| `get_ticket_aging` | Get aging stats across all open tickets |

---

### 6. POS Server

**File:** `mcp/src/pos-server.ts`
**Domain:** Point-of-sale order management

| Tool | Description |
|---|---|
| `create_order` | Create a new POS order |
| `send_order_to_kitchen` | Fire an order through `PATCH /v1/orders/:id/send` |
| `void_order` | Void an open order (manager role required) |
| `apply_loyalty_points` | Deduct or add loyalty points for a customer |
| `get_open_orders` | List orders by status (`open`, `sent`, `ready`, `paid`) |

---

### 7. Prep Server

**File:** `mcp/src/prep-server.ts`
**Domain:** Shift prep planning and batch projections

| Tool | Description |
|---|---|
| `generate_prep_list` | Generate mise en place task list for a shift based on par shortfall |
| `get_prep_list` | Retrieve an existing prep plan |
| `project_batch_requirement` | Calculate total batch weight needed for target covers |

---

### 8. Post-Pilot Server

**File:** `mcp/src/post-pilot-server.ts`
**Domain:** Loyalty programs and marketing automation

| Tool | Description |
|---|---|
| `get_loyalty_balance` | Look up a customer's loyalty point balance |
| `generate_postcard` | Generate a loyalty postcard or coupon |
| `send_loyalty_campaign` | Dispatch a batch loyalty campaign to eligible customers |

---

## Connecting to Claude Desktop

Add to your `claude_desktop_config.json` (`~/Library/Application Support/Claude/` on macOS):

```json
{
  "mcpServers": {
    "culinaryos-ops": {
      "command": "node",
      "args": ["/path/to/CulinaryOS/mcp/dist/culinaryops-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:3000",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    },
    "culinaryos-kds": {
      "command": "node",
      "args": ["/path/to/CulinaryOS/mcp/dist/kds-server.js"],
      "env": {
        "CULINARY_API_URL": "http://localhost:3000",
        "VITE_TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    }
  }
}
```

Build the MCP servers first:

```bash
cd mcp
pnpm install
pnpm run build
```

---

## Connecting to Live Ops (CulinaryOps Hub Live)

For the live operations hub against a running CulinaryOS API:

```bash
pnpm --filter culinaryos-mcp-servers run start-culinaryops-live
```

This starts `culinaryops-hub-live.ts` in SSE mode, connecting to `CULINARY_API_URL` for real-time shift data.

---

## JSON-RPC Protocol Examples

### Tool Call: `bump_kds_ticket`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "bump_kds_ticket",
    "arguments": {
      "ticketId": "t-101"
    }
  }
}
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Success: Ticket t-101 has been bumped. Order status: ready."
      }
    ],
    "isError": false
  }
}
```

### Tool Call: `scale_recipe`

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "scale_recipe",
    "arguments": {
      "recipeId": "recipe-uuid",
      "targetServings": 48
    }
  }
}
```

---

## Adding a New MCP Server

1. Create `mcp/src/my-server.ts` following the pattern in `recipe-server.ts`.
2. Export a `Server` instance using `@modelcontextprotocol/sdk`.
3. Register a build script in `mcp/package.json`.
4. Add the server and its tools to this document.
5. If the tools expose a new public API contract, update [`extension_template/`](../extension_template/) if relevant.

---

## AI is Strictly Additive

All MCP tools operate against the CulinaryOS Hono API. The system **does not require** MCP servers or an AI agent to function. Every operation available via MCP is also directly accessible via the REST API and the web client UIs.

No core restaurant operation has a hard dependency on Anthropic API availability.
