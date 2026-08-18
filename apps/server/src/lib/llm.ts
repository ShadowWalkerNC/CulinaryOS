// ============================================================
// CulinaryOS — Optional LLM Service Layer
// Wraps Anthropic Claude API with graceful degraded mode.
//
// RULE 9 (AGENTS.md): AI is additive, not required.
// No core restaurant operation may have a hard dependency on
// Anthropic API availability. All functions return a fallback
// when ANTHROPIC_API_KEY is absent or the API is unreachable.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';

// ---- Singleton client (only created when key is present) ----

let _client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.trim() === '' || key.startsWith('sk-ant-placeholder')) {
    return null;
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export function isLLMAvailable(): boolean {
  return getClient() !== null;
}

// ---- Shared model config ----

const DEFAULT_MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 1024;

// ---- Public API ----

export interface LLMResult {
  ok: boolean;
  text?: string;
  /** Present when ok is false */
  fallback?: string;
  error?: string;
}

/**
 * Low-level completion call. Returns a structured result that the caller
 * can use without worrying about whether the AI layer is online.
 */
export async function complete(
  systemPrompt: string,
  userMessage: string,
  opts: { model?: string; maxTokens?: number } = {}
): Promise<LLMResult> {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      fallback: 'AI layer unavailable — ANTHROPIC_API_KEY not configured.',
    };
  }

  try {
    const response = await client.messages.create({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text =
      response.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('') ?? '';

    return { ok: true, text };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[llm] Anthropic API error:', message);
    return {
      ok: false,
      fallback: 'AI layer temporarily unavailable.',
      error: message,
    };
  }
}

// ---- Domain-specific helpers ----

/**
 * Generate AI-powered ops insight for a given metrics payload.
 * Returns a plain-English analysis string, or a safe fallback.
 */
export async function generateOpsInsight(metrics: {
  wastePercent: number;
  avgTicketTime: number;
  topWastedItems: string[];
  coverCount: number;
}): Promise<string> {
  const result = await complete(
    `You are an expert restaurant operations analyst. Analyze the provided shift metrics
and produce a concise, actionable insight (3–5 sentences) for the kitchen manager.
Focus on waste reduction, ticket time, and prep prioritization.
Do NOT mention Anthropic or AI. Write in plain restaurant-operator language.`,
    JSON.stringify(metrics, null, 2)
  );
  return result.ok
    ? (result.text ?? '')
    : `Shift summary: ${metrics.coverCount} covers, ${metrics.wastePercent.toFixed(1)}% waste, avg ticket ${metrics.avgTicketTime}s.`;
}

/**
 * Suggest a daily prep plan from pantry par levels and a menu snapshot.
 * Returns a structured plan string or a safe fallback.
 */
export async function suggestPrepPlan(context: {
  menuItems: string[];
  projectedCovers: number;
  lowStockItems: string[];
}): Promise<string> {
  const result = await complete(
    `You are a professional sous chef. Given today's projected covers, menu items,
and low-stock pantry items, generate a concise morning prep checklist (bullet list).
Be practical and specific. No preamble, no closing remarks.`,
    JSON.stringify(context, null, 2)
  );
  return result.ok
    ? (result.text ?? '')
    : `Prep ${context.projectedCovers} covers. Low stock: ${context.lowStockItems.join(', ') || 'none'}.`;
}

/**
 * Generate a short marketing postcard message for loyalty customers.
 */
export async function generateLoyaltyMessage(context: {
  restaurantName: string;
  specialOffer: string;
  customerFirstName: string;
}): Promise<string> {
  const result = await complete(
    `You are a warm, inviting restaurant marketing copywriter. Write a short (2–3 sentence)
loyalty postcard message addressed to the customer by first name.
Mention the offer naturally. Keep the tone friendly and personal.`,
    JSON.stringify(context, null, 2),
    { maxTokens: 256 }
  );
  return result.ok
    ? (result.text ?? '')
    : `Hi ${context.customerFirstName}, ${context.specialOffer} — we hope to see you soon at ${context.restaurantName}!`;
}
