// ============================================================
// CulinaryOS — Extension Marketplace API
// GET  /v1/marketplace/extensions          → list all extensions
// GET  /v1/marketplace/extensions/:id      → get one extension
// POST /v1/marketplace/extensions/:id/install → install extension
// GET  /v1/marketplace/extensions/:id/status  → installed status
// GET  /v1/marketplace/ai/insight          → AI ops insight (optional LLM)
// POST /v1/marketplace/ai/prep-plan        → AI prep suggestion (optional LLM)
//
// The marketplace is always available regardless of LLM availability.
// AI-powered endpoints gracefully degrade when ANTHROPIC_API_KEY is absent.
// ============================================================

import { Hono } from 'hono';
import type { Env } from '../types';
import {
  isLLMAvailable,
  generateOpsInsight,
  suggestPrepPlan,
  generateLoyaltyMessage,
} from '../lib/llm';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Extensions manifests live at <repo-root>/extensions/<id>/culinaryos_extension.json
// We resolve from the monorepo root relative to this file's location.
const EXTENSIONS_DIR = path.resolve(__dirname, '../../../../extensions');

// ---- Manifest loader ----

interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  min_platform_version: string;
  author: { name: string; email?: string; url?: string };
  description: string;
  category: string;
  entry_point: string;
  permissions: string[];
  hooks: string[];
  settings_schema: unknown[];
  pricing: { model: string; price_cents: number };
  /** Populated at runtime */
  installed?: boolean;
}

async function loadExtensions(): Promise<ExtensionManifest[]> {
  try {
    const dirs = await readdir(EXTENSIONS_DIR, { withFileTypes: true });
    const results: ExtensionManifest[] = [];
    for (const d of dirs) {
      if (!d.isDirectory()) continue;
      const manifestPath = path.join(EXTENSIONS_DIR, d.name, 'culinaryos_extension.json');
      try {
        const raw = await readFile(manifestPath, 'utf8');
        const manifest = JSON.parse(raw) as ExtensionManifest;
        results.push({ ...manifest, installed: false });
      } catch {
        // Skip directories without a valid manifest
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ---- In-memory installed set (per process; production would use DB) ----
// In live mode, this should be backed by a `tenant_extensions` table.

const installedExtensions = new Set<string>();

// ---- Router ----

export const marketplaceRoutes = new Hono<Env>();

/**
 * GET /v1/marketplace/extensions
 * Returns all available extension manifests with install status.
 */
marketplaceRoutes.get('/extensions', async (c) => {
  const extensions = await loadExtensions();
  const withStatus = extensions.map((ext) => ({
    ...ext,
    installed: installedExtensions.has(ext.id),
    llm_available: isLLMAvailable(),
  }));
  return c.json({ ok: true, data: withStatus });
});

/**
 * GET /v1/marketplace/extensions/:id
 * Returns a single extension manifest.
 */
marketplaceRoutes.get('/extensions/:id', async (c) => {
  const { id } = c.req.param();
  const extensions = await loadExtensions();
  const ext = extensions.find((e) => e.id === id);
  if (!ext) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: `Extension '${id}' not found.` } },
      404
    );
  }
  return c.json({
    ok: true,
    data: { ...ext, installed: installedExtensions.has(ext.id) },
  });
});

/**
 * POST /v1/marketplace/extensions/:id/install
 * Marks an extension as installed for the current tenant session.
 * In production, this should persist to `tenant_extensions` with tenant scoping.
 */
marketplaceRoutes.post('/extensions/:id/install', async (c) => {
  const { id } = c.req.param();
  const extensions = await loadExtensions();
  const ext = extensions.find((e) => e.id === id);
  if (!ext) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: `Extension '${id}' not found.` } },
      404
    );
  }

  installedExtensions.add(id);
  console.log(`[marketplace] Extension installed: ${id}`);

  return c.json({
    ok: true,
    data: {
      id,
      name: ext.name,
      installed: true,
      installedAt: new Date().toISOString(),
    },
  });
});

/**
 * DELETE /v1/marketplace/extensions/:id/install
 * Uninstalls (removes) an extension.
 */
