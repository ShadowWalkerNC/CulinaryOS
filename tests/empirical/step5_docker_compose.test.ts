import { describe, it, expect } from 'bun:test';
import fs from 'fs';
import path from 'path';

// -------------------------------------------------------------------
// Step 5 Empirical Verification: Docker Compose Infrastructure
// -------------------------------------------------------------------

describe('Step 5: Docker Compose Infrastructure Validation', () => {
  const composePath = path.resolve(process.cwd(), 'docker-compose.yml');
  const composeContent = fs.readFileSync(composePath, 'utf8');

  it('verifies docker-compose.yml file exists and is non-empty', () => {
    expect(fs.existsSync(composePath)).toBe(true);
    expect(composeContent.length).toBeGreaterThan(100);
  });

  it('validates required services are declared', () => {
    expect(composeContent).toContain('backend:');
    expect(composeContent).toContain('pos-client:');
    expect(composeContent).toContain('kds-client:');
    expect(composeContent).toContain('admin-client:');
    expect(composeContent).toContain('web-client:');
  });

  it('validates exact port mappings according to spec', () => {
    // POS: 5172, KDS: 5173, Admin: 5174, Web: 5176, backend: 3000
    expect(composeContent).toContain('"3000:3000"');
    expect(composeContent).toContain('"5172:80"');
    expect(composeContent).toContain('"5173:80"');
    expect(composeContent).toContain('"5174:80"');
    expect(composeContent).toContain('"5176:80"');
  });

  it('validates required environment variables & build args for multi-tenant isolation', () => {
    expect(composeContent).toContain('VITE_TENANT_ID: ${VITE_TENANT_ID}');
    expect(composeContent).toContain('VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}');
    expect(composeContent).toContain('VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}');
    expect(composeContent).toContain('VITE_API_URL: ${VITE_API_URL:-http://localhost:3000}');
  });

  it('validates backend service healthcheck configuration', () => {
    expect(composeContent).toContain('healthcheck:');
    expect(composeContent).toContain('http://localhost:3000/health');
    expect(composeContent).toContain('condition: service_healthy');
  });

  it('validates multi-tenant isolation configuration across services', () => {
    // Each client service depends on backend and receives tenant context
    const posBlock = composeContent.slice(composeContent.indexOf('pos-client:'), composeContent.indexOf('kds-client:'));
    const kdsBlock = composeContent.slice(composeContent.indexOf('kds-client:'), composeContent.indexOf('admin-client:'));
    const adminBlock = composeContent.slice(composeContent.indexOf('admin-client:'), composeContent.indexOf('web-client:'));
    const webBlock = composeContent.slice(composeContent.indexOf('web-client:'));

    expect(posBlock).toContain('VITE_TENANT_ID');
    expect(kdsBlock).toContain('VITE_TENANT_ID');
    expect(adminBlock).toContain('VITE_TENANT_ID');
    expect(webBlock).toContain('VITE_TENANT_ID');
  });
});
