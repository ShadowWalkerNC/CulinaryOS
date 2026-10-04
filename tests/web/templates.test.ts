import { describe, it, expect } from 'bun:test';
import { resolve } from 'node:path';
import { loadManifest, resolveSlots } from '../../packages/template-engine/src/index';

describe('CulinaryOS Web / Plated Restaurant Templates', () => {
  const templatesRoot = resolve(process.cwd(), 'packages/template-engine/templates');
  const templateNames = [
    'bakery',
    'bar',
    'cafe',
    'catering',
    'food-stand',
    'food-truck',
    'ghost-kitchen',
    'restaurant',
  ];

  it('loads and validates all 8 restaurant template manifests', async () => {
    for (const name of templateNames) {
      const templateDir = resolve(templatesRoot, name);
      const manifest = await loadManifest(templateDir);

      expect(manifest).toBeDefined();
      expect(manifest.businessType).toBe(name);
      expect(typeof manifest.displayName).toBe('string');
      expect(Array.isArray(manifest.slots)).toBe(true);
      expect(manifest.slots.length).toBeGreaterThan(0);
    }
  });

  it('resolves content slots for restaurant template against sample project schema', async () => {
    const restaurantDir = resolve(templatesRoot, 'restaurant');
    const manifest = await loadManifest(restaurantDir);

    const mockSchema: any = {
      id: 'proj-123',
      schemaVersion: '1.0',
      businessType: 'restaurant',
      styleTemplate: 'hearth',
      colorTheme: 'terracotta',
      darkMode: false,
      business: {
        name: 'Gabriel Osteria',
        tagline: 'Modern Italian Kitchen',
        description: 'Authentic wood-fired culinary experience.',
        phone: '555-0199',
        email: 'info@gabrielosteria.com',
      },
      branding: {
        primaryColor: '#e11d48',
        accentColor: '#f59e0b',
        secondaryColor: '#1f2937',
      },
      seo: {
        siteTitle: 'Gabriel Osteria | Modern Italian Kitchen',
        metaDescription: 'Handmade pasta and wood-fired specialties.',
      },
      social: {
        instagram: 'https://instagram.com/gabrielosteria',
      },
      deployment: {
        target: 'vercel',
      },
      locations: [
        {
          name: 'Main Location',
          address: {
            street: '123 Main St',
            city: 'Portland',
            state: 'OR',
            zip: '97201',
          },
        },
      ],
      primaryLocationIndex: 0,
    };

    const slots = resolveSlots(manifest, mockSchema);
    expect(slots).toBeDefined();
    expect(typeof slots).toBe('object');
    expect(slots['business.name']).toBe('Gabriel Osteria');
    expect(slots['business.tagline']).toBe('Modern Italian Kitchen');
    expect(slots['branding.primaryColor']).toBe('#e11d48');
  });
});
