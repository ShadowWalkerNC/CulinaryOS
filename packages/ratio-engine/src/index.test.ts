import { describe, it, expect } from 'bun:test';
import { scaleBlueprint, computeCost, fromTotalWeight } from './index';

const sourdough = {
  id: 'sourdough',
  name: 'Sourdough Boule',
  baseYield: 1,
  yieldUnit: 'loaf',
  ingredients: [
    { id: 'flour',   name: 'Bread Flour', ratioWeight: 100, unit: 'g' as const },
    { id: 'water',   name: 'Water',       ratioWeight: 75,  unit: 'ml' as const },
    { id: 'starter', name: 'Starter',     ratioWeight: 20,  unit: 'g' as const },
    { id: 'salt',    name: 'Salt',        ratioWeight: 2,   unit: 'g' as const },
  ],
};

describe('scaleBlueprint', () => {
  it('scales to 12 loaves preserving ratios', () => {
    const scaled = scaleBlueprint(sourdough, 12);
    expect(scaled.find(i => i.id === 'flour')?.ratioWeight).toBe(1200);
    expect(scaled.find(i => i.id === 'water')?.ratioWeight).toBe(900);
  });

  it('throws on zero yield', () => {
    expect(() => scaleBlueprint(sourdough, 0)).toThrow();
  });
});

describe('computeCost', () => {
  it('computes cost correctly', () => {
    const scaled = scaleBlueprint(sourdough, 1);
    const cost = computeCost(scaled, { flour: 0.002, water: 0, starter: 0.01, salt: 0.001 });
    // 100*0.002 + 75*0 + 20*0.01 + 2*0.001 = 0.2 + 0 + 0.2 + 0.002 = 0.402
    expect(cost).toBeCloseTo(0.402);
  });
});

describe('fromTotalWeight', () => {
  it('distributes total dough weight by ratio', () => {
    const result = fromTotalWeight(sourdough, 1970); // 100+75+20+2 = 197 ratio units, ×10
    expect(result.find(i => i.id === 'flour')?.ratioWeight).toBeCloseTo(1000);
    expect(result.find(i => i.id === 'water')?.ratioWeight).toBeCloseTo(750);
  });
});
