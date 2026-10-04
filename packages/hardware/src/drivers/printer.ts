import * as net from 'node:net';
import { EscposBuilder } from './escpos.js';

export interface PrinterStatus {
  connected: boolean;
  paperStatus: 'ok' | 'low' | 'out';
  error?: string | undefined;
}

export interface ReceiptPrinterDriver {
  readonly name: string;
  status(): Promise<PrinterStatus>;
  printRaw(payload: Uint8Array): Promise<boolean>;
  kickDrawer(pin?: 2 | 5): Promise<boolean>;
}

/**
 * In-memory loopback printer driver for headless testing, CI pipelines,
 * and software development without physical POS thermal hardware.
 */
export class LoopbackPrinterDriver implements ReceiptPrinterDriver {
  readonly name: string;
  private printedJobs: Uint8Array[] = [];
  private drawerKicks: number = 0;
  private isConnected: boolean = true;
  private paperState: 'ok' | 'low' | 'out' = 'ok';

  constructor(name: string = 'Loopback Virtual Printer') {
    this.name = name;
  }

  async status(): Promise<PrinterStatus> {
    return {
      connected: this.isConnected,
      paperStatus: this.paperState,
    };
  }

  async printRaw(payload: Uint8Array): Promise<boolean> {
    if (!this.isConnected || this.paperState === 'out') {
      return false;
    }
    // Clone buffer
    const copy = new Uint8Array(payload.length);
    copy.set(payload);
    this.printedJobs.push(copy);
    return true;
  }

  async kickDrawer(pin: 2 | 5 = 2): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }
    const builder = new EscposBuilder();
    builder.cashDrawerKick(pin);
    const kickBytes = builder.build();
    this.printedJobs.push(kickBytes);
    this.drawerKicks += 1;
    return true;
  }

  // Inspection helpers for tests
  getPrintedJobs(): Uint8Array[] {
    return [...this.printedJobs];
  }

  getJobCount(): number {
    return this.printedJobs.length;
  }

  getDrawerKickCount(): number {
    return this.drawerKicks;
  }

  setConnected(connected: boolean): void {
    this.isConnected = connected;
  }

  setPaperStatus(status: 'ok' | 'low' | 'out'): void {
    this.paperState = status;
  }

  clear(): void {
    this.printedJobs = [];
    this.drawerKicks = 0;
  }
}

export interface NetworkPrinterOptions {
  host: string;
  port?: number | undefined; // Defaults to 9100 (standard raw print port)
  timeoutMs?: number | undefined;
  name?: string | undefined;
}

/**
 * Raw TCP Socket driver for network receipt printers (Star TSP143IV, Epson TM-m30, Epson TM-U220).
 * Communicates directly with port 9100.
 */
export class NetworkPrinterDriver implements ReceiptPrinterDriver {
  readonly name: string;
  private host: string;
  private port: number;
  private timeoutMs: number;

  constructor(options: NetworkPrinterOptions) {
    this.host = options.host;
    this.port = options.port ?? 9100;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.name = options.name ?? `Network Printer (${this.host}:${this.port})`;
  }

  async status(): Promise<PrinterStatus> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve({ connected: true, paperStatus: 'ok' });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ connected: false, paperStatus: 'ok', error: 'Connection timed out' });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ connected: false, paperStatus: 'ok', error: err.message });
      });

      socket.connect(this.port, this.host);
    });
  }

  async printRaw(payload: Uint8Array): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeoutMs);

      socket.on('connect', () => {
        socket.write(Buffer.from(payload), (err) => {
          socket.end();
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(this.port, this.host);
    });
  }

  async kickDrawer(pin: 2 | 5 = 2): Promise<boolean> {
    const builder = new EscposBuilder();
    builder.cashDrawerKick(pin);
    return this.printRaw(builder.build());
  }
}
