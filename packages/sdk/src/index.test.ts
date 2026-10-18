import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryOSClient } from './index.js';

describe('CulinaryOS SDK Client', () => {
  it('instantiates client with base configuration and default URL', () => {
    const client = new CulinaryOSClient({
      tenantId: 'tenant-demo-123',
      apiKey: 'key_test_abc',
    });

    assert.equal(client.tenantId, 'tenant-demo-123');
    assert.equal(client.baseUrl, 'http://localhost:3000');
    assert.ok(client.integrations.shoreline !== undefined);
  });

  it('normalizes custom baseUrl removing trailing slash', () => {
    const client = new CulinaryOSClient({
      baseUrl: 'https://api.culinaryos.internal/',
      tenantId: 'tenant-prod-999',
    });

    assert.equal(client.baseUrl, 'https://api.culinaryos.internal');
  });
});
