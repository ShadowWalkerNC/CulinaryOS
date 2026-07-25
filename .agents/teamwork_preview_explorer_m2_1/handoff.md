# Handoff Report: M2 Binary Event & Offline Delta Sync Investigation

## 1. Observation

### 1.1 Codebase Files Inspected
1. **Binary Protocol (`packages/event-bus/src/binary-protocol.ts`)**:
   - `encodeBinaryEvent(event: DomainEvent): Uint8Array` (lines 12–28): Serializes `DomainEvent` JSON, prefixes 6-byte header (`0x43`, `0x01`, `Uint32BE` length), returns combined `Uint8Array`.
   - `decodeBinaryEvent(buffer: Uint8Array): DomainEvent | null` (lines 33–45): Verifies buffer length `>= 6`, checks header magic `0x43` and version `0x01`, extracts Big-Endian payload length, decodes UTF-8 JSON back into `DomainEvent`.
   - Barrel export: `packages/event-bus/src/index.ts` (line 7).

2. **Offline-First Transaction Delta Sync (`packages/shared/src/offline-sync.ts`)**:
   - `OfflineTransactionDelta` interface (lines 6–14): `{ id, tenant_id, order_id, action, payload, timestamp, synced }`.
   - `enqueueOfflineDelta(delta)` (lines 18–35): Appends cryptographic `delta-${crypto.randomUUID()}` transaction delta to `localStorage` under key `culinaryos_offline_transaction_queue`.
   - `getOfflineQueue()` (lines 37–44): Retrieves and parses LocalStorage array.
   - `markDeltasSynced(syncedIds)` (lines 46–53): Filters out synced IDs from LocalStorage queue.
   - `flushOfflineQueue(syncApiUrl)` (lines 55–76): Asynchronously posts pending deltas to `${syncApiUrl}/v1/pos/sync-deltas` and calls `markDeltasSynced` on HTTP 200 response.
   - Barrel export: `packages/shared/src/index.ts` (line 1).

3. **Existing Test Structure**:
   - Test Runner Script: `scripts/run-all-tests.cjs` (executes `npx tsx@4.7.1 -r ./scripts/test-hook.cjs`).
   - Existing Tests: `tests/event-bus/broker.test.ts` and `tests/event-bus/handlers.test.ts`.
   - **Missing Tests**: No test files currently exist for `binary-protocol.ts` or `offline-sync.ts` in `tests/`.

---

## 2. Logic Chain

1. **Binary Encoding Readiness**:
   - `packages/event-bus/src/binary-protocol.ts` contains a complete implementation of binary encoding and decoding with a 6-byte header (`0x43` magic byte + `0x01` version + 4-byte BE length).
   - *Logic*: The binary encoder format is structurally sound and ready for use, but `packages/event-bus/src/realtime-bridge.ts` and WebSocket clients in POS/KDS currently transmit uncompressed JSON broadcast events over standard WebSocket frames rather than binary `Uint8Array` packets.

2. **Offline Transaction Delta Sync Readiness**:
   - `packages/shared/src/offline-sync.ts` implements `enqueueOfflineDelta`, `getOfflineQueue`, `markDeltasSynced`, and `flushOfflineQueue`.
   - *Logic*: The cryptographic UUIDv4 ID generation (`delta-${crypto.randomUUID()}`) prevents collision upon reconnection replay. However, `apps/pos/src/views/CheckoutView.tsx` currently falls back to `mockDb` rather than calling `enqueueOfflineDelta`, and `apps/server` has not exposed the `/v1/pos/sync-deltas` endpoint to receive batch replays.

3. **Test Infrastructure Readiness**:
   - `scripts/run-all-tests.cjs` automatically discovers and runs `.test.ts` files under `tests/`.
   - *Logic*: Implementers can add `tests/event-bus/binary-protocol.test.ts` and `tests/shared/offline-sync.test.ts` directly into `tests/` without modifying test runner configuration.

---

## 3. Caveats

1. **Browser LocalStorage Mocking in Node/Bun Test Environments**:
   - In Node.js or server environments, `localStorage` and `crypto.randomUUID()` may require global polyfills or DOM test mocks (e.g. `globalThis.localStorage`) during test execution.
2. **WebSocket Transport Integration**:
   - WebSockets in Supabase Realtime use string JSON broadcasts by default; using binary `Uint8Array` requires raw WebSocket server/client arraybuffer mode or binary channel encoding.
3. **Backend API Endpoint**:
   - `apps/server/src/routes/orders.ts` needs a handler for `POST /v1/pos/sync-deltas` to apply array of `OfflineTransactionDelta` sequentially in timestamp order.

---

## 4. Conclusion

Requirement R2 is partially fulfilled in code assets:
- **Binary Event Protocol**: Core functions `encodeBinaryEvent` and `decodeBinaryEvent` are implemented in `packages/event-bus/src/binary-protocol.ts`.
- **Offline Delta Sync**: Core functions `enqueueOfflineDelta` and `flushOfflineQueue` are implemented in `packages/shared/src/offline-sync.ts`.

To fully complete Requirement R2 implementation (for Implementer agent):
1. Create `tests/event-bus/binary-protocol.test.ts` and `tests/shared/offline-sync.test.ts`.
2. Connect `encodeBinaryEvent` / `decodeBinaryEvent` to WebSocket event streams in POS/KDS.
3. Wire `enqueueOfflineDelta` into `apps/pos/src/views/CheckoutView.tsx` when offline.
4. Implement `POST /v1/pos/sync-deltas` in `apps/server`.

---

## 5. Verification Method

### 5.1 Project Test Command
Run all unit tests using the repository test runner:
```bash
node ./scripts/run-all-tests.cjs
```

### 5.2 Specific Files to Inspect
- `packages/event-bus/src/binary-protocol.ts`
- `packages/shared/src/offline-sync.ts`
- `tests/event-bus/broker.test.ts`
- `tests/event-bus/handlers.test.ts`

### 5.3 Invalidation Conditions
- Any changes to `encodeBinaryEvent` that break the 6-byte header structure (`0x43`, `0x01`, 32-bit BE payload length).
- Any modifications to `enqueueOfflineDelta` that omit cryptographic UUIDv4 ID generation or change LocalStorage key `culinaryos_offline_transaction_queue`.
