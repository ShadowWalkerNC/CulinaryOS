import { describe, expect, it } from 'bun:test';
import { normalizeLocalApiBase } from '../../packages/shared/src/api-client.ts';

describe('API base loopback normalization', () => {
  it('uses IPv4 for an HTTP localhost development API', () => {
    expect(normalizeLocalApiBase('http://localhost:3000')).toBe('http://127.0.0.1:3000');
  });

  it('preserves an explicit IPv4 or remote API address', () => {
    expect(normalizeLocalApiBase('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    expect(normalizeLocalApiBase('https://api.example.com')).toBe('https://api.example.com');
  });

  it('does not rewrite HTTPS localhost, whose certificate name is significant', () => {
    expect(normalizeLocalApiBase('https://localhost:3000')).toBe('https://localhost:3000');
  });
});