marketplaceRoutes.delete('/extensions/:id/install', async (c) => {
  const { id } = c.req.param();
  if (!installedExtensions.has(id)) {
    return c.json(
      { ok: false, error: { code: 'NOT_FOUND', message: `Extension '${id}' is not installed.` } },
      404
    );
  }
  installedExtensions.delete(id);
  return c.json({ ok: true, data: { id, installed: false } });
});

/**
 * GET /v1/marketplace/extensions/:id/status
 * Returns install status for a specific extension.
 */
marketplaceRoutes.get('/extensions/:id/status', async (c) => {
  const { id } = c.req.param();
  return c.json({
    ok: true,
    data: {
      id,
      installed: installedExtensions.has(id),
      llm_available: isLLMAvailable(),
    },
  });
});

/**
 * GET /v1/marketplace/ai/status
 * Returns whether the optional LLM layer is online.
 */
marketplaceRoutes.get('/ai/status', (c) => {
  return c.json({
    ok: true,
    data: {
      llm_available: isLLMAvailable(),
      provider: isLLMAvailable() ? 'anthropic' : null,
      model: isLLMAvailable() ? 'claude-sonnet-4-5' : null,
    },
  });
});

/**
 * POST /v1/marketplace/ai/ops-insight
 * Returns an AI-generated ops insight for shift metrics.
 * Gracefully degrades when LLM is unavailable.
 */
marketplaceRoutes.post('/ai/ops-insight', async (c) => {
  const body = await c.req.json().catch(() => null) as {
    wastePercent?: number;
    avgTicketTime?: number;
    topWastedItems?: string[];
    coverCount?: number;
  } | null;

  if (!body) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Request body required.' } },
      422
    );
  }

  const metrics = {
    wastePercent: Number(body.wastePercent ?? 0),
    avgTicketTime: Number(body.avgTicketTime ?? 0),
    topWastedItems: Array.isArray(body.topWastedItems) ? body.topWastedItems : [],
    coverCount: Number(body.coverCount ?? 0),
  };

  const insight = await generateOpsInsight(metrics);

  return c.json({
    ok: true,
    data: {
      insight,
      llm_used: isLLMAvailable(),
      generatedAt: new Date().toISOString(),
    },
  });
});

/**
 * POST /v1/marketplace/ai/prep-plan
 * Returns an AI-generated daily prep plan suggestion.
 * Gracefully degrades when LLM is unavailable.
 */
marketplaceRoutes.post('/ai/prep-plan', async (c) => {
  const body = await c.req.json().catch(() => null) as {
    menuItems?: string[];
    projectedCovers?: number;
    lowStockItems?: string[];
  } | null;

  if (!body) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Request body required.' } },
      422
    );
  }

  const context = {
    menuItems: Array.isArray(body.menuItems) ? body.menuItems : [],
    projectedCovers: Number(body.projectedCovers ?? 0),
    lowStockItems: Array.isArray(body.lowStockItems) ? body.lowStockItems : [],
  };

  const plan = await suggestPrepPlan(context);

  return c.json({
    ok: true,
    data: {
      plan,
      llm_used: isLLMAvailable(),
      generatedAt: new Date().toISOString(),
    },
  });
});

/**
 * POST /v1/marketplace/ai/loyalty-message
 * Returns an AI-generated loyalty postcard message.
 * Gracefully degrades when LLM is unavailable.
 */
marketplaceRoutes.post('/ai/loyalty-message', async (c) => {
  const body = await c.req.json().catch(() => null) as {
    restaurantName?: string;
    specialOffer?: string;
    customerFirstName?: string;
  } | null;

  if (!body) {
    return c.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Request body required.' } },
      422
    );
  }

  const context = {
    restaurantName: body.restaurantName ?? 'our restaurant',
    specialOffer: body.specialOffer ?? 'a special offer',
    customerFirstName: body.customerFirstName ?? 'Guest',
  };

  const message = await generateLoyaltyMessage(context);

  return c.json({
    ok: true,
    data: {
      message,
      llm_used: isLLMAvailable(),
      generatedAt: new Date().toISOString(),
    },
  });
});

