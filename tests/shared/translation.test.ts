import { describe, it, expect } from 'bun:test';
import {
  translateCulinaryText,
  translateTicketItem,
  translateTicket,
  formatDualLanguageText,
  EscPosEncoder,
  type KitchenTicket,
  type KitchenTicketPayload,
} from '@culinaryos/shared';

describe('Culinary Translation Engine', () => {
  it('translates common dishes to Spanish and French', () => {
    const es = translateCulinaryText('Ribeye Steak', 'es');
    expect(es.translated).toBe('Bife de Chorizo');
    expect(es.original).toBe('Ribeye Steak');

    const fr = translateCulinaryText('Ribeye Steak', 'fr');
    expect(fr.translated).toBe('Entrecôte Grillée');

    const burgerEs = translateCulinaryText('Smash Burger Double', 'es');
    expect(burgerEs.translated).toBe('Hamburguesa Smash Doble');
  });

  it('translates cooking temperatures and doneness', () => {
    expect(translateCulinaryText('Medium Rare', 'es').translated).toBe('Término Medio / Poco Hecho');
    expect(translateCulinaryText('Medium Rare', 'fr').translated).toBe('À Point / Saignant');
    expect(translateCulinaryText('Well Done', 'es').translated).toBe('Bien Cocido');
    expect(translateCulinaryText('Well Done', 'fr').translated).toBe('Bien Cuit');
  });

  it('translates modifier patterns dynamically', () => {
    expect(translateCulinaryText('No Onions', 'es').translated).toBe('Sin Cebolla');
    expect(translateCulinaryText('No Onions', 'fr').translated).toBe('Sans Oignons');
    expect(translateCulinaryText('Extra Sauce', 'es').translated).toBe('Salsa Extra');
    expect(translateCulinaryText('Dressing on side', 'es').translated).toBe('Aderezo Aparte');
    expect(translateCulinaryText('Gluten Free', 'es').translated).toBe('Sin Gluten');
  });

  it('translates full kitchen tickets with dual-language headers', () => {
    const ticket: KitchenTicket = {
      id: 't-test-1',
      orderId: 'o-999',
      courseNumber: 1,
      station: 'grill',
      stationName: 'Hot Grill',
      status: 'fired',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'i-1',
          name: 'Ribeye Steak',
          quantity: 2,
          modifiers: ['Medium Rare', 'No Onions'],
          notes: 'Guest allergy to dairy',
        },
      ],
    };

    const translated = translateTicket(ticket, 'es');
    expect(translated.targetLanguage).toBe('es');
    expect(translated.translatedStationName).toBe('Parrilla Caliente');
    expect(translated.items[0].translatedName).toBe('Bife de Chorizo');
    expect(translated.items[0].dualLanguageHeader).toBe('Bife de Chorizo (Ribeye Steak)');
    expect(translated.items[0].translatedModifiers?.[0]).toContain('Término Medio');
    expect(translated.items[0].translatedModifiers?.[1]).toContain('Sin Cebolla');
  });

  it('formats dual-language inline and stacked text', () => {
    const inline = formatDualLanguageText('Caesar Salad', 'es', 'inline');
    expect(inline).toBe('Ensalada César (Caesar Salad)');

    const stacked = formatDualLanguageText('Caesar Salad', 'es', 'stacked');
    expect(stacked).toBe('Ensalada César\n  (Caesar Salad)');
  });

  it('encodes bilingual ESC/POS kitchen thermal chits', () => {
    const payload: KitchenTicketPayload = {
      ticketId: 't-1234',
      orderId: 'o-5678',
      tableNumber: 'Table 4',
      serverName: 'Chef Maria',
      station: 'grill',
      stationName: 'Hot Grill',
      courseNumber: 2,
      priority: 'allergy',
      timestamp: new Date().toISOString(),
      items: [
        {
          name: 'Ribeye Steak',
          quantity: 1,
          modifiers: ['Medium Rare', 'Nut Allergy'],
          notes: 'Cross-contact caution',
        },
      ],
    };

    const encoder = new EscPosEncoder();
    const bytes = encoder.encodeKitchenChit(payload, { paperWidth: '80mm' }, 'es');
    expect(bytes instanceof Uint8Array).toBe(true);
    expect(bytes.length).toBeGreaterThan(50);

    const text = encoder.generateKitchenChitText(payload, 48, 'es');
    expect(text).toContain('PARRILLA CALIENTE');
    expect(text).toContain('Bife de Chorizo');
    expect(text).toContain('Ribeye Steak');
    expect(text).toContain('TIEMPO 2');
  });
});
