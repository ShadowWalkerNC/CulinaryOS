import { describe, it, expect } from 'bun:test';
import {
  emitPrepTaskCompleted,
  buildShiftPrep,
  getMiseEnPlace,
  scaleRecipe,
  calculateRatio,
} from '../../packages/prep-engine/src/index';

describe('CulinaryOS Prep Domain Consolidation', () => {
  it('re-exports ratio-engine scaling and ratio calculations', () => {
    const recipe = {
      id: 'loaf-1',
      name: 'Country Loaf',
      baseIngredient: 'Flour',
      ingredients: [
        { name: 'Flour', ratio: 1.0, unit: 'g' },
        { name: 'Water', ratio: 0.75, unit: 'g' },
        { name: 'Salt', ratio: 0.02, unit: 'g' },
      ],
    };

    const scaled = scaleRecipe(recipe, 2000);
    expect(scaled['Flour']).toBe(2000);
    expect(scaled['Water']).toBe(1500);
    expect(scaled['Salt']).toBe(40);

    const ratio = calculateRatio(750, 1000);
    expect(ratio).toBe(75);
  });

  it('builds mise en place and shift prep lists', () => {
    const recipe = {
      id: 'dressing-1',
      name: 'Salad Dressing',
      baseIngredient: 'Olive Oil',
      ingredients: [
        { name: 'Olive Oil', ratio: 0.7, unit: 'ml' },
        { name: 'Vinegar', ratio: 0.3, unit: 'ml' },
      ],
    };

    const mise = getMiseEnPlace(recipe, 500);
    expect(mise).toHaveLength(2);
    expect(mise[0].ingredient).toBe('Olive Oil');
    expect(mise[0].amount).toBe(350);

    const prep = buildShiftPrep(
      [
        { ingredient: 'Dressing', currentStock: 2, parLevel: 5, unit: 'bottles' },
        { ingredient: 'Croutons', currentStock: 10, parLevel: 8, unit: 'bags' },
      ],
      'lunch',
      '2026-10-04'
    );
    expect(prep.items).toHaveLength(1);
    expect(prep.items[0].ingredient).toBe('Dressing');
    expect(prep.items[0].prepAmount).toBe(3);
  });

  it('emits prep.task.completed domain events from Record input', () => {
    const event = emitPrepTaskCompleted({
      taskId: 'task-101',
      tenantId: '00000000-0000-0000-0000-000000000001',
      recipeName: 'Country Loaf',
      recipeId: 'rec-01',
      completedBy: 'Maria S.',
      decrements: {
        Flour: 2000,
        Water: 1500,
        Salt: 40,
      },
    });

    expect(event.eventType).toBe('prep.task.completed');
    expect(event.version).toBe(1);
    expect(event.payload.taskId).toBe('task-101');
    expect(event.payload.recipeName).toBe('Country Loaf');
    expect(event.payload.completedBy).toBe('Maria S.');
    expect(event.payload.decrements).toHaveLength(3);
    expect(event.payload.decrements[0]).toEqual({ ingredient: 'Flour', quantity: 2000 });
  });

  it('emits prep.task.completed domain events from mise en place array input', () => {
    const event = emitPrepTaskCompleted({
      taskId: 'task-102',
      tenantId: '00000000-0000-0000-0000-000000000001',
      decrements: [
        { ingredient: 'Tomato Sauce', amount: 5000, unit: 'ml', ingredientId: 'ing-tomato' },
      ],
    });

    expect(event.payload.decrements[0]).toEqual({
      ingredient: 'Tomato Sauce',
      quantity: 5000,
      unit: 'ml',
      ingredientId: 'ing-tomato',
    });
  });
});
