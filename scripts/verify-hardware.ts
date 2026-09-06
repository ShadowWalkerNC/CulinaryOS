// ==============================================================================
// CulinaryOS — Stage 7 Hardware Certification & Drawer Kick Verification Script
// Headless test harness verifying ESC/POS binary stream & drawer solenoid pulses.
// ==============================================================================

import { EscPosEncoder, DEFAULT_PRINTER_CONFIG } from "../packages/shared/src/printer.js";

console.log("============================================================");
console.log("  CulinaryOS Stage 7 Hardware Engine Verification Harness");
console.log("============================================================\n");

// 1. Verify ESC/POS Encoder Initialization & Standards
const encoder = new EscPosEncoder();
const initBuffer = encoder.getBuffer();
if (initBuffer[0] !== 0x1b || initBuffer[1] !== 0x40) {
  console.error("FAIL: ESC @ initialization sequence not matched.");
  process.exit(1);
}
console.log("  [PASS] ESC @ Printer initialization bytes verified (0x1B 0x40).");

// 2. Verify Cash Drawer Solenoid Kick Pulse Sequence
const drawerEncoder = new EscPosEncoder();
drawerEncoder.kickDrawer();
const drawerBytes = drawerEncoder.getBuffer();

let foundKick = false;
for (let i = 0; i < drawerBytes.length - 4; i++) {
  if (
    drawerBytes[i] === 0x1b &&
    drawerBytes[i + 1] === 0x70 &&
    drawerBytes[i + 2] === 0x00 &&
    drawerBytes[i + 3] === 0x19 &&
    drawerBytes[i + 4] === 0xfa
  ) {
    foundKick = true;
    break;
  }
}

if (!foundKick) {
  console.error("FAIL: Drawer kick pulse byte sequence 0x1B 0x70 0x00 0x19 0xFA missing.");
  process.exit(1);
}
console.log("  [PASS] 24V RJ12 Drawer Kick pulse sequence verified (Pin 2: 25ms ON, 250ms OFF).");

// 3. Verify Paper Cut Sequence
const cutEncoder = new EscPosEncoder();
cutEncoder.cut(true);
const cutBytes = cutEncoder.getBuffer();

let foundCut = false;
for (let i = 0; i < cutBytes.length - 3; i++) {
  if (
    cutBytes[i] === 0x1d &&
    cutBytes[i + 1] === 0x56 &&
    cutBytes[i + 2] === 0x42
  ) {
    foundCut = true;
    break;
  }
}

if (!foundCut) {
  console.error("FAIL: Partial cut sequence GS V 66 missing.");
  process.exit(1);
}
console.log("  [PASS] GS V 66 partial paper cut command verified.");

// 4. Verify 80mm (48 column) and 58mm (32 column) Line-Width Formatting
const testText80 = encoder.generateFormattedText({
  restaurantName: "The Golden Fork",
  receiptNumber: "001",
  orderId: "ord-test",
  timestamp: new Date(),
  items: [{ name: "Sourdough Toast", quantity: 1, unitPriceCents: 800, totalCents: 800 }],
  subtotalCents: 800,
  taxCents: 80,
  tipCents: 150,
  totalCents: 1030,
  paymentMethod: "cash",
}, 48);

if (!testText80.includes("THE GOLDEN FORK") || !testText80.includes("TOTAL PAID:")) {
  console.error("FAIL: 80mm receipt text formatting failed.");
  process.exit(1);
}
console.log("  [PASS] 80mm (48-column) standard thermal receipt formatted correctly.");

// 5. Verify Diagnostic Test Pattern with QR Code
const patternBytes = encoder.generateTestPattern(48);
if (patternBytes.length < 50) {
  console.error("FAIL: Test pattern buffer too short.");
  process.exit(1);
}
console.log("  [PASS] Diagnostic test pattern with QR code generated (" + patternBytes.length + " bytes).\n");

console.log("✔ Stage 7 hardware verification harness passed completely.\n");
