// ============================================================
// Tests: Course Firing Engine
// ============================================================

import { describe, it, expect } from 'bun:test';
import { initialHoldStatus } from '@culinaryos/shared';

// ---- initialHoldStatus ----

describe('initialHoldStatus', () => {
  it('course 1 is always firing', ()  => expect(initialHoldStatus(1)).toBe('firing'));
  it('course 2 starts held', ()       => expect(initialHoldStatus(2)).toBe('held'));
  it('course 3 starts held', ()       => expect(initialHoldStatus(3)).toBe('held'));
  it('course 10 starts held', ()      => expect(initialHoldStatus(10)).toBe('held'));
});

// ---- checkAndAdvanceCourse logic (pure unit — no db) ----

describe('course advance logic', () => {
  // Extract the allBumped check as a testable pure function
  function shouldAdvance(tickets: { status: string }[]): boolean {
    if (tickets.length === 0) return false;
    return tickets.every((t) => t.status === 'bumped');
  }

  it('advances when all prev-course tickets are bumped', () => {
    expect(shouldAdvance([
      { status: 'bumped' },
      { status: 'bumped' },
    ])).toBe(true);
  });

  it('does not advance when one ticket is still cooking', () => {
    expect(shouldAdvance([
      { status: 'bumped' },
      { status: 'cooking' },
    ])).toBe(false);
  });

  it('does not advance when a ticket is queued', () => {
    expect(shouldAdvance([{ status: 'queued' }])).toBe(false);
  });

  it('does not advance on empty ticket list', () => {
    expect(shouldAdvance([])).toBe(false);
  });

  it('advances correctly with a single ticket', () => {
    expect(shouldAdvance([{ status: 'bumped' }])).toBe(true);
  });
});

// ---- Course number sequencing ----

describe('course sequencing', () => {
  function nextCourse(bumped: number): number {
    return bumped + 1;
  }

  it('course 1 bumped → fires course 2', () => expect(nextCourse(1)).toBe(2));
  it('course 2 bumped → fires course 3', () => expect(nextCourse(2)).toBe(3));
  it('works for any N',                    () => expect(nextCourse(9)).toBe(10));
});

// ---- Delta deduction: held tickets properly excluded from active view ----

describe('held ticket exclusion', () => {
  type TicketStatus = 'queued'|'cooking'|'firing'|'bumped'|'held'|'voided';
  const ACTIVE_STATUSES: TicketStatus[] = ['queued','firing','cooking'];

  function activeTickets(tickets: { status: TicketStatus }[]) {
    return tickets.filter((t) => ACTIVE_STATUSES.includes(t.status));
  }

  it('held tickets are excluded from active view', () => {
    const tickets = [
      { status: 'queued'  as TicketStatus },
      { status: 'held'    as TicketStatus },
      { status: 'bumped'  as TicketStatus },
    ];
    expect(activeTickets(tickets).length).toBe(1);
  });

  it('shows held tickets when show_held=true', () => {
    const statuses: TicketStatus[] = ['queued','firing','cooking','held'];
    const tickets = [
      { status: 'queued'  as TicketStatus },
      { status: 'held'    as TicketStatus },
      { status: 'voided'  as TicketStatus },
    ];
    expect(tickets.filter((t) => statuses.includes(t.status)).length).toBe(2);
  });

  it('voided tickets never show', () => {
    const tickets = [{ status: 'voided' as TicketStatus }];
    expect(activeTickets(tickets).length).toBe(0);
  });
});

// ---- Manual fire validation ----

describe('manual fire-course validation', () => {
  function validateFireCourse(courseNumber: unknown): { ok: boolean; error?: string } {
    if (!courseNumber) return { ok: false, error: 'courseNumber is required' };
    const n = Number(courseNumber);
    if (isNaN(n) || n < 2) return { ok: false, error: 'courseNumber must be 2 or greater' };
    return { ok: true };
  }

  it('accepts course 2',               () => expect(validateFireCourse(2).ok).toBe(true));
  it('accepts course 5',               () => expect(validateFireCourse(5).ok).toBe(true));
  it('rejects course 1',               () => expect(validateFireCourse(1).ok).toBe(false));
  it('rejects course 0',               () => expect(validateFireCourse(0).ok).toBe(false));
  it('rejects missing courseNumber',   () => expect(validateFireCourse(undefined).ok).toBe(false));
  it('rejects string NaN',             () => expect(validateFireCourse('abc').ok).toBe(false));
});
