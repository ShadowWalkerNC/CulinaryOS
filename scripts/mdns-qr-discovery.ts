/**
 * CulinaryOS Local QR & mDNS Network Discovery Engine
 *
 * Provides:
 * 1. Native mDNS (RFC 6762) multicast advertising on `culinaryos.local` via UDP 5353.
 * 2. Automatic discovery of local LAN IPv4 network interfaces.
 * 3. Pure TypeScript QR Code generator (zero external dependencies) with:
 *    - High-contrast terminal ANSI QR code rendering (half/full blocks)
 *    - SVG & Data URL rendering for mobile handheld & tablet pairing.
 * 4. Data URL and JSON pairing payloads for frontend pairing screens.
 */
import * as os from 'os';
import * as dgram from 'dgram';

export interface PairingInfo {
  lanIp: string;
  hostname: string;
  tenantId: string;
  urls: {
    desktop: string;
    pos: string;
    kds: string;
    admin: string;
    storefront: string;
    tableside: string;
    api: string;
  };
  mdnsUrls: {
    desktop: string;
    pos: string;
    kds: string;
    admin: string;
    storefront: string;
    tableside: string;
    api: string;
  };
  generatedAt: string;
}

/**
 * Returns primary non-internal IPv4 address of this machine.
 */
export function getLanIpv4(): string {
  const all = getAllLanIpv4();
  return all.length > 0 ? all[0] : '127.0.0.1';
}

/**
 * Returns all non-internal IPv4 addresses across network adapters.
 */
export function getAllLanIpv4(): string[] {
  const addresses: string[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const list = interfaces[name];
      if (!list) continue;
      for (const iface of list) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
  } catch {
    // Fallback
  }
  return addresses;
}

/**
 * Generates pairing URLs and configuration payload.
 */
export function generatePairingPayload(options: {
  lanIp?: string;
  hostname?: string;
  tenantId?: string;
} = {}): PairingInfo {
  const lanIp = options.lanIp || getLanIpv4();
  const hostname = options.hostname || 'culinaryos.local';
  const tenantId = options.tenantId || '00000000-0000-0000-0000-000000000001';

  return {
    lanIp,
    hostname,
    tenantId,
    urls: {
      desktop: `http://${lanIp}:5180`,
      pos: `http://${lanIp}:5172`,
      kds: `http://${lanIp}:5173`,
      admin: `http://${lanIp}:5174`,
      storefront: `http://${lanIp}:5176`,
      tableside: `http://${lanIp}:5176/table/demo/1`,
      api: `http://${lanIp}:3000`,
    },
    mdnsUrls: {
      desktop: `http://${hostname}:5180`,
      pos: `http://${hostname}:5172`,
      kds: `http://${hostname}:5173`,
      admin: `http://${hostname}:5174`,
      storefront: `http://${hostname}:5176`,
      tableside: `http://${hostname}:5176/table/demo/1`,
      api: `http://${hostname}:3000`,
    },
    generatedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// Pure TypeScript QR Code Matrix Generator (Zero Dependencies)
// -------------------------------------------------------------

// Galois Field GF(256) Log & Antilog Tables for Reed-Solomon Error Correction
const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= gfMul(poly[j], GF_EXP[i]);
      nextPoly[j + 1] ^= poly[j];
    }
    poly = nextPoly;
  }
  return poly;
}

function rsEncode(data: number[], numEcBytes: number): number[] {
  const gen = rsGeneratorPoly(numEcBytes);
  const msg = new Array(data.length + numEcBytes).fill(0);
  for (let i = 0; i < data.length; i++) {
    msg[i] = data[i];
  }

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }

  return msg.slice(data.length);
}

