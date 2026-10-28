import { describe, expect, it, afterAll, beforeAll } from 'bun:test';
import { Hono } from 'hono';
import { createHash } from 'node:crypto';
import {
  createInteragencyRoutes,
} from '../../apps/server/src/routes/interagency.ts';
import {
  InteragencyService,
  type Grant,
  type Authorization,
  type GrantStore,
  type Resource,
  type SnapshotRecord,
} from '../../apps/server/src/interagency/service.ts';
import { setAdminSupabaseForTesting } from '../../apps/server/src/middleware/supabase.ts';
import type { Env } from '../../apps/server/src/types.ts';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const MANAGER_JWT = 'valid-manager-jwt';

class RouteMemoryStore implements GrantStore {
  grants = new Map<string, Grant>();
  codes = new Map<string, Authorization>();
  membership = true;

  async create(g: Grant, a: Authorization) {
    this.grants.set(g.id, { ...g });
    this.codes.set(a.codeHash, a);
  }
  async authorization(h: string) {
    return this.codes.get(h) ?? null;
  }
  async exchange(
    h: string,
    c: string,
    r: string,
    t: string,
    f: string,
    e: string,
    now: string
  ) {
    const a = this.codes.get(h);
    if (!a || a.challenge !== c || a.redirectUri !== r || a.expiresAt <= now) {
      return null;
    }
    this.codes.delete(h);
    const g = this.grants.get(a.grantId)!;
    if (g.revokedAt || g.expiresAt <= now) return null;
    Object.assign(g, { tokenHash: t, refreshHash: f, tokenExpiresAt: e });
    return { ...g };
  }
  async byAccess(h: string) {
    return [...this.grants.values()].find((g) => g.tokenHash === h) ?? null;
  }
  async byRefresh(h: string) {
    return [...this.grants.values()].find((g) => g.refreshHash === h) ?? null;
  }
  async rotate(
    id: string,
    old: string,
    t: string,
    f: string,
    e: string,
    now: string
  ) {
    const g = this.grants.get(id);
    if (!g || g.refreshHash !== old || g.revokedAt || g.expiresAt <= now) {
      return null;
    }
    Object.assign(g, { tokenHash: t, refreshHash: f, tokenExpiresAt: e });
    return { ...g };
  }
  async member(_u: string, t: string) {
    return this.membership && t === TENANT_ID;
  }
  async revoke(id: string, t: string) {
    const g = this.grants.get(id);
    if (g?.tenantId === t) g.revokedAt = '2026-10-27T12:00:00.000Z';
  }
  async list(u: string, t: string) {
    return [...this.grants.values()].filter(
      (g) => g.userId === u && g.tenantId === t
    );
  }
  async snapshot(
    t: string,
    _r: Resource,
    offset: number,
    limit: number
  ): Promise<SnapshotRecord[]> {
    if (t !== TENANT_ID) return [];
    return [
      { id: 'rec-1', sourceVersion: 'v1', data: { name: 'Artisan Melt' } },
      { id: 'rec-2', sourceVersion: 'v1', data: { name: 'Truffle Fries' } },
    ].slice(offset, offset + limit);
  }
}

function createTestHarness(enabled = true) {
  setAdminSupabaseForTesting({
    auth: {
      getUser: async (token: string) => {
        if (token === MANAGER_JWT) {
          return { data: { user: { id: USER_ID } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { role: 'manager' },
              error: null,
            }),
          }),
        }),
      }),
    }),
  });

  const store = new RouteMemoryStore();
  let time = Date.parse('2026-10-27T12:00:00.000Z');
  const service = new InteragencyService(store, () => time);

  const routes = createInteragencyRoutes(
    () => service,
    () => enabled
  );

  const app = new Hono<Env>();
  app.route('/v1/interagency', routes);

  const verifier = 'a'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const redirectUri = 'http://127.0.0.1:3101/interagency/callback';

  return { app, store, service, verifier, challenge, redirectUri };
}

