# CulinaryOS Model Context Protocol (MCP) Server Specification

> **Document Version:** 1.0.0
> **Protocol Standard:** Model Context Protocol (MCP) v1.0 / Anthropic
> **Server Implementation:** `intelligence/mcp` and `mcp/`

---

## 1. Overview & Security Sandbox

CulinaryOS exposes restaurant-specific intelligence, inventory controls, and operational workflows to AI assistants and coding agents via standard **Model Context Protocol (MCP)** tools.

> [!CAUTION]
> **Security & RBAC Invariant:**
> MCP tools are **accessories**, not an administrative backdoor.
> Every tool invocation must:
> 1. Pass through CulinaryOS tenant isolation (`X-Tenant-Id` claim).
> 2. Enforce role-based permission checks (e.g. `inventory.adjust` requires manager privilege).
> 3. Log all tool executions to the audit trail (`ai_prompt_log`).
> 4. Route destructive actions (such as menu deletions or supplier purchase orders) through human-in-the-loop approvals.

---

## 2. Canonical Restaurant MCP Tool Suite

| Tool Name | Scope / Domain | Description | Required Permission |
| :--- | :--- | :--- | :--- |
| `restaurant.get` | Platform / Org | Fetch restaurant metadata, operating hours, active station modes | `restaurant.read` |
| `menu.get` | Menu & Catalog | Retrieve active categories, items, modifier groups, and 86 status | `menu.read` |
| `orders.list` | Front-of-House | List active dining room and online orders filtered by table/status | `orders.read` |
| `inventory.get` | Inventory / Stock | Query raw ingredient stock levels, unit costs, and par minimums | `inventory.read` |
| `inventory.adjust` | Inventory / Stock | Adjust stock count for receiving, spoilage, or audit with reason | `inventory.write` (Manager) |
| `prep.list` | Prep & KitchenKit | Retrieve the shift prep par list, assigned stations, and progress | `prep.read` |
| `recipes.get` | Recipe Vault | Retrieve standardized recipe ingredients, ratios, and allergens | `recipes.read` |
| `vendors.get` | Supply Chain | List certified suppliers, vendor SKUs, and open purchase orders | `vendors.read` |
| `marketing.generate`| Growth / Campaigns | Generate brand-aligned social captions, event posts, or specials | `marketing.write` |
| `marketing.schedule`| Growth / Campaigns | Queue an approved social post or email blast for publishing | `marketing.publish` (Manager) |
| `analytics.get` | Executive Intel | Query daily gross, labor cost percentage, and prime cost variance | `analytics.read` (Owner/GM) |
| `reservations.list` | Dining Room | Query upcoming table reservations, party sizes, and turn pacing | `reservations.read` |

---

## 3. Server Configuration & Transports

### 3.1 Local Development / Coding Agent Integration (stdio)
In `~/.gemini/antigravity/mcp/` or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "culinaryos": {
      "command": "node",
      "args": ["C:/Users/white/Documents/GitHub/CulinaryOS/mcp/dist/index.js"],
      "env": {
        "CULINARYOS_URL": "http://localhost:3000",
        "CULINARYOS_API_KEY": "culinary_live_secret_key",
        "TENANT_ID": "00000000-0000-0000-0000-000000000001"
      }
    }
  }
}
```

### 3.2 Cloud / Network Hub Integration (SSE)
CulinaryOS also provides a remote Server-Sent Events (SSE) endpoint:
- **Endpoint:** `GET /v1/mcp/sse`
- **Authentication:** Bearer token with tenant scope.
- **Protocol:** Bidirectional JSON-RPC 2.0 streaming.
