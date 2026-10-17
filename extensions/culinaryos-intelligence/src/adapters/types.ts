/**
 * Model adapter interface: models are replaceable. Adapters only carry
 * prompts and completions — all restaurant business logic lives in skills.
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompleteOptions {
  maxTokens?: number;
  temperature?: number;
  /** Stop sequences. */
  stop?: string[];
}

export interface ModelAdapter {
  readonly id: string;
  complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string>;
}
