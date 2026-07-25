# Challenge Report — Requirements R1 & R2 Stress Testing

## Challenge Summary

**Overall risk assessment**: MEDIUM

Empirical and adversarial stress testing was conducted against Requirement 1 (`encodeBinaryEvent`/`decodeBinaryEvent` in `packages/event-bus/src/binary-protocol.ts`) and Requirement 2 (`enqueueOfflineDelta`/`flushOfflineQueue` in `packages/shared/src/offline-sync.ts`). All test harnesses were written and executed directly against the implementation code.

---

## Challenges

### [Medium] Challenge 1: Unhandled `JSON.parse` Exception in `decodeBinaryEvent`
- **Assumption challenged**: `decodeBinaryEvent` always returns `null` safely when given malformed or invalid binary packet data.
- **Attack scenario**: A corrupted binary packet is received over a noisy kitchen/restaurant Wi-Fi network. The 6-byte header (`0x43 0x01` + payload length) is valid, but the payload bytes contain truncated or corrupted JSON (e.g. `{invalid_json`).
- **Blast radius**: `decodeBinaryEvent` calls `JSON.parse(jsonStr)` at line 44 without a `try...catch` block. When invalid JSON is parsed, JavaScript throws an uncaught `SyntaxError: Unexpected token...`. Any KDS or POS WebSocket message handler calling `decodeBinaryEvent(buffer)` will crash unless wrapped in an external try-catch.
- **Mitigation**: Wrap `JSON.parse(jsonStr)` inside a `try...catch` block within `decodeBinaryEvent` and return `null` if JSON parsing fails.

### [Low] Challenge 2: Lack of LocalStorage Quota Recovery / Eviction in `enqueueOfflineDelta`
- **Assumption challenged**: LocalStorage writes always succeed during offline checkout operations.
- **Attack scenario**: High-volume offline operations cause LocalStorage to reach browser storage limits (typically ~5MB). `localStorage.setItem` throws `QuotaExceededError`.
- **Blast radius**: `enqueueOfflineDelta` gracefully catches `QuotaExceededError` and returns the generated delta object without throwing. However, the delta is NOT saved to disk, meaning un-synced offline transactions will be lost if the app closes before re-establishing connectivity.
- **Mitigation**: Implement an IndexedDB fallback or a LRU eviction / warning system when LocalStorage quota is exceeded.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| **R1-1: Truncated Buffer (<6 bytes)** | Return `null` | Returns `null` | PASS |
| **R1-2: Invalid Magic Byte (0x99) / Version (0x02)** | Return `null` | Returns `null` | PASS |
| **R1-3: Header Lying Payload Length (> actual buffer)** | Return `null` | Returns `null` | PASS |
| **R1-4: Subarray Buffer with Offset (`byteOffset > 0`)** | Reconstructs event | Reconstructs event correctly | PASS |
| **R1-5: Huge Payload (10,000 items / >500KB)** | Encodes/Decodes with 100% fidelity | Encodes/Decodes with 100% fidelity | PASS |
| **R1-6: Unicode, Emojis, Control Chars & Escaped Backslashes** | Preserves exact UTF-8 strings | Preserves exact UTF-8 strings | PASS |
| **R1-7: Valid Header + Corrupted JSON Payload** | Return `null` | Throws `SyntaxError` (uncaught) | **FAIL (Flaw Identified)** |
| **R2-1: 500 Rapid Insertions & UUIDv4 Uniqueness** | 500 unique `delta-uuidv4` IDs | 500 unique IDs, 0 collisions | PASS |
| **R2-2: LocalStorage `QuotaExceededError`** | Catch & return delta without crash | Catches error, logs warning, returns delta | PASS |
| **R2-3: LocalStorage Corrupted JSON String** | Recover gracefully, return `[]` | Returns `[]`, allows new enqueues | PASS |
| **R2-4: Network Failure during `flushOfflineQueue`** | Return 0, keep queue intact | Returns 0, preserves queue | PASS |
| **R2-5: HTTP 500 Server Error during flush** | Return 0, keep queue intact | Returns 0, preserves queue | PASS |
| **R2-6: In-Flight Concurrent Enqueue during flush** | Preserve in-flight delta in queue | Retains in-flight delta, clears flushed ones | PASS |

---

## Unchallenged Areas

- **IndexedDB fallback layer**: `enqueueOfflineDelta` currently uses `localStorage` directly rather than IndexedDB.
- **WebSocket reconnection backoff**: Network reconnection backoff timing in UI view components was not tested (out of scope for unit protocol engine testing).