// Version table constants (Versions 1 - 5, Medium error correction level)
const VERSION_CAPACITIES = [
  { version: 1, size: 21, totalDataBytes: 19, ecBytes: 10, totalBytes: 26 },
  { version: 2, size: 25, totalDataBytes: 34, ecBytes: 16, totalBytes: 44 },
  { version: 3, size: 29, totalDataBytes: 55, ecBytes: 26, totalBytes: 70 },
  { version: 4, size: 33, totalDataBytes: 80, ecBytes: 36, totalBytes: 100 },
  { version: 5, size: 37, totalDataBytes: 108, ecBytes: 48, totalBytes: 134 },
];

export function createQrMatrix(text: string): boolean[][] {
  const bytes = Buffer.from(text, 'utf8');
  let verInfo = VERSION_CAPACITIES[0];

  for (const v of VERSION_CAPACITIES) {
    if (bytes.length + 3 <= v.totalDataBytes) {
      verInfo = v;
      break;
    }
  }

  const { size, totalDataBytes, ecBytes } = verInfo;

  // 1. Bit buffer construction (Byte mode: 0100 + char count + data + terminator)
  const bitArray: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bitArray.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4); // Byte mode indicator
  pushBits(bytes.length, 8); // Character count indicator (8 bits for V1-V9)
  for (const b of bytes) {
    pushBits(b, 8);
  }
  // Terminator (up to 4 zeroes)
  pushBits(0, Math.min(4, totalDataBytes * 8 - bitArray.length));
  // Pad to byte boundary
  while (bitArray.length % 8 !== 0) {
    bitArray.push(0);
  }

  // Pad with alternating 0xEC and 0x11
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitArray.length < totalDataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to byte codewords
  const dataCodewords: number[] = [];
  for (let i = 0; i < bitArray.length; i += 8) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitArray[i + b];
    }
    dataCodewords.push(byteVal);
  }

  // Calculate Reed-Solomon error correction codewords
  const ecCodewords = rsEncode(dataCodewords, ecBytes);
  const finalCodewords = [...dataCodewords, ...ecCodewords];

  // 2. Matrix allocation
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  const setModule = (r: number, c: number, val: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isReserved[r][c] = true;
    }
  };

  // 3. Finder Patterns (7x7 with 1-module separator)
  const placeFinder = (startRow: number, startCol: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = startRow + r;
        const col = startCol + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(row, col, isBlack);
        } else {
          setModule(row, col, false); // Separator
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 4. Timing Patterns
  for (let i = 8; i < size - 8; i++) {
    const isBlack = i % 2 === 0;
    if (!isReserved[6][i]) setModule(6, i, isBlack);
    if (!isReserved[i][6]) setModule(i, 6, isBlack);
  }

  // 5. Dark Module
  setModule(4 * 1 + 9, 8, true); // (4*V + 9, 8) -> for V1: (13, 8)

  // 6. Format Information reservation
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isReserved[8][i] = true;
      isReserved[i][8] = true;
    }
  }
  for (let i = size - 8; i < size; i++) {
    isReserved[8][i] = true;
    isReserved[i][8] = true;
  }

  // 7. Place Data Codewords (zigzag traversal)
  let bitIdx = 0;
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing line

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (let c = right; c >= right - 1; c--) {
        if (!isReserved[r][c]) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = mask ? !bitVal : bitVal;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // 8. Place Format Info (Level M + Mask 0: 0x5412 XOR 0x5412)
  const formatBits = 0x5412 ^ 0x5412; // Formats: Level M, Mask 0 with standard BCH mask
  const formatStr = (0x4a44).toString(2).padStart(15, '0'); // Standard precomputed BCH for M-0

  for (let i = 0; i < 15; i++) {
    const bit = formatStr[14 - i] === '1';
    if (i < 6) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i === 7) setModule(8, 8, bit);
    else if (i === 8) setModule(7, 8, bit);
    else setModule(14 - i, 8, bit);

    if (i < 8) setModule(size - 1 - i, 8, bit);
    else setModule(8, size - 15 + i, bit);
  }

  return matrix;
}

