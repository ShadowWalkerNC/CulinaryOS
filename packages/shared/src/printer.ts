// CulinaryOS — Thermal Receipt Printer & ESC/POS Engine
// Supports 80mm (48 col) & 58mm (32 col) thermal receipt printers across WebUSB, Web Bluetooth, Web Serial, Network TCP, and Browser Spooler.

import type { ZReport } from './types/reports.js';
import { translateCulinaryText, type SupportedLanguage } from './translation.js';

export type PrinterPaperWidth = '80mm' | '58mm';
export type PrinterTransportType = 'auto' | 'usb' | 'bluetooth' | 'serial' | 'network' | 'browser';

export interface KitchenChitItem {
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
  station?: string;
  course?: number;
}

export interface KitchenTicketPayload {
  restaurantName?: string;
  ticketId: string;
  orderId: string;
  tableNumber?: string | number;
  serverName?: string;
  station?: string;
  stationName?: string;
  courseNumber?: number;
  priority?: 'normal' | 'rush' | 'allergy';
  timestamp: string | Date;
  items: KitchenChitItem[];
  notes?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  seatNumber?: number;
  station?: string;
  course?: number;
  modifiers?: string[];
  notes?: string;
}

export interface ReceiptPayload {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  restaurantTaxId?: string;
  receiptNumber: string;
  orderId: string;
  tableNumber?: string | number;
  sectionName?: string;
  serverName?: string;
  guestCount?: number;
  timestamp: string | Date;
  items: ReceiptItem[];
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  discountCents?: number;
  totalCents: number;
  paymentMethod: 'cash' | 'credit' | 'debit' | 'tap' | 'qr' | 'comp' | 'split' | string;
  authCode?: string;
  cardLast4?: string;
  cashTenderedCents?: number;
  changeDueCents?: number;
  footerMessage?: string;
  qrCodeData?: string;
}

export interface PrinterConfig {
  transport: PrinterTransportType;
  paperWidth: PrinterPaperWidth;
  columns?: number;
  autoPrintOnPayment: boolean;
  kickDrawerOnCash: boolean;
  printDuplicateKitchenTicket: boolean;
  headerMessage?: string;
  footerMessage?: string;
  networkIp?: string;
  networkPort?: number;
  serialBaudRate?: number;
  pairedDeviceName?: string | null;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  transport: 'auto',
  paperWidth: '80mm',
  columns: 48,
  autoPrintOnPayment: true,
  kickDrawerOnCash: true,
  printDuplicateKitchenTicket: false,
  headerMessage: 'CulinaryOS Fine Dining',
  footerMessage: 'Thank you for dining with us! Please come again.',
  networkIp: '192.168.1.200',
  networkPort: 9100,
  serialBaudRate: 9600,
  pairedDeviceName: null,
};

/**
 * High-performance ESC/POS binary command encoder.
 * Encodes standard ESC/POS bytes supported by Epson TM series, Star Micronics, Citizen, Munbyn, Bixolon, Xprinter, Sunmi.
 */
