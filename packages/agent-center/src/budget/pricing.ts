import { AGENT_CENTER_DEFAULTS, PROVIDER_IDS, type ProviderId, ValidationError } from '../types.js';

export interface ModelRatePerMillionTokens {
  input_usd_per_1m: number;
  output_usd_per_1m: number;
  cached_input_usd_per_1m: number;
}

const DEFAULT_RATE: ModelRatePerMillionTokens = {
  input_usd_per_1m: 1.0,
  output_usd_per_1m: 4.0,
  cached_input_usd_per_1m: 0.25,
};

export const MODEL_PRICING_CATALOG: Record<string, ModelRatePerMillionTokens> = {
  'openai:gpt-6.1-sol': { input_usd_per_1m: 2.0, output_usd_per_1m: 8.0, cached_input_usd_per_1m: 0.5 },
  'openai:gpt-6.1-astra': { input_usd_per_1m: 1.5, output_usd_per_1m: 6.0, cached_input_usd_per_1m: 0.375 },
  'openai:gpt-4o-mini': { input_usd_per_1m: 0.15, output_usd_per_1m: 0.6, cached_input_usd_per_1m: 0.075 },
  'anthropic:claude-opus-5-5-high': { input_usd_per_1m: 5.0, output_usd_per_1m: 25.0, cached_input_usd_per_1m: 0.5 },
  'anthropic:claude-sonnet-5-5-medium': { input_usd_per_1m: 3.0, output_usd_per_1m: 15.0, cached_input_usd_per_1m: 0.3 },
  'google:gemini-4-argon-high': { input_usd_per_1m: 1.25, output_usd_per_1m: 5.0, cached_input_usd_per_1m: 0.3125 },
  'google:gemini-3.8-flash-medium': { input_usd_per_1m: 0.1, output_usd_per_1m: 0.4, cached_input_usd_per_1m: 0.025 },
  'meta:muse-spark-1.3': { input_usd_per_1m: 0.2, output_usd_per_1m: 0.6, cached_input_usd_per_1m: 0.05 },
  'local_script:deterministic': { input_usd_per_1m: 0, output_usd_per_1m: 0, cached_input_usd_per_1m: 0 },
};

export function usdToMicros(usd: number): number {
  if (typeof usd !== 'number' || !Number.isFinite(usd)) {
    throw new ValidationError(`Invalid USD value: ${String(usd)}`);
  }
  return Math.round(usd * AGENT_CENTER_DEFAULTS.MICRODOLLARS_PER_USD);
}

export function microsToUsd(micros: number): number {
  return Math.round(micros) / AGENT_CENTER_DEFAULTS.MICRODOLLARS_PER_USD;
}

export function getModelRate(provider: ProviderId, model: string): ModelRatePerMillionTokens {
  return MODEL_PRICING_CATALOG[`${provider}:${model}`] ?? DEFAULT_RATE;
}

export function estimateTokenCostMicros(params: {
  provider: ProviderId;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
}): number {
  if (!(PROVIDER_IDS as readonly string[]).includes(params.provider)) {
    throw new ValidationError(`Invalid provider "${String(params.provider)}"`);
  }
  for (const [k, v] of [
    ['input_tokens', params.input_tokens],
    ['output_tokens', params.output_tokens],
    ['cached_tokens', params.cached_tokens],
  ] as const) {
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
      throw new ValidationError(`${k} must be a finite non-negative integer`);
    }
  }
  const rate = getModelRate(params.provider, params.model);
  const billableInput = Math.max(0, params.input_tokens - params.cached_tokens);
  const inputUsd = (billableInput / 1_000_000) * rate.input_usd_per_1m;
  const cachedUsd = (params.cached_tokens / 1_000_000) * rate.cached_input_usd_per_1m;
  const outputUsd = (params.output_tokens / 1_000_000) * rate.output_usd_per_1m;
  return usdToMicros(inputUsd + cachedUsd + outputUsd);
}
