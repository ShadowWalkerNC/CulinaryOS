// ============================================================
// Integration Tests: HTMX Kiosk HTML Streaming Route
// ============================================================

import { describe, it, expect } from 'bun:test';
import { kdsRoutes } from '@culinaryos/server/routes/kds';

describe('GET /v1/kds/htmx-cards', () => {
  it('returns 422 if X-Tenant-Id header is missing', async () => {
    const res = await kdsRoutes.request('/htmx-cards');
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('returns 200 OK with micro-HTML card fragments when X-Tenant-Id is present', async () => {
    const res = await kdsRoutes.request('/htmx-cards', {
      headers: {
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
      },
    });

    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type') || '';
    expect(contentType).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('kds-card');
    expect(html).toContain('TICKET #');
    expect(html).toContain('BUMP TICKET');
    expect(html).toContain('hx-patch="/v1/kds/tickets/');
  });
});
