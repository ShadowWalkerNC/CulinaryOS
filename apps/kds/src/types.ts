// ─── Shared KDS types ────────────────────────────────────────────────────────

export type TicketStatus = 'queued' | 'cooking' | 'ready' | 'bumped' | 'voided';
export type CourseHoldStatus = 'held' | 'firing' | 'fired';

export interface TicketItem {
  id: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface KitchenTicket {
  id: string;
  orderId: string;
  tableLabel: string;
  seatNumber?: number;
  courseNumber: number;
  courseHoldStatus: CourseHoldStatus;
  status: TicketStatus;
  stationId?: string;
  stationName?: string;
  items: TicketItem[];
  createdAt: string;
  firedAt?: string;
  bumpedAt?: string;
  elapsedSeconds: number; // derived — seconds since firedAt or createdAt
}

export interface CourseFireEvent {
  orderId: string;
  courseNumber: number;
  firedTicketIds: string[];
  firedBy: string;
  firedAt: string;
}

export interface AnalyticsSummary {
  stationId:        string;
  periodMinutes:    number;
  avgTicketSeconds: number;
  bumpRate:         number; // bumps per hour
  queueDepth:       number; // currently queued
  heldCount:        number; // tickets held waiting for course fire
}
