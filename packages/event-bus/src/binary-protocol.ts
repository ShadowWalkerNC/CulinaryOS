// ============================================================
// @culinaryos/event-bus — Fast Binary Packet Protocol
// High-performance binary encoding for real-time KDS/POS feeds
// Features: Direct dictionary field & value tags, LEB128 varint encoding,
// Float64 epoch packing, maximum raw DEFLATE stream compression.
// ============================================================

import { deflateRawSync, inflateRawSync } from 'zlib';
import type { DomainEvent } from './types';

// Header Magic Bytes: 'C' (0x43) + Version (0x01)
const MAGIC_HEADER_0 = 0x43;
const MAGIC_HEADER_1 = 0x01;

// Type Tags (0x01 .. 0x7F)
const TAG_NULL            = 0x01;
const TAG_TRUE            = 0x02;
const TAG_FALSE           = 0x03;
const TAG_INT32           = 0x04;
const TAG_FLOAT64         = 0x05;
const TAG_TIMESTAMP_EPOCH = 0x06;
const TAG_STRING          = 0x07;
const TAG_ARRAY           = 0x08;
const TAG_OBJECT          = 0x09;
const TAG_DICT_VALUE      = 0x0a;

// Byte tag range 0x80..0xFF represents direct object key dictionary tags (0x80 | dictId)

// Dictionary mapping common field names to integer IDs (1..127)
const FIELD_DICT: Record<string, number> = {
  eventId:        1,
  eventType:      2,
  tenantId:       3,
  source:         4,
  timestamp:      5,
  version:        6,
  payload:        7,
  orderId:        8,
  tableNumber:    9,
  guestCount:     10,
  serverName:     11,
  items:          12,
  subtotal:       13,
  tax:            14,
  total:          15,
  status:         16,
  id:             17,
  name:           18,
  quantity:       19,
  price:          20,
  seat:           21,
  notes:          22,
  lineItemId:     23,
  station:        24,
  courseNumber:   25,
  modifiers:      26,
  recipeId:       27,
  reason:         28,
  ticketId:       29,
  bumpedBy:       30,
  bumpedAt:       31,
  ingredientId:   32,
  ingredientName: 33,
  currentQty:     34,
  reorderAt:      35,
  unit:           36,
  menuItemId:     37,
  soldAt:         38,
  firedTicketIds: 39,
  firedBy:        40,
  createdAt:      41,
  reorderQty:     42,
  costPerUnit:    43,
  supplier:       44,
  stockStatus:    45,
  current_qty:    46,
  reorder_at:     47,
  reorder_qty:    48,
  cost_per_unit:  49,
  stock_status:   50,
  poNumber:       51,
  po_number:      52,
  totalCost:      53,
  total_cost:     54,
  approvedAt:     55,
  approved_at:    56,
  sentAt:         57,
  sent_at:        58,
  receivedAt:     59,
  received_at:    60,
  poLineItems:    61,
  po_line_items:  62,
  orderedQty:     63,
  ordered_qty:    64,
  receivedQty:    65,
  received_qty:   66,
  unitCost:       67,
  unit_cost:      68,
  stockQuantity:  69,
  stock_quantity: 70,
  parLevel:       71,
  par_level:      72,
  itemId:         73,
  qty:            74,
};

const FIELD_DICT_REV: Record<number, string> = {};
for (const [k, v] of Object.entries(FIELD_DICT)) {
  FIELD_DICT_REV[v] = k;
}

// Common string values dictionary for domain events & KDS/POS feeds
const VALUE_DICT: Record<string, number> = {
  'pos:order:created':         1,
  'pos:order:cancelled':       2,
  'pos:menu:item-sold':        3,
  'kds:ticket:bumped':         4,
  'kds:course:fired':          5,
  'recipeos:pantry:low-stock': 6,
  'SUBMITTED':                 7,
  'PENDING':                   8,
  'IN_PROGRESS':               9,
  'COMPLETED':                 10,
  'CANCELLED':                 11,
  'PAID':                      12,
  'hot':                       13,
  'cold':                      14,
  'grill':                     15,
  'pastry':                    16,
  'expo':                      17,
  'bar':                       18,
  'pcs':                       19,
  'kg':                        20,
  'g':                         21,
  'l':                         22,
  'ml':                        23,
  'ok':                        24,
  'low_stock':                 25,
  'out_of_stock':              26,
};

