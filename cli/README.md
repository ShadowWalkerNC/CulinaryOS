# culinary-cli

CulinaryOS command-line interface. Manage menus, inventory, orders, tenants, and reports directly from your terminal.

## Setup

```bash
cd cli
npm install
cp ../.env.example .env.cli
# Set CULINARY_API_URL and CULINARY_API_KEY in .env.cli
npm run build
npm link   # makes `culinary` available globally
```

## Commands

```bash
culinary menu list --tenant <id>
culinary menu create --tenant <id> --name "Dinner Menu"
culinary menu publish --tenant <id> --menu <id>

culinary inventory check --tenant <id>
culinary inventory check --tenant <id> --low
culinary inventory update --tenant <id> --item <id> --qty 24
culinary inventory reorder --tenant <id>

culinary orders list --tenant <id>
culinary orders list --tenant <id> --status fired
culinary orders fire --tenant <id> --order <id>
culinary orders void --tenant <id> --order <id> --reason "Customer cancelled"

culinary tenant list
culinary tenant create --name "Northern Fixins" --email owner@example.com --plan pro

culinary report sales --tenant <id>
culinary report sales --tenant <id> --date 2026-06-20
culinary report depletion --tenant <id>
```

## Environment Variables

| Variable | Description |
|---|---|
| `CULINARY_API_URL` | Base URL of the CulinaryOS backend (default: `http://localhost:8080`) |
| `CULINARY_API_KEY` | API key or JWT for authentication |
