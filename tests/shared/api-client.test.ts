import { describe, expect, it } from 'bun:test';
import { getApiBase, getTenantId, normalizeLocalApiBase } from '../../packages/shared/src/api-client.ts';

describe('API base loopback normalization', () => {
  it('keeps packaged API requests same-origin on a LAN tablet or HTTPS domain', () => {
    const previous = process.env.VITE_API_URL;
    try {
      process.env.VITE_API_URL = '/';
      expect(`${getApiBase()}/v1/orders`).toBe('/v1/orders');
    } finally {
      if (previous === undefined) delete process.env.VITE_API_URL;
      else process.env.VITE_API_URL = previous;
    }
  });
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

  it('reads the tenant from the environment with the demo default as fallback', () => {
    expect(getTenantId()).toBe('00000000-0000-0000-0000-000000000001');
    const previous = process.env.VITE_TENANT_ID;
    try {
      process.env.VITE_TENANT_ID = 'tenant-from-env';
      expect(getTenantId()).toBe('tenant-from-env');
    } finally {
      if (previous === undefined) delete process.env.VITE_TENANT_ID;
      else process.env.VITE_TENANT_ID = previous;
    }
  });

  it('prefers an explicit IPv4 API address over the loopback default', () => {
    const previous = process.env.VITE_API_URL;
    try {
      process.env.VITE_API_URL = 'http://127.0.0.1:53201';
      expect(getApiBase()).toBe('http://127.0.0.1:53201');
    } finally {
      if (previous === undefined) delete process.env.VITE_API_URL;
      else process.env.VITE_API_URL = previous;
    }
  });
});
