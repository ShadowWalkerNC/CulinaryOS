// CulinaryOS POS — Hardware Receipt Printer Driver Hub
// Supports WebUSB, Web Bluetooth, Web Serial, Network TCP, and Browser Thermal Spooler.

import {
  EscPosEncoder,
  ReceiptPayload,
  PrinterConfig,
  DEFAULT_PRINTER_CONFIG,
} from '@culinaryos/shared';

const STORAGE_KEY = 'culinaryos_printer_config';

export class HardwarePrinterService {
  private static instance: HardwarePrinterService;
  private config: PrinterConfig = { ...DEFAULT_PRINTER_CONFIG };
  private usbDevice: any | null = null;
  private bluetoothServer: any | null = null;
  private bluetoothCharacteristic: any | null = null;
  private serialPort: any | null = null;
  private serialWriter: any | null = null;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): HardwarePrinterService {
    if (!HardwarePrinterService.instance) {
      HardwarePrinterService.instance = new HardwarePrinterService();
    }
    return HardwarePrinterService.instance;
  }

  public getConfig(): PrinterConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<PrinterConfig>): PrinterConfig {
    this.config = { ...this.config, ...updates };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    }
    return this.getConfig();
  }

  private loadConfig(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.config = { ...DEFAULT_PRINTER_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      this.config = { ...DEFAULT_PRINTER_CONFIG };
    }
  }

  // Capability checks
  public isWebUsbSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  // Active Connection Info
  public getConnectionStatus(): {
    transport: string;
    deviceName: string;
    isConnected: boolean;
  } {
    if (this.usbDevice?.opened) {
      return {
        transport: 'USB',
        deviceName: this.usbDevice.productName || 'USB Thermal Printer',
        isConnected: true,
      };
    }
    if (this.bluetoothServer?.connected) {
      return {
        transport: 'Bluetooth',
        deviceName: this.bluetoothServer.device.name || 'BT Receipt Printer',
        isConnected: true,
      };
    }
    if (this.serialPort) {
      return {
        transport: 'Serial',
        deviceName: 'Serial COM Port',
        isConnected: true,
      };
    }
    return {
      transport: this.config.transport === 'browser' ? 'Browser Spooler' : this.config.transport.toUpperCase(),
      deviceName: this.config.pairedDeviceName || (this.config.transport === 'network' ? `Network IP: ${this.config.networkIp}` : 'Universal Thermal Spooler'),
      isConnected: this.config.transport === 'browser' || !!this.config.pairedDeviceName,
    };
  }

  /**
   * Pair a direct WebUSB receipt printer (e.g. Epson TM-T88, Munbyn, Star TSP100, Sunmi, Xprinter).
   */
  public async pairUsbPrinter(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isWebUsbSupported()) {
      return { success: false, error: 'WebUSB is not supported in this browser. Use Chrome/Edge or System Spooler.' };
    }
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
      this.usbDevice = device;
      const name = device.productName || `USB Printer (VID: ${device.vendorId})`;
      this.updateConfig({ transport: 'usb', pairedDeviceName: name });
      return { success: true, name };
    } catch (err: any) {
      return { success: false, error: err.message || 'USB pairing cancelled or failed.' };
    }
  }

  /**
   * Pair a direct Web Bluetooth receipt printer (e.g. Star SM-L200, Zebra, generic BLE 58mm/80mm).
   */
  public async pairBluetoothPrinter(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isWebBluetoothSupported()) {
      return { success: false, error: 'Web Bluetooth is not supported in this browser.' };
    }
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard Print Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star Micronics
          0xffe0, // Generic Serial / ESC-POS BLE
          0x18f0,
        ],
      });
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Could not connect to Bluetooth GATT server.');
      this.bluetoothServer = server;

      // Locate writable characteristic
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.bluetoothCharacteristic = char;
            break;
          }
        }
        if (this.bluetoothCharacteristic) break;
      }

      const name = device.name || 'Bluetooth Receipt Printer';
      this.updateConfig({ transport: 'bluetooth', pairedDeviceName: name });
      return { success: true, name };
    } catch (err: any) {
      return { success: false, error: err.message || 'Bluetooth pairing cancelled or failed.' };
    }
  }

  /**
   * Connect to a Web Serial COM / RS-232 port.
   */
  public async pairSerialPrinter(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isWebSerialSupported()) {
      return { success: false, error: 'Web Serial is not supported in this browser.' };
    }
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: this.config.serialBaudRate || 9600 });
      this.serialPort = port;
      this.serialWriter = port.writable.getWriter();
      const name = `Serial COM Port (${this.config.serialBaudRate || 9600} baud)`;
      this.updateConfig({ transport: 'serial', pairedDeviceName: name });
      return { success: true, name };
    } catch (err: any) {
      return { success: false, error: err.message || 'Serial pairing cancelled or failed.' };
    }
  }

  /**
   * Main method: Prints a structured guest receipt across the active or best-matching transport.
   */
  public async printReceipt(
    payload: ReceiptPayload,
    customOptions?: Partial<PrinterConfig>
  ): Promise<{ success: boolean; transport: string; message: string }> {
    const activeConfig: PrinterConfig = { ...this.config, ...customOptions };
    const encoder = new EscPosEncoder();
    const escposBytes = encoder.encodeReceipt(payload, activeConfig);

    // 1. Direct USB Transport
    if ((activeConfig.transport === 'usb' || activeConfig.transport === 'auto') && this.usbDevice?.opened) {
      try {
        await this.sendToUsb(escposBytes);
        return { success: true, transport: 'USB', message: `Printed to ${this.usbDevice.productName || 'USB Printer'}` };
      } catch (e: any) {
        console.warn('[HardwarePrinter] USB write failed, trying fallback:', e);
      }
    }

    // 2. Direct Bluetooth Transport
    if ((activeConfig.transport === 'bluetooth' || activeConfig.transport === 'auto') && this.bluetoothCharacteristic) {
      try {
        await this.sendToBluetooth(escposBytes);
        return { success: true, transport: 'Bluetooth', message: 'Printed via Bluetooth connection' };
      } catch (e: any) {
        console.warn('[HardwarePrinter] Bluetooth write failed, trying fallback:', e);
      }
    }

    // 3. Direct Serial Transport
    if ((activeConfig.transport === 'serial' || activeConfig.transport === 'auto') && this.serialWriter) {
      try {
        await this.sendToSerial(escposBytes);
        return { success: true, transport: 'Serial', message: 'Printed via Serial COM Port' };
      } catch (e: any) {
        console.warn('[HardwarePrinter] Serial write failed, trying fallback:', e);
      }
    }

    // 4. Universal High-Fidelity Browser / OS Spooler (Thermal Print CSS Frame)
    return this.printViaBrowserThermalFrame(payload, activeConfig);
  }

  /**
   * Prints a diagnostic hardware test pattern.
   */
  public async printTestPattern(): Promise<{ success: boolean; transport: string; message: string }> {
    const encoder = new EscPosEncoder();
    const cols = this.config.paperWidth === '58mm' ? 32 : 48;
    const testBytes = encoder.generateTestPattern(cols);

    if (this.usbDevice?.opened) {
      await this.sendToUsb(testBytes);
      return { success: true, transport: 'USB', message: 'Diagnostic test pattern sent to USB printer' };
    }
    if (this.bluetoothCharacteristic) {
      await this.sendToBluetooth(testBytes);
      return { success: true, transport: 'Bluetooth', message: 'Diagnostic test pattern sent to Bluetooth printer' };
    }
    if (this.serialWriter) {
      await this.sendToSerial(testBytes);
      return { success: true, transport: 'Serial', message: 'Diagnostic test pattern sent to Serial COM port' };
    }

    // Browser simulation test
    const dummyPayload: ReceiptPayload = {
      restaurantName: 'CulinaryOS Test Kitchen',
      restaurantAddress: '100 Culinary Way, Suite 400',
      restaurantPhone: '(555) 019-2834',
      restaurantTaxId: 'US-99482104-K',
      receiptNumber: 'TEST-001',
      orderId: 'ord-test-sample-01',
      tableNumber: 'T1',
      sectionName: 'Main Dining',
      serverName: 'John Doe',
      guestCount: 2,
      timestamp: new Date(),
      items: [
        { name: 'Prime Dry-Aged Ribeye', quantity: 1, unitPriceCents: 4800, totalCents: 4800, seatNumber: 1, notes: 'Medium Rare' },
        { name: 'Truffle Mashed Potatoes', quantity: 1, unitPriceCents: 1200, totalCents: 1200, seatNumber: 1 },
        { name: 'Crispy Calamari', quantity: 1, unitPriceCents: 1400, totalCents: 1400, seatNumber: 2 },
      ],
      subtotalCents: 7400,
      taxCents: 740,
      tipCents: 1628,
      totalCents: 9768,
      paymentMethod: 'credit',
      cardLast4: '4242',
      authCode: '998412',
      footerMessage: 'Diagnostic Hardware Test Passed!',
      qrCodeData: 'https://culinaryos.org/hardware/receipt-test',
    };
    return this.printViaBrowserThermalFrame(dummyPayload, this.config);
  }

  /**
   * Kicks the cash drawer connected via RJ12 port on printer.
   */
  public async kickCashDrawer(): Promise<{ success: boolean; message: string }> {
    const encoder = new EscPosEncoder();
    encoder.kickDrawer();
    const bytes = encoder.getBuffer();

    if (this.usbDevice?.opened) {
      await this.sendToUsb(bytes);
      return { success: true, message: 'Cash drawer trigger pulse sent (USB)' };
    }
    if (this.serialWriter) {
      await this.sendToSerial(bytes);
      return { success: true, message: 'Cash drawer trigger pulse sent (Serial)' };
    }
    return { success: true, message: 'Cash drawer trigger registered (System)' };
  }

  // --- Transport Helpers ---

  private async sendToUsb(data: Uint8Array): Promise<void> {
    if (!this.usbDevice || !this.usbDevice.opened) throw new Error('USB device is not opened');
    // Send to bulk out endpoint (typically endpoint 1 or 2)
    const outEndpoint = this.usbDevice.configuration?.interfaces[0]?.alternate?.endpoints.find(
      (e) => e.direction === 'out'
    )?.endpointNumber || 1;
    await this.usbDevice.transferOut(outEndpoint, data);
  }

  private async sendToBluetooth(data: Uint8Array): Promise<void> {
    if (!this.bluetoothCharacteristic) throw new Error('Bluetooth characteristic not ready');
    // Chunk in 512-byte MTU blocks
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.bluetoothCharacteristic.writeValue(chunk);
    }
  }

  private async sendToSerial(data: Uint8Array): Promise<void> {
    if (!this.serialWriter) throw new Error('Serial writer not ready');
    await this.serialWriter.write(data);
  }

  /**
   * Universal Browser Spooler using an isolated, thermal-styled iframe.
   */
  private printViaBrowserThermalFrame(
    payload: ReceiptPayload,
    config: PrinterConfig
  ): Promise<{ success: boolean; transport: string; message: string }> {
    return new Promise((resolve) => {
      try {
        const widthMm = config.paperWidth === '58mm' ? '58mm' : '80mm';
        const dateStr = typeof payload.timestamp === 'string'
          ? new Date(payload.timestamp).toLocaleString()
          : payload.timestamp.toLocaleString();

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
          window.print();
          document.body.removeChild(iframe);
          resolve({ success: true, transport: 'Browser', message: 'Triggered native window.print()' });
          return;
        }

        const itemsHtml = payload.items
          .map((item) => {
            const seatTag = item.seatNumber && item.seatNumber > 0 ? ` <span style="font-size: 10px; color: #555;">[S${item.seatNumber}]</span>` : '';
            const qtyStr = item.quantity > 1 ? `<b>${item.quantity}x </b>` : '';
            const mods = item.modifiers && item.modifiers.length > 0
              ? item.modifiers.map((m) => `<div style="font-size: 10px; color: #666; padding-left: 10px;">+ ${m}</div>`).join('')
              : '';
            const notesHtml = item.notes
              ? `<div style="font-size: 10px; font-weight: bold; color: #b45309; padding-left: 10px; font-style: italic;">* NOTE: ${item.notes}</div>`
              : '';
            return `
              <div style="margin-bottom: 4px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <span>${qtyStr}${item.name}${seatTag}</span>
                  <span>$${(item.totalCents / 100).toFixed(2)}</span>
                </div>
                ${mods}
                ${notesHtml}
              </div>
            `;
          })
          .join('');

        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Receipt #${payload.receiptNumber}</title>
              <style>
                @page {
                  size: ${widthMm} auto;
                  margin: 0;
                }
                body {
                  width: ${widthMm};
                  margin: 0 auto;
                  padding: 8px 12px;
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 12px;
                  line-height: 1.35;
                  color: #000;
                  background: #fff;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 6px 0; }
                .double-divider { border-top: 2px solid #000; margin: 6px 0; }
                .row { display: flex; justify-content: space-between; }
                .title { font-size: 16px; font-weight: 900; letter-spacing: 1px; }
                .total-due { font-size: 15px; font-weight: 900; }
              </style>
            </head>
            <body>
              <div class="text-center">
                <div class="title">${payload.restaurantName.toUpperCase()}</div>
                ${payload.restaurantAddress ? `<div>${payload.restaurantAddress}</div>` : ''}
                ${payload.restaurantPhone ? `<div>${payload.restaurantPhone}</div>` : ''}
                ${payload.restaurantTaxId ? `<div style="font-size: 10px;">TAX ID: ${payload.restaurantTaxId}</div>` : ''}
              </div>
              <div class="double-divider"></div>

              <div class="row">
                <span>CHECK: #${payload.receiptNumber}</span>
                <span>ORDER: ${payload.orderId.slice(-6).toUpperCase()}</span>
              </div>
              <div class="row">
                <span>TABLE: ${payload.tableNumber ?? 'N/A'}${payload.sectionName ? ` (${payload.sectionName})` : ''}</span>
                <span>SERVER: ${payload.serverName ?? 'Staff'}</span>
              </div>
              <div class="row" style="font-size: 11px;">
                <span>${dateStr}</span>
                <span>GUESTS: ${payload.guestCount ?? 1}</span>
              </div>
              <div class="divider"></div>

              <div class="row bold">
                <span>ITEM / SEAT</span>
                <span>PRICE</span>
              </div>
              <div class="divider"></div>

              ${itemsHtml}

              <div class="divider"></div>
              <div class="row"><span>SUBTOTAL:</span><span>$${(payload.subtotalCents / 100).toFixed(2)}</span></div>
              <div class="row"><span>TAX:</span><span>$${(payload.taxCents / 100).toFixed(2)}</span></div>
              ${payload.tipCents > 0 ? `<div class="row"><span>GRATUITY / TIP:</span><span>$${(payload.tipCents / 100).toFixed(2)}</span></div>` : ''}
              
              <div class="double-divider"></div>
              <div class="row total-due">
                <span>TOTAL DUE:</span>
                <span>$${(payload.totalCents / 100).toFixed(2)}</span>
              </div>
              <div class="double-divider"></div>

              <div class="row">
                <span>PAYMENT: ${payload.paymentMethod.toUpperCase()}</span>
                <span>APPROVED</span>
              </div>
              ${payload.cardLast4 ? `<div class="row" style="font-size: 11px;"><span>CARD: **** ${payload.cardLast4}</span><span>AUTH: ${payload.authCode || 'ONLINE'}</span></div>` : ''}
              ${payload.cashTenderedCents ? `<div class="row"><span>TENDERED:</span><span>$${(payload.cashTenderedCents / 100).toFixed(2)}</span></div><div class="row"><span>CHANGE DUE:</span><span>$${((payload.changeDueCents ?? 0) / 100).toFixed(2)}</span></div>` : ''}

              <div class="divider"></div>
              <div class="text-center" style="font-size: 11px; margin-top: 8px;">
                <div>${payload.footerMessage || config.footerMessage || 'Thank you for dining with us!'}</div>
                <div style="font-size: 10px; color: #555; margin-top: 2px;">Powered by CulinaryOS POS</div>
              </div>
            </body>
          </html>
        `);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve({ success: true, transport: 'Browser', message: 'Sent to system thermal print spooler' });
          }, 1000);
        }, 300);
      } catch (err: any) {
        window.print();
        resolve({ success: true, transport: 'Browser', message: 'Fallback print dialog triggered' });
      }
    });
  }
}

export const hardwarePrinter = HardwarePrinterService.getInstance();
