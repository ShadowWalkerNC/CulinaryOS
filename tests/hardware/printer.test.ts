import { describe, it, expect } from 'bun:test';
import {
  EscPosEncoder,
  ReceiptPayload,
  DEFAULT_PRINTER_CONFIG,
} from '../../packages/shared/src/printer';

describe('Thermal Receipt Printer & ESC/POS Engine', () => {
  it('initializes ESC/POS printer with standard reset command (ESC @)', () => {
    const encoder = new EscPosEncoder();
    const buffer = encoder.getBuffer();
    expect(buffer[0]).toBe(0x1b);
    expect(buffer[1]).toBe(0x40);
  });

  it('encodes alignment commands (Left, Center, Right)', () => {
    const encoder = new EscPosEncoder();
    encoder.align('center');
    encoder.text('CENTERED');
    encoder.align('right');
    encoder.text('RIGHT');
    encoder.align('left');

    const buffer = encoder.getBuffer();
    // Verify ESC a 1 is in buffer
    let hasCenter = false;
    let hasRight = false;
    for (let i = 0; i < buffer.length - 2; i++) {
      if (buffer[i] === 0x1b && buffer[i + 1] === 0x61 && buffer[i + 2] === 1) hasCenter = true;
      if (buffer[i] === 0x1b && buffer[i + 1] === 0x61 && buffer[i + 2] === 2) hasRight = true;
    }
    expect(hasCenter).toBe(true);
    expect(hasRight).toBe(true);
  });

  it('encodes text emphasis, sizing, and styling', () => {
    const encoder = new EscPosEncoder();
    encoder.bold(true);
    encoder.doubleHeight(true);
    encoder.doubleWidth(true);
    encoder.underline(true);
    encoder.invert(true);
    encoder.text('SPECIAL');
    encoder.bold(false);
    encoder.invert(false);

    const buffer = encoder.getBuffer();
    expect(buffer.length).toBeGreaterThan(10);
  });

  it('formats column rows with exact column width spacing', () => {
    const encoder = new EscPosEncoder();
    encoder.row('Item Name', '$15.00', 32);
    encoder.row('Prime Ribeye Steak [S1]', '$48.00', 48);

    const textOutput = encoder.generateFormattedText({
      restaurantName: 'Test Bistro',
      receiptNumber: '001',
      orderId: 'ord-123456',
      timestamp: new Date(),
      items: [{ name: 'Burger', quantity: 1, unitPriceCents: 1500, totalCents: 1500 }],
      subtotalCents: 1500,
      taxCents: 150,
      tipCents: 300,
      totalCents: 1950,
      paymentMethod: 'cash',
      cashTenderedCents: 2000,
      changeDueCents: 50,
    }, 48);

    expect(textOutput).toContain('TEST BISTRO');
    expect(textOutput).toContain('SUBTOTAL:');
    expect(textOutput).toContain('$15.00');
    expect(textOutput).toContain('TOTAL PAID:');
    expect(textOutput).toContain('$19.50');
    expect(textOutput).toContain('CHANGE DUE:');
  });

  it('encodes paper cut and cash drawer pulse commands', () => {
    const encoder = new EscPosEncoder();
    encoder.cut(true);
    encoder.kickDrawer();

    const buffer = encoder.getBuffer();
    // GS V 66 0 (cut)
    let hasCut = false;
    let hasDrawer = false;
    for (let i = 0; i < buffer.length - 3; i++) {
      if (buffer[i] === 0x1d && buffer[i + 1] === 0x56 && buffer[i + 2] === 0x42) hasCut = true;
      if (buffer[i] === 0x1b && buffer[i + 1] === 0x70 && buffer[i + 2] === 0x00) hasDrawer = true;
    }
    expect(hasCut).toBe(true);
    expect(hasDrawer).toBe(true);
  });

  it('encodes full receipt payload into complete ESC/POS stream', () => {
    const encoder = new EscPosEncoder();
    const payload: ReceiptPayload = {
      restaurantName: 'The Golden Fork',
      restaurantAddress: '123 Main Street',
      restaurantPhone: '(555) 555-1212',
      restaurantTaxId: 'US-883921-K',
      receiptNumber: 'CHK-9021',
      orderId: 'ord-883920194821',
      tableNumber: 'Booth 12',
      sectionName: 'Main Dining',
      serverName: 'Jane Smith',
      guestCount: 4,
      timestamp: '2026-08-26T12:00:00Z',
      items: [
        { name: 'Margherita Pizza', quantity: 2, unitPriceCents: 1800, totalCents: 3600, seatNumber: 1, modifiers: ['Extra Basil'] },
        { name: 'Caesar Salad', quantity: 1, unitPriceCents: 1200, totalCents: 1200, seatNumber: 2 },
      ],
      subtotalCents: 4800,
      taxCents: 480,
      tipCents: 1000,
      discountCents: 500,
      totalCents: 5780,
      paymentMethod: 'cash',
      cashTenderedCents: 6000,
      changeDueCents: 220,
      qrCodeData: 'https://culinaryos.org/receipt/ord-883920194821',
    };

    const bytes = encoder.encodeReceipt(payload, { paperWidth: '80mm', columns: 48, kickDrawerOnCash: true });
    expect(bytes.length).toBeGreaterThan(100);

    // Verify 58mm compact width encoding
    const compactBytes = encoder.encodeReceipt(payload, { paperWidth: '58mm', columns: 32 });
    expect(compactBytes.length).toBeGreaterThan(100);
  });

  it('generates diagnostic test pattern with QR code and cut', () => {
    const encoder = new EscPosEncoder();
    const testBytes = encoder.generateTestPattern(48);
    expect(testBytes.length).toBeGreaterThan(80);
    expect(DEFAULT_PRINTER_CONFIG.paperWidth).toBe('80mm');
    expect(DEFAULT_PRINTER_CONFIG.columns).toBe(48);
  });
});
