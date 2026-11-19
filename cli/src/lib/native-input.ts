import { randomUUID } from 'node:crypto';

export function integerArgument(value: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('Expected a nonnegative safe integer');
  }
  return Number(value);
}

export function operationId(value?: string): string {
  const id = value ?? `cli-${randomUUID()}`;
  console.error(`Operation ID: ${id} (reuse --operation-id for retries)`);
  return id;
}
