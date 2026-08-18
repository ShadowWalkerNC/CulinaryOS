# Database Schema Inventory & TypeScript Type Mapping Analysis (V1–V14)

**Explorer**: Explorer 2 (Milestone 1 — Ratio Engine & Database Types)  
**Date**: 2026-08-15  
**Working Directory**: `C:\Users\white\OneDrive\Documents\GitHub\CulinaryOS\.agents\sub_orch_m1_explorer_2`

---

## 1. Executive Summary

A comprehensive investigation was conducted on all database migrations located in `supabase/migrations/` (migrations V1 through V14, as well as the 5 dated migrations `20260620_*`) and compared against `packages/db/src/types.ts`.

### Critical Finding
The current `packages/db/src/types.ts` is an outdated stub containing only 3 placeholder tables (`organizations`, `restaurants`, `users`) that **do not exist in the actual CulinaryOS schema**. It is missing **100%** of the 26 core production tables from migrations V1–V14, all 7 extension/beta tables, all 4 database views, all database enums and check constraints, all custom RPC functions, and all Realtime-enabled table contracts.

---

## 2. Complete Inventory of Migrations

| Migration File | Primary Focus | Key Database Entities |
|---|---|---|
| `V1__tenants.sql` | Multi-tenancy & Membership | `tenants`, `tenant_users`, `my_tenant_id()`, `my_role()`, `set_updated_at()` |
| `V2__kds_schema.sql` | Kitchen Display System | `kitchen_tickets`, `ticket_items`, `station_summary` (view) |
| `V3__pos_schema.sql` | Point of Sale & Menus | `menus`, `menu_sections`, `menu_items`, `modifier_groups`, `modifiers`, `tabs`, `pos_orders`, `pos_order_line_items`, `line_item_modifiers`, `payments` |
| `V4__rls_policies.sql` | Tenant Isolation (RLS) | Row Level Security enabled for all V1–V3 tables |
| `V5__event_bus.sql` | Domain Event Audit Log | `domain_events` (audit log for event bus replay) |
| `V6__realtime_enable.sql` | Supabase Realtime | `kitchen_tickets`, `pos_orders`, `domain_events` added to `supabase_realtime` |
| `V7__recipeos_pantry.sql` | Pantry & Recipe Linking | `ingredients`, `recipe_ingredients`, `pantry_ledger`, `pantry_status` (view) |
| `V8__course_firing.sql` | Course Firing State Machine | `course_fire_log`, `order_course_status` (view), `kitchen_tickets` altered with course hold fields |
| `V9__restock_purchase_orders.sql` | Restock & PO Management | `po_status` (enum), `restock_purchase_orders`, `po_line_items`, `next_po_number()` |
| `V10__stripe_payments.sql` | Stripe Integration & Order Totals | `payments` extended (Stripe fields), `pos_orders` extended (`closed_at`, `covers`, `total_cents`), `tenants` extended |
| `V11__public_menu_rls.sql` | Public Ordering Read Access | Anonymous SELECT policies for active menus & items |
| `V12__audit_security_hardening.sql` | Security Hardening & Outbox | `pending_push` (KDS outbox), `security_invoker` views, `get_public_menu_by_slug()` RPC |
| `V13__pantry_rpc_outbox_po_counter.sql` | Atomic Operations & RPCs | `decrement_pantry_stock()` RPC, `tenants.po_seq` atomic counter, `pending_push` write policies |
| `V14__staff_pins_ops_economics.sql` | Staff PIN Auth & Food Economics | `staff_pins`, `waste_events`, `plate_economics`, `menu_item_recipes`, `my_tenant_id()` hardened as `SECURITY DEFINER` |
| `20260620_ai_prompt_log.sql` | AI Prompt Library Audit | `ai_prompt_log` (append-only prompt audit trail) |
| `20260620_beta_applications.sql` | Beta Onboarding | `beta_applications` (operator intake) |
| `20260620_beta_feedback.sql` | Weekly Beta Feedback | `beta_feedback`, `beta_at_risk` (view) |
| `20260620_extension_registry.sql` | Extension Marketplace | `extension_registry`, `installed_extensions`, `extension_error_log` |
| `20260620_founding_customers.sql` | Founding Customer Ledger | `founding_customers`, `stamp_founding_badge()` |

---

## 3. Discrepancy Matrix (`packages/db/src/types.ts` vs Actual Migrations)

