import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProviderAdapter,
  ClaudeProviderAdapter,
  GeminiProviderAdapter,
  OpenAIProviderAdapter,
  LocalProviderAdapter,
} from '../src/adapters/provider.ts';
import type { ChatMessage } from '../src/adapters/types.ts';

describe('Multi-provider Model Adapter Suite', () => {
  const sampleMessages: ChatMessage[] = [
    { role: 'system', content: 'You are a Michelin star kitchen supervisor.' },
    { role: 'user', content: 'How should I prep duck confit?' },
  ];

  it('creates provider instances with correct IDs and models', () => {
    const claude = createProviderAdapter({ provider: 'claude', apiKey: 'claude-key' });
    assert.equal(claude.id, 'claude');
    assert.equal(claude.provider, 'claude');
    assert.ok(claude instanceof ClaudeProviderAdapter);

    const gemini = createProviderAdapter({ provider: 'gemini', apiKey: 'gemini-key' });
    assert.equal(gemini.id, 'gemini');
    assert.equal(gemini.provider, 'gemini');
    assert.ok(gemini instanceof GeminiProviderAdapter);

    const openai = createProviderAdapter({ provider: 'openai', apiKey: 'openai-key' });
    assert.equal(openai.id, 'openai');
    assert.equal(openai.provider, 'openai');
    assert.ok(openai instanceof OpenAIProviderAdapter);

    const local = createProviderAdapter({ provider: 'local', baseUrl: 'http://localhost:11434/v1' });
    assert.equal(local.id, 'local');
    assert.equal(local.provider, 'local');
    assert.ok(local instanceof LocalProviderAdapter);
  });

  it('throws on unsupported provider', () => {
    assert.throws(() => {
      createProviderAdapter({ provider: 'unknown-vendor' as any });
    });
  });

  it('executes Claude completions with correct Anthropic payload and headers', async () => {
    let capturedUrl = '';
    let capturedHeaders: any = {};
    let capturedBody: any = {};

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      capturedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          content: [{ type: 'text', text: 'Cure duck legs in salt and thyme for 24 hours.' }],
        }),
      } as Response;
    }) as typeof fetch;

    const adapter = new ClaudeProviderAdapter({
      apiKey: 'sk-ant-test',
      fetchFn: mockFetch,
    });

    const completion = await adapter.complete(sampleMessages, { maxTokens: 500, temperature: 0.2 });

    assert.equal(capturedUrl, 'https://api.anthropic.com/v1/messages');
    assert.equal(capturedHeaders['x-api-key'], 'sk-ant-test');
    assert.equal(capturedHeaders['anthropic-version'], '2023-06-01');
    assert.equal(capturedBody.system, 'You are a Michelin star kitchen supervisor.');
    assert.equal(capturedBody.messages[0].role, 'user');
    assert.equal(capturedBody.max_tokens, 500);
    assert.equal(capturedBody.temperature, 0.2);
    assert.equal(completion, 'Cure duck legs in salt and thyme for 24 hours.');
  });

  it('executes Gemini completions with Google generateContent wire format', async () => {
    let capturedUrl = '';
    let capturedBody: any = {};

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Submerge in duck fat at 90C for 3 hours.' }],
              },
            },
          ],
        }),
      } as Response;
    }) as typeof fetch;

    const adapter = new GeminiProviderAdapter({
      apiKey: 'ai-google-test',
      model: 'gemini-1.5-flash',
      fetchFn: mockFetch,
    });

    const completion = await adapter.complete(sampleMessages);

    assert.ok(capturedUrl.includes('/models/gemini-1.5-flash:generateContent?key=ai-google-test'));
    assert.equal(capturedBody.systemInstruction.parts[0].text, 'You are a Michelin star kitchen supervisor.');
    assert.equal(capturedBody.contents[0].parts[0].text, 'How should I prep duck confit?');
    assert.equal(completion, 'Submerge in duck fat at 90C for 3 hours.');
  });

  it('executes OpenAI completions with standard ChatCompletion format', async () => {
    let capturedUrl = '';
    let capturedHeaders: any = {};
    let capturedBody: any = {};

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      capturedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          choices: [
            {
              message: { content: 'Sear skin side down until crisp and golden.' },
            },
          ],
        }),
      } as Response;
    }) as typeof fetch;

    const adapter = new OpenAIProviderAdapter({
      apiKey: 'sk-proj-test',
      model: 'gpt-4o-mini',
      fetchFn: mockFetch,
    });

    const completion = await adapter.complete(sampleMessages);

    assert.equal(capturedUrl, 'https://api.openai.com/v1/chat/completions');
    assert.equal(capturedHeaders['authorization'], 'Bearer sk-proj-test');
    assert.equal(capturedBody.model, 'gpt-4o-mini');
    assert.equal(completion, 'Sear skin side down until crisp and golden.');
  });

  it('executes Local completions against Ollama/LM Studio endpoints', async () => {
    let capturedUrl = '';
    let capturedBody: any = {};

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          choices: [{ message: { content: 'Local LLM Chef Advice' } }],
        }),
      } as Response;
    }) as typeof fetch;

    const adapter = new LocalProviderAdapter({
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'llama3.2',
      fetchFn: mockFetch,
    });

    const completion = await adapter.complete(sampleMessages);

    assert.equal(capturedUrl, 'http://127.0.0.1:11434/v1/chat/completions');
    assert.equal(capturedBody.model, 'llama3.2');
    assert.equal(completion, 'Local LLM Chef Advice');
  });

  it('surfaces actionable error when provider API returns HTTP failure', async () => {
    const mockFetch = (async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API key provided',
    })) as unknown as typeof fetch;

    const adapter = new ClaudeProviderAdapter({
      apiKey: 'bad-key',
      fetchFn: mockFetch,
    });

    await assert.rejects(
      async () => {
        await adapter.complete(sampleMessages);
      },
      /\[claude\] API request failed \(HTTP 401\)/
    );
  });
});
