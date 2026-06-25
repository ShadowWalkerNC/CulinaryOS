# 🍳 CulinaryOS

> The all-in-one culinary intelligence platform — built for professional kitchens, food entrepreneurs, and culinary creators. 

CulinaryOS is designed as a local-first, modular platform orchestrating microservices via the **Model Context Protocol (MCP)**. This architecture ensures high-speed, offline-capable kitchen tools (POS, KDS, Inventory) that can later sync to cloud SaaS/PaaS backends.

---

## 🗺️ Architectural Ecosystem

```
CulinaryOS Core Platform
├── Mobile (Android — Track A)
│   ├── Recipe Engine + Ratio Blueprint System
│   ├── Prep List Manager
│   └── AI Chef Assistant (Anthropic API)
│
├── MCP Microservices Layer (Local-first / STDIO & SSE)
│   ├── POS MCP Server (create_order, apply_loyalty)
│   ├── KDS MCP Server (fetch_kds_tickets, bump_kds_ticket)
│   └── Inventory MCP Server (get_inventory_levels, log_audit_count)
│
├── Web / ERP Interface (React + Base44 — Track B)
│   ├── POS · KDS · Inventory · Scheduling
│   └── CRM + Loyalty · Scheduling CRM · Team Chat
│
└── Desktop App (Electron) & SaaS Sync (Supabase)
    ├── Local-first Room to Supabase Sync
    └── RestRevive AI Data Bridge
```

---

## 📁 Repository Documentation Hub

Explore the detailed blueprints for CulinaryOS modules and specifications:

### 🔌 [MCP Microservices Spec](file:///c:/Users/User/Documents/CulinaryOS/docs/mcp_architecture_spec.md)
*Detailed JSON-RPC schemas and tool specifications for local-first KDS, POS, and inventory Model Context Protocol servers.*

### 📐 [Track A — UI/UX Design Specs](file:///c:/Users/User/Documents/CulinaryOS/docs/track_a_ui_ux_specs.md)
*Jetpack Compose styling tokens, user flows, and wireframe outlines for the Ratio Blueprint recipe engine, mobile prep list batched workflow, and responsive pantry level indicators.*

### 🗄️ [Track A — Room Database Schema](file:///c:/Users/User/Documents/CulinaryOS/docs/track_a_room_schema.md)
*Room SQLite database entities, relations, indices, sync metadata design, and Kotlin implementation details for offline-first operation.*

### 🤖 [AI Features Spec (Both Tracks)](file:///c:/Users/User/Documents/CulinaryOS/docs/ai_features_spec.md)
*System prompts, fallback strategies, and Claude/Anthropic API structures for the Mobile AI Chef Assistant, AI-driven KDS prioritization, and smart 86 ingredient depletion detection.*

### 🌐 [Track B — Base44 Entity Reference](file:///c:/Users/User/Documents/CulinaryOS/docs/track_b_base44_entity_reference.md)
*Database model definitions for POS, KDS queues, physical inventories, scheduling systems, and multi-tenant separation using PostgreSQL Row-Level Security (RLS).*

### 🔌 [API Documentation & Sync Specification](file:///c:/Users/User/Documents/CulinaryOS/docs/api_documentation.md)
*OpenAPI schemas for recipe syndication and third-party integrations, alongside conflict-resolution rules for bi-directional local-to-cloud sync.*

### 💸 [Financial Model & Pricing](file:///c:/Users/User/Documents/CulinaryOS/docs/financial_model_pricing.md)
*Monetization breakdown (Free, Home Chef, Pro Kitchen, Enterprise), Stripe integration parameters, and hosting vs. transaction fee financial planning.*

### 📣 [Go-to-Market Strategy](file:///c:/Users/User/Documents/CulinaryOS/docs/go_to_market_strategy.md)
*Ideal Customer Profiles (ICPs) for cafes, food trucks, bakeries, and institutional facilities, alongside pilot phases and launch metrics.*

---

## 🎯 Project Status & Roadmap

| Module | Stack | Status | Target Launch |
| :--- | :--- | :--- | :--- |
| **Track A (Android)** | Kotlin · Compose · Room | 🔵 In Development | Q3 2026 (Alpha) |
| **Track B (Web)** | React · Base44 · Supabase · Stripe | 🔵 In Development | Q4 2026 (Pilot-ready) |
| **MCP Servers** | Node.js · TypeScript · STDIO/SSE | 🔵 In Development | Q4 2026 (Pilot-ready) |
| **Integrations** | Supabase Sync · Electron · Public API | ⚪ Phase 3/4 planned | Q1 2027+ |