| Entity Name | Entity Type | In Migrations? | In Existing `types.ts`? | Status / Action Needed |
|---|---|---|---|---|
| `organizations` | Table | ❌ No | ✅ Yes | **Remove** (Obsolete legacy/phantom table) |
| `restaurants` | Table | ❌ No | ✅ Yes | **Remove** (Obsolete legacy/phantom table) |
| `users` | Table | ❌ No | ✅ Yes | **Remove** (Replaced by `auth.users` + `tenant_users`) |
| `tenants` | Table | ✅ V1, V10, V13 | ❌ No | **Add** (Core tenant entity) |
| `tenant_users` | Table | ✅ V1 | ❌ No | **Add** (Multi-tenant membership & RBAC) |
| `kitchen_tickets` | Table | ✅ V2, V8 | ❌ No | **Add** (Core KDS ticket state) |
| `ticket_items` | Table | ✅ V2 | ❌ No | **Add** (KDS line items & modifiers) |
| `menus` | Table | ✅ V3 | ❌ No | **Add** (Menu definitions) |
| `menu_sections` | Table | ✅ V3 | ❌ No | **Add** (Categories/sections) |
| `menu_items` | Table | ✅ V3 | ❌ No | **Add** (Dishes, pricing, station, allergens) |
| `modifier_groups` | Table | ✅ V3 | ❌ No | **Add** (Modifier group rules) |
| `modifiers` | Table | ✅ V3 | ❌ No | **Add** (Individual modifiers & pricing adjustments) |
| `tabs` | Table | ✅ V3 | ❌ No | **Add** (Bar/dining room open tabs) |
| `pos_orders` | Table | ✅ V3, V10 | ❌ No | **Add** (POS orders, lifecycle, totals) |
| `pos_order_line_items` | Table | ✅ V3 | ❌ No | **Add** (Ordered items snapshots) |
| `line_item_modifiers` | Table | ✅ V3 | ❌ No | **Add** (Selected modifier snapshots) |
| `payments` | Table | ✅ V3, V10 | ❌ No | **Add** (Payment records & Stripe intents) |
| `domain_events` | Table | ✅ V5 | ❌ No | **Add** (Outbox / audit event log) |
| `ingredients` | Table | ✅ V7 | ❌ No | **Add** (Pantry stock & reorder levels) |
| `recipe_ingredients` | Table | ✅ V7 | ❌ No | **Add** (Recipe-to-ingredient composition) |
| `pantry_ledger` | Table | ✅ V7 | ❌ No | **Add** (Stock deduction & restock ledger) |
| `course_fire_log` | Table | ✅ V8 | ❌ No | **Add** (Course firing audit log) |
| `restock_purchase_orders` | Table | ✅ V9 | ❌ No | **Add** (Purchase order headers) |
| `po_line_items` | Table | ✅ V9 | ❌ No | **Add** (Purchase order line items) |
| `pending_push` | Table | ✅ V12 | ❌ No | **Add** (KDS reconnection outbox) |
| `staff_pins` | Table | ✅ V14 | ❌ No | **Add** (Terminal PIN auth mapping) |
| `waste_events` | Table | ✅ V14 | ❌ No | **Add** (CulinaryOps waste tracking) |
| `plate_economics` | Table | ✅ V14 | ❌ No | **Add** (Theoretical food cost snapshots) |
| `menu_item_recipes` | Table | ✅ V14 | ❌ No | **Add** (Menu item to recipe mapping) |
| `ai_prompt_log` | Table | ✅ 20260620, V12, V13 | ❌ No | **Add** (AI prompt audit log) |
| `beta_applications` | Table | ✅ 20260620 | ❌ No | **Add** (Beta intake applications) |
| `beta_feedback` | Table | ✅ 20260620 | ❌ No | **Add** (Beta operator feedback) |
| `extension_registry` | Table | ✅ 20260620 | ❌ No | **Add** (Marketplace catalog) |
| `installed_extensions` | Table | ✅ 20260620 | ❌ No | **Add** (Tenant/location extension installs) |
| `extension_error_log` | Table | ✅ 20260620 | ❌ No | **Add** (Extension crash/error logging) |
| `founding_customers` | Table | ✅ 20260620 | ❌ No | **Add** (Founding tier customer tracking) |
| `station_summary` | View | ✅ V2 | ❌ No | **Add** (Station load & avg cook time) |
| `pantry_status` | View | ✅ V7, V12 | ❌ No | **Add** (Stock levels & low stock flags) |
| `order_course_status` | View | ✅ V8, V12 | ❌ No | **Add** (Held/firing course counts per order) |
| `beta_at_risk` | View | ✅ 20260620, V12 | ❌ No | **Add** (NPS & churn risk operator view) |
| `po_status` | Enum | ✅ V9 | ❌ No | **Add** (`draft`, `approved`, `sent`, `received`, `cancelled`) |
| `my_tenant_id()` | Function | ✅ V1, V12, V14 | ❌ No | **Add** (`() => string | null`) |
| `my_role()` | Function | ✅ V1, V14 | ❌ No | **Add** (`(p_tenant_id: string) => string | null`) |
| `next_po_number()` | Function | ✅ V9, V12, V13 | ❌ No | **Add** (`(p_tenant_id: string) => string`) |
| `get_public_menu_by_slug()` | Function | ✅ V12 | ❌ No | **Add** (`(p_slug: string) => Json`) |
| `decrement_pantry_stock()` | Function | ✅ V13 | ❌ No | **Add** (`(item_id: string, qty: number, ...) => number`) |

---

## 4. Deep Architectural & Field-Level Analysis

### 4.1 Monetary Representation
All monetary values across the database migrations are strictly stored as integer cents or numeric cents:
- `menu_items.price`: `int` (cents)
- `modifiers.price_adjustment`: `int` (cents, supports negative values for discounts)
- `pos_orders.subtotal`, `pos_orders.tax`, `pos_orders.total`: `int` (cents)
- `pos_order_line_items.unit_price`, `pos_order_line_items.line_total`: `int` (cents)
- `payments.amount`, `payments.tip_amount`, `payments.tip_cents`: `int` (cents)
- `ingredients.cost_per_unit`: `numeric` (cents)
- `restock_purchase_orders.total_cost`, `po_line_items.unit_cost`: `numeric` (cents)
- `waste_events.cost_per_gram`, `waste_events.waste_cost`: `numeric` (dollars or cents depending on scale; stored as numeric)
- `plate_economics.sale_price_cents`, `plate_economics.theoretical_cost_cents`: `int` (cents)
- `extension_registry.price_cents`: `int` (cents)

### 4.2 Unit Quantities & Precision
Physical culinary measurements use `numeric` in PostgreSQL (`number` in TypeScript) to support non-integer quantities (e.g. 1.5 kg, 0.25 oz, 350.5 grams):
- `ingredients.current_qty`, `ingredients.reorder_at`, `ingredients.reorder_qty`
- `recipe_ingredients.quantity`
- `pantry_ledger.delta` (negative = deduct, positive = restock)
- `po_line_items.ordered_qty`, `po_line_items.received_qty`
- `waste_events.quantity_grams`
- `plate_economics.quantity`

