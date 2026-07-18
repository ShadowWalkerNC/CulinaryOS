package com.culinaryos.shared.sync

import kotlinx.serialization.Serializable

/**
 * The universal event envelope for all CulinaryOS operations.
 * See docs/sync-protocol.md for full specification.
 *
 * Every action in the system — order created, ticket fired, inventory depleted —
 * is represented as a CulinaryEvent written to the local queue first,
 * then synced to the server.
 */
@Serializable
data class CulinaryEvent(
    /** Client-generated UUID v4. Globally unique. Used for server deduplication. */
    val eventId: String,

    /** Tenant scope key. ALWAYS present. Server rejects events missing this field. */
    val restaurantId: String,

    /** Identifies which terminal generated this event (e.g. "pos-terminal-01") */
    val deviceId: String,

    /**
     * Monotonic integer per device. Increments by 1 per event. Never resets.
     * Persisted in SQLDelight so it survives app restarts and device reboots.
     * Server uses this to detect gaps and order events from the same device.
     */
    val clientSequence: Long,

    /** Unix epoch milliseconds — when this event was created on the device. */
    val clientTimestamp: Long,

    /**
     * Event type identifier. See docs/sync-protocol.md Event Type Registry.
     * Examples: ORDER_CREATED, TICKET_FIRED, INVENTORY_DEPLETED
     */
    val type: String,

    /** The ID of the entity this event applies to (orderId, ticketId, etc.) */
    val aggregateId: String,

    /** JSON string — event-type-specific data payload. */
    val payload: String
)

/** All valid event type constants. Expand as new phases add new domains. */
object EventType {
    // Phase 2 — POS
    const val ORDER_CREATED = "ORDER_CREATED"
    const val ORDER_LINE_ADDED = "ORDER_LINE_ADDED"
    const val ORDER_LINE_REMOVED = "ORDER_LINE_REMOVED"
    const val ORDER_DISCOUNT_APPLIED = "ORDER_DISCOUNT_APPLIED"
    const val ORDER_VOIDED = "ORDER_VOIDED"
    const val ORDER_COMPED = "ORDER_COMPED"

    // Phase 3 — KDS
    const val TICKET_FIRED = "TICKET_FIRED"
    const val TICKET_BUMPED = "TICKET_BUMPED"
    const val TICKET_RECALLED = "TICKET_RECALLED"
    const val TICKET_COMPLETED = "TICKET_COMPLETED"
    const val COURSE_FIRED = "COURSE_FIRED"

    // Phase 4 — Online Ordering
    const val CUSTOMER_ORDER_PLACED = "CUSTOMER_ORDER_PLACED"
    const val ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED"

    // Phase 5 — Inventory
    const val INVENTORY_DEPLETED = "INVENTORY_DEPLETED"
    const val INVENTORY_ADJUSTED = "INVENTORY_ADJUSTED"
    const val PURCHASE_ORDER_RECEIVED = "PURCHASE_ORDER_RECEIVED"

    // Phase 7 — Payments
    const val PAYMENT_RECORDED = "PAYMENT_RECORDED"
}
