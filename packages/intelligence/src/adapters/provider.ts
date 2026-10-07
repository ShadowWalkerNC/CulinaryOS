/**
 * Multi-provider Model Adapter
 * Unified interface and factory supporting Claude (Anthropic), Gemini (Google),
 * OpenAI, and Local (Ollama, LM Studio, llama.cpp, vLLM) backends.
 */

import type { ChatMessage, CompleteOptions, ModelAdapter } from './types.ts';

export type ProviderType = 'claude' | 'gemini' | 'openai' | 'local';

export interface ProviderConfig {
  provider: ProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Custom fetch function for testing and mocking without network calls. */
  fetchFn?: typeof fetch;
}

export interface ProviderAdapter extends ModelAdapter {
  readonly provider: ProviderType;
  readonly model: string;
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
  abstract readonly id: string;
  abstract readonly provider: ProviderType;
  readonly model: string;
  protected apiKey?: string;
  protected baseUrl: string;
  protected timeoutMs: number;
  protected customHeaders: Record<string, string>;
  protected fetchFn: typeof fetch;

  constructor(config: ProviderConfig, defaultBaseUrl: string, defaultModel: string) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? defaultModel;
    this.baseUrl = (config.baseUrl ?? defaultBaseUrl).replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 60000;
    this.customHeaders = config.headers ?? {};
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  abstract complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string>;

  protected async executeRequest(url: string, init: RequestInit): Promise<any> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(url, {
        ...init,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let errBody = '';
        try {
          errBody = await res.text();
        } catch {
          // ignore
        }
        throw new Error(`[${this.provider}] API request failed (HTTP ${res.status}): ${errBody || res.statusText}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

export type SubclassProviderConfig = Omit<ProviderConfig, 'provider'> & { provider?: ProviderType };

/**
 * Anthropic Claude Provider Adapter
 * Wire format: POST https://api.anthropic.com/v1/messages
 */
export class ClaudeProviderAdapter extends BaseProviderAdapter {
  readonly id = 'claude';
  readonly provider: ProviderType = 'claude';

  constructor(config: SubclassProviderConfig = {}) {
    super(
      { ...config, provider: 'claude' },
      'https://api.anthropic.com/v1',
      'claude-3-5-sonnet-20241022'
    );
  }

  async complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const systemPrompt = systemMessages.map((m) => m.content).join('\n\n');
    const conversation = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const url = `${this.baseUrl}/messages`;
    const payload: Record<string, any> = {
      model: this.model,
      messages: conversation.length > 0 ? conversation : [{ role: 'user', content: '' }],
      max_tokens: opts?.maxTokens ?? 1024,
      temperature: opts?.temperature,
      stop_sequences: opts?.stop,
    };
    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      ...this.customHeaders,
    };

    const data = await this.executeRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const contentBlocks = data?.content;
    if (Array.isArray(contentBlocks) && contentBlocks.length > 0) {
      return contentBlocks
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');
    }
    return '';
  }
}

/**
 * Google Gemini Provider Adapter
 * Wire format: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */
export class GeminiProviderAdapter extends BaseProviderAdapter {
  readonly id = 'gemini';
  readonly provider: ProviderType = 'gemini';

  constructor(config: SubclassProviderConfig = {}) {
    super(
      { ...config, provider: 'gemini' },
      'https://generativelanguage.googleapis.com/v1beta',
      'gemini-1.5-pro'
    );
  }

  async complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string> {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystem = messages.filter((m) => m.role !== 'system');

    const contents = nonSystem.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const payload: Record<string, any> = {
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '' }] }],
      generationConfig: {
        maxOutputTokens: opts?.maxTokens,
        temperature: opts?.temperature,
        stopSequences: opts?.stop,
      },
    };

    if (systemMessages.length > 0) {
      payload.systemInstruction = {
        parts: systemMessages.map((s) => ({ text: s.content })),
      };
    }

    const keyParam = this.apiKey ? `?key=${encodeURIComponent(this.apiKey)}` : '';
    const url = `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent${keyParam}`;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...this.customHeaders,
    };

    const data = await this.executeRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (Array.isArray(parts)) {
      return parts.map((p: any) => p.text ?? '').join('');
    }
    return '';
  }
}

/**
 * OpenAI Provider Adapter
 * Wire format: POST https://api.openai.com/v1/chat/completions
 */
export class OpenAIProviderAdapter extends BaseProviderAdapter {
  readonly id = 'openai';
  readonly provider: ProviderType = 'openai';

  constructor(config: SubclassProviderConfig = {}) {
    super(
      { ...config, provider: 'openai' },
      'https://api.openai.com/v1',
      'gpt-4o'
    );
  }

  async complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      max_tokens: opts?.maxTokens,
      temperature: opts?.temperature,
      stop: opts?.stop,
    };

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      ...this.customHeaders,
    };

    const data = await this.executeRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return data?.choices?.[0]?.message?.content ?? '';
  }
}

/**
 * Local Endpoint Provider Adapter (Ollama, LM Studio, llama.cpp, vLLM)
 * Wire format: POST {baseUrl}/chat/completions (OpenAI compatible)
 */
export class LocalProviderAdapter extends BaseProviderAdapter {
  readonly id = 'local';
  readonly provider: ProviderType = 'local';

  constructor(config: SubclassProviderConfig = {}) {
    super(
      { ...config, provider: 'local' },
      config.baseUrl ?? 'http://localhost:11434/v1',
      'llama3.1'
    );
  }

  async complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const payload = {
      model: this.model,
      messages,
      max_tokens: opts?.maxTokens,
      temperature: opts?.temperature,
      stop: opts?.stop,
    };

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
      ...this.customHeaders,
    };

    const data = await this.executeRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    return data?.choices?.[0]?.message?.content ?? '';
  }
}

/**
 * Factory function creating a ProviderAdapter based on provider configuration.
 */
export function createProviderAdapter(config: ProviderConfig): ProviderAdapter {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProviderAdapter(config);
    case 'gemini':
      return new GeminiProviderAdapter(config);
    case 'openai':
      return new OpenAIProviderAdapter(config);
    case 'local':
      return new LocalProviderAdapter(config);
    default: {
      const exhaustiveCheck: never = config.provider;
      throw new Error(`Unsupported AI model provider: ${exhaustiveCheck}`);
    }
  }
}
