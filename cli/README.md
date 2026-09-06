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
# 1. Point of Sale (POS)
culinary pos list                              # View active orders
culinary pos seat <tableId> --covers 4         # Seat guests
culinary pos fire <tableId> [items...]         # Fire order to kitchen
culinary pos merge <target> <sources...>       # Merge tables
culinary pos transfer <tableId> <serverPin>    # Server transfer with manager PIN
culinary pos void <orderId> <item> <reason> <pin> # Void item with manager PIN
culinary pos pay <orderId> --method card       # Settle payment

# 2. Kitchen Display System (KDS) & Course Pacing
culinary kds list                              # View live kitchen tickets & aging
culinary kds bump <ticketId> --station expo    # Bump completed ticket
culinary kds fire-course <orderId> <courseNo>  # Fire held course (e.g. Course 2)
culinary kds 86 <itemId> [count]               # Set 86 portion countdown
culinary kds pacing                            # Monitor course pacing, C2 hold times & alerts

# 3. Operations, Labor & Daily Coaching
culinary ops waste <itemId> <qty> <reason>     # Log kitchen scrap/spoilage
culinary ops food-cost                         # Actual vs theoretical food cost variance
culinary ops labor                             # Shift labor hours & labor % report
culinary ops coach                             # Run operations consultant coaching audit

# 4. Reservations & Tables
culinary reservations list                     # View dining room reservations
culinary reservations create --guest "Smith" --party 4 --time "19:00"

# 5. Talent & HR Staff Management
culinary talent staff                          # View staff roster & roles
culinary talent clock-in <staffId>             # Staff timecard punch

# 6. Billing & Stripe SaaS Tiers
culinary billing status                        # Inspect Stripe Connect & subscription status
culinary billing portal                        # Open billing portal

# 7. Pantry & Inventory Par Levels
culinary pantry stock                          # Real-time pantry stock grams & par levels
culinary pantry deduct <ingredient> <grams>    # Manual pantry stock deduction

# 8. Tabs & Bar Orders
culinary tabs list                             # View active bar and dining tabs
culinary tabs transfer <tabId> <tableId>       # Transfer bar tab to dining table

# 9. Menu Management
culinary menu list                             # List menu items & pricing
culinary menu create --name "Dinner Menu"
culinary menu publish --menu <id>

# 10. Inventory
culinary inventory check                       # Check pantry inventory
culinary inventory reorder                     # Auto-draft replenishment purchase order

# 11. Orders
culinary orders list                           # List recent orders
culinary orders fire <orderId>                 # Direct order fire

# 12. Tenant Management
culinary tenant list                           # List configured tenants
culinary tenant create --name "Bistro" --email owner@example.com

# 13. Reports & Payroll
culinary report sales                          # Shift sales summary
culinary report depletion                      # Ingredient depletion report

# 14. KitchenKit Prep & FIFO Labels
culinary prep scale "Pizza Dough" --factor 3.5 # Scale batch formula
culinary prep label "Marinara" --shelfLife 48  # Print adhesive FIFO QR label
culinary prep par                              # Low-stock pantry items & auto-draft PO

# 15. System Diagnostics & Hardware Certification
culinary system doctor                         # Port scan & health diagnostics
culinary system doctor security                # Audit RLS, webhook signatures & manager gates
culinary system hardware --action kick-drawer  # Test 24V RJ12 cash drawer kick
culinary system hardware --action test-page    # Print ESC/POS printer alignment diagnostic
culinary system heal                           # Auto-kill zombie port processes
culinary system tray                           # Launch Windows skillet tray daemon
culinary system discover                       # Broadcast mDNS (culinaryos.local) & pairing QR

# 16. Multi-Unit Commissary & Stock Transfers
culinary commissary transfers                  # View incoming/outgoing stock transfers
culinary commissary request "Patties" 100      # Place stock replenishment request
culinary commissary royalty                    # Brand-wide franchise royalty ledger

# 17. AI Kitchen Autopilot & Token Audit
culinary autopilot status                      # Verify Rule 6 feature flag state
culinary autopilot tokens                      # Inspect ai_prompt_log token burn & cost
culinary autopilot forecast --daypart dinner   # Predictive rush covers & revenue forecast

# 18. Dynamic Daypart & Happy Hour Pricing
culinary dayparts list                         # View scheduled daypart & happy hour rules
culinary dayparts active                       # View currently effective pricing window
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
