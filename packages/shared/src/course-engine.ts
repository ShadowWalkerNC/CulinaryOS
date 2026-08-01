// ============================================================
// CulinaryOS — Course Engine Utilities
// Canonical course hold state calculation
// ============================================================

import type { CourseHoldStatus } from './types/order';

export function initialHoldStatus(courseNumber: number): CourseHoldStatus {
  return courseNumber === 1 ? 'firing' : 'held';
}