// ---- Custom Tool Registration & Developer Extension Submission ----

let customRegisteredExtensions: ExtensionManifest[] = [
  {
    id: 'batch-scaler-tool',
    name: 'Culinary Batch Scaler & Yield Engine',
    version: '1.2.0',
    min_platform_version: '0.1.0',
    author: { name: 'CulinaryOS Core Team', email: 'dev@culinaryos.org' },
    description: 'Dynamic batch recipe scaling with pan size dimensional scaling and baker percentage ratios.',
    category: 'Kitchen Tools',
    entry_point: '/tools/batch-scaler',
    permissions: ['recipes:read', 'pantry:read'],
    hooks: ['pos:order:created'],
    settings_schema: [],
    pricing: { model: 'free', price_cents: 0 },
    installed: true,
  },
  {
    id: 'culinary-unit-converter',
    name: 'Density-Aware Unit & Volume Math',
    version: '1.1.0',
    min_platform_version: '0.1.0',
    author: { name: 'Chef Labs Community', email: 'cheflabs@culinaryos.org' },
    description: 'Instant conversion between volume (tsp, tbsp, cups, fl oz, mL, L) and weight (g, oz, lb, kg) tailored to ingredient densities.',
    category: 'Calculators',
    entry_point: '/tools/unit-converter',
    permissions: [],
    hooks: [],
    settings_schema: [],
    pricing: { model: 'free', price_cents: 0 },
    installed: true,
  },
  {
    id: 'promo-flyer-builder',
    name: 'Promo Flyer & Event Menu Designer',
    version: '1.0.0',
    min_platform_version: '0.1.0',
    author: { name: 'Plated Design Studio', url: 'https://plated.culinaryos.org' },
    description: 'Quickly design and print tabletop tents, happy hour flyers, and event menus with branded typography and QR codes.',
    category: 'Marketing & Design',
    entry_point: '/tools/flyer-builder',
    permissions: ['menu:read'],
    hooks: [],
    settings_schema: [],
    pricing: { model: 'free', price_cents: 0 },
    installed: true,
  },
];

/**
 * POST /v1/marketplace/extensions/custom
 * Allows developers and operators to register custom tools / extensions.
 */
marketplaceRoutes.post('/extensions/custom', async (c) => {
  const body = await c.req.json().catch(() => null) as Partial<ExtensionManifest> | null;
  if (!body || !body.name || !body.category) {
    return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Tool Name and Category are required.' } }, 422);
  }

  const id = body.id || `ext-custom-${Date.now()}`;
  const newExt: ExtensionManifest = {
    id,
    name: body.name,
    version: body.version || '1.0.0',
    min_platform_version: '0.1.0',
    author: body.author || { name: 'Community Developer' },
    description: body.description || 'Custom user-created tool for CulinaryOS.',
    category: body.category,
    entry_point: body.entry_point || `/tools/${id}`,
    permissions: body.permissions || [],
    hooks: body.hooks || [],
    settings_schema: body.settings_schema || [],
    pricing: body.pricing || { model: 'free', price_cents: 0 },
    installed: true,
  };

  customRegisteredExtensions.unshift(newExt);
  installedExtensions.add(id);

  return c.json({
    ok: true,
    data: {
      message: `Custom tool "${newExt.name}" registered and activated successfully!`,
      extension: newExt,
    },
  }, 201);
});

/**
 * GET /v1/marketplace/themes
 * Returns curated UI color theme presets.
 */
