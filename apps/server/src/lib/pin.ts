import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Format: `<saltHex>:<hashHex>` using scrypt. */
export function hashPin(pin: string, saltHex?: string): string {
  const salt = saltHex ?? randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const next = scryptSync(pin, salt, 32);
  const prev = Buffer.from(hash, 'hex');
  if (prev.length !== next.length) return false;
  return timingSafeEqual(prev, next);
}

export const DEMO_STAFF = [
  {
    pin: '1234',
    email: 'server@demo.culinaryos.local',
    displayName: 'John Doe',
    role: 'server' as const,
  },
  {
    pin: '5678',
    email: 'manager@demo.culinaryos.local',
    displayName: 'Jane Smith',
    role: 'manager' as const,
  },
];
