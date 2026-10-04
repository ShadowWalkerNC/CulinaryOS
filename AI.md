# CulinaryOS Intelligence & Restaurant AI Architecture

> **Document Version:** 1.0.0
> **Status:** Architecture Specification
> **Core Principle:** Vendor-Neutral, Replaceable Providers, Restaurant-Specific Domain Ownership

---

## 1. Architectural Philosophy

CulinaryOS Intelligence transforms operational restaurant telemetry into actionable insights, automated prep recommendations, and real-time margin defense.

> [!IMPORTANT]
> **The Replaceable Provider Directive:**
> Restaurant business logic must **NEVER be coupled** to Anthropic Claude, Google Gemini, OpenAI, or any single model vendor.
> All intelligent capabilities consume the domain through abstract provider interfaces (`ProviderAdapter`). If an AI vendor changes pricing, throttles requests, or goes offline, CulinaryOS switches providers by updating an environment flag.

---

## 2. Core Capabilities

CulinaryOS Intelligence absorbs proven algorithms and workflows from **RestRevive-AI** and the **CulinaryOS Intelligence Addon**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      CulinaryOS Intelligence Layer                     │
├────────────────────────────────────────────────────────────────────────┤
│  Diagnostic Anomaly Detection:                                         │
│  - Food Waste Spikes (vs historical 30-day baseline)                   │
│  - Labor Cost Drift (vs scheduled sales target % threshold)            │
│  - Menu Item Margin Erosion (supplier price hike alerts)               │
│  - HACCP Temperature Deviations (holding cooler warning alerts)        │
├────────────────────────────────────────────────────────────────────────┤
│  Operational Skill Registry (12 Core Skills):                          │
│  - recipe-costing         - menu-margin            - prep-list         │
│  - inventory-par          - production-forecast    - waste-analysis    │
│  - schedule-analysis      - ordering-suggestions   - event-planning    │
│  - haccp-sop              - temps-review           - shift-handoff     │
├────────────────────────────────────────────────────────────────────────┤
│  Autonomous Restaurant Role Agents (6 Persona Profiles):               │
│  - Executive Chef        - General Manager        - Expeditor          │
│  - Line Cook             - Beverage Director      - Compliance Auditor │
├────────────────────────────────────────────────────────────────────────┤
│  Policy & Governance Engine:                                           │
│  - Human-in-the-Loop Approval Queue (for purchases, menu 86s, wages)   │
│  - Tenant Data Redaction & Privacy Isolation                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Abstract Provider Interface (`intelligence/providers/`)

```typescript
export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ProviderAdapter {
  id: 'anthropic' | 'google-gemini' | 'openai' | 'local-litert';
  name: string;
  generateText(prompt: string, options?: AICompletionOptions): Promise<string>;
  generateStructured<T>(prompt: string, schema: any, options?: AICompletionOptions): Promise<T>;
  isAvailable(): Promise<boolean>;
}
```

---

## 4. Ecosystem Boundaries: ForgeSatchel, JOSH & MuseLab

### 4.1 ForgeSatchel Relationship
- **ForgeSatchel:** Broader developer ecosystem providing generic agent runners, MCP dev infrastructure, and context orchestration.
- **Boundary:** CulinaryOS **never duplicates** generic developer tooling. CulinaryOS owns **restaurant-specific** business logic, recipes, inventory schemas, and kitchen operations.

### 4.2 JOSH System 1 Relationship
- **JOSH:** Separate System 1 deterministic classifier and local command router.
- **Boundary:** Do NOT embed JOSH into CulinaryOS core. CulinaryOS integrates via an optional decoupled adapter (`integrations/josh/adapter.ts`) for fast natural language intent classification. If JOSH is absent, CulinaryOS standard UI/CLI routing operates seamlessly.

### 4.3 MuseLab Boundary
- **MuseLab:** Experimental Meta Muse / Muse SDK incubation lab (AI glasses, XR headsets, prototype gadgets). Replaces the legacy `MuseAiBots` repository.
- **Boundary:** **Strict isolation.** CulinaryOS production logic must NEVER depend on experimental MuseLab code. When a hardware or computer vision experiment matures, its stable interface is formally ported to CulinaryOS.
