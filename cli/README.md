# culinary-cli

CulinaryOS command-line interface. Manage menus, inventory, orders, tenants, and reports directly from your terminal.

---

## Setup

```bash
cd cli
pnpm install
cp ../.env.example .env.cli
# Set CULINARY_API_URL and CULINARY_API_KEY in .env.cli
pnpm run build
npm link   # makes `culinary` available globally
```

---

## Commands

```bash
# Menu management
culinary menu list --tenant <id>
culinary menu create --tenant <id> --name "Dinner Menu"
culinary menu publish --tenant <id> --menu <id>

# Inventory / pantry
culinary inventory check --tenant <id>
culinary inventory check --tenant <id> --low
culinary inventory update --tenant <id> --item <id> --qty 24
culinary inventory reorder --tenant <id>

# Orders
culinary orders list --tenant <id>
culinary orders list --tenant <id> --status fired
culinary orders fire --tenant <id> --order <id>
culinary orders void --tenant <id> --order <id> --reason "Customer cancelled"

# Tenant management
culinary tenant list
culinary tenant create --name "Northern Fixins" --email owner@example.com --plan pro

# Reports
culinary report sales --tenant <id>
culinary report sales --tenant <id> --date 2026-08-26
culinary report depletion --tenant <id>
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CULINARY_API_URL` | Base URL of the CulinaryOS API | `http://localhost:3000` |
| `CULINARY_API_KEY` | API key or JWT for authentication | *(required)* |

For demo mode, use:
```env
CULINARY_API_URL=http://localhost:3000
CULINARY_API_KEY=demo
```

And pass `X-Tenant-Id: 00000000-0000-0000-0000-000000000001` in requests (the CLI handles this automatically when `--tenant` is specified).