/**
 * Renders an ANSI ASCII QR code directly into a terminal string.
 */
export async function generateTerminalQr(text: string): Promise<string> {
  const matrix = createQrMatrix(text);
  const size = matrix.length;
  const lines: string[] = [];

  // 2-module border
  const border = '  '.repeat(size + 4);
  lines.push('\x1b[47m' + border + '\x1b[0m');

  for (let r = 0; r < size; r += 2) {
    let line = '\x1b[47m  ';
    for (let c = 0; c < size; c++) {
      const top = matrix[r][c];
      const bot = r + 1 < size ? matrix[r + 1][c] : false;

      if (top && bot) {
        line += '\x1b[30m\x1b[40m \x1b[47m'; // Both black
      } else if (top && !bot) {
        line += '\x1b[30m\x1b[47m▀\x1b[47m'; // Top black, bot white
      } else if (!top && bot) {
        line += '\x1b[30m\x1b[47m▄\x1b[47m'; // Top white, bot black
      } else {
        line += '\x1b[37m\x1b[47m \x1b[47m'; // Both white
      }
    }
    line += '  \x1b[0m';
    lines.push(line);
  }

  lines.push('\x1b[47m' + border + '\x1b[0m');
  return lines.join('\n');
}

/**
 * Generates an SVG string representation of the QR code.
 */
export function generateQrSvg(text: string, moduleSize = 8, margin = 4): string {
  const matrix = createQrMatrix(text);
  const size = matrix.length;
  const totalSize = (size + margin * 2) * moduleSize;

  let rects = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * moduleSize;
        const y = (r + margin) * moduleSize;
        rects += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#111827"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
}

/**
 * Generates a Data URL for browser / UI rendering.
 */