Discrete inventory or item counts use `int` / `integer`:
- `kitchen_tickets.order_number`, `cover_count`, `course_number`, `cook_time_seconds`
- `ticket_items.quantity`, `sort_order`
- `menu_sections.sort_order`, `menu_items.sort_order`, `modifier_groups.sort_order`
- `modifier_groups.min_selections`, `modifier_groups.max_selections`
- `tabs.cover_count`
- `pos_orders.order_number`, `pos_orders.cover_count`, `pos_orders.covers`
- `pos_order_line_items.quantity`, `pos_order_line_items.course_number`, `pos_order_line_items.sort_order`
- `course_fire_log.course_number`
- `tenants.po_seq`
- `beta_feedback.week_number`, `beta_feedback.nps_score`
- `extension_registry.install_count`
- `founding_customers.customer_number`

### 4.3 JSONB Types
The database uses `jsonb` in several critical locations:
1. `domain_events.payload`: Stores the serialized domain event object (e.g. order details, ticket bumps, inventory changes).
2. `pending_push.payload`: Stores offline/reconnection push notifications destined for KDS stations.
3. `ai_prompt_log.inputs`: Structured input parameters supplied to prompt template.
4. `installed_extensions.settings`: Key-value configuration for active tenant plugins.
5. `get_public_menu_by_slug` return value: Nested JSON representation of menu hierarchy.

### 4.4 PostgreSQL Array Types
PostgreSQL arrays are mapped to TypeScript arrays:
- `ticket_items.modifiers`: `string[]` (defaults to `[]`)
- `menu_items.allergens`: `string[]` (defaults to `[]`)
- `course_fire_log.ticket_ids`: `string[]` (UUIDs, defaults to `[]`)
- `beta_feedback.bugs_reported`: `string[] | null`
- `beta_feedback.confusion_points`: `string[] | null`
- `beta_feedback.feature_requests`: `string[] | null`
- `beta_feedback.founder_action_items`: `string[] | null`
- `extension_registry.permissions`: `string[]`

---

## 5. Complete Proposed TypeScript Schema for `packages/db/src/types.ts`

Below is the complete, exhaustive, type-safe definition that must replace `packages/db/src/types.ts`:

