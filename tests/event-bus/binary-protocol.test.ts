// ============================================================
// Unit Tests: Binary Packet Protocol
// ============================================================

import { describe, it, expect } from 'bun:test';
import { encodeBinaryEvent, decodeBinaryEvent } from '../../packages/event-bus/src/binary-protocol';
import type { DomainEvent } from '../../packages/event-bus/src/types';

describe('binary-protocol', () => {
  const sampleEvent: DomainEvent = {
    eventId: 'evt-12345-67890-abcdef',
    eventType: 'pos:order:created',
    tenantId: 'tenant-bistro-main-001',
    source: 'pos-terminal-01',
    timestamp: '2026-07-25T10:00:00.000Z',
    version: 1,
    payload: {
      orderId: 'ord-998877665544332211',
      tableNumber: 12,
      guestCount: 4,
      serverName: 'Alexander',
      items: [
        { id: 'item-1', name: 'Truffle Ribeye Steak', quantity: 2, price: 45.50, seat: 1, notes: 'Medium Rare' },
        { id: 'item-2', name: 'Lobster Bisque', quantity: 2, price: 18.00, seat: 2 },
        { id: 'item-3', name: 'Vintage Cabernet Sauvignon', quantity: 1, price: 95.00, seat: 1 }
      ],
      subtotal: 222.00,
      tax: 19.98,
      total: 241.98,
      status: 'SUBMITTED'
    }
  };

  it('encodes and decodes a DomainEvent correctly with full data fidelity', () => {
    const encoded = encodeBinaryEvent(sampleEvent);
    expect(encoded instanceof Uint8Array).toBe(true);
    expect(encoded[0]).toBe(0x43); // 'C'
    expect(encoded[1]).toBe(0x01); // Version 1

    const decoded = decodeBinaryEvent(encoded);
    expect(decoded !== null).toBe(true);
    expect(decoded).toEqual(sampleEvent);
  });

  it('demonstrates >50-60% size reduction compared directly to compact unformatted JSON', () => {
    const compactJsonStr = JSON.stringify(sampleEvent);
    const compactJsonBytes = new TextEncoder().encode(compactJsonStr).length;

    const encodedPacket = encodeBinaryEvent(sampleEvent);
    const binaryBytes = encodedPacket.length;

    const sizeReduction = ((compactJsonBytes - binaryBytes) / compactJsonBytes) * 100;
    expect(sizeReduction).toBeGreaterThanOrEqual(50); // >50-60% size reduction vs compact JSON
  });

  it('returns null for invalid magic header or corrupted buffer', () => {
    const invalidHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(decodeBinaryEvent(invalidHeader)).toBe(null);

    const shortBuffer = new Uint8Array([0x43, 0x01]);
    expect(decodeBinaryEvent(shortBuffer)).toBe(null);

    const corruptedPayload = new Uint8Array([0x43, 0x01, 0x00, 0x00, 0x00, 0x64, 0x99, 0x88, 0x77, 0x66]);
    expect(decodeBinaryEvent(corruptedPayload)).toBe(null);
  });
});
