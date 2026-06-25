package com.culinaryos.backend.domain.ordering

import kotlinx.serialization.Serializable
import java.time.Instant
import java.util.UUID

// ─── Domain Models ────────────────────────────────────────────────────────────

data class MenuSnapshot(
    val id: UUID,
    val restaurantId: UUID,
    val version: Int,
    val status: SnapshotStatus,
    val publishedBy: UUID?,
    val publishedAt: Instant?,
    val snapshotJson: String
)

enum class SnapshotStatus { DRAFT, ACTIVE, ARCHIVED }

data class CustomerOrder(
    val id: UUID,
    val restaurantId: UUID,
    val menuSnapshotId: UUID,
    val fulfillmentType: FulfillmentType,
    val customerName: String,
    val customerEmail: String?,
    val customerPhone: String?,
    val deliveryAddress: String?,
    val specialInstructions: String?,
    val linesJson: String,
    val subtotalCents: Int,
    val status: CustomerOrderStatus,
    val posOrderId: UUID?,
    val trackingToken: String,
    val createdAt: Instant
)

enum class FulfillmentType { PICKUP, DELIVERY }

enum class CustomerOrderStatus {
    RECEIVED, PREPARING, READY, COMPLETED, CANCELLED;

    /** Allowed next states from this status — enforces legal transitions. */
    fun allowedTransitions(): List<CustomerOrderStatus> = when (this) {
        RECEIVED   -> listOf(PREPARING, CANCELLED)
        PREPARING  -> listOf(READY, CANCELLED)
        READY      -> listOf(COMPLETED)
        COMPLETED  -> emptyList()
        CANCELLED  -> emptyList()
    }
}

data class CustomerOrderStatusEvent(
    val id: UUID,
    val customerOrderId: UUID,
    val restaurantId: UUID,
    val fromStatus: String,
    val toStatus: String,
    val occurredAt: Instant
)

// ─── Request / Response DTOs ──────────────────────────────────────────────────

@Serializable
data class PublishSnapshotRequest(
    val publishedBy: String   // userId
)

@Serializable
data class PlaceCustomerOrderRequest(
    val fulfillmentType: String,       // PICKUP | DELIVERY
    val customerName: String,
    val customerEmail: String? = null,
    val customerPhone: String? = null,
    val deliveryAddress: String? = null,
    val specialInstructions: String? = null,
    val lines: List<OrderLineRequest>
)

@Serializable
data class OrderLineRequest(
    val menuItemId: String,
    val menuItemName: String,
    val quantity: Int,
    val unitPriceCents: Int,
    val modifiers: List<String> = emptyList()
)

@Serializable
data class UpdateOrderStatusRequest(
    val toStatus: String,
    val actorId: String? = null
)

@Serializable
data class OrderStatusResponse(
    val orderId: String,
    val status: String,
    val trackingToken: String,
    val fulfillmentType: String,
    val customerName: String,
    val subtotalCents: Int,
    val createdAt: String
)
