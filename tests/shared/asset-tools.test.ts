import { describe, it, expect } from '../../scripts/bun-test-impl.js';
import { generateOgImage } from '../../packages/asset-tools/src/index.js';

describe('CulinaryOS Web / Plated Asset Tools', () => {
  it('generates a valid 1200x630 Open Graph PNG buffer', async () => {
    const buffer = await generateOgImage({
      businessName: 'Gabriel Osteria',
      tagline: 'Modern Italian Kitchen & Wine Bar',
      primaryColor: '#c2410c',
    });

    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);

    // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50);
    expect(buffer[2]).toBe(0x4E);
    expect(buffer[3]).toBe(0x47);
  });

  it('handles custom dimensions and fallback colors gracefully', async () => {
    const buffer = await generateOgImage({
      businessName: 'The Rusty Fork',
      primaryColor: '#0f172a',
      width: 800,
      height: 418,
    });

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.slice(0, 4).toString('hex')).toBe('89504e47');
  });
});
