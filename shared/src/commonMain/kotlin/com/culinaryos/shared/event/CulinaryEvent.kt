package com.culinaryos.shared.event

import kotlinx.serialization.Serializable

/**
 * Universal event envelope for the CulinaryOS local-first sync system.
 *
 * Every user action in an operational client (POS, KDS) generates a CulinaryEvent.
 * Events are:
 *   1. Persisted to LocalEventQueue (SQLDelight / SQLite) immediately
 *   2. Applied to local UI state optimistically
 *   3. Synced to the server in background order by clientSequence
 *   4. Assigned a serverSequence by the server after processing
 *
 * See docs/sync-protocol.md for the full conflict resolution specification.
 */
@Serializable
data class CulinaryEvent(
    val eventId: String,            // UUID v4 — client-generated, globally unique
    val restaurantId: String,       // from JWT claim — tenant scope key
    val deviceId: String,           // stable terminal identifier (persisted on install)
    val clientSequence: Long,       // monotonic per-device integer — never resets
    val clientTimestamp: Long,      // Unix epoch milliseconds
    val type: EventType,            // what happened
    val payload: String,            // JSON string — type-specific fields
    val serverSequence: Long? = null, // assigned by server after processing
    val syncedAt: Long? = null       // Unix epoch ms — set locally when server confirms
)

enum class EventType {
    // ── Phase 2: POS Core ────────────────────────────────────────────────
    ORDER_CREATED,
    ORDER_LINE_ADDED,
    ORDER_SENT_TO_KITCHEN,
    ORDER_LINE_VOIDED,
    ORDER_ADJUSTMENT_ADDED,
    ORDER_CLOSED,

    // ── Phase 3: KDS ────────────────────────────────────────────────────
    TICKET_FIRED,
    TICKET_BUMPED,
    TICKET_RECALLED,
    TICKET_COMPLETED,

    // ── Phase 4: Online Ordering ──────────────────────────────────────────
    CUSTOMER_ORDER_RECEIVED,
    CUSTOMER_ORDER_STATUS_CHANGED,

    // ── Phase 5: Inventory ────────────────────────────────────────────────
    INVENTORY_DEPLETED,
    INVENTORY_ADJUSTED,
    PURCHASE_ORDER_RECEIVED,

    // ── Phase 7: Payments ────────────────────────────────────────────────
    PAYMENT_RECORDED,
    RECEIPT_GENERATED
}
