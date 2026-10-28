import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// Adversarial Verification of Migrations V20 & V21 (Interagency Read Bridge)
// ============================================================================

describe('Migration V20 — Interagency Read Grants Integrity', () => {
  const v20Path = path.resolve(
    process.cwd(),
    'supabase/migrations/V20__interagency_read_grants.sql'
  );

  it('migration file exists and is non-empty', () => {
    assert.ok(fs.existsSync(v20Path), 'V20 migration file must exist');
    const content = fs.readFileSync(v20Path, 'utf8');
    assert.ok(content.length > 500, 'V20 file should have substantial content');
  });

  it('contains zero Unicode em-dash characters (strict governance)', () => {
    const content = fs.readFileSync(v20Path, 'utf8');
    const emDashes = content.match(/[\u2014]/g) || [];
    assert.strictEqual(emDashes.length, 0, 'Must have zero em-dash characters');
  });

  it('has perfectly balanced dollar quotes ($$) for all PL/pgSQL function bodies', () => {
    const content = fs.readFileSync(v20Path, 'utf8');
    const dollarQuotes = content.match(/\$\$/g) || [];
    assert.ok(dollarQuotes.length > 0, 'Must contain dollar quotes');
    assert.strictEqual(dollarQuotes.length % 2, 0, 'Dollar quotes must be balanced in pairs');
  });

  it('enforces secure search_path on all SECURITY DEFINER functions', () => {
    const content = fs.readFileSync(v20Path, 'utf8');
    const secDefiners = [
      ...content.matchAll(/CREATE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)[\s\S]*?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,pg_temp/gi),
    ];
    assert.ok(secDefiners.length >= 3, `Expected 3 functions with SET search_path=public,pg_temp, found ${secDefiners.length}`);
  });

  it('enforces RLS on both interagency_grants and interagency_authorizations', () => {
    const content = fs.readFileSync(v20Path, 'utf8');
    assert.ok(
      content.includes('ALTER TABLE public.interagency_grants ENABLE ROW LEVEL SECURITY;'),
      'Must enable RLS on interagency_grants'
    );
    assert.ok(
      content.includes('ALTER TABLE public.interagency_authorizations ENABLE ROW LEVEL SECURITY;'),
      'Must enable RLS on interagency_authorizations'
    );
  });

  it('revokes public/anon access and restricts function execution to service_role', () => {
    const content = fs.readFileSync(v20Path, 'utf8');
    assert.ok(content.includes('REVOKE ALL ON public.interagency_grants FROM anon,authenticated;'));
    assert.ok(content.includes('REVOKE ALL ON public.interagency_authorizations FROM anon,authenticated;'));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.interagency_create_authorization(jsonb,jsonb) TO service_role;'));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.interagency_exchange_code(text,text,text,text,text,timestamptz,timestamptz) TO service_role;'));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.interagency_rotate_refresh(uuid,text,text,text,timestamptz,timestamptz) TO service_role;'));
  });
});

describe('Migration V21 — Interagency Read Projections Integrity', () => {
  const v21Path = path.resolve(
    process.cwd(),
    'supabase/migrations/V21__interagency_read_projections.sql'
  );

  it('migration file exists and is non-empty', () => {
    assert.ok(fs.existsSync(v21Path), 'V21 migration file must exist');
    const content = fs.readFileSync(v21Path, 'utf8');
    assert.ok(content.length > 500, 'V21 file should have substantial content');
  });

  it('contains zero Unicode em-dash characters (strict governance)', () => {
    const content = fs.readFileSync(v21Path, 'utf8');
    const emDashes = content.match(/[\u2014]/g) || [];
    assert.strictEqual(emDashes.length, 0, 'Must have zero em-dash characters');
  });

  it('has perfectly balanced dollar quotes ($$) for all projection function bodies', () => {
    const content = fs.readFileSync(v21Path, 'utf8');
    const dollarQuotes = content.match(/\$\$/g) || [];
    assert.ok(dollarQuotes.length > 0, 'Must contain dollar quotes');
    assert.strictEqual(dollarQuotes.length % 2, 0, 'Dollar quotes must be balanced in pairs');
  });

  it('enforces STABLE SECURITY DEFINER with safe search_path on projections', () => {
    const content = fs.readFileSync(v21Path, 'utf8');
    const secDefiners = [
      ...content.matchAll(/CREATE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)[\s\S]*?STABLE\s+SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,pg_temp/gi),
    ];
    assert.ok(secDefiners.length >= 2, `Expected 2 projection functions with STABLE SECURITY DEFINER, found ${secDefiners.length}`);
  });

  it('grants projection execution strictly to service_role', () => {
    const content = fs.readFileSync(v21Path, 'utf8');
    assert.ok(content.includes('REVOKE ALL ON FUNCTION public.interagency_sales_summary(uuid,integer,integer) FROM PUBLIC,anon,authenticated;'));
    assert.ok(content.includes('REVOKE ALL ON FUNCTION public.interagency_recipe_snapshot(uuid,integer,integer) FROM PUBLIC,anon,authenticated;'));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.interagency_sales_summary(uuid,integer,integer) TO service_role;'));
    assert.ok(content.includes('GRANT EXECUTE ON FUNCTION public.interagency_recipe_snapshot(uuid,integer,integer) TO service_role;'));
  });
});