export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  public init(): this {
    // ESC @: Initialize printer
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  public align(alignment: 'left' | 'center' | 'right'): this {
    // ESC a n: 0=Left, 1=Center, 2=Right
    const n = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, n);
    return this;
  }

  public bold(enable = true): this {
    // ESC E n: 1=Bold on, 0=Bold off
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  public underline(enable = true): this {
    // ESC - n: 1=Underline on, 0=Underline off
    this.buffer.push(0x1b, 0x2d, enable ? 1 : 0);
    return this;
  }

  public doubleHeight(enable = true): this {
    // GS ! n: Bit 0 = double height
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  public doubleWidth(enable = true): this {
    // GS ! n: Bit 4 = double width
    this.buffer.push(0x1d, 0x21, enable ? 0x10 : 0x00);
    return this;
  }

  public doubleSize(enable = true): this {
    // GS ! n: 0x11 = double height & double width
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  public invert(enable = true): this {
    // GS B n: 1=Reverse white-on-black
    this.buffer.push(0x1d, 0x42, enable ? 1 : 0);
    return this;
  }

  public text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Basic ASCII & CP437 mapping
      this.buffer.push(code > 255 ? 0x3f : code);
    }
    return this;
  }

  public line(str = ''): this {
    this.text(str);
    this.buffer.push(0x0d, 0x0a); // CR LF
    return this;
  }

  public feed(lines = 2): this {
    // ESC d n: Print and feed n lines
    this.buffer.push(0x1b, 0x64, Math.max(1, lines));
    return this;
  }

  public divider(char = '-', columns = 48): this {
    return this.line(char.repeat(columns));
  }

  public row(left: string, right: string, columns = 48): this {
    const spaceCount = Math.max(1, columns - left.length - right.length);
    const line = left + ' '.repeat(spaceCount) + right;
    return this.line(line);
  }

  public row3(left: string, mid: string, right: string, columns = 48): this {
    const totalContent = left.length + mid.length + right.length;
    const spaceAvailable = Math.max(2, columns - totalContent);
    const half = Math.floor(spaceAvailable / 2);
    const secondHalf = spaceAvailable - half;
    const line = left + ' '.repeat(half) + mid + ' '.repeat(secondHalf) + right;
    return this.line(line);
  }

  public kickDrawer(): this {
    // ESC p 0 25 250: Generate pulse on drawer pin 2 (standard 24V RJ12)
    this.buffer.push(0x1b, 0x70, 0x00, 0x19, 0xfa);
    return this;
  }

  public cut(partial = true): this {
    // GS V m: 66 = partial cut with feed, 65 = full cut
    this.buffer.push(0x1d, 0x56, partial ? 0x42 : 0x41, 0x00);
    return this;
  }

  public qrCode(data: string): this {
    // Standard ESC/POS 2D QR Code Model 2 sequence
    const dataLen = data.length + 3;
    const pL = dataLen % 256;
    const pH = Math.floor(dataLen / 256);

    // 1. Model: QR Code Model 2
    this.buffer.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // 2. Module Size: 5 dots
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x05);
    // 3. Error Correction Level: M (15%)
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    // 4. Store Data in QR Buffer
    this.buffer.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data.charCodeAt(i) & 0xff);
    }
    // 5. Print QR Code from Buffer
    this.buffer.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    this.buffer.push(0x0a);
    return this;
  }

  public getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Encodes a complete guest receipt into ESC/POS bytes.
   */
  public encodeReceipt(payload: ReceiptPayload, config?: Partial<PrinterConfig>): Uint8Array {
    const columns = config?.paperWidth === '58mm' ? 32 : (config?.columns || 48);
    const dateStr = typeof payload.timestamp === 'string'
      ? new Date(payload.timestamp).toLocaleString()
      : payload.timestamp.toLocaleString();

    this.init();

    // 1. Restaurant Header
    this.align('center');
    this.doubleSize(true);
    this.bold(true);
    this.line(payload.restaurantName);
    this.doubleSize(false);
    this.bold(false);

    if (payload.restaurantAddress) this.line(payload.restaurantAddress);
    if (payload.restaurantPhone) this.line(payload.restaurantPhone);
    if (payload.restaurantTaxId) this.line(`TAX ID: ${payload.restaurantTaxId}`);
    this.divider('=', columns);

    // 2. Order & Server Meta
    this.align('left');
    this.row(`CHECK: #${payload.receiptNumber}`, `ORDER: ${payload.orderId.slice(-6).toUpperCase()}`, columns);
    this.row(
      `TABLE: ${payload.tableNumber ?? 'N/A'}${payload.sectionName ? ` (${payload.sectionName})` : ''}`,
      `SERVER: ${payload.serverName ?? 'Staff'}`,
      columns
    );
    this.row(`DATE: ${dateStr}`, `GUESTS: ${payload.guestCount ?? 1}`, columns);
    this.divider('-', columns);

    // 3. Itemized Products
    this.bold(true);
    this.row('ITEM / SEAT', 'PRICE', columns);
    this.bold(false);
    this.divider('-', columns);

    payload.items.forEach((item) => {
      const priceStr = `$${(item.totalCents / 100).toFixed(2)}`;
      const seatTag = item.seatNumber && item.seatNumber > 0 ? ` [S${item.seatNumber}]` : '';
      const qtyStr = item.quantity > 1 ? `${item.quantity}x ` : '';
      const itemName = `${qtyStr}${item.name}${seatTag}`;

      if (itemName.length + priceStr.length + 1 <= columns) {
        this.row(itemName, priceStr, columns);
      } else {
        this.line(itemName);
        this.align('right');
        this.line(priceStr);
        this.align('left');
      }

      // Modifiers & notes
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach((m) => {
          this.line(`  + ${m}`);
        });
      }
      if (item.notes) {
        this.line(`  * Note: ${item.notes}`);
      }
    });

    this.divider('-', columns);

    // 4. Financial Totals
    this.row('SUBTOTAL:', `$${(payload.subtotalCents / 100).toFixed(2)}`, columns);
    this.row('TAX:', `$${(payload.taxCents / 100).toFixed(2)}`, columns);
    if (payload.discountCents && payload.discountCents > 0) {
      this.row('DISCOUNT:', `-$${(payload.discountCents / 100).toFixed(2)}`, columns);
    }
    if (payload.tipCents > 0) {
      this.row('GRATUITY / TIP:', `$${(payload.tipCents / 100).toFixed(2)}`, columns);
    }

    this.divider('=', columns);
    this.bold(true);
    this.doubleHeight(true);
    this.row('TOTAL DUE:', `$${(payload.totalCents / 100).toFixed(2)}`, columns);
    this.doubleHeight(false);
    this.bold(false);
    this.divider('=', columns);

    // 5. Payment Details
    this.align('left');
    this.row(`METHOD: ${payload.paymentMethod.toUpperCase()}`, 'STATUS: APPROVED', columns);
    if (payload.cardLast4) {
      this.row(`CARD: **** **** **** ${payload.cardLast4}`, `AUTH: ${payload.authCode || 'ONLINE'}`, columns);
    }
    if (payload.cashTenderedCents && payload.cashTenderedCents > 0) {
      this.row('CASH TENDERED:', `$${(payload.cashTenderedCents / 100).toFixed(2)}`, columns);
      this.row('CHANGE RETURNED:', `$${((payload.changeDueCents ?? 0) / 100).toFixed(2)}`, columns);
    }

    this.divider('-', columns);

    // 6. QR Code / Feedback
    if (payload.qrCodeData) {
      this.align('center');
      this.line('Scan to view digital receipt & leave review');
      this.feed(1);
      this.qrCode(payload.qrCodeData);
      this.feed(1);
    }

    // 7. Footer
    this.align('center');
    this.line(payload.footerMessage || config?.footerMessage || 'Thank you! Powered by CulinaryOS');
    this.line('www.culinaryos.org');

    // 8. Feed & Cut
    this.feed(3);
    this.cut(true);

    // 9. Kick Cash Drawer if Cash Tendered
    if (payload.paymentMethod.toLowerCase() === 'cash' && (config?.kickDrawerOnCash ?? true)) {
      this.kickDrawer();
    }

    return this.getBuffer();
  }

  /**
   * Generates a plain-text thermal-formatted string for system spoolers and preview.
   */
  public generateFormattedText(payload: ReceiptPayload, columns = 48): string {
    const dateStr = typeof payload.timestamp === 'string'
      ? new Date(payload.timestamp).toLocaleString()
      : payload.timestamp.toLocaleString();

    const formatRow = (left: string, right: string) => {
      const spaceCount = Math.max(1, columns - left.length - right.length);
      return left + ' '.repeat(spaceCount) + right;
    };

    const lines: string[] = [
      payload.restaurantName.toUpperCase().padStart(Math.floor((columns + payload.restaurantName.length) / 2)),
      payload.restaurantAddress ? payload.restaurantAddress.padStart(Math.floor((columns + payload.restaurantAddress.length) / 2)) : '',
      payload.restaurantPhone ? payload.restaurantPhone.padStart(Math.floor((columns + payload.restaurantPhone.length) / 2)) : '',
      '='.repeat(columns),
      formatRow(`CHECK: #${payload.receiptNumber}`, `ORDER: ${payload.orderId.slice(-6).toUpperCase()}`),
      formatRow(`TABLE: ${payload.tableNumber ?? 'N/A'}`, `SERVER: ${payload.serverName ?? 'Staff'}`),
      formatRow(`DATE: ${dateStr}`, `GUESTS: ${payload.guestCount ?? 1}`),
      '-'.repeat(columns),
      formatRow('ITEM / SEAT', 'PRICE'),
      '-'.repeat(columns),
    ];

    payload.items.forEach((item) => {
      const priceStr = `$${(item.totalCents / 100).toFixed(2)}`;
      const seatTag = item.seatNumber && item.seatNumber > 0 ? ` [S${item.seatNumber}]` : '';
      const qtyStr = item.quantity > 1 ? `${item.quantity}x ` : '';
      const itemName = `${qtyStr}${item.name}${seatTag}`;
      lines.push(formatRow(itemName, priceStr));
      if (item.modifiers) {
        item.modifiers.forEach((m) => lines.push(`  + ${m}`));
      }
    });

    lines.push('-'.repeat(columns));
    lines.push(formatRow('SUBTOTAL:', `$${(payload.subtotalCents / 100).toFixed(2)}`));
    lines.push(formatRow('TAX (10%):', `$${(payload.taxCents / 100).toFixed(2)}`));
    if (payload.tipCents > 0) {
      lines.push(formatRow('TIP / GRATUITY:', `$${(payload.tipCents / 100).toFixed(2)}`));
    }
    lines.push('='.repeat(columns));
    lines.push(formatRow('TOTAL PAID:', `$${(payload.totalCents / 100).toFixed(2)}`));
    lines.push('='.repeat(columns));
    lines.push(formatRow(`PAYMENT: ${payload.paymentMethod.toUpperCase()}`, 'STATUS: APPROVED'));
    if (payload.cardLast4) {
      lines.push(formatRow(`CARD: **** ${payload.cardLast4}`, `AUTH: ${payload.authCode || '994821'}`));
    }
    if (payload.cashTenderedCents) {
      lines.push(formatRow('CASH TENDERED:', `$${(payload.cashTenderedCents / 100).toFixed(2)}`));
      lines.push(formatRow('CHANGE DUE:', `$${((payload.changeDueCents ?? 0) / 100).toFixed(2)}`));
    }
    lines.push('-'.repeat(columns));
    lines.push((payload.footerMessage || 'Thank you for your visit!').padStart(Math.floor((columns + 25) / 2)));
    lines.push('Powered by CulinaryOS POS'.padStart(Math.floor((columns + 24) / 2)));

    return lines.filter(Boolean).join('\n');
  }

  /**
   * Generates a diagnostic test pattern to verify printer speed, alignment, and cutting.
   */
  public generateTestPattern(columns = 48): Uint8Array {
    this.init();
    this.align('center');
    this.bold(true);
    this.doubleSize(true);
    this.line('CULINARYOS HARDWARE TEST');
    this.doubleSize(false);
    this.line('THERMAL PRINTER DIAGNOSTIC');
    this.bold(false);
    this.divider('=', columns);

    this.align('left');
    this.line(`COLUMN WIDTH: ${columns} COLUMNS`);
    this.line(`TIME: ${new Date().toISOString()}`);
    this.line(`STATUS: OK - PORT OPEN & READY`);
    this.divider('-', columns);

    this.line('LEFT ALIGNED TEXT');
    this.align('center');
    this.line('CENTER ALIGNED TEXT');
    this.align('right');
    this.line('RIGHT ALIGNED TEXT');
    this.align('left');
    this.divider('-', columns);

    this.bold(true);
    this.line('BOLD FONT TEST 1234567890');
    this.bold(false);
    this.underline(true);
    this.line('UNDERLINE FONT TEST');
    this.underline(false);
    this.invert(true);
    this.line(' INVERTED WHITE ON BLACK ');
    this.invert(false);
    this.divider('-', columns);

    this.align('center');
    this.line('TEST QR CODE VERIFICATION:');
    this.qrCode('https://culinaryos.org/hardware/receipt-test');
    this.feed(1);

    this.line('DIAGNOSTIC TEST COMPLETE');
    this.line('PAPER CUT & DRAWER TRIGGER TEST');
    this.feed(3);
    this.cut(true);
    this.kickDrawer();

    return this.getBuffer();
  }

  /**
   * Encodes a complete End-of-Day Z-Report into ESC/POS bytes.
   */
  public encodeZReport(report: ZReport, restaurantName = 'The Golden Fork', config?: Partial<PrinterConfig>): Uint8Array {
    const columns = config?.paperWidth === '58mm' ? 32 : (config?.columns || 48);

    this.init();

    // 1. Header
    this.align('center');
    this.bold(true);
    this.doubleSize(true);
    this.line('END OF DAY Z-REPORT');
    this.doubleSize(false);
    this.line(restaurantName.toUpperCase());
    this.bold(false);
    this.line(`REPORT NO: ${report.zReportNumber}`);
    this.line(`DATE: ${report.date} | STATUS: ${report.status.toUpperCase()}`);
    if (report.closedBy) {
      this.line(`CLOSED BY: ${report.closedBy.displayName} (${report.closedBy.role.toUpperCase()})`);
    }
    this.divider('=', columns);

    // 2. Financial Summary
    this.align('left');
    this.bold(true);
    this.line('FINANCIAL RECONCILIATION');
    this.bold(false);
    this.divider('-', columns);
    this.row('Gross Sales:', `$${(report.financials.grossSalesCents / 100).toFixed(2)}`, columns);
    this.row('Comps / Discounts:', `-$${(report.financials.discountsCompsCents / 100).toFixed(2)}`, columns);
    this.row('Voids Total:', `-$${(report.financials.voidsTotalCents / 100).toFixed(2)}`, columns);
    this.row('Net Sales:', `$${(report.financials.netSalesCents / 100).toFixed(2)}`, columns);
    this.row('Total Tax Collected:', `$${(report.financials.taxTotalCents / 100).toFixed(2)}`, columns);
    this.divider('-', columns);
    this.bold(true);
    this.row('TOTAL REVENUE:', `$${(report.financials.totalRevenueCents / 100).toFixed(2)}`, columns);
    this.bold(false);
    this.row('Total Orders / Checks:', `${report.financials.totalOrdersCount}`, columns);
    this.row('Average Check:', `$${(report.financials.averageCheckCents / 100).toFixed(2)}`, columns);
    this.divider('=', columns);

    // 3. Multi-Rate Tax Summary
    this.bold(true);
    this.line('TAX BREAKDOWN (MULTI-RATE)');
    this.bold(false);
    this.divider('-', columns);
    const pf = report.taxBreakdown.breakdown.preparedFood;
    const alc = report.taxBreakdown.breakdown.alcohol;
    const ex = report.taxBreakdown.breakdown.exempt;
    this.row(`Prep Food (${pf.ratePercent}%):`, `$${(pf.taxAmountCents / 100).toFixed(2)} ($${(pf.taxableSalesCents / 100).toFixed(2)})`, columns);
    this.row(`Alcohol (${alc.ratePercent}%):`, `$${(alc.taxAmountCents / 100).toFixed(2)} ($${(alc.taxableSalesCents / 100).toFixed(2)})`, columns);
    this.row(`Exempt (0%):`, `$0.00 ($${(ex.taxableSalesCents / 100).toFixed(2)})`, columns);
    this.row('Effective Tax Rate:', `${report.taxBreakdown.effectiveTaxRatePercent.toFixed(2)}%`, columns);
    this.divider('=', columns);

    // 4. Tender Summary
    this.bold(true);
    this.line('TENDER & PAYMENT SUMMARY');
    this.bold(false);
    this.divider('-', columns);
    this.row(`Credit Card (${report.tenderBreakdown.creditCard.transactionCount}):`, `$${(report.tenderBreakdown.creditCard.totalCents / 100).toFixed(2)}`, columns);
    this.row(`Cash Tender (${report.tenderBreakdown.cash.transactionCount}):`, `$${(report.tenderBreakdown.cash.totalCents / 100).toFixed(2)}`, columns);
    this.row(`Gift Cards (${report.tenderBreakdown.giftCard.transactionCount}):`, `$${(report.tenderBreakdown.giftCard.totalCents / 100).toFixed(2)}`, columns);
    this.row(`Comps (${report.tenderBreakdown.comp.transactionCount}):`, `$${(report.tenderBreakdown.comp.totalCents / 100).toFixed(2)}`, columns);
    this.row('Total Tips Recorded:', `$${(report.tenderBreakdown.totalTipsCents / 100).toFixed(2)}`, columns);
    this.divider('=', columns);

    // 5. Cash Drawer Audit
    this.bold(true);
    this.line('CASH DRAWER AUDIT & FLOAT');
    this.bold(false);
    this.divider('-', columns);
    this.row('Opening Float:', `$${(report.cashReconciliation.openingFloatCents / 100).toFixed(2)}`, columns);
    this.row('Cash Collected:', `$${(report.cashReconciliation.cashSalesCents / 100).toFixed(2)}`, columns);
    this.row('Paid In / (Paid Out):', `$${((report.cashReconciliation.paidInCents - report.cashReconciliation.paidOutCents) / 100).toFixed(2)}`, columns);
    this.row('Expected In Drawer:', `$${(report.cashReconciliation.expectedInDrawerCents / 100).toFixed(2)}`, columns);
    this.row('Actual Counted Cash:', `$${(report.cashReconciliation.actualCountedCents / 100).toFixed(2)}`, columns);
    this.bold(true);
    const os = report.cashReconciliation.overShortCents;
    const osStr = os === 0 ? '$0.00 (EXACT)' : os > 0 ? `+$${(os / 100).toFixed(2)} (OVER)` : `-$${(Math.abs(os) / 100).toFixed(2)} (SHORT)`;
    this.row('OVER / SHORT VARIANCE:', osStr, columns);
    this.bold(false);
    this.divider('=', columns);

    // 6. Tip Pool Distribution
    if (report.tipPoolSummary && report.tipPoolSummary.staffPayouts?.length > 0) {
      this.bold(true);
      this.line(`TIP POOL (${report.tipPoolSummary.method.toUpperCase()} - $${(report.tipPoolSummary.poolTotalCents / 100).toFixed(2)})`);
      this.bold(false);
      this.divider('-', columns);
      report.tipPoolSummary.staffPayouts.forEach((sp) => {
        const name = sp.staffName || sp.staffId;
        this.row(`${name} (${sp.role}, ${sp.hours}h):`, `$${(sp.payoutCents / 100).toFixed(2)} ($${(sp.effectiveHourlyTipRateCents / 100).toFixed(2)}/h)`, columns);
      });
      this.divider('=', columns);
    }

    // 7. Footer
    this.align('center');
    this.line('IMMUTABLE SHIFT AUDIT TRAIL SEALS LEDGER');
    this.line('CulinaryOS Accounting Security');
    this.feed(3);
    this.cut(true);

    return this.getBuffer();
  }

  /**
   * Generates a plain-text thermal-formatted string of the Z-Report.
   */
  public generateZReportFormattedText(report: ZReport, restaurantName = 'The Golden Fork', columns = 48): string {
    const formatRow = (left: string, right: string) => {
      const spaceCount = Math.max(1, columns - left.length - right.length);
      return left + ' '.repeat(spaceCount) + right;
    };

    const lines: string[] = [
      'END OF DAY Z-REPORT'.padStart(Math.floor((columns + 19) / 2)),
      restaurantName.toUpperCase().padStart(Math.floor((columns + restaurantName.length) / 2)),
      `REPORT NO: ${report.zReportNumber}`.padStart(Math.floor((columns + 11 + report.zReportNumber.length) / 2)),
      `DATE: ${report.date} | STATUS: ${report.status.toUpperCase()}`,
      report.closedBy ? `CLOSED BY: ${report.closedBy.displayName} (${report.closedBy.role.toUpperCase()})` : '',
      '='.repeat(columns),
      'FINANCIAL RECONCILIATION',
      '-'.repeat(columns),
      formatRow('Gross Sales:', `$${(report.financials.grossSalesCents / 100).toFixed(2)}`),
      formatRow('Comps / Discounts:', `-$${(report.financials.discountsCompsCents / 100).toFixed(2)}`),
      formatRow('Voids Total:', `-$${(report.financials.voidsTotalCents / 100).toFixed(2)}`),
      formatRow('Net Sales:', `$${(report.financials.netSalesCents / 100).toFixed(2)}`),
      formatRow('Total Tax Collected:', `$${(report.financials.taxTotalCents / 100).toFixed(2)}`),
      '-'.repeat(columns),
      formatRow('TOTAL REVENUE:', `$${(report.financials.totalRevenueCents / 100).toFixed(2)}`),
      formatRow('Total Orders / Checks:', `${report.financials.totalOrdersCount}`),
      formatRow('Average Check:', `$${(report.financials.averageCheckCents / 100).toFixed(2)}`),
      '='.repeat(columns),
      'TAX BREAKDOWN (MULTI-RATE)',
      '-'.repeat(columns),
      formatRow(`Prep Food (${report.taxBreakdown.breakdown.preparedFood.ratePercent}%):`, `$${(report.taxBreakdown.breakdown.preparedFood.taxAmountCents / 100).toFixed(2)}`),
      formatRow(`Alcohol (${report.taxBreakdown.breakdown.alcohol.ratePercent}%):`, `$${(report.taxBreakdown.breakdown.alcohol.taxAmountCents / 100).toFixed(2)}`),
      formatRow(`Exempt (0%):`, `$0.00`),
      formatRow('Effective Tax Rate:', `${report.taxBreakdown.effectiveTaxRatePercent.toFixed(2)}%`),
      '='.repeat(columns),
      'TENDER & PAYMENT SUMMARY',
      '-'.repeat(columns),
      formatRow(`Credit Card (${report.tenderBreakdown.creditCard.transactionCount}):`, `$${(report.tenderBreakdown.creditCard.totalCents / 100).toFixed(2)}`),
      formatRow(`Cash Tender (${report.tenderBreakdown.cash.transactionCount}):`, `$${(report.tenderBreakdown.cash.totalCents / 100).toFixed(2)}`),
      formatRow(`Gift Cards (${report.tenderBreakdown.giftCard.transactionCount}):`, `$${(report.tenderBreakdown.giftCard.totalCents / 100).toFixed(2)}`),
      formatRow(`Comps (${report.tenderBreakdown.comp.transactionCount}):`, `$${(report.tenderBreakdown.comp.totalCents / 100).toFixed(2)}`),
      formatRow('Total Tips Recorded:', `$${(report.tenderBreakdown.totalTipsCents / 100).toFixed(2)}`),
      '='.repeat(columns),
      'CASH DRAWER AUDIT & FLOAT',
      '-'.repeat(columns),
      formatRow('Opening Float:', `$${(report.cashReconciliation.openingFloatCents / 100).toFixed(2)}`),
      formatRow('Cash Collected:', `$${(report.cashReconciliation.cashSalesCents / 100).toFixed(2)}`),
      formatRow('Expected In Drawer:', `$${(report.cashReconciliation.expectedInDrawerCents / 100).toFixed(2)}`),
      formatRow('Actual Counted Cash:', `$${(report.cashReconciliation.actualCountedCents / 100).toFixed(2)}`),
      formatRow('OVER / SHORT VARIANCE:', report.cashReconciliation.overShortCents === 0 ? '$0.00 (EXACT)' : report.cashReconciliation.overShortCents > 0 ? `+$${(report.cashReconciliation.overShortCents / 100).toFixed(2)} (OVER)` : `-$${(Math.abs(report.cashReconciliation.overShortCents) / 100).toFixed(2)} (SHORT)`),
      '='.repeat(columns),
      'IMMUTABLE SHIFT AUDIT TRAIL SEALS LEDGER',
      'CulinaryOS Accounting Security',
    ];

    return lines.filter(Boolean).join('\n');
  }

  /**
   * Encodes a bilingual kitchen ticket chit for BOH line cooks into ESC/POS bytes.
   * Renders primary translated dish name in bold/double height with original English subtitle.
   */
  public encodeKitchenChit(
    payload: KitchenTicketPayload,
    config?: Partial<PrinterConfig>,
    targetLanguage: SupportedLanguage = 'en'
  ): Uint8Array {
    const columns = config?.paperWidth === '58mm' ? 32 : (config?.columns || 48);
    const dateStr = typeof payload.timestamp === 'string'
      ? new Date(payload.timestamp).toLocaleTimeString()
      : payload.timestamp.toLocaleTimeString();

    this.init();

    // 1. Station & Table Header
    this.align('center');
    const stationLabel = payload.stationName || payload.station || 'KITCHEN';
    const transStation = targetLanguage !== 'en'
      ? translateCulinaryText(stationLabel, targetLanguage).translated
      : stationLabel;

    this.bold(true);
    this.doubleSize(true);
    this.line(`** ${transStation.toUpperCase()} **`);
    if (targetLanguage !== 'en' && transStation.toLowerCase() !== stationLabel.toLowerCase()) {
      this.doubleSize(false);
      this.line(`(${stationLabel.toUpperCase()})`);
      this.doubleSize(true);
    }
    this.doubleSize(false);

    if (payload.priority === 'allergy' || payload.priority === 'rush') {
      this.invert(true);
      this.line(` *** ${payload.priority.toUpperCase()} PRIORITY *** `);
      this.invert(false);
    }

    this.divider('=', columns);

    // 2. Ticket Metadata
    this.align('left');
    this.bold(true);
    this.doubleHeight(true);
    this.row(
      `TABLE: ${payload.tableNumber ?? 'TAKEAWAY'}`,
      `TICKET #${payload.ticketId.slice(-6).toUpperCase()}`,
      columns
    );
    this.doubleHeight(false);
    this.bold(false);

    const courseLabel = payload.courseNumber ? `Course ${payload.courseNumber}` : 'Standard';
    const transCourse = targetLanguage === 'es' && payload.courseNumber
      ? `Tiempo ${payload.courseNumber}`
      : targetLanguage === 'fr' && payload.courseNumber
        ? `Service ${payload.courseNumber}`
        : courseLabel;

    this.row(
      `TIME: ${dateStr}`,
      `SERVER: ${payload.serverName ?? 'Server'}`,
      columns
    );
    this.row(`COURSE: ${transCourse.toUpperCase()}`, `ORDER: ${payload.orderId.slice(-6).toUpperCase()}`, columns);
    this.divider('=', columns);

    // 3. Items with Bilingual Translation
    payload.items.forEach((item) => {
      const transName = translateCulinaryText(item.name, targetLanguage);
      const isTranslated = targetLanguage !== 'en' && transName.translated.toLowerCase() !== item.name.toLowerCase();

      this.bold(true);
      this.doubleHeight(true);
      const qtyPrefix = `${item.quantity}x `;
      this.line(`${qtyPrefix}${isTranslated ? transName.translated : item.name}`);
      this.doubleHeight(false);

      if (isTranslated) {
        this.bold(false);
        this.line(`   (${item.name})`);
      }
      this.bold(false);

      // Modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach((mod) => {
          const transMod = translateCulinaryText(mod, targetLanguage);
          const isModTrans = targetLanguage !== 'en' && transMod.translated.toLowerCase() !== mod.toLowerCase();
          const isAllergy = /allerg/i.test(mod) || /sin\s+/i.test(transMod.translated) || /no\s+/i.test(mod);

          if (isAllergy) {
            this.bold(true);
            this.line(`   >> ${transMod.translated}${isModTrans ? ` (${mod})` : ''}`);
            this.bold(false);
          } else {
            this.line(`   + ${transMod.translated}${isModTrans ? ` (${mod})` : ''}`);
          }
        });
      }

      if (item.notes) {
        this.bold(true);
        this.line(`   * NOTE: ${item.notes}`);
        this.bold(false);
      }

      this.feed(1);
    });

    if (payload.notes) {
      this.divider('-', columns);
      this.bold(true);
      this.line(`TICKET NOTES: ${payload.notes}`);
      this.bold(false);
    }

    this.divider('=', columns);
    this.feed(3);
    this.cut(true);

    return this.getBuffer();
  }

  /**
   * Generates formatted text of a bilingual kitchen chit for preview or spooler.
   */
  public generateKitchenChitText(
    payload: KitchenTicketPayload,
    columns = 48,
    targetLanguage: SupportedLanguage = 'en'
  ): string {
    const formatRow = (left: string, right: string) => {
      const spaceCount = Math.max(1, columns - left.length - right.length);
      return left + ' '.repeat(spaceCount) + right;
    };

    const stationLabel = payload.stationName || payload.station || 'KITCHEN';
    const transStation = targetLanguage !== 'en'
      ? translateCulinaryText(stationLabel, targetLanguage).translated
      : stationLabel;

    const dateStr = typeof payload.timestamp === 'string'
      ? new Date(payload.timestamp).toLocaleTimeString()
      : payload.timestamp.toLocaleTimeString();

    const courseLabel = payload.courseNumber ? `COURSE ${payload.courseNumber}` : 'STANDARD';
    const transCourse = targetLanguage === 'es' && payload.courseNumber
      ? `TIEMPO ${payload.courseNumber}`
      : targetLanguage === 'fr' && payload.courseNumber
        ? `SERVICE ${payload.courseNumber}`
        : courseLabel;

    const lines: string[] = [
      `[ ${transStation.toUpperCase()} ]`.padStart(Math.floor((columns + transStation.length + 4) / 2)),
      targetLanguage !== 'en' && transStation.toLowerCase() !== stationLabel.toLowerCase()
        ? `(${stationLabel.toUpperCase()})`.padStart(Math.floor((columns + stationLabel.length + 2) / 2))
        : '',
      payload.priority && payload.priority !== 'normal'
        ? `*** ${payload.priority.toUpperCase()} PRIORITY ***`.padStart(Math.floor((columns + 24) / 2))
        : '',
      '='.repeat(columns),
      formatRow(`TABLE: ${payload.tableNumber ?? 'TAKEAWAY'}`, `TICKET #${payload.ticketId.slice(-6).toUpperCase()}`),
      formatRow(`TIME: ${dateStr}`, `SERVER: ${payload.serverName ?? 'Server'}`),
      formatRow(`COURSE: ${transCourse}`, `ORDER: ${payload.orderId.slice(-6).toUpperCase()}`),
      '='.repeat(columns),
    ];

    payload.items.forEach((item) => {
      const transName = translateCulinaryText(item.name, targetLanguage);
      const isTranslated = targetLanguage !== 'en' && transName.translated.toLowerCase() !== item.name.toLowerCase();
      lines.push(`${item.quantity}x ${isTranslated ? transName.translated : item.name}`);
      if (isTranslated) {
        lines.push(`   (${item.name})`);
      }
      if (item.modifiers) {
        item.modifiers.forEach((mod) => {
          const transMod = translateCulinaryText(mod, targetLanguage);
          const isModTrans = targetLanguage !== 'en' && transMod.translated.toLowerCase() !== mod.toLowerCase();
          lines.push(`   + ${transMod.translated}${isModTrans ? ` (${mod})` : ''}`);
        });
      }
      if (item.notes) {
        lines.push(`   * NOTE: ${item.notes}`);
      }
    });

    if (payload.notes) {
      lines.push('-'.repeat(columns));
      lines.push(`TICKET NOTES: ${payload.notes}`);
    }

    lines.push('='.repeat(columns));
    return lines.filter(Boolean).join('\n');
  }
}