marketplaceRoutes.get('/themes', (c) => {
  return c.json({
    ok: true,
    data: [
      {
        id: 'bistro-dark',
        name: 'Bistro Dark (Obsidian & Amber)',
        description: 'Warm, low-glare kitchen and dining room theme with rich amber accents.',
        primary: '#f59e0b',
        background: '#09090b',
        card: '#18181b',
        text: '#fafafa',
      },
      {
        id: 'nordic-clean',
        name: 'Nordic Clean (Slate & Ice Blue)',
        description: 'Crisp, high-clarity minimalist aesthetic for modern daytime cafes and bistros.',
        primary: '#0ea5e9',
        background: '#f8fafc',
        card: '#ffffff',
        text: '#0f172a',
      },
      {
        id: 'tuscan-olive',
        name: 'Tuscan Olive (Terracotta & Sage)',
        description: 'Earthy, rustic Italian warmth with sage green and terracotta tones.',
        primary: '#16a34a',
        background: '#1c1917',
        card: '#292524',
        text: '#f5f5f4',
      },
      {
        id: 'midnight-chef',
        name: 'Midnight Chef (OLED & Emerald)',
        description: 'Ultra-high contrast OLED dark theme engineered for fast KDS station reading.',
        primary: '#10b981',
        background: '#000000',
        card: '#111827',
        text: '#f9fafb',
      },
      {
        id: 'solar-gold',
        name: 'Solar Gold (High Contrast)',
        description: 'Bright daylight-optimized theme for outdoor patio POS terminals.',
        primary: '#d97706',
        background: '#ffffff',
        card: '#f3f4f6',
        text: '#111827',
      },
    ],
  });
});

// ============================================================
// Sprint 3: Zero-Fee Developer Marketplace & Paid Verification
// ============================================================

interface MarketplaceVerificationRecord {
  extensionId: string;
  developerEmail: string;
  verificationTier: 'community' | 'verified_partner' | 'enterprise_sla';
  securityAuditStatus: 'passed' | 'pending' | 'review_required';
  developerPayoutRate: 1.0; // 100% to developer
  verifiedAt?: string;
  badge: string;
}

let mockVerifications: Record<string, MarketplaceVerificationRecord> = {
  'stripe-terminal': {
    extensionId: 'stripe-terminal',
    developerEmail: 'hardware@culinaryos.io',
    verificationTier: 'enterprise_sla',
    securityAuditStatus: 'passed',
    developerPayoutRate: 1.0,
    verifiedAt: new Date().toISOString(),
    badge: '🛡️ Verified Enterprise SLA',
  },
  'recipe-vault': {
    extensionId: 'recipe-vault',
    developerEmail: 'community@recipeos.org',
    verificationTier: 'verified_partner',
    securityAuditStatus: 'passed',
    developerPayoutRate: 1.0,
    verifiedAt: new Date().toISOString(),
    badge: '✅ Verified Partner Extension',
  },
};

// ---- POST /v1/marketplace/extensions/submit ----
marketplaceRoutes.post('/extensions/submit', async (c) => {
  const body = await c.req.json<{
    name: string;
    developerEmail: string;
    description: string;
    entryPointUrl: string;
    requestedTier?: 'community' | 'verified_partner' | 'enterprise_sla';
  }>();

  if (!body.name || !body.developerEmail || !body.entryPointUrl) {
    return c.json({ ok: false, error: { message: 'name, developerEmail, entryPointUrl required' } }, 422);
  }

  const extensionId = body.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const tier = body.requestedTier ?? 'community';

  const record: MarketplaceVerificationRecord = {
    extensionId,
    developerEmail: body.developerEmail,
    verificationTier: tier,
    securityAuditStatus: tier === 'community' ? 'passed' : 'pending',
    developerPayoutRate: 1.0, // 0% platform fee, 100% to developer
    badge: tier === 'enterprise_sla' ? '🛡️ Enterprise Verified' : tier === 'verified_partner' ? '✅ Verified Partner' : '📦 Community Open Extension',
  };

  mockVerifications[extensionId] = record;

  return c.json({
    ok: true,
    data: {
      extensionId,
      record,
      message: 'Extension registered in CulinaryOS Developer Marketplace. 100% developer revenue share enabled.',
    },
  }, 201);
});

// ---- GET /v1/marketplace/extensions/:id/verification ----
marketplaceRoutes.get('/extensions/:id/verification', async (c) => {
  const id = c.req.param('id');
  const record = mockVerifications[id] ?? {
    extensionId: id,
    developerEmail: 'dev@example.com',
    verificationTier: 'community',
    securityAuditStatus: 'passed',
    developerPayoutRate: 1.0,
    badge: '📦 Community Extension',
  };

  return c.json({ ok: true, data: record });
});


