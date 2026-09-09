/**
 * Canonical CulinaryOS Dialog — Radix-backed with a proper focus trap,
 * Escape-to-close, overlay-click close, and portal rendering.
 *
 * Re-exported from the Radix implementation in `./ui/dialog` so every app
 * shares one accessible dialog. (Previously this module held a hand-rolled
 * dialog without focus management; it has been retired in favor of this.)
 */
export * from './ui/dialog';