```typescript
// ============================================================
// CulinaryOS — Complete Supabase Database TypeScript Definitions
// Generated from Migrations V1–V14 + Extension Registries
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TenantPlan = 'starter' | 'pro' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'cancelled';
export type TenantUserRole = 'owner' | 'manager' | 'chef' | 'server' | 'viewer';

export type KitchenStation =
  | 'hot'
  | 'cold'
  | 'grill'
  | 'fry'
  | 'sauce'
  | 'pastry'
  | 'pass'
  | 'bar';

export type TicketStatus =
  | 'queued'
  | 'fired'
  | 'cooking'
  | 'bumped'
  | 'recalled'
  | 'voided';

export type TicketPriority = 'normal' | 'rush' | 'allergy';
export type CourseHoldStatus = 'held' | 'firing' | 'fired';

export type MenuStatus = 'draft' | 'active' | 'archived';
export type MenuItemStatus = 'available' | 'unavailable' | '86d';

export type TabStatus = 'open' | 'closed' | 'transferred';

export type OrderStatus =
  | 'open'
  | 'sent'
  | 'in-progress'
  | 'ready'
  | 'served'
  | 'paid'
  | 'voided';

export type PaymentMethod = 'cash' | 'card' | 'split' | 'comp' | 'gift_card';
export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export type PantryReason = 'sale' | 'restock' | 'waste' | 'adjustment' | string;
export type StockStatus = 'out_of_stock' | 'low_stock' | 'ok';

export type POStatus = 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';

export type AIPromptReviewStatus = 'pending' | 'approved' | 'edited' | 'rejected';
export type BetaApplicationStatus = 'pending' | 'admitted' | 'declined' | 'converted';
export type BetaConversionIntent =
  | 'definitely_converting'
  | 'likely_converting'
  | 'undecided'
  | 'unlikely'
  | 'churning';

export type ExtensionCategory =
  | 'ordering'
  | 'inventory'
  | 'ai'
  | 'reporting'
  | 'loyalty'
  | 'integrations'
  | 'staff'
  | 'other';

export type ExtensionPricingModel = 'free' | 'paid' | 'usage';

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          plan: TenantPlan;
          status: TenantStatus;
          stripe_customer_id: string | null;
          stripe_account_id: string | null;
          po_seq: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          plan?: TenantPlan;
          status?: TenantStatus;
          stripe_customer_id?: string | null;
          stripe_account_id?: string | null;
          po_seq?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          plan?: TenantPlan;
          status?: TenantStatus;
          stripe_customer_id?: string | null;
          stripe_account_id?: string | null;
          po_seq?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_users: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: TenantUserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: TenantUserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: TenantUserRole;
          created_at?: string;
        };
      };
      kitchen_tickets: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          order_number: number;
          station: KitchenStation;
          status: TicketStatus;
          priority: TicketPriority;
          table_number: string | null;
          cover_count: number | null;
          course_number: number;
          course_hold_status: CourseHoldStatus;
          notes: string | null;
          void_reason: string | null;
          held_at: string | null;
          fired_at: string | null;
          bumped_at: string | null;
          cook_time_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          order_number: number;
          station: KitchenStation;
          status?: TicketStatus;
          priority?: TicketPriority;
          table_number?: string | null;
          cover_count?: number | null;
          course_number?: number;
          course_hold_status?: CourseHoldStatus;
          notes?: string | null;
          void_reason?: string | null;
          held_at?: string | null;
          fired_at?: string | null;
          bumped_at?: string | null;
          cook_time_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          order_number?: number;
          station?: KitchenStation;
          status?: TicketStatus;
          priority?: TicketPriority;
          table_number?: string | null;
          cover_count?: number | null;
          course_number?: number;
          course_hold_status?: CourseHoldStatus;
          notes?: string | null;
          void_reason?: string | null;
          held_at?: string | null;
          fired_at?: string | null;
          bumped_at?: string | null;
          cook_time_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_items: {
        Row: {
          id: string;
          ticket_id: string;
          line_item_id: string;
          name: string;
          quantity: number;
          modifiers: string[];
          notes: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          line_item_id: string;
          name: string;
          quantity?: number;
          modifiers?: string[];
          notes?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          line_item_id?: string;
          name?: string;
          quantity?: number;
          modifiers?: string[];
          notes?: string | null;
          sort_order?: number;
        };
      };
      menus: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          status: MenuStatus;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          status?: MenuStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          status?: MenuStatus;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      menu_sections: {
        Row: {
          id: string;
          menu_id: string;
          tenant_id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          menu_id: string;
          tenant_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          menu_id?: string;
          tenant_id?: string;
          name?: string;
          sort_order?: number;
        };
      };
      menu_items: {
        Row: {
          id: string;
          section_id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          price: number;
          status: MenuItemStatus;
          station: KitchenStation;
          recipe_id: string | null;
          allergens: string[];
          image_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_id: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          price?: number;
          status?: MenuItemStatus;
          station?: KitchenStation;
          recipe_id?: string | null;
          allergens?: string[];
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          status?: MenuItemStatus;
          station?: KitchenStation;
          recipe_id?: string | null;
          allergens?: string[];
          image_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      modifier_groups: {
        Row: {
          id: string;
          menu_item_id: string;
          name: string;
          required: boolean;
          min_selections: number;
          max_selections: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          menu_item_id: string;
          name: string;
          required?: boolean;
          min_selections?: number;
          max_selections?: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          menu_item_id?: string;
          name?: string;
          required?: boolean;
          min_selections?: number;
          max_selections?: number;
          sort_order?: number;
        };
      };
      modifiers: {
        Row: {
          id: string;
          modifier_group_id: string;
          name: string;
          price_adjustment: number;
          is_default: boolean;
        };
        Insert: {
          id?: string;
          modifier_group_id: string;
          name: string;
          price_adjustment?: number;
          is_default?: boolean;
        };
        Update: {
          id?: string;
          modifier_group_id?: string;
          name?: string;
          price_adjustment?: number;
          is_default?: boolean;
        };
      };
      tabs: {
        Row: {
          id: string;
          tenant_id: string;
          table_number: string | null;
          cover_count: number | null;
          server_name: string | null;
          status: TabStatus;
          opened_at: string;
          closed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          table_number?: string | null;
          cover_count?: number | null;
          server_name?: string | null;
          status?: TabStatus;
          opened_at?: string;
          closed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          table_number?: string | null;
          cover_count?: number | null;
          server_name?: string | null;
          status?: TabStatus;
          opened_at?: string;
          closed_at?: string | null;
          updated_at?: string;
        };
      };
      pos_orders: {
        Row: {
          id: string;
          tenant_id: string;
          tab_id: string | null;
          order_number: number;
          table_number: string | null;
          cover_count: number | null;
          server_name: string | null;
          status: OrderStatus;
          notes: string | null;
          subtotal: number;
          tax: number;
          total: number;
          fired_at: string | null;
          paid_at: string | null;
          voided_at: string | null;
          void_reason: string | null;
          closed_at: string | null;
          covers: number;
          total_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          tab_id?: string | null;
          order_number?: number;
          table_number?: string | null;
          cover_count?: number | null;
          server_name?: string | null;
          status?: OrderStatus;
          notes?: string | null;
          subtotal?: number;
          tax?: number;
          total?: number;
          fired_at?: string | null;
          paid_at?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          closed_at?: string | null;
          covers?: number;
          total_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          tab_id?: string | null;
          order_number?: number;
          table_number?: string | null;
          cover_count?: number | null;
          server_name?: string | null;
          status?: OrderStatus;
          notes?: string | null;
          subtotal?: number;
          tax?: number;
          total?: number;
          fired_at?: string | null;
          paid_at?: string | null;
          voided_at?: string | null;
          void_reason?: string | null;
          closed_at?: string | null;
          covers?: number;
          total_cents?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      pos_order_line_items: {
        Row: {
          id: string;
          order_id: string;
          tenant_id: string;
          menu_item_id: string;
          name: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          station: string;
          course_number: number;
          recipe_id: string | null;
          notes: string | null;
          void_reason: string | null;
          is_voided: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          tenant_id: string;
          menu_item_id: string;
          name: string;
          quantity?: number;
          unit_price: number;
          line_total: number;
          station: string;
          course_number?: number;
          recipe_id?: string | null;
          notes?: string | null;
          void_reason?: string | null;
          is_voided?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          tenant_id?: string;
          menu_item_id?: string;
          name?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          station?: string;
          course_number?: number;
          recipe_id?: string | null;
          notes?: string | null;
          void_reason?: string | null;
          is_voided?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      line_item_modifiers: {
        Row: {
          id: string;
          line_item_id: string;
          modifier_id: string | null;
          name: string;
          price_adjustment: number;
        };
        Insert: {
          id?: string;
          line_item_id: string;
          modifier_id?: string | null;
          name: string;
          price_adjustment?: number;
        };
        Update: {
          id?: string;
          line_item_id?: string;
          modifier_id?: string | null;
          name?: string;
          price_adjustment?: number;
        };
      };
      payments: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          amount: number;
          method: PaymentMethod;
          status: PaymentStatus;
          tip_amount: number;
          reference_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_client_secret: string | null;
          tip_cents: number;
          receipt_sent_at: string | null;
          receipt_email: string | null;
          failure_message: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          amount: number;
          method: PaymentMethod;
          status?: PaymentStatus;
          tip_amount?: number;
          reference_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_client_secret?: string | null;
          tip_cents?: number;
          receipt_sent_at?: string | null;
          receipt_email?: string | null;
          failure_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          amount?: number;
          method?: PaymentMethod;
          status?: PaymentStatus;
          tip_amount?: number;
          reference_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_client_secret?: string | null;
          tip_cents?: number;
          receipt_sent_at?: string | null;
          receipt_email?: string | null;
          failure_message?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
      };
      domain_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          tenant_id: string;
          source: string;
          version: number;
          payload: Json;
          processed: boolean;
          processed_at: string | null;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          tenant_id: string;
          source: string;
          version?: number;
          payload: Json;
          processed?: boolean;
          processed_at?: string | null;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          tenant_id?: string;
          source?: string;
          version?: number;
          payload?: Json;
          processed?: boolean;
          processed_at?: string | null;
          error?: string | null;
          created_at?: string;
        };
      };
      ingredients: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          unit: string;
          current_qty: number;
          reorder_at: number;
          reorder_qty: number;
          cost_per_unit: number;
          supplier: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          unit: string;
          current_qty?: number;
          reorder_at?: number;
          reorder_qty?: number;
          cost_per_unit?: number;
          supplier?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          unit?: string;
          current_qty?: number;
          reorder_at?: number;
          reorder_qty?: number;
          cost_per_unit?: number;
          supplier?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          ingredient_id: string;
          quantity: number;
          unit: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
      pantry_ledger: {
        Row: {
          id: string;
          tenant_id: string;
          ingredient_id: string;
          delta: number;
          reason: PantryReason;
          reference_id: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ingredient_id: string;
          delta: number;
          reason: PantryReason;
          reference_id?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ingredient_id?: string;
          delta?: number;
          reason?: PantryReason;
          reference_id?: string | null;
          recorded_by?: string | null;
          created_at?: string;
        };
      };
      course_fire_log: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          course_number: number;
          fired_by: string | null;
          fired_at: string;
          ticket_ids: string[];
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          course_number: number;
          fired_by?: string | null;
          fired_at?: string;
          ticket_ids?: string[];
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          course_number?: number;
          fired_by?: string | null;
          fired_at?: string;
          ticket_ids?: string[];
        };
      };
      restock_purchase_orders: {
        Row: {
          id: string;
          tenant_id: string;
          po_number: string;
          status: POStatus;
          supplier: string | null;
          notes: string | null;
          created_by: string;
          approved_by: string | null;
          approved_at: string | null;
          sent_at: string | null;
          expected_at: string | null;
          received_at: string | null;
          total_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          po_number: string;
          status?: POStatus;
          supplier?: string | null;
          notes?: string | null;
          created_by: string;
          approved_by?: string | null;
          approved_at?: string | null;
          sent_at?: string | null;
          expected_at?: string | null;
          received_at?: string | null;
          total_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          po_number?: string;
          status?: POStatus;
          supplier?: string | null;
          notes?: string | null;
          created_by?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          sent_at?: string | null;
          expected_at?: string | null;
          received_at?: string | null;
          total_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      po_line_items: {
        Row: {
          id: string;
          po_id: string;
          ingredient_id: string;
          ingredient_name: string;
          unit: string;
          ordered_qty: number;
          received_qty: number;
          unit_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          po_id: string;
          ingredient_id: string;
          ingredient_name: string;
          unit: string;
          ordered_qty: number;
          received_qty?: number;
          unit_cost?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          po_id?: string;
          ingredient_id?: string;
          ingredient_name?: string;
          unit?: string;
          ordered_qty?: number;
          received_qty?: number;
          unit_cost?: number;
          created_at?: string;
        };
      };
      pending_push: {
        Row: {
          id: string;
          tenant_id: string;
          station_id: string | null;
          event_type: string;
          payload: Json;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          station_id?: string | null;
          event_type: string;
          payload?: Json;
          created_at?: string;
          delivered_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          station_id?: string | null;
          event_type?: string;
          payload?: Json;
          created_at?: string;
          delivered_at?: string | null;
        };
      };
      staff_pins: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          pin_hash: string;
          display_name: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          pin_hash: string;
          display_name: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          pin_hash?: string;
          display_name?: string;
          active?: boolean;
          created_at?: string;
        };
      };
      waste_events: {
        Row: {
          id: string;
          tenant_id: string;
          ingredient: string;
          quantity_grams: number;
          cost_per_gram: number;
          waste_cost: number;
          reason: string;
          notes: string | null;
          log_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          ingredient: string;
          quantity_grams: number;
          cost_per_gram?: number;
          waste_cost?: number;
          reason: string;
          notes?: string | null;
          log_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          ingredient?: string;
          quantity_grams?: number;
          cost_per_gram?: number;
          waste_cost?: number;
          reason?: string;
          notes?: string | null;
          log_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      plate_economics: {
        Row: {
          id: string;
          tenant_id: string;
          order_id: string;
          menu_item_id: string | null;
          item_name: string;
          quantity: number;
          sale_price_cents: number | null;
          theoretical_cost_cents: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          order_id: string;
          menu_item_id?: string | null;
          item_name: string;
          quantity?: number;
          sale_price_cents?: number | null;
          theoretical_cost_cents?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          item_name?: string;
          quantity?: number;
          sale_price_cents?: number | null;
          theoretical_cost_cents?: number | null;
          created_at?: string;
        };
      };
      menu_item_recipes: {
        Row: {
          id: string;
          tenant_id: string;
          menu_item_id: string;
          recipe_id: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          menu_item_id: string;
          recipe_id: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          menu_item_id?: string;
          recipe_id?: string;
        };
      };
      ai_prompt_log: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          prompt_name: string;
          prompt_version: string;
          inputs: Json;
          raw_output: string;
          review_status: AIPromptReviewStatus;
          edited_output: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          prompt_name: string;
          prompt_version: string;
          inputs: Json;
          raw_output: string;
          review_status?: AIPromptReviewStatus;
          edited_output?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          prompt_name?: string;
          prompt_version?: string;
          inputs?: Json;
          raw_output?: string;
          review_status?: AIPromptReviewStatus;
          edited_output?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
      };
      beta_applications: {
        Row: {
          id: string;
          business_name: string;
          business_type: string;
          current_pos: string | null;
          primary_pain: string | null;
          phone: string;
          email: string;
          location: string | null;
          status: BetaApplicationStatus;
          founder_notes: string | null;
          applied_at: string;
          admitted_at: string | null;
          converted_at: string | null;
        };
        Insert: {
          id?: string;
          business_name: string;
          business_type: string;
          current_pos?: string | null;
          primary_pain?: string | null;
          phone: string;
          email: string;
          location?: string | null;
          status?: BetaApplicationStatus;
          founder_notes?: string | null;
          applied_at?: string;
          admitted_at?: string | null;
          converted_at?: string | null;
        };
        Update: {
          id?: string;
          business_name?: string;
          business_type?: string;
          current_pos?: string | null;
          primary_pain?: string | null;
          phone?: string;
          email?: string;
          location?: string | null;
          status?: BetaApplicationStatus;
          founder_notes?: string | null;
          applied_at?: string;
          admitted_at?: string | null;
          converted_at?: string | null;
        };
      };
      beta_feedback: {
        Row: {
          id: string;
          application_id: string;
          week_number: number;
          call_date: string;
          bugs_reported: string[] | null;
          confusion_points: string[] | null;
          feature_requests: string[] | null;
          what_worked: string | null;
          nps_score: number | null;
          conversion_intent: BetaConversionIntent | null;
          conversion_blocker: string | null;
          founder_action_items: string[] | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          application_id: string;
          week_number: number;
          call_date: string;
          bugs_reported?: string[] | null;
          confusion_points?: string[] | null;
          feature_requests?: string[] | null;
          what_worked?: string | null;
          nps_score?: number | null;
          conversion_intent?: BetaConversionIntent | null;
          conversion_blocker?: string | null;
          founder_action_items?: string[] | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          application_id?: string;
          week_number?: number;
          call_date?: string;
          bugs_reported?: string[] | null;
          confusion_points?: string[] | null;
          feature_requests?: string[] | null;
          what_worked?: string | null;
          nps_score?: number | null;
          conversion_intent?: BetaConversionIntent | null;
          conversion_blocker?: string | null;
          founder_action_items?: string[] | null;
          recorded_at?: string;
        };
      };
      extension_registry: {
        Row: {
          id: string;
          extension_id: string;
          name: string;
          description: string;
          category: ExtensionCategory;
          version: string;
          author_name: string;
          author_email: string;
          pricing_model: ExtensionPricingModel;
          price_cents: number;
          download_url: string;
          manifest_hash: string;
          permissions: string[];
          is_verified: boolean;
          is_published: boolean;
          install_count: number;
          avg_rating: number | null;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          extension_id: string;
          name: string;
          description: string;
          category: ExtensionCategory;
          version: string;
          author_name: string;
          author_email: string;
          pricing_model: ExtensionPricingModel;
          price_cents?: number;
          download_url: string;
          manifest_hash: string;
          permissions: string[];
          is_verified?: boolean;
          is_published?: boolean;
          install_count?: number;
          avg_rating?: number | null;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          extension_id?: string;
          name?: string;
          description?: string;
          category?: ExtensionCategory;
          version?: string;
          author_name?: string;
          author_email?: string;
          pricing_model?: ExtensionPricingModel;
          price_cents?: number;
          download_url?: string;
          manifest_hash?: string;
          permissions?: string[];
          is_verified?: boolean;
          is_published?: boolean;
          install_count?: number;
          avg_rating?: number | null;
          published_at?: string | null;
          created_at?: string;
        };
      };
      installed_extensions: {
        Row: {
          id: string;
          location_id: string;
          extension_id: string;
          installed_at: string;
          is_enabled: boolean;
          settings: Json;
          last_error: string | null;
          last_error_at: string | null;
        };
        Insert: {
          id?: string;
          location_id: string;
          extension_id: string;
          installed_at?: string;
          is_enabled?: boolean;
          settings?: Json;
          last_error?: string | null;
          last_error_at?: string | null;
        };
        Update: {
          id?: string;
          location_id?: string;
          extension_id?: string;
          installed_at?: string;
          is_enabled?: boolean;
          settings?: Json;
          last_error?: string | null;
          last_error_at?: string | null;
        };
      };
      extension_error_log: {
        Row: {
          id: string;
          location_id: string | null;
          extension_id: string;
          error_message: string;
          stack_trace: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          location_id?: string | null;
          extension_id: string;
          error_message: string;
          stack_trace?: string | null;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          location_id?: string | null;
          extension_id?: string;
          error_message?: string;
          stack_trace?: string | null;
          occurred_at?: string;
        };
      };
      founding_customers: {
        Row: {
          id: string;
          company_id: string;
          customer_number: number;
          business_name: string;
          business_type: string;
          location: string;
          converted_at: string;
          public_name: string | null;
          public_permission: boolean | null;
          guarantee_terms: string;
          transferable_to: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_number: number;
          business_name: string;
          business_type: string;
          location: string;
          converted_at?: string;
          public_name?: string | null;
          public_permission?: boolean | null;
          guarantee_terms?: string;
          transferable_to?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          customer_number?: number;
          business_name?: string;
          business_type?: string;
          location?: string;
          converted_at?: string;
          public_name?: string | null;
          public_permission?: boolean | null;
          guarantee_terms?: string;
          transferable_to?: string | null;
        };
      };
    };
    Views: {
      station_summary: {
        Row: {
          tenant_id: string;
          station: KitchenStation;
          active_count: number;
          bumped_count: number;
          avg_cook_seconds: number | null;
        };
      };
      pantry_status: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          unit: string;
          current_qty: number;
          reorder_at: number;
          reorder_qty: number;
          cost_per_unit: number;
          supplier: string | null;
          stock_status: StockStatus;
        };
      };
      order_course_status: {
        Row: {
          order_id: string;
          tenant_id: string;
          course_number: number;
          held_count: number;
          firing_count: number;
          fired_count: number;
          bumped_count: number;
          total_count: number;
          all_bumped: boolean | null;
        };
      };
      beta_at_risk: {
        Row: {
          business_name: string;
          phone: string;
          week_number: number;
          conversion_intent: string | null;
          conversion_blocker: string | null;
          nps_score: number | null;
          call_date: string;
        };
      };
    };
    Functions: {
      my_tenant_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      my_role: {
        Args: {
          p_tenant_id: string;
        };
        Returns: string | null;
      };
      next_po_number: {
        Args: {
          p_tenant_id: string;
        };
        Returns: string;
      };
      get_public_menu_by_slug: {
        Args: {
          p_slug: string;
        };
        Returns: Json | null;
      };
      decrement_pantry_stock: {
        Args: {
          item_id: string;
          qty: number;
          p_tenant_id?: string | null;
          p_reason?: string;
          p_reference_id?: string | null;
        };
        Returns: number;
      };
    };
    Enums: {
      po_status: POStatus;
      kitchen_station: KitchenStation;
      ticket_status: TicketStatus;
      ticket_priority: TicketPriority;
      course_hold_status: CourseHoldStatus;
      menu_status: MenuStatus;
      menu_item_status: MenuItemStatus;
      tab_status: TabStatus;
      order_status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      stock_status: StockStatus;
      tenant_plan: TenantPlan;
      tenant_status: TenantStatus;
      tenant_user_role: TenantUserRole;
    };
  };
}

// ------------------------------------------------------------
// Convenience Row Type Aliases
// ------------------------------------------------------------
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export type TenantUser = Database['public']['Tables']['tenant_users']['Row'];
export type TenantUserInsert = Database['public']['Tables']['tenant_users']['Insert'];
export type TenantUserUpdate = Database['public']['Tables']['tenant_users']['Update'];

export type KitchenTicketRow = Database['public']['Tables']['kitchen_tickets']['Row'];
export type KitchenTicketInsert = Database['public']['Tables']['kitchen_tickets']['Insert'];
export type KitchenTicketUpdate = Database['public']['Tables']['kitchen_tickets']['Update'];

export type TicketItemRow = Database['public']['Tables']['ticket_items']['Row'];
export type TicketItemInsert = Database['public']['Tables']['ticket_items']['Insert'];
export type TicketItemUpdate = Database['public']['Tables']['ticket_items']['Update'];

export type MenuRow = Database['public']['Tables']['menus']['Row'];
export type MenuInsert = Database['public']['Tables']['menus']['Insert'];
export type MenuUpdate = Database['public']['Tables']['menus']['Update'];

export type MenuSectionRow = Database['public']['Tables']['menu_sections']['Row'];
export type MenuSectionInsert = Database['public']['Tables']['menu_sections']['Insert'];
export type MenuSectionUpdate = Database['public']['Tables']['menu_sections']['Update'];

export type MenuItemRow = Database['public']['Tables']['menu_items']['Row'];
export type MenuItemInsert = Database['public']['Tables']['menu_items']['Insert'];
export type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update'];

export type ModifierGroupRow = Database['public']['Tables']['modifier_groups']['Row'];
export type ModifierGroupInsert = Database['public']['Tables']['modifier_groups']['Insert'];
export type ModifierGroupUpdate = Database['public']['Tables']['modifier_groups']['Update'];

export type ModifierRow = Database['public']['Tables']['modifiers']['Row'];
export type ModifierInsert = Database['public']['Tables']['modifiers']['Insert'];
export type ModifierUpdate = Database['public']['Tables']['modifiers']['Update'];

export type TabRow = Database['public']['Tables']['tabs']['Row'];
export type TabInsert = Database['public']['Tables']['tabs']['Insert'];
export type TabUpdate = Database['public']['Tables']['tabs']['Update'];

export type PosOrderRow = Database['public']['Tables']['pos_orders']['Row'];
export type PosOrderInsert = Database['public']['Tables']['pos_orders']['Insert'];
export type PosOrderUpdate = Database['public']['Tables']['pos_orders']['Update'];

export type PosOrderLineItemRow = Database['public']['Tables']['pos_order_line_items']['Row'];
export type PosOrderLineItemInsert = Database['public']['Tables']['pos_order_line_items']['Insert'];
export type PosOrderLineItemUpdate = Database['public']['Tables']['pos_order_line_items']['Update'];

export type LineItemModifierRow = Database['public']['Tables']['line_item_modifiers']['Row'];
export type LineItemModifierInsert = Database['public']['Tables']['line_item_modifiers']['Insert'];
export type LineItemModifierUpdate = Database['public']['Tables']['line_item_modifiers']['Update'];

export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type DomainEventRow = Database['public']['Tables']['domain_events']['Row'];
export type DomainEventInsert = Database['public']['Tables']['domain_events']['Insert'];
export type DomainEventUpdate = Database['public']['Tables']['domain_events']['Update'];

export type IngredientRow = Database['public']['Tables']['ingredients']['Row'];
export type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
export type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

export type RecipeIngredientRow = Database['public']['Tables']['recipe_ingredients']['Row'];
export type RecipeIngredientInsert = Database['public']['Tables']['recipe_ingredients']['Insert'];
export type RecipeIngredientUpdate = Database['public']['Tables']['recipe_ingredients']['Update'];

export type PantryLedgerRow = Database['public']['Tables']['pantry_ledger']['Row'];
export type PantryLedgerInsert = Database['public']['Tables']['pantry_ledger']['Insert'];
export type PantryLedgerUpdate = Database['public']['Tables']['pantry_ledger']['Update'];

export type CourseFireLogRow = Database['public']['Tables']['course_fire_log']['Row'];
export type CourseFireLogInsert = Database['public']['Tables']['course_fire_log']['Insert'];
export type CourseFireLogUpdate = Database['public']['Tables']['course_fire_log']['Update'];

export type RestockPurchaseOrderRow = Database['public']['Tables']['restock_purchase_orders']['Row'];
export type RestockPurchaseOrderInsert = Database['public']['Tables']['restock_purchase_orders']['Insert'];
export type RestockPurchaseOrderUpdate = Database['public']['Tables']['restock_purchase_orders']['Update'];

export type PoLineItemRow = Database['public']['Tables']['po_line_items']['Row'];
export type PoLineItemInsert = Database['public']['Tables']['po_line_items']['Insert'];
export type PoLineItemUpdate = Database['public']['Tables']['po_line_items']['Update'];

export type PendingPushRow = Database['public']['Tables']['pending_push']['Row'];
export type PendingPushInsert = Database['public']['Tables']['pending_push']['Insert'];
export type PendingPushUpdate = Database['public']['Tables']['pending_push']['Update'];

export type StaffPinRow = Database['public']['Tables']['staff_pins']['Row'];
export type StaffPinInsert = Database['public']['Tables']['staff_pins']['Insert'];
export type StaffPinUpdate = Database['public']['Tables']['staff_pins']['Update'];

export type WasteEventRow = Database['public']['Tables']['waste_events']['Row'];
export type WasteEventInsert = Database['public']['Tables']['waste_events']['Insert'];
export type WasteEventUpdate = Database['public']['Tables']['waste_events']['Update'];

export type PlateEconomicsRow = Database['public']['Tables']['plate_economics']['Row'];
export type PlateEconomicsInsert = Database['public']['Tables']['plate_economics']['Insert'];
export type PlateEconomicsUpdate = Database['public']['Tables']['plate_economics']['Update'];

export type MenuItemRecipeRow = Database['public']['Tables']['menu_item_recipes']['Row'];
export type MenuItemRecipeInsert = Database['public']['Tables']['menu_item_recipes']['Insert'];
export type MenuItemRecipeUpdate = Database['public']['Tables']['menu_item_recipes']['Update'];

export type AIPromptLogRow = Database['public']['Tables']['ai_prompt_log']['Row'];
export type AIPromptLogInsert = Database['public']['Tables']['ai_prompt_log']['Insert'];
export type AIPromptLogUpdate = Database['public']['Tables']['ai_prompt_log']['Update'];

export type BetaApplicationRow = Database['public']['Tables']['beta_applications']['Row'];
export type BetaApplicationInsert = Database['public']['Tables']['beta_applications']['Insert'];
export type BetaApplicationUpdate = Database['public']['Tables']['beta_applications']['Update'];

export type BetaFeedbackRow = Database['public']['Tables']['beta_feedback']['Row'];
export type BetaFeedbackInsert = Database['public']['Tables']['beta_feedback']['Insert'];
export type BetaFeedbackUpdate = Database['public']['Tables']['beta_feedback']['Update'];

export type ExtensionRegistryRow = Database['public']['Tables']['extension_registry']['Row'];
export type ExtensionRegistryInsert = Database['public']['Tables']['extension_registry']['Insert'];
export type ExtensionRegistryUpdate = Database['public']['Tables']['extension_registry']['Update'];

export type InstalledExtensionRow = Database['public']['Tables']['installed_extensions']['Row'];
export type InstalledExtensionInsert = Database['public']['Tables']['installed_extensions']['Insert'];
export type InstalledExtensionUpdate = Database['public']['Tables']['installed_extensions']['Update'];

export type ExtensionErrorLogRow = Database['public']['Tables']['extension_error_log']['Row'];
export type ExtensionErrorLogInsert = Database['public']['Tables']['extension_error_log']['Insert'];
export type ExtensionErrorLogUpdate = Database['public']['Tables']['extension_error_log']['Update'];

export type FoundingCustomerRow = Database['public']['Tables']['founding_customers']['Row'];
export type FoundingCustomerInsert = Database['public']['Tables']['founding_customers']['Insert'];
export type FoundingCustomerUpdate = Database['public']['Tables']['founding_customers']['Update'];

// View Rows
export type StationSummaryRow = Database['public']['Views']['station_summary']['Row'];
export type PantryStatusRow = Database['public']['Views']['pantry_status']['Row'];
export type OrderCourseStatusRow = Database['public']['Views']['order_course_status']['Row'];
export type BetaAtRiskRow = Database['public']['Views']['beta_at_risk']['Row'];
```
