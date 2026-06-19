package com.culinaryos.shared.sync

/**
 * SyncEngine — Phase 2 offline sync implementation.
 *
 * Responsibilities:
 *   1. Accept locally-created CulinaryEvents and persist them to LocalEventQueue (SQLDelight)
 *   2. Drain the queue to the server on connectivity, with exponential backoff
 *   3. Mark events as synced once the server confirms them
 *
 * Platform-specific implementations (Android/Desktop) will inject:
 *   - A SQLDelight LocalEventQueueQueries instance
 *   - A connectivity observer (Flow<Boolean>)
 *   - An HttpClient configured with the server base URL and auth token
 *
 * This file defines the shared contract. Platform wiring lives in each client module.
 */

import com.culinaryos.shared.event.CulinaryEvent
import com.culinaryos.shared.event.EventType

/**
 * Result of a sync attempt.
 */
sealed class SyncResult {
    object Success : SyncResult()
    data class Failure(val cause: Throwable, val retryable: Boolean) : SyncResult()
    object NothingToSync : SyncResult()
}

/**
 * Interface that platform-specific SyncEngine implementations must satisfy.
 * The Compose Multiplatform clients (POS, KDS) will provide a concrete implementation
 * that runs as a background coroutine on the IO dispatcher.
 *
 * Lifecycle:
 *   - Call start() once on app launch (coroutine scope tied to app lifecycle)
 *   - Call enqueue() on every user action that generates an event
 *   - Call stop() on app termination
 *
 * Guarantees:
 *   - Events are never lost: they are persisted to SQLite before enqueue() returns
 *   - Events are delivered in client-sequence order per device
 *   - A server 409 (conflict on financial event) surfaces as SyncResult.Failure(retryable=false)
 *   - Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (cap), then every 60s
 */
interface SyncEngine {
    /**
     * Persist event to local queue and trigger a sync attempt.
     * Returns immediately — the sync happens in the background.
     * The UI should update optimistically before this returns.
     */
    suspend fun enqueue(event: CulinaryEvent)

    /**
     * Start the background sync loop.
     * Observes connectivity; drains queue when online.
     */
    fun start(scope: kotlinx.coroutines.CoroutineScope)

    /** Stop the sync loop and clean up resources. */
    fun stop()

    /** Returns true if there are unsynced events in the local queue. */
    suspend fun hasPendingEvents(): Boolean

    /** Returns the count of unsynced events. Used for the offline indicator in POS UI. */
    suspend fun pendingEventCount(): Long
}

/**
 * Backoff calculator — pure function, easily testable.
 * Returns delay in milliseconds for a given retry attempt (0-indexed).
 */
fun syncBackoffMs(attempt: Int): Long {
    val baseSec = 1L
    val maxSec  = 60L
    val delaySec = minOf(baseSec * (1L shl minOf(attempt, 6)), maxSec)
    return delaySec * 1000L
}
