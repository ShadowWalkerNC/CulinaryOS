// ============================================================
// Tests: KDS Tickets — grouping + timer logic
// ============================================================

import { describe, it, expect } from 'bun:test';

// ---- Unit: group items by station + course ----

describe('groupByStationAndCourse', () => {
  interface Item { station: string; courseNumber?: number; }

  function group(items: Item[]): Map<string, Item[]> {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const key = `${item.station}::${item.courseNumber ?? 1}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }

  it('groups same station + course together', () => {
    const items = [
      { station: 'grill', courseNumber: 2 },
      { station: 'grill', courseNumber: 2 },
      { station: 'cold',  courseNumber: 1 },
    ];
    const result = group(items);
    expect(result.size).toBe(2);
    expect(result.get('grill::2')?.length).toBe(2);
    expect(result.get('cold::1')?.length).toBe(1);
  });

  it('defaults course to 1 when not set', () => {
    const items = [{ station: 'hot' }, { station: 'hot' }];
    const result = group(items);
    expect(result.size).toBe(1);
    expect(result.get('hot::1')?.length).toBe(2);
  });

  it('separates different courses at same station', () => {
    const items = [
      { station: 'hot', courseNumber: 1 },
      { station: 'hot', courseNumber: 2 },
    ];
    const result = group(items);
    expect(result.size).toBe(2);
  });

  it('handles single item order', () => {
    const result = group([{ station: 'bar', courseNumber: 1 }]);
    expect(result.size).toBe(1);
  });

  it('returns empty map for empty order', () => {
    expect(group([]).size).toBe(0);
  });
});

// ---- Unit: ticket timer / status logic ----

describe('ticket timer', () => {
  const WARN_SECONDS   = 600;
  const DANGER_SECONDS = 900;

  function timerStatus(elapsed: number): 'ok' | 'warn' | 'danger' {
    if (elapsed >= DANGER_SECONDS) return 'danger';
    if (elapsed >= WARN_SECONDS)   return 'warn';
    return 'ok';
  }

  it('ok under 10 minutes', ()      => expect(timerStatus(300)).toBe('ok'));
  it('warn at exactly 10 minutes',()=> expect(timerStatus(600)).toBe('warn'));
  it('warn between 10-15 min', ()   => expect(timerStatus(750)).toBe('warn'));
  it('danger at 15 minutes', ()     => expect(timerStatus(900)).toBe('danger'));
  it('danger over 15 minutes', ()   => expect(timerStatus(1200)).toBe('danger'));
  it('ok at zero', ()               => expect(timerStatus(0)).toBe('ok'));
});

// ---- Unit: allergy detection ----

describe('allergy detection', () => {
  function hasAllergy(modifiers: string[][]): boolean {
    return modifiers.some((mods) => mods.some((m) => /allerg/i.test(m)));
  }

  it('detects allergy modifier', () => {
    expect(hasAllergy([['No gluten', 'Allergy: nuts']])).toBe(true);
  });

  it('case-insensitive match', () => {
    expect(hasAllergy([['ALLERGY: dairy']])).toBe(true);
  });

  it('no allergy when clean', () => {
    expect(hasAllergy([['Medium rare', 'Extra sauce']])).toBe(false);
  });

  it('false for empty modifiers', () => {
    expect(hasAllergy([])).toBe(false);
  });
});
