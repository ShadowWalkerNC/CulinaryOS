// ============================================================
// CulinaryOS — Display Package & TV D-Pad Remote Tests
// ============================================================

import { describe, it, expect } from 'bun:test';
import { ANDROID_KEYCODES } from '../../packages/display/src/navigation/useRemoteDpadNavigation.js';
import { formatElapsedSeconds } from '../../packages/display/src/components/TvTicketCard.js';

describe('Display D-Pad Navigation & Formatter Engine', () => {
  it('correctly maps all Android TV Remote keycodes', () => {
    expect(ANDROID_KEYCODES.DPAD_UP).toBe(19);
    expect(ANDROID_KEYCODES.DPAD_DOWN).toBe(20);
    expect(ANDROID_KEYCODES.DPAD_LEFT).toBe(21);
    expect(ANDROID_KEYCODES.DPAD_RIGHT).toBe(22);
    expect(ANDROID_KEYCODES.DPAD_CENTER).toBe(23);
    expect(ANDROID_KEYCODES.BACK).toBe(4);
    expect(ANDROID_KEYCODES.MENU).toBe(82);
    expect(ANDROID_KEYCODES.ENTER).toBe(66);
  });

  it('formats ticket elapsed seconds to mm:ss format for television viewing', () => {
    expect(formatElapsedSeconds(0)).toBe('00:00');
    expect(formatElapsedSeconds(65)).toBe('01:05');
    expect(formatElapsedSeconds(434)).toBe('07:14');
    expect(formatElapsedSeconds(762)).toBe('12:42');
  });

  it('determines warning and critical timer thresholds correctly', () => {
    const isLateWarning = (seconds: number) => seconds / 60 >= 5 && seconds / 60 < 10;
    const isCriticalLate = (seconds: number) => seconds / 60 >= 10;

    expect(isLateWarning(240)).toBe(false); // 4 min -> green
    expect(isLateWarning(300)).toBe(true);  // 5 min -> amber
    expect(isLateWarning(599)).toBe(true);  // 9:59 -> amber
    expect(isCriticalLate(600)).toBe(true); // 10 min -> red
    expect(isCriticalLate(720)).toBe(true); // 12 min -> red
  });
});
