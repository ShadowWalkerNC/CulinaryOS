// ============================================================
// CulinaryOS — Hardware Bridge & Evidence Registry Routes
// Stage A0 / R8: LAN TCP (:9100) Spooler, Drawer Pulse & Matrix
// ============================================================

import net from 'node:net';
import { Hono } from 'hono';
import { ok, err, requireTenant } from '../middleware/auth.js';
import { EscPosEncoder, DEFAULT_PRINTER_CONFIG, type ReceiptPayload } from '@culinaryos/shared';
import type { Env } from '../types.js';

export const hardwareRoutes = new Hono<Env>();

export interface HardwareRegistryEntry {
  id: string;
  role: 'receipt_printer' | 'kitchen_printer' | 'cash_drawer' | 'payment_reader' | 'tv_kiosk';
  model: string;
  protocolFamily: 'escpos_tcp' | 'starprnt_cloudprnt' | 'impact_escpos' | 'rj12_24v_dk' | 'stripe_terminal_sdk' | 'android_tv_adb';
  verificationState: 'candidate' | 'tested_on_device' | 'supported';
  notes: string;
}

const HARDWARE_REGISTRY: HardwareRegistryEntry[] = [
  {
    id: 'epson-tm-m30iii',
    role: 'receipt_printer',
    model: 'Epson OmniLink TM-m30III',
    protocolFamily: 'escpos_tcp',
    verificationState: 'supported',
    notes: 'Native ESC/POS over Ethernet (:9100), USB-C, or Bluetooth; drives 24V RJ12 DK port.',
  },
  {
    id: 'star-tsp143iv',
    role: 'receipt_printer',
    model: 'Star Micronics TSP100IV / TSP143IV',
    protocolFamily: 'starprnt_cloudprnt',
    verificationState: 'candidate',
    notes: 'Uses StarPRNT / CloudPRNT protocol family; do not assume raw ESC/POS without emulation mode.',
  },
  {
    id: 'star-sp742',
    role: 'kitchen_printer',
    model: 'Star SP742 Impact Dot-Matrix',
    protocolFamily: 'impact_escpos',
    verificationState: 'supported',
    notes: 'Heat/grease-resistant ribbon impact printer for hot-line tickets.',
  },
  {
    id: 'apg-vasario-1616',
    role: 'cash_drawer',
    model: 'APG Vasario 1616 (24V RJ12)',
    protocolFamily: 'rj12_24v_dk',
    verificationState: 'supported',
    notes: 'Connects to printer DK port via 6-pin POS RJ12 cable (never 4-pin RJ11 phone cable).',
  },
  {
    id: 'stripe-wisepos-e',
    role: 'payment_reader',
    model: 'Stripe Reader S700 / WisePOS E',
    protocolFamily: 'stripe_terminal_sdk',
    verificationState: 'supported',
    notes: 'SAQ-A card-present EMV/NFC via Stripe Terminal SDK; PAN never touches server.',
  },
  {
    id: 'walmart-onn-4k-gtv',
    role: 'tv_kiosk',
    model: 'Walmart onn. 4K Google TV (onn_4k_gtv)',
    protocolFamily: 'android_tv_adb',
    verificationState: 'tested_on_device',
    notes: 'Verified live via CleanMyTV Launcher Engine v1 + com.culinaryos.display APK over ADB.',
  },
];

function sendTcpBytes(ip: string, port: number, payload: Uint8Array, timeoutMs = 1500): Promise<{ connected: boolean; error?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (res: { connected: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(res);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.write(Buffer.from(payload), (writeErr) => {
        if (writeErr) finish({ connected: false, error: writeErr.message });
        else finish({ connected: true });
      });
    });
    socket.once('timeout', () => finish({ connected: false, error: `TCP connection timed out (${ip}:${port})` }));
    socket.once('error', (e) => finish({ connected: false, error: e.message }));
    socket.connect(port, ip);
  });
}

hardwareRoutes.get('/registry', (c) => {
  return ok(c, HARDWARE_REGISTRY);
});

hardwareRoutes.post('/print', requireTenant, async (c) => {
  const body = await c.req.json<{
    ip?: string;
    port?: number;
    rawBase64?: string;
    receipt?: ReceiptPayload;
    loopback?: boolean;
  }>().catch(() => ({} as { ip?: string; port?: number; rawBase64?: string; receipt?: ReceiptPayload; loopback?: boolean }));

  const jobId = `hwjob-${Date.now()}`;
  let bytes: Uint8Array;

  if (body.rawBase64) {
    bytes = new Uint8Array(Buffer.from(body.rawBase64, 'base64'));
  } else if (body.receipt) {
    const encoder = new EscPosEncoder();
    bytes = encoder.encodeReceipt(body.receipt, DEFAULT_PRINTER_CONFIG);
  } else {
    return err(c, 'VALIDATION_ERROR', 'rawBase64 or receipt payload is required', 422);
  }

  if (body.loopback) {
    return ok(c, {
      jobId,
      status: 'sent',
      transport: 'loopback',
      bytesSent: bytes.length,
    });
  }

  const ip = (body.ip || '').trim();
  const port = Number(body.port || 9100);
  if (!ip) {
    return ok(c, {
      jobId,
      status: 'unavailable',
      transport: 'network',
      bytesSent: 0,
      message: 'No target printer IP configured',
    });
  }

  const result = await sendTcpBytes(ip, port, bytes);
  return ok(c, {
    jobId,
    status: result.connected ? 'sent' : 'unavailable',
    transport: 'network',
    target: `${ip}:${port}`,
    bytesSent: result.connected ? bytes.length : 0,
    ...(result.error ? { message: result.error } : {}),
  });
});

hardwareRoutes.post('/kick-drawer', requireTenant, async (c) => {
  const body = await c.req.json<{
    ip?: string;
    port?: number;
    pin?: 2 | 5;
    loopback?: boolean;
  }>().catch(() => ({} as { ip?: string; port?: number; pin?: 2 | 5; loopback?: boolean }));

  const jobId = `drawer-${Date.now()}`;
  const pinByte = body.pin === 5 ? 0x01 : 0x00;
  const pulseBytes = new Uint8Array([0x1b, 0x70, pinByte, 0x19, 0xfa]);

  if (body.loopback) {
    return ok(c, {
      jobId,
      status: 'sent',
      transport: 'loopback',
      pin: body.pin === 5 ? 5 : 2,
      bytesSent: pulseBytes.length,
    });
  }

  const ip = (body.ip || '').trim();
  const port = Number(body.port || 9100);
  if (!ip) {
    return ok(c, {
      jobId,
      status: 'unavailable',
      transport: 'none',
      bytesSent: 0,
      message: 'No physical cash drawer transport connected (USB/Serial/LAN IP required)',
    });
  }

  const result = await sendTcpBytes(ip, port, pulseBytes);
  return ok(c, {
    jobId,
    status: result.connected ? 'sent' : 'unavailable',
    transport: 'network',
    target: `${ip}:${port}`,
    bytesSent: result.connected ? pulseBytes.length : 0,
    ...(result.error ? { message: result.error } : {}),
  });
});

export default hardwareRoutes;