describe('Interagency HTTP Routes — /v1/interagency', () => {
  it('returns 404 when INTERAGENCY_READ_ENABLED is false', async () => {
    const { app } = createTestHarness(false);
    const res = await app.request('/v1/interagency/snapshots?resource=recipes');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('disabled');
  });

  it('handles full PKCE flow: authorize -> token -> snapshots -> refresh -> revoke', async () => {
    const { app, verifier, challenge, redirectUri } = createTestHarness(true);

    // 1. Authorize
    const authRes = await app.request('/v1/interagency/authorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
        Authorization: `Bearer ${MANAGER_JWT}`,
      },
      body: JSON.stringify({
        redirectUri,
        challenge,
        state: 's'.repeat(43),
        scopes: ['recipes', 'sales_summary'],
      }),
    });
    expect(authRes.status).toBe(200);
    const authBody = await authRes.json();
    expect(authBody.grantId).toBeDefined();
    expect(authBody.redirect).toContain('code=');

    const code = new URL(authBody.redirect).searchParams.get('code')!;
    expect(code).toBeDefined();

    // 2. Token Exchange
    const tokenRes = await app.request('/v1/interagency/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grantType: 'authorization_code',
        code,
        verifier,
        redirectUri,
      }),
    });
    expect(tokenRes.status).toBe(200);
    const tokenBody = await tokenRes.json();
    expect(tokenBody.accessToken).toBeDefined();
    expect(tokenBody.refreshToken).toBeDefined();
    expect(tokenBody.scopes).toEqual(['recipes', 'sales_summary']);

    // 3. Read Snapshots
    const snapRes = await app.request('/v1/interagency/snapshots?resource=recipes', {
      headers: {
        Authorization: `Bearer ${tokenBody.accessToken}`,
      },
    });
    expect(snapRes.status).toBe(200);
    const snapBody = await snapRes.json();
    expect(snapBody.resource).toBe('recipes');
    expect(snapBody.readOnly).toBe(true);
    expect(snapBody.records.length).toBe(2);
    expect(snapBody.records[0].data.name).toBe('Artisan Melt');

    // 4. Refresh Token Rotation
    const refreshRes = await app.request('/v1/interagency/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grantType: 'refresh_token',
        refreshToken: tokenBody.refreshToken,
      }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshBody = await refreshRes.json();
    expect(refreshBody.accessToken).toBeDefined();
    expect(refreshBody.refreshToken).not.toBe(tokenBody.refreshToken);

    // Old access token fails after refresh
    const oldSnapRes = await app.request('/v1/interagency/snapshots?resource=recipes', {
      headers: {
        Authorization: `Bearer ${tokenBody.accessToken}`,
      },
    });
    expect(oldSnapRes.status).toBe(401);

    // New access token succeeds
    const newSnapRes = await app.request('/v1/interagency/snapshots?resource=recipes', {
      headers: {
        Authorization: `Bearer ${refreshBody.accessToken}`,
      },
    });
    expect(newSnapRes.status).toBe(200);

    // 5. Manager Lists Active Grants
    const listRes = await app.request('/v1/interagency/grants', {
      headers: {
        'X-Tenant-Id': TENANT_ID,
        Authorization: `Bearer ${MANAGER_JWT}`,
      },
    });
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json();
    expect(listBody.grants.length).toBe(1);
    expect(listBody.grants[0].audience).toBe('culinaryos-interagency');

    // 6. Manager Revokes Grant
    const revokeRes = await app.request(
      `/v1/interagency/grants/${listBody.grants[0].id}/revoke`,
      {
        method: 'POST',
        headers: {
          'X-Tenant-Id': TENANT_ID,
          Authorization: `Bearer ${MANAGER_JWT}`,
        },
      }
    );
    expect(revokeRes.status).toBe(200);
    const revokeBody = await revokeRes.json();
    expect(revokeBody.revoked).toBe(true);

    // Access after revocation fails
    const postRevokeRes = await app.request('/v1/interagency/snapshots?resource=recipes', {
      headers: {
        Authorization: `Bearer ${refreshBody.accessToken}`,
      },
    });
    expect(postRevokeRes.status).toBe(401);
  });

  it('rejects payloads over 64KB with 413 Payload Too Large', async () => {
    const { app } = createTestHarness(true);
    const largePayload = JSON.stringify({
      data: 'x'.repeat(70000),
    });
    const res = await app.request('/v1/interagency/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: largePayload,
    });
    expect(res.status).toBe(413);
  });
});
