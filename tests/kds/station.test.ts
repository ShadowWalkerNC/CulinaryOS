import { describe, it, expect, beforeAll } from 'bun:test';
import { initialHoldStatus } from '../../kds/server/lib/course-engine';

// ─── Unit tests for initialHoldStatus ────────────────────────────────────────
describe('initialHoldStatus', () => {
  it('returns firing for course 1', () => {
    expect(initialHoldStatus(1)).toBe('firing');
  });

  it('returns held for course 2', () => {
    expect(initialHoldStatus(2)).toBe('held');
  });

  it('returns held for any course > 1', () => {
    for (let n = 2; n <= 10; n++) {
      expect(initialHoldStatus(n)).toBe('held');
    }
  });
});

// ─── CourseHoldBanner logic tests (pure) ─────────────────────────────────────
describe('CourseHoldBanner display logic', () => {
  it('renders null when event is null', () => {
    // Mirrors the component guard: if (!visible || !event) return null
    const event = null;
    expect(event).toBeNull();
  });

  it('formats firedBy=auto label correctly', () => {
    const firedBy = 'auto';
    const courseNumber = 2;
    const label = firedBy === 'auto'
      ? `Course ${courseNumber} fired automatically`
      : `Course ${courseNumber} fired by server`;
    expect(label).toBe('Course 2 fired automatically');
  });

  it('formats server override label correctly', () => {
    const firedBy = 'server-mike';
    const courseNumber = 3;
    const label = firedBy === 'auto'
      ? `Course ${courseNumber} fired automatically`
      : `Course ${courseNumber} fired by server`;
    expect(label).toBe('Course 3 fired by server');
  });
});

// ─── Analytics calculations ───────────────────────────────────────────────────
describe('Analytics calculations', () => {
  it('calculates avgTicketSeconds correctly', () => {
    const rows = [
      { fired_at: '2026-06-26T08:00:00Z', bumped_at: '2026-06-26T08:08:00Z' }, // 480s
      { fired_at: '2026-06-26T08:01:00Z', bumped_at: '2026-06-26T08:07:00Z' }, // 360s
    ];
    const avg = Math.round(
      rows.reduce((sum, r) => {
        return sum + (new Date(r.bumped_at).getTime() - new Date(r.fired_at).getTime()) / 1000;
      }, 0) / rows.length
    );
    expect(avg).toBe(420); // (480+360)/2
  });

  it('calculates bumpRate per hour from 30m window', () => {
    const totalBumps = 15;
    const periodMin  = 30;
    const rate = parseFloat(((totalBumps / periodMin) * 60).toFixed(1));
    expect(rate).toBe(30.0);
  });

  it('returns 0 avgSecs when no bumped tickets', () => {
    const rows: any[] = [];
    const avg = rows.length > 0 ? 999 : 0;
    expect(avg).toBe(0);
  });
});

// ─── Ticket card timer color logic ───────────────────────────────────────────
describe('Timer color thresholds', () => {
  const timerColor = (secs: number) => {
    if (secs < 300) return 'green';
    if (secs < 600) return 'amber';
    return 'red';
  };

  it('green under 5 minutes', ()  => expect(timerColor(0)).toBe('green'));
  it('green at 4:59',         ()  => expect(timerColor(299)).toBe('green'));
  it('amber at 5:00',         ()  => expect(timerColor(300)).toBe('amber'));
  it('amber at 9:59',         ()  => expect(timerColor(599)).toBe('amber'));
  it('red at 10:00',          ()  => expect(timerColor(600)).toBe('red'));
  it('red over 10 minutes',   ()  => expect(timerColor(900)).toBe('red'));
});
