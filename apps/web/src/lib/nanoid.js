/** Tiny collision-resistant ID for cart line items — no dependency needed */
export function nanoid(len = 12) {
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
        .map((b) => b.toString(36).padStart(2, '0'))
        .join('')
        .slice(0, len);
}
