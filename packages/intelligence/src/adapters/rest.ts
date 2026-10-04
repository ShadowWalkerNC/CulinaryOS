/**
 * OpenAI-compatible REST adapter (fetch, zero deps). Covers Ollama
 * (http://localhost:11434/v1), OpenAI, and any OpenAI-compatible local
 * server (llama.cpp, LM Studio, vLLM, ...). Providers with different
 * wire shapes implement ModelAdapter the same way.
 */
import type { ChatMessage, CompleteOptions, ModelAdapter } from './types.ts';

export interface RestAdapterOptions {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
}

export class RestAdapter implements ModelAdapter {
  readonly id = 'rest';
  private baseUrl: string;
  private model: string;
  private apiKey?: string;
  private timeoutMs: number;

  constructor(opts: RestAdapterOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.model = opts.model;
    this.apiKey = opts.apiKey;
    this.timeoutMs = opts.timeoutMs ?? 60000;
  }

  /** Ollama defaults: baseUrl http://localhost:11434/v1, no key needed. */
  static ollama(model = 'llama3.1', baseUrl = 'http://localhost:11434/v1'): RestAdapter {
    return new RestAdapter({ baseUrl, model });
  }

  async complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: opts?.maxTokens,
          temperature: opts?.temperature,
          stop: opts?.stop,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`model request failed: HTTP ${res.status}`);
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return body.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }
}
