package com.culinaryos.backend.domain.kds

import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

// ─── Domain Models ────────────────────────────────────────────────────────────

data class Station(
    val id: UUID,
    val restaurantId: UUID,
    val name: String,
    val stationType: StationType,
    val isActive: Boolean,
    val sortOrder: Int
)

enum class StationType { GRILL, FRY, SAUTE, EXPO, CUSTOM }

data class TicketEvent(
    val id: UUID,
    val restaurantId: UUID,
    val orderId: UUID,
    val stationId: UUID,
    val eventType: TicketEventType,
    val firedAt: Instant,
    val occurredAt: Instant,
    val actorId: UUID?
)

enum class TicketEventType { FIRED, BUMPED, RECALLED, COMPLETED }

/**
 * A Ticket is a live view of the current state of an order at a station.
 * Derived from the ticket_events log — the most recent event type per order/station
 * determines the display state.
 */
data class Ticket(
    val orderId: UUID,
    val stationId: UUID,
    val restaurantId: UUID,
    val currentStatus: TicketEventType,
    val firedAt: Instant,
    val lastUpdatedAt: Instant,
    val elapsedSeconds: Long,          // firedAt → now, for color-coded age indicator
    val orderLines: List<TicketLine>   // lines routed to this station
)

data class TicketLine(
    val menuItemName: String,
    val quantity: Int,
    val modifiersJson: String,
    val stationTags: List<String>
)

data class PendingPush(
    val id: Long,
    val restaurantId: UUID,
    val targetStationId: UUID?,
    val eventType: String,
    val payloadJson: String,
    val createdAt: Instant
)

// ─── Request / Response DTOs ──────────────────────────────────────────────────

@Serializable
data class CreateStationRequest(
    val name: String,
    val stationType: String = "CUSTOM",
    val sortOrder: Int = 0
)

@Serializable
data class BumpTicketRequest(
    val actorId: String
)

@Serializable
data class KdsConnectParams(
    val stationId: String,
    val lastAckSequence: Long = 0   // client sends its last received outbox id on reconnect
)
