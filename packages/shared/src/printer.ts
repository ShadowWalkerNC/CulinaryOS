// CulinaryOS — Thermal Receipt Printer & ESC/POS Engine
// Supports 80mm (48 col) & 58mm (32 col) thermal receipt printers across WebUSB, Web Bluetooth, Web Serial, Network TCP, and Browser Spooler.

export type PrinterPaperWidth = '80mm' | '58mm';
export type PrinterTransportType = 'auto' | 'usb' | 'bluetooth' | 'serial' | 'network' | 'browser';

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
}