const VALUE_DICT_REV: Record<number, string> = {};
for (const [k, v] of Object.entries(VALUE_DICT)) {
  VALUE_DICT_REV[v] = k;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

class BinaryWriter {
  private bytes: number[] = [];

  writeByte(b: number) {
    this.bytes.push(b & 0xff);
  }

  writeBytes(arr: Uint8Array | number[]) {
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (b !== undefined) {
        this.bytes.push(b);
      }
    }
  }

  writeVarint(n: number) {
    let v = Math.floor(n);
    if (v < 0) v = 0;
    while (v >= 0x80) {
      this.bytes.push((v & 0x7f) | 0x80);
      v = v >>> 7;
    }
    this.bytes.push(v & 0x7f);
  }

  writeInt32(n: number) {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setInt32(0, n, false);
    this.writeBytes(buf);
  }

  writeFloat64(n: number) {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setFloat64(0, n, false);
    this.writeBytes(buf);
  }

  writeString(s: string) {
    const encoded = new TextEncoder().encode(s);
    this.writeVarint(encoded.length);
    this.writeBytes(encoded);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

class BinaryReader {
  private offset = 0;

  constructor(private buffer: Uint8Array) {}

  readByte(): number {
    if (this.offset >= this.buffer.length) {
      throw new Error('Unexpected EOF reading byte');
    }
    const b = this.buffer[this.offset++];
    if (b === undefined) {
      throw new Error('Unexpected EOF reading byte');
    }
    return b;
  }

  readBytes(len: number): Uint8Array {
    if (this.offset + len > this.buffer.length) {
      throw new Error('Unexpected EOF reading bytes');
    }
    const slice = this.buffer.subarray(this.offset, this.offset + len);
    this.offset += len;
    return slice;
  }

  readVarint(): number {
    let result = 0;
    let shift = 0;
    while (true) {
      if (this.offset >= this.buffer.length) {
        throw new Error('Unexpected EOF reading varint');
      }
      const b = this.buffer[this.offset++];
      if (b === undefined) {
        throw new Error('Unexpected EOF reading varint');
      }
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    return result;
  }

  readInt32(): number {
    const buf = this.readBytes(4);
    return new DataView(buf.buffer, buf.byteOffset, 4).getInt32(0, false);
  }

  readFloat64(): number {
    const buf = this.readBytes(8);
    return new DataView(buf.buffer, buf.byteOffset, 8).getFloat64(0, false);
  }

  readString(): string {
    const len = this.readVarint();
    const bytes = this.readBytes(len);
    return new TextDecoder().decode(bytes);
  }
}

function encodeValue(val: any, writer: BinaryWriter): void {
  if (val === null || val === undefined) {
    writer.writeByte(TAG_NULL);
    return;
  }

  if (typeof val === 'boolean') {
    writer.writeByte(val ? TAG_TRUE : TAG_FALSE);
    return;
  }

  if (typeof val === 'number') {
    if (Number.isInteger(val) && val >= -2147483648 && val <= 2147483647) {
      writer.writeByte(TAG_INT32);
      writer.writeInt32(val);
    } else {
      writer.writeByte(TAG_FLOAT64);
      writer.writeFloat64(val);
    }
    return;
  }

  if (typeof val === 'string') {
    const valDictId = VALUE_DICT[val];
    if (valDictId !== undefined) {
      writer.writeByte(TAG_DICT_VALUE);
      writer.writeVarint(valDictId);
      return;
    }

    if (ISO_DATE_REGEX.test(val)) {
      const epochMs = Date.parse(val);
      if (!isNaN(epochMs) && new Date(epochMs).toISOString() === val) {
        writer.writeByte(TAG_TIMESTAMP_EPOCH);
        writer.writeFloat64(epochMs);
        return;
      }
    }

    writer.writeByte(TAG_STRING);
    writer.writeString(val);
    return;
  }

  if (Array.isArray(val)) {
    writer.writeByte(TAG_ARRAY);
    writer.writeVarint(val.length);
    for (let i = 0; i < val.length; i++) {
      encodeValue(val[i], writer);
    }
    return;
  }

  if (typeof val === 'object') {
    writer.writeByte(TAG_OBJECT);
    const keys = Object.keys(val);
    writer.writeVarint(keys.length);
    for (const key of keys) {
      const dictId = FIELD_DICT[key];
      if (dictId !== undefined && dictId <= 127) {
        writer.writeByte(0x80 | dictId);
      } else {
        writer.writeByte(TAG_STRING);
        writer.writeString(key);
      }
      encodeValue(val[key], writer);
    }
    return;
  }

  writer.writeByte(TAG_STRING);
  writer.writeString(String(val));
}

function decodeValue(reader: BinaryReader): any {
  const tag = reader.readByte();

  if ((tag & 0x80) !== 0) {
    // Direct field dictionary tag (0x80 | dictId)
    const dictId = tag & 0x7f;
    const key = FIELD_DICT_REV[dictId];
    if (!key) throw new Error(`Unknown direct dictionary field ID: ${dictId}`);
    return key;
  }

  switch (tag) {
    case TAG_NULL:
      return null;

    case TAG_TRUE:
      return true;

    case TAG_FALSE:
      return false;

    case TAG_INT32:
      return reader.readInt32();

    case TAG_FLOAT64:
      return reader.readFloat64();

    case TAG_TIMESTAMP_EPOCH: {
      const ms = reader.readFloat64();
      return new Date(ms).toISOString();
    }

    case TAG_STRING:
      return reader.readString();

    case TAG_DICT_VALUE: {
      const dictId = reader.readVarint();
      const val = VALUE_DICT_REV[dictId];
      if (!val) throw new Error(`Unknown value dictionary ID: ${dictId}`);
      return val;
    }

    case TAG_ARRAY: {
      const len = reader.readVarint();
      const arr = new Array(len);
      for (let i = 0; i < len; i++) {
        arr[i] = decodeValue(reader);
      }
      return arr;
    }

    case TAG_OBJECT: {
      const fieldCount = reader.readVarint();
      const obj: Record<string, any> = {};
      for (let i = 0; i < fieldCount; i++) {
        const nextTag = reader.readByte();
        let key: string;
        if ((nextTag & 0x80) !== 0) {
          const dictId = nextTag & 0x7f;
          const dictKey = FIELD_DICT_REV[dictId];
          if (!dictKey) throw new Error(`Unknown dictionary field ID: ${dictId}`);
          key = dictKey;
        } else if (nextTag === TAG_STRING) {
          key = reader.readString();
        } else {
          throw new Error(`Unexpected key tag in object: ${nextTag}`);
        }
        obj[key] = decodeValue(reader);
      }
      return obj;
    }

    default:
      throw new Error(`Unknown value type tag: ${tag}`);
  }
}

/**
 * Encodes a JSON DomainEvent into a compact Uint8Array binary buffer.
 * Uses dictionary key/value mapping, varint length, Float64 packing, and raw DEFLATE compression.
 */
export function encodeBinaryEvent(event: DomainEvent): Uint8Array {
  const writer = new BinaryWriter();
  encodeValue(event, writer);
  const uncompressed = writer.toUint8Array();

  const compressed = deflateRawSync(uncompressed, { level: 6 });

  // Magic Header: 0x43 0x01 + 4-byte Big-Endian uncompressed size
  const header = new Uint8Array(6);
  header[0] = MAGIC_HEADER_0;
  header[1] = MAGIC_HEADER_1;
  new DataView(header.buffer).setUint32(2, uncompressed.length, false);

  const packet = new Uint8Array(header.length + compressed.length);
  packet.set(header, 0);
  packet.set(compressed, header.length);

  return packet;
}

/**
 * Decodes a binary Uint8Array buffer back into a typed DomainEvent.
 * Returns null safely on corrupted input or decode error.
 */
export function decodeBinaryEvent(buffer: Uint8Array): DomainEvent | null {
  try {
    if (!buffer || !(buffer instanceof Uint8Array) || buffer.length < 6) {
      return null;
    }

    if (buffer[0] !== MAGIC_HEADER_0 || buffer[1] !== MAGIC_HEADER_1) {
      return null;
    }

    const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const expectedUncompressedLen = dv.getUint32(2, false);

    const compressedPayload = buffer.subarray(6);
    const uncompressed = inflateRawSync(compressedPayload);

    if (uncompressed.length !== expectedUncompressedLen) {
      return null;
    }

    const reader = new BinaryReader(uncompressed);
    const event = decodeValue(reader);

    if (!event || typeof event !== 'object') {
      return null;
    }

    return event as DomainEvent;
  } catch (_err) {
    return null;
  }
}
