/**
 * Echo adapter: offline fallback for tests and demos. Returns the last
 * user message wrapped as an assistant reply. No network, no cost.
 */
import type { ChatMessage, CompleteOptions, ModelAdapter } from './types.ts';

export class EchoAdapter implements ModelAdapter {
  readonly id = 'echo';
  async complete(messages: ChatMessage[], _opts?: CompleteOptions): Promise<string> {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    return `[echo] ${last?.content ?? '(no input)'}`;
  }
}
