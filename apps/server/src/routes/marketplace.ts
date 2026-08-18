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
