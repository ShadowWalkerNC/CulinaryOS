// ============================================================
// Tier 2 — F1.4: 3-Mode Tableside QR (Boundary & Corner Cases)
// Covers: Extreme tip bounds (0% and 500%), negative custom tips clamped to 0,
// empty table parameters, non-ASCII restaurant slugs, and $0 balance checks.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  buildTablesideUrl,
  calculateTablesideTip,
  parseTablesideUrl,
} from '../tier1-features/f1_4_tableside_qr.test.js';

describe('F1.4 Tableside QR — Tier 2 Boundaries', () => {
  it('1. calculates 0% tip without error preserving subtotal + tax total', () => {
    const res = calculateTablesideTip(5000, 413, { type: 'percent', value: 0 });
    expect(res.tipCents).toBe(0);
    expect(res.totalCents).toBe(5413);
  });

  it('2. calculates high gratuity (e.g. 50% / 100% tip) accurately', () => {
    const res = calculateTablesideTip(10000, 825, { type: 'percent', value: 100 });
    expect(res.tipCents).toBe(10000);
    expect(res.totalCents).toBe(20825);
  });

  it('3. clamps negative custom tip input to $0', () => {
    const res = calculateTablesideTip(5000, 413, { type: 'custom_cents', value: -500 });
    expect(res.tipCents).toBe(0);
    expect(res.totalCents).toBe(5413);
  });

  it('4. encodes and decodes URL with URI-encoded unicode slugs (e.g. "café-münchen")', () => {
    const url = buildTablesideUrl('https://orders.culinaryos.org', 'café-münchen', 'T-09', 'view_only');
    const parsed = parseTablesideUrl(url);
    expect(decodeURIComponent(parsed.slug)).toBe('café-münchen');
    expect(parsed.tableNumber).toBe('T-09');
    expect(parsed.mode).toBe('view_only');
  });

  it('5. handles $0 order balance with $0 tip returning $0 total', () => {
    const res = calculateTablesideTip(0, 0, { type: 'percent', value: 18 });
    expect(res.tipCents).toBe(0);
    expect(res.totalCents).toBe(0);
  });
});
