import { describe, it, expect } from 'bun:test';
import {
  getMock86Items,
  setMock86Count,
  toggleMock86,
  decrementMock86,
  getMockTickets,
  createMockTicketsFromOrder,
  holdMockTicket,
  fireMockTicket,
  resetMockTickets,
} from '../../apps/server/src/lib/mock-kitchen.js';
import {
  translateTicket,
  translateTicketItem,
  formatDualLanguageText,
} from '@culinaryos/shared';
import {
  calculateIngredientVariance,
  calculateActualVsTheoretical,
} from '@culinaryos/food-cost-engine';
import {
  scaleRecipeByBakersPercentage,
  formatAdhesiveLabel,
} from '@culinaryos/prep-engine';

describe('Milestone 2: Back-of-House Kitchen & Prep Engines Integration', () => {
  describe('F2.1: Live 86 Inventory Countdowns', () => {
    it('initializes and manages 86 countdowns', () => {
      const initial = getMock86Items();
      expect(initial.length).toBeGreaterThan(0);

      const ribeye = setMock86Count('Prime Ribeye Steak', 5);
      expect(ribeye?.countRemaining).toBe(5);
      expect(ribeye?.is86).toBe(false);

      // Decrement by 3 -> 2 remaining
      const dec1 = decrementMock86('Prime Ribeye Steak', 3);
      expect(dec1.item?.countRemaining).toBe(2);
      expect(dec1.is86).toBe(false);

      // Decrement by 2 -> 0 remaining, status locks to 86'd
      const dec2 = decrementMock86('Prime Ribeye Steak', 2);
      expect(dec2.item?.countRemaining).toBe(0);
      expect(dec2.is86).toBe(true);

      // Toggle 86 manual override
      const toggled = toggleMock86('Prime Ribeye Steak');
      expect(toggled?.is86).toBe(false);
      expect(toggled?.countRemaining).toBe(10);
    });
  });

  describe('F2.2: Multi-Course Hold/Fire Pacing', () => {
    it('creates staged course tickets with Course 1 fired and Course 2 held', () => {
      resetMockTickets([]);
      const tickets = createMockTicketsFromOrder({
        tenantId: '00000000-0000-0000-0000-000000000001',
        orderId: 'test-order-99',
        tableNumber: '12',
        items: [
          { name: 'Caesar Salad', quantity: 2, courseNumber: 1, station: 'cold' },
          { name: 'Ribeye Steak', quantity: 2, courseNumber: 2, station: 'grill' },
        ],
      });

      expect(tickets.length).toBe(2);
      const c1 = tickets.find((t) => t.course_number === 1);
      const c2 = tickets.find((t) => t.course_number === 2);

      expect(c1?.course_hold_status).toBe('fired');
      expect(c1?.status).toBe('fired');

      expect(c2?.course_hold_status).toBe('held');
      expect(c2?.status).toBe('queued');

      // Fire Course 2
      const firedC2 = fireMockTicket(c2!.id);
      expect(firedC2?.course_hold_status).toBe('fired');
      expect(firedC2?.status).toBe('fired');
      expect(firedC2?.fired_at).toBeDefined();

      // Re-hold Course 2
      const heldAgain = holdMockTicket(c2!.id);
      expect(heldAgain?.course_hold_status).toBe('held');
      expect(heldAgain?.status).toBe('queued');
    });
  });

  describe('F2.3: Per-Station Dual-Language Culinary Translation', () => {
    it('translates ticket items to Spanish and French with original subtitles', () => {
      const item = {
        name: 'Double Cheeseburger',
        modifiers: ['No Onions', 'Extra Cheese', 'Medium Rare'],
      };

      const es = translateTicketItem(item, 'es');
      expect(es.translatedName).toBe('Hamburguesa Doble con Queso');
      expect(es.translatedModifiers.some((m) => m.includes('Sin Cebolla'))).toBe(true);
      expect(es.translatedModifiers.some((m) => m.includes('Extra Queso'))).toBe(true);

      const fr = translateTicketItem(item, 'fr');
      expect(fr.translatedName).toBe('Double Cheeseburger');
      expect(fr.translatedModifiers.some((m) => m.includes('Sans Oignons'))).toBe(true);

      const formatted = formatDualLanguageText('French Fries', 'es');
      expect(formatted).toBe('Papas Fritas (French Fries)');
    });
  });

  describe('F2.4: 1-Click Waste Logging & Actual-vs-Theoretical Variance', () => {
    it('computes variance and detects cost drift', () => {
      const result = calculateIngredientVariance(100, 108, 3, 4.5, 'Ground Beef Chuck', 'lbs');
      expect(result.theoreticalCost).toBe(450);
      expect(result.actualCost).toBe(486);
      expect(result.wasteCost).toBe(13.5);
      expect(result.varianceCost).toBe(36);
      expect(result.unexplainedCost).toBe(22.5); // 36 - 13.5
      expect(result.status).toBe('alert');
    });
  });

  describe('F2.5: Batch Prep Recipe Scaling & Adhesive Labels', () => {
    it('scales dough and formats thermal expiration label', () => {
      const scaled = scaleRecipeByBakersPercentage(
        {
          name: 'Ciabatta Dough',
          baseFlourGrams: 1000,
          ingredients: [
            { name: 'Flour', percentage: 100 },
            { name: 'Water', percentage: 80 },
            { name: 'Salt', percentage: 2.2 },
            { name: 'Yeast', percentage: 1.0 },
          ],
        },
        3000
      );

      expect(scaled.totalBatchWeightGrams).toBe(5496); // 3000 * 1.832 = 5496

      const label = formatAdhesiveLabel(
        {
          recipeName: 'Ciabatta Dough',
          batchNumber: 'LOT-9988',
          cookInitials: 'JD',
          prepDate: new Date('2026-08-01T06:00:00Z'),
          shelfLifeHours: 48,
          allergens: ['Wheat'],
          yieldQuantity: 5.5,
          yieldUnit: 'kg',
        },
        '2x2'
      );

      expect(label.format).toBe('2x2');
      expect(label.allergenWarningText).toContain('WHEAT');
      expect(label.qrCodeData).toContain('LOT-9988');
      expect(label.escPosCommands.length).toBeGreaterThan(0);
    });
  });
});
