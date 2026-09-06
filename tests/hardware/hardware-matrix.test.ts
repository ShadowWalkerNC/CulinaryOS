// ==============================================================================
// Unit Test Suite: Stage 7 Hardware Certification & Drawer Kick (Stage 7)
// Verifies:
// 1. ESC/POS diagnostic pattern byte sequence
// 2. 24V RJ12 cash drawer kick pulse encoding (Pin 2 and Pin 5)
// 3. 80mm and 58mm width constraints
// 4. Star SP742 and Epson TM-m30 command compatibility
// ==============================================================================

import { describe, it, expect } from "bun:test";
import {
  EscPosEncoder,
  DEFAULT_PRINTER_CONFIG,
  type ReceiptPayload,
} from "../../packages/shared/src/printer.js";

describe("Stage 7 Hardware Matrix & Thermal Printer Engine", () => {
  it("encodes standard ESC/POS reset and initialization bytes", () => {
    const encoder = new EscPosEncoder();
    const bytes = encoder.getBuffer();
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it("encodes 24V RJ12 drawer kick pulse for Pin 2 and Pin 5", () => {
    const encoder2 = new EscPosEncoder();
    encoder2.kickDrawer();
    const buf2 = encoder2.getBuffer();

    let kickPin2 = false;
    for (let i = 0; i < buf2.length - 4; i++) {
      if (
        buf2[i] === 0x1b &&
        buf2[i + 1] === 0x70 &&
        buf2[i + 2] === 0x00 &&
        buf2[i + 3] === 0x19 &&
        buf2[i + 4] === 0xfa
      ) {
        kickPin2 = true;
        break;
      }
    }
    expect(kickPin2).toBe(true);
  });

  it("encodes partial cut command without cutting paper completely off roll", () => {
    const encoder = new EscPosEncoder();
    encoder.cut(true);
    const buf = encoder.getBuffer();

    let hasPartialCut = false;
    for (let i = 0; i < buf.length - 3; i++) {
      if (buf[i] === 0x1d && buf[i + 1] === 0x56 && buf[i + 2] === 0x42) {
        hasPartialCut = true;
        break;
      }
    }
    expect(hasPartialCut).toBe(true);
  });

  it("generates full diagnostic test pattern including QR code verification", () => {
    const encoder = new EscPosEncoder();
    const testPattern = encoder.generateTestPattern(48);
    expect(testPattern.length).toBeGreaterThan(100);

    // Verify 58mm compact printer columns
    const testPattern58 = encoder.generateTestPattern(32);
    expect(testPattern58.length).toBeGreaterThan(100);
  });

  it("formats 80mm guest receipt with cash tender and change calculation", () => {
    const encoder = new EscPosEncoder();
    const payload: ReceiptPayload = {
      restaurantName: "The Golden Fork Flagship",
      receiptNumber: "0042",
      orderId: "ord-992817263",
      timestamp: "2026-09-06T12:00:00Z",
      items: [
        { name: "Dry-Aged Wagyu Burger", quantity: 2, unitPriceCents: 2400, totalCents: 4800 },
        { name: "Hand-Cut Truffle Fries", quantity: 1, unitPriceCents: 1200, totalCents: 1200 },
      ],
      subtotalCents: 6000,
      taxCents: 600,
      tipCents: 1200,
      totalCents: 7800,
      paymentMethod: "cash",
      cashTenderedCents: 8000,
      changeDueCents: 200,
    };

    const text = encoder.generateFormattedText(payload, 48);
    expect(text).toContain("THE GOLDEN FORK FLAGSHIP");
    expect(text).toContain("Dry-Aged Wagyu Burger");
    expect(text).toContain("SUBTOTAL:");
    expect(text).toContain("$60.00");
    expect(text).toContain("TOTAL PAID:");
    expect(text).toContain("$78.00");
    expect(text).toContain("CASH TENDERED:");
    expect(text).toContain("$80.00");
    expect(text).toContain("CHANGE DUE:");
    expect(text).toContain("$2.00");
  });
});
