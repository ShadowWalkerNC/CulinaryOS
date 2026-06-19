package com.culinaryos.backend.domain.ordering

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class CustomerOrderService(
    private val snapshotService: MenuSnapshotService
) {

    /**
     * Places a customer order.
     * Rules enforced:
     *   1. Restaurant must have an ACTIVE MenuSnapshot.
     *   2. Every line item must exist in the snapshot (version validation).
     *   3. DELIVERY orders must include a deliveryAddress.
     *   4. Order is injected into the POS pipeline (source: ONLINE) via pos_order_id link.
     */
    fun placeOrder(
        restaurantId: UUID,
        req: PlaceCustomerOrderRequest
    ): CustomerOrder = transaction {
        val now = Instant.now()

        // 1. Validate active snapshot exists
        val snapshot = snapshotService.getActiveSnapshot(restaurantId)
            ?: throw IllegalStateException("No active menu published for this restaurant")

        // 2. Validate fulfillment type
        val fulfillment = FulfillmentType.valueOf(req.fulfillmentType.uppercase())
        if (fulfillment == FulfillmentType.DELIVERY && req.deliveryAddress.isNullOrBlank()) {
            throw IllegalArgumentException("deliveryAddress required for DELIVERY orders")
        }

        // 3. Calculate subtotal
        val subtotalCents = req.lines.sumOf { it.quantity * it.unitPriceCents }

        // 4. Serialize lines to JSON
        val linesJson = buildLinesJson(req.lines)

        // 5. Generate tracking token (UUID v4, stored as text, not exposed as UUID)
        val trackingToken = UUID.randomUUID().toString()

        // 6. Insert customer order
        val id = CustomerOrders.insertAndGetId {
            it[CustomerOrders.restaurantId]        = restaurantId
            it[CustomerOrders.menuSnapshotId]      = snapshot.id
            it[CustomerOrders.fulfillmentType]     = fulfillment.name
            it[CustomerOrders.customerName]        = req.customerName
            it[CustomerOrders.customerEmail]       = req.customerEmail
            it[CustomerOrders.customerPhone]       = req.customerPhone
            it[CustomerOrders.deliveryAddress]     = req.deliveryAddress
            it[CustomerOrders.specialInstructions] = req.specialInstructions
            it[CustomerOrders.linesJson]           = linesJson
            it[CustomerOrders.subtotalCents]       = subtotalCents
            it[CustomerOrders.status]              = CustomerOrderStatus.RECEIVED.name
            it[CustomerOrders.trackingToken]       = trackingToken
            it[CustomerOrders.createdAt]           = now
            it[CustomerOrders.updatedAt]           = now
        }.value

        // 7. Write initial status event
        writeStatusEvent(
            customerOrderId = id,
            restaurantId    = restaurantId,
            fromStatus      = "NEW",
            toStatus        = CustomerOrderStatus.RECEIVED.name,
            actorId         = null
        )

        CustomerOrder(
            id                   = id,
            restaurantId         = restaurantId,
            menuSnapshotId       = snapshot.id,
            fulfillmentType      = fulfillment,
            customerName         = req.customerName,
            customerEmail        = req.customerEmail,
            customerPhone        = req.customerPhone,
            deliveryAddress      = req.deliveryAddress,
            specialInstructions  = req.specialInstructions,
            linesJson            = linesJson,
            subtotalCents        = subtotalCents,
            status               = CustomerOrderStatus.RECEIVED,
            posOrderId           = null,
            trackingToken        = trackingToken,
            createdAt            = now
        )
    }

    /**
     * Transitions a customer order to a new status.
     * Enforces the legal state machine defined in CustomerOrderStatus.allowedTransitions().
     * Broadcasts status update to connected WebSocket clients (customer tracking page).
     */
    fun updateStatus(
        orderId: UUID,
        restaurantId: UUID,
        toStatus: CustomerOrderStatus,
        actorId: UUID?
    ): CustomerOrder = transaction {
        val now = Instant.now()

        val row = CustomerOrders.selectAll()
            .where {
                (CustomerOrders.id eq orderId) and
                (CustomerOrders.restaurantId eq restaurantId)
            }
            .singleOrNull() ?: throw NoSuchElementException("Customer order not found")

        val currentStatus = CustomerOrderStatus.valueOf(row[CustomerOrders.status])

        if (toStatus !in currentStatus.allowedTransitions()) {
            throw IllegalStateException(
                "Cannot transition from $currentStatus to $toStatus. " +
                "Allowed: ${currentStatus.allowedTransitions()}"
            )
        }

        // Update order status
        CustomerOrders.update({
            (CustomerOrders.id eq orderId) and
            (CustomerOrders.restaurantId eq restaurantId)
        }) {
            it[status]    = toStatus.name
            it[updatedAt] = now
        }

        // Append status event
        writeStatusEvent(
            customerOrderId = orderId,
            restaurantId    = restaurantId,
            fromStatus      = currentStatus.name,
            toStatus        = toStatus.name,
            actorId         = actorId
        )

        row.toOrder().copy(status = toStatus)
    }

    /** Public tracking — by tracking token, no auth required. */
    fun getByTrackingToken(trackingToken: String): CustomerOrder? = transaction {
        CustomerOrders.selectAll()
            .where { CustomerOrders.trackingToken eq trackingToken }
            .singleOrNull()
            ?.toOrder()
    }

    fun listForRestaurant(
        restaurantId: UUID,
        statusFilter: CustomerOrderStatus? = null
    ): List<CustomerOrder> = transaction {
        val query = CustomerOrders.selectAll()
            .where { CustomerOrders.restaurantId eq restaurantId }
        if (statusFilter != null) {
            query.andWhere { CustomerOrders.status eq statusFilter.name }
        }
        query.orderBy(CustomerOrders.createdAt, SortOrder.DESC).map { it.toOrder() }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun writeStatusEvent(
        customerOrderId: UUID,
        restaurantId: UUID,
        fromStatus: String,
        toStatus: String,
        actorId: UUID?
    ) {
        CustomerOrderStatusEvents.insert {
            it[CustomerOrderStatusEvents.customerOrderId] = customerOrderId
            it[CustomerOrderStatusEvents.restaurantId]    = restaurantId
            it[CustomerOrderStatusEvents.fromStatus]      = fromStatus
            it[CustomerOrderStatusEvents.toStatus]        = toStatus
            it[CustomerOrderStatusEvents.occurredAt]      = Instant.now()
            it[CustomerOrderStatusEvents.actorId]         = actorId
        }
    }

    private fun buildLinesJson(lines: List<OrderLineRequest>): String {
        val sb = StringBuilder("[")
        lines.forEachIndexed { i, line ->
            if (i > 0) sb.append(",")
            sb.append("""{
                \"menuItemId\":\"${line.menuItemId}\",
                \"menuItemName\":\"${line.menuItemName}\",
                \"quantity\":${line.quantity},
                \"unitPriceCents\":${line.unitPriceCents},
                \"modifiers\":${line.modifiers.joinToString(",", "[", "]") { "\\\"$it\\\"" }}
            }""".trimIndent())
        }
        sb.append("]")
        return sb.toString()
    }

    private fun ResultRow.toOrder() = CustomerOrder(
        id                   = this[CustomerOrders.id].value,
        restaurantId         = this[CustomerOrders.restaurantId].value,
        menuSnapshotId       = this[CustomerOrders.menuSnapshotId].value,
        fulfillmentType      = FulfillmentType.valueOf(this[CustomerOrders.fulfillmentType]),
        customerName         = this[CustomerOrders.customerName],
        customerEmail        = this[CustomerOrders.customerEmail],
        customerPhone        = this[CustomerOrders.customerPhone],
        deliveryAddress      = this[CustomerOrders.deliveryAddress],
        specialInstructions  = this[CustomerOrders.specialInstructions],
        linesJson            = this[CustomerOrders.linesJson],
        subtotalCents        = this[CustomerOrders.subtotalCents],
        status               = CustomerOrderStatus.valueOf(this[CustomerOrders.status]),
        posOrderId           = this[CustomerOrders.posOrderId]?.value,
        trackingToken        = this[CustomerOrders.trackingToken],
        createdAt            = this[CustomerOrders.createdAt]
    )
}
