import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { requestSignup } from '../../apps/marketing/src/lib/signup.ts';

const input = { restaurant_name: 'Test Venue', email: 'operator@example.invalid', password: 'fictional-test-password', timezone: 'UTC' };
const endpoint = 'https://api.example.invalid';
const reply = (body: unknown, status = 200): typeof fetch => async () => Response.json(body, { status });

describe('Marketing signup does not fabricate cloud readiness', () => {
  it('does not send credentials when no API is configured', async () => {
    let calls = 0;
    await assert.rejects(requestSignup(input, undefined, async () => { calls++; throw new Error('Unexpected request'); }), /not configured/);
    assert.equal(calls, 0);
  });
  it('preserves a network failure instead of claiming account creation', async () => {
    await assert.rejects(requestSignup(input, endpoint, async () => { throw new Error('Network unavailable'); }), /Network unavailable/);
  });
  it('refuses unsafe destinations before sending a password', async () => {
    let calls = 0;
    for (const url of ['http://api.example.invalid', 'https://user:secret@api.example.invalid', 'https://api.example.invalid?tracking=yes']) {
      await assert.rejects(requestSignup(input, url, async () => { calls++; throw new Error('Unexpected request'); }), /secure API configuration/);
    }
    assert.equal(calls, 0);
  });
  it('rejects a demo tenant even on HTTP 201', async () => {
    await assert.rejects(requestSignup(input, endpoint, reply({ data: { tenant_id: 'demo', demo_mode: true } }, 201)), /demo/);
  });
  it('rejects old provisioning responses without a verification contract', async () => {
    await assert.rejects(requestSignup(input, endpoint, reply({ data: { success: true, tenant_id: 'legacy' } }, 201)), /verification is not available/);
    await assert.rejects(requestSignup(input, endpoint, reply(null)), /verification is not available/);
  });
  it('reports an unavailable API and duplicate account', async () => {
    await assert.rejects(requestSignup(input, endpoint, reply({ error: { message: 'Registration unavailable' } }, 503)), /Registration unavailable/);
    await assert.rejects(requestSignup(input, endpoint, reply({}, 409)), /already exists/);
  });
  it('sends the actual signup and accepts only pending verification', async () => {
    let sentUrl = '';
    let sentBody: unknown;
    const fetchImpl: typeof fetch = async (url, options) => {
      sentUrl = String(url);
      assert.equal(options?.method, 'POST');
      sentBody = JSON.parse(options?.body as string);
      return Response.json({ data: { verification_required: true } }, { status: 202 });
    };
    assert.deepEqual(await requestSignup(input, endpoint + '/', fetchImpl), { tenantId: null });
    assert.equal(sentUrl, endpoint + '/v1/auth/signup');
    assert.deepEqual(sentBody, input);
  });
});
