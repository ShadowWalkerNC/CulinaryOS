// ============================================================
// Unit Tests: Station mapping + KDS active statuses
// ============================================================

import { describe, it, expect } from 'bun:test';
import {
  resolveDbStations,
  uiStationFromDb,
  KDS_ACTIVE_STATUSES,
  stationLabel,
} from '@culinaryos/shared';

describe('stations mapping', () => {
  it('maps UI tab 1 to grill/hot DB stations', () => {
    expect(resolveDbStations('1')).toEqual(['grill', 'hot']);
    expect(resolveDbStations('2')).toEqual(['cold']);
    expect(resolveDbStations('3')).toEqual(['fry']);
    expect(resolveDbStations('4')).toEqual(['bar']);
  });

  it('maps DB stations back to UI tabs', () => {
    expect(uiStationFromDb('grill')).toBe('1');
    expect(uiStationFromDb('hot')).toBe('1');
    expect(uiStationFromDb('cold')).toBe('2');
    expect(uiStationFromDb('fry')).toBe('3');
    expect(uiStationFromDb('bar')).toBe('4');
  });

  it('includes fired in active KDS statuses and excludes ready', () => {
    expect(KDS_ACTIVE_STATUSES).toContain('fired');
    expect(KDS_ACTIVE_STATUSES).toContain('queued');
    expect(KDS_ACTIVE_STATUSES).toContain('cooking');
    expect([...KDS_ACTIVE_STATUSES]).not.toContain('ready');
  });

  it('provides human labels', () => {
    expect(stationLabel('1')).toBe('Hot Grill');
    expect(stationLabel('grill')).toBe('Hot Grill');
  });
});
