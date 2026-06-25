# KDS — CulinaryOS Kitchen Display System

Real-time kitchen ticket display with station routing, cook timers, bump/recall, and RUSH priority.

## Interfaces

| Interface | Location | Command |
|---|---|---|
| Web display | `kds-client/` | `npm run dev` |
| CLI | `kds/` | `kds tickets list` |
| MCP server | `kds/mcp/` | stdio |

## Web Display Features

- Station bar — filter to any station or view all
- Live ticket grid — auto-refreshes every 5 seconds
- Per-ticket cook timer (green → yellow at 10m → red at 15m)
- RUSH pulse animation, ALLERGY badge
- One-click BUMP, RECALL
- "All clear" state when no active tickets

## CLI Commands

```bash
kds tickets list
kds tickets list --station grill
kds tickets list --status bumped
kds tickets get <ticketId>
kds bump <ticketId>
kds stations summary
```

## MCP Tools

| Tool | Description |
|---|---|
| `get_tickets` | Active tickets, filter by station/status |
| `get_ticket` | Single ticket full detail |
| `fire_ticket` | Fire queued → cooking |
| `bump_ticket` | Mark complete |
| `recall_ticket` | Un-bump back to cooking |
| `get_station_summary` | Count per station |
| `rush_ticket` | Set RUSH priority |
| `void_ticket` | Void a ticket |

## MCP Config

```json
{
  "mcpServers": {
    "kds": {
      "command": "node",
      "args": ["/path/to/CulinaryOS/kds/mcp/dist/kds-mcp-server.js"],
      "env": {
        "KDS_API_URL": "http://localhost:3002",
        "INTERNAL_API_KEY": "your-key",
        "TENANT_ID": "your-tenant-id"
      }
    }
  }
}
```