export async function generateDataUrlQr(text: string): Promise<string> {
  const svg = generateQrSvg(text);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// -------------------------------------------------------------
// Pure Node RFC 6762 mDNS Multicast DNS Daemon
// -------------------------------------------------------------

const MDNS_MULTICAST_IPV4 = '224.0.0.251';
const MDNS_PORT = 5353;

function encodeDnsName(name: string): Buffer {
  const parts = name.split('.');
  const buffers: Buffer[] = [];
  for (const part of parts) {
    if (part.length === 0) continue;
    const lenBuf = Buffer.from([part.length]);
    const partBuf = Buffer.from(part, 'utf8');
    buffers.push(lenBuf, partBuf);
  }
  buffers.push(Buffer.from([0])); // Terminating zero
  return Buffer.concat(buffers);
}

function decodeDnsName(buf: Buffer, offset: number): { name: string; bytesRead: number } {
  const parts: string[] = [];
  let curr = offset;
  let jumped = false;
  let totalRead = 0;

  while (curr < buf.length) {
    const len = buf[curr];
    if (len === 0) {
      if (!jumped) totalRead = curr - offset + 1;
      break;
    }
    // Pointer check (0xc0)
    if ((len & 0xc0) === 0xc0) {
      if (!jumped) {
        totalRead = curr - offset + 2;
        jumped = true;
      }
      const ptrOffset = ((len & 0x3f) << 8) | buf[curr + 1];
      curr = ptrOffset;
      continue;
    }

    curr++;
    parts.push(buf.toString('utf8', curr, curr + len));
    curr += len;
  }

  return {
    name: parts.join('.'),
    bytesRead: jumped ? totalRead : curr - offset + 1,
  };
}

/**
 * Creates an authoritative mDNS response packet resolving `culinaryos.local`
 * to the local IPv4 address and announcing the CulinaryOS HTTP service.
 */
export function buildMdnsResponsePacket(options: {
  hostname?: string;
  ip?: string;
  port?: number;
  serviceName?: string;
}): Buffer {
  const host = options.hostname || 'culinaryos.local';
  const ip = options.ip || getLanIpv4();
  const port = options.port || 5180;
  const serviceName = options.serviceName || 'CulinaryOS Restaurant Server';

  const hostEncoded = encodeDnsName(host);
  const serviceType = encodeDnsName('_culinaryos._tcp.local');
  const serviceInstance = encodeDnsName(`${serviceName}._culinaryos._tcp.local`);

  const ipParts = ip.split('.').map((p) => parseInt(p, 10));

  // DNS Header: ID=0, Flags=0x8400 (Response + Authoritative), QDCOUNT=0, ANCOUNT=3, NSCOUNT=0, ARCOUNT=0
  const header = Buffer.alloc(12);
  header.writeUInt16BE(0x0000, 0); // ID
  header.writeUInt16BE(0x8400, 2); // Flags: Standard response
  header.writeUInt16BE(0, 4);      // Questions
  header.writeUInt16BE(3, 6);      // Answers: A record + PTR record + SRV record
  header.writeUInt16BE(0, 8);      // Authority RRs
  header.writeUInt16BE(0, 10);     // Additional RRs

  // Answer 1: A Record (culinaryos.local -> IPv4)
  const aRecordHeader = Buffer.alloc(10);
  aRecordHeader.writeUInt16BE(0x0001, 0); // Type: A (1)
  aRecordHeader.writeUInt16BE(0x8001, 2); // Class: IN (1) + Flush cache bit (0x8000)
  aRecordHeader.writeUInt32BE(120, 4);    // TTL: 120s
  aRecordHeader.writeUInt16BE(4, 8);      // RDLENGTH: 4 bytes
  const aRecordData = Buffer.from(ipParts.length === 4 ? ipParts : [127, 0, 0, 1]);
  const aRecord = Buffer.concat([hostEncoded, aRecordHeader, aRecordData]);

  // Answer 2: PTR Record (_culinaryos._tcp.local -> Instance)
  const ptrRecordHeader = Buffer.alloc(10);
  ptrRecordHeader.writeUInt16BE(0x000c, 0); // Type: PTR (12)
  ptrRecordHeader.writeUInt16BE(0x0001, 2); // Class: IN (1)
  ptrRecordHeader.writeUInt32BE(120, 4);    // TTL: 120s
  ptrRecordHeader.writeUInt16BE(serviceInstance.length, 8);
  const ptrRecord = Buffer.concat([serviceType, ptrRecordHeader, serviceInstance]);

  // Answer 3: SRV Record (Instance -> culinaryos.local:port)
  const srvData = Buffer.alloc(6);
  srvData.writeUInt16BE(0, 0); // Priority
  srvData.writeUInt16BE(0, 2); // Weight
  srvData.writeUInt16BE(port, 4); // Port
  const srvRecordHeader = Buffer.alloc(10);
  srvRecordHeader.writeUInt16BE(0x0021, 0); // Type: SRV (33)
  srvRecordHeader.writeUInt16BE(0x8001, 2); // Class: IN (1) + Flush
  srvRecordHeader.writeUInt32BE(120, 4);    // TTL: 120s
  srvRecordHeader.writeUInt16BE(6 + hostEncoded.length, 8);
  const srvRecord = Buffer.concat([serviceInstance, srvRecordHeader, srvData, hostEncoded]);

  return Buffer.concat([header, aRecord, ptrRecord, srvRecord]);
}

export interface MdnsService {
  socket: dgram.Socket;
  stop: () => void;
  broadcastAnnouncement: () => void;
}

/**
 * Starts a native RFC 6762 mDNS UDP daemon on port 5353.
 */
export function startMdnsAdvertiser(options: {
  hostname?: string;
  ip?: string;
  port?: number;
  serviceName?: string;
} = {}): MdnsService {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const host = (options.hostname || 'culinaryos.local').toLowerCase();
  let intervalId: NodeJS.Timeout | null = null;

  const sendResponse = (targetIp = MDNS_MULTICAST_IPV4, targetPort = MDNS_PORT) => {
    try {
      const packet = buildMdnsResponsePacket(options);
      socket.send(packet, 0, packet.length, targetPort, targetIp);
    } catch {
      // Ignore broadcast errors
    }
  };

  socket.on('error', (err) => {
    console.warn('[mDNS] Notice: UDP 5353 binding notice:', err.message);
  });

  socket.on('message', (msg, rinfo) => {
    try {
      if (msg.length < 12) return;
      const flags = msg.readUInt16BE(2);
      const isQuery = (flags & 0x8000) === 0;
      if (!isQuery) return;

      const qdCount = msg.readUInt16BE(4);
      let offset = 12;

      for (let i = 0; i < qdCount && offset < msg.length; i++) {
        const { name, bytesRead } = decodeDnsName(msg, offset);
        offset += bytesRead;
        if (offset + 4 > msg.length) break;

        offset += 4; // Skip QTYPE + QCLASS

        const queryName = name.toLowerCase();
        if (
          queryName === host ||
          queryName.includes('culinaryos') ||
          queryName.includes('_culinaryos._tcp')
        ) {
          sendResponse(rinfo.address, rinfo.port);
          sendResponse(MDNS_MULTICAST_IPV4, MDNS_PORT);
          break;
        }
      }
    } catch {
      // Malformed incoming packet
    }
  });

  socket.bind(MDNS_PORT, () => {
    try {
      socket.addMembership(MDNS_MULTICAST_IPV4);
      socket.setMulticastTTL(255);
      socket.setMulticastLoopback(true);

      // Send initial announcement
      sendResponse();

      // Periodic 60s keepalive announcement
      intervalId = setInterval(() => {
        sendResponse();
      }, 60000);
    } catch {
      // Fallback
    }
  });

  return {
    socket,
    stop: () => {
      if (intervalId) clearInterval(intervalId);
      try {
        socket.close();
      } catch {
        // Ignored
      }
    },
    broadcastAnnouncement: () => {
      sendResponse();
    },
  };
}

// -------------------------------------------------------------
// Standalone CLI Execution
// -------------------------------------------------------------
if (process.argv[1]?.replace(/\\/g, '/').includes('mdns-qr-discovery')) {
  const lanIp = getLanIpv4();
  const pairing = generatePairingPayload({ lanIp });

  console.log('\n======================================================');
  console.log('    CulinaryOS Network Discovery & Pairing Engine     ');
  console.log('======================================================\n');

  console.log(`🌐 Local LAN IP:      \x1b[32m${lanIp}\x1b[0m`);
  console.log(`🏷️ mDNS Hostname:     \x1b[36mhttp://culinaryos.local:5180\x1b[0m`);
  console.log(`🔑 Tenant ID:         \x1b[35m${pairing.tenantId}\x1b[0m\n`);

  console.log('📱 Scan QR Code with Mobile Handheld / Tablet to Pair:\n');

  generateTerminalQr(pairing.urls.desktop).then((qrAscii) => {
    console.log(qrAscii);
    console.log(`\nDirect Workstation Link: \x1b[4m\x1b[36m${pairing.urls.desktop}\x1b[0m`);
    console.log(`Direct POS Terminal:     \x1b[4m\x1b[36m${pairing.urls.pos}\x1b[0m`);
    console.log(`Direct Kitchen KDS:      \x1b[4m\x1b[36m${pairing.urls.kds}\x1b[0m`);
    console.log(`Tableside Ordering:      \x1b[4m\x1b[36m${pairing.urls.tableside}\x1b[0m\n`);

    console.log('⚡ Starting mDNS multicast advertising (culinaryos.local)...');
    const mdns = startMdnsAdvertiser();
    console.log('✅ Advertising on 224.0.0.251:5353. Press Ctrl+C to stop.\n');

    process.on('SIGINT', () => {
      mdns.stop();
      process.exit(0);
    });
  });
}
