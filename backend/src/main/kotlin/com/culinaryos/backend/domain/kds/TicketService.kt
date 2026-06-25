package com.culinaryos.backend.domain.kds

import com.culinaryos.backend.domain.pos.OrderLines
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Instant
import java.util.UUID

class TicketService {

    // ─── Stations ────────────────────────────────────────────────────────────

    fun createStation(restaurantId: UUID, req: CreateStationRequest): Station = transaction {
        val now = Instant.now()
        val id = Stations.insertAndGetId {
            it[Stations.restaurantId] = restaurantId
            it[Stations.name]         = req.name
            it[Stations.stationType]  = req.stationType.uppercase()
            it[Stations.sortOrder]    = req.sortOrder
            it[Stations.createdAt]    = now
        }.value
        Station(id, restaurantId, req.name, StationType.valueOf(req.stationType.uppercase()), true, req.sortOrder)
    }

    fun listStations(restaurantId: UUID): List<Station> = transaction {
        Stations.selectAll()
            .where { (Stations.restaurantId eq restaurantId) and (Stations.isActive eq true) }
            .orderBy(Stations.sortOrder)
            .map { it.toStation() }
    }

    // ─── Fire tickets when order is sent to kitchen ───────────────────────────
    // Called by OrderService.sendToKitchen() — fires one FIRED event per station
    // that has at least one order line routed to it.

    fun fireTicketsForOrder(orderId: UUID, restaurantId: UUID): List<TicketEvent> = transaction {
        val now = Instant.now()

        // Collect all distinct station tags from order lines
        val stationTags = OrderLines.selectAll()
            .where { (OrderLines.orderId eq orderId) and (OrderLines.restaurantId eq restaurantId) }
            .flatMap { row ->
                @Suppress("UNCHECKED_CAST")
                (row[OrderLines.stationTags] as List<String>)
            }
            .distinct()

        if (stationTags.isEmpty()) return@transaction emptyList()

        // Resolve station tags → station IDs
        val matchingStations = Stations.selectAll()
            .where {
                (Stations.restaurantId eq restaurantId) and
                (Stations.isActive eq true) and
                (Stations.stationType inList stationTags)
            }
            .map { it.toStation() }

        matchingStations.map { station ->
            val eventId = TicketEvents.insertAndGetId {
                it[TicketEvents.restaurantId] = restaurantId
                it[TicketEvents.orderId]      = orderId
                it[TicketEvents.stationId]    = station.id
                it[TicketEvents.eventType]    = TicketEventType.FIRED.name
                it[TicketEvents.firedAt]      = now
                it[TicketEvents.occurredAt]   = now
                it[TicketEvents.payloadJson]  = "{}"
            }.value

            // Write to outbox BEFORE attempting WebSocket push
            writeOutbox(
                restaurantId    = restaurantId,
                targetStationId = station.id,
                eventType       = TicketEventType.FIRED.name,
                payloadJson     = """{ "orderId": "$orderId", "stationId": "${station.id}", "firedAt": "$now" }"""
            )

            TicketEvent(
                id           = eventId,
                restaurantId = restaurantId,
                orderId      = orderId,
                stationId    = station.id,
                eventType    = TicketEventType.FIRED,
                firedAt      = now,
                occurredAt   = now,
                actorId      = null
            )
        }
    }

    // ─── Bump ─────────────────────────────────────────────────────────────────

    fun bumpTicket(orderId: UUID, stationId: UUID, restaurantId: UUID, actorId: UUID): TicketEvent = transaction {
        val now = Instant.now()

        val firedEvent = TicketEvents.selectAll()
            .where {
                (TicketEvents.orderId   eq orderId) and
                (TicketEvents.stationId eq stationId) and
                (TicketEvents.eventType eq TicketEventType.FIRED.name)
            }
            .singleOrNull() ?: throw NoSuchElementException("No FIRED ticket found for this order/station")

        val eventId = TicketEvents.insertAndGetId {
            it[TicketEvents.restaurantId] = restaurantId
            it[TicketEvents.orderId]      = orderId
            it[TicketEvents.stationId]    = stationId
            it[TicketEvents.eventType]    = TicketEventType.BUMPED.name
            it[TicketEvents.firedAt]      = firedEvent[TicketEvents.firedAt]
            it[TicketEvents.occurredAt]   = now
            it[TicketEvents.actorId]      = actorId
            it[TicketEvents.payloadJson]  = "{}"
        }.value

        // Broadcast bump to all stations (expo needs to know)
        writeOutbox(
            restaurantId    = restaurantId,
            targetStationId = null, // null = broadcast
            eventType       = TicketEventType.BUMPED.name,
            payloadJson     = """{ "orderId": "$orderId", "stationId": "$stationId", "occurredAt": "$now" }"""
        )

        TicketEvent(
            id           = eventId,
            restaurantId = restaurantId,
            orderId      = orderId,
            stationId    = stationId,
            eventType    = TicketEventType.BUMPED,
            firedAt      = firedEvent[TicketEvents.firedAt],
            occurredAt   = now,
            actorId      = actorId
        )
    }

    // ─── Recall ───────────────────────────────────────────────────────────────

    fun recallTicket(orderId: UUID, stationId: UUID, restaurantId: UUID, actorId: UUID): TicketEvent = transaction {
        val now = Instant.now()

        val firedEvent = TicketEvents.selectAll()
            .where {
                (TicketEvents.orderId   eq orderId) and
                (TicketEvents.stationId eq stationId) and
                (TicketEvents.eventType eq TicketEventType.FIRED.name)
            }
            .singleOrNull() ?: throw NoSuchElementException("No FIRED ticket to recall")

        val eventId = TicketEvents.insertAndGetId {
            it[TicketEvents.restaurantId] = restaurantId
            it[TicketEvents.orderId]      = orderId
            it[TicketEvents.stationId]    = stationId
            it[TicketEvents.eventType]    = TicketEventType.RECALLED.name
            it[TicketEvents.firedAt]      = firedEvent[TicketEvents.firedAt]
            it[TicketEvents.occurredAt]   = now
            it[TicketEvents.actorId]      = actorId
            it[TicketEvents.payloadJson]  = "{}"
        }.value

        writeOutbox(
            restaurantId    = restaurantId,
            targetStationId = stationId,
            eventType       = TicketEventType.RECALLED.name,
            payloadJson     = """{ "orderId": "$orderId", "stationId": "$stationId", "occurredAt": "$now" }"""
        )

        TicketEvent(
            id           = eventId,
            restaurantId = restaurantId,
            orderId      = orderId,
            stationId    = stationId,
            eventType    = TicketEventType.RECALLED,
            firedAt      = firedEvent[TicketEvents.firedAt],
            occurredAt   = now,
            actorId      = actorId
        )
    }

    // ─── Live Ticket Queue (for KDS display) ──────────────────────────────────
    // Returns all FIRED tickets that have NOT been BUMPED or COMPLETED,
    // ordered by firedAt ascending (oldest ticket first = top of queue).

    fun getActiveTickets(stationId: UUID, restaurantId: UUID): List<Ticket> = transaction {
        val now = Instant.now()

        // Find all order IDs that have a FIRED but not BUMPED/COMPLETED event at this station
        val firedOrderIds = TicketEvents.selectAll()
            .where {
                (TicketEvents.stationId    eq stationId) and
                (TicketEvents.restaurantId eq restaurantId) and
                (TicketEvents.eventType    eq TicketEventType.FIRED.name)
            }
            .map { it[TicketEvents.orderId].value }

        val closedOrderIds = TicketEvents.selectAll()
            .where {
                (TicketEvents.stationId    eq stationId) and
                (TicketEvents.restaurantId eq restaurantId) and
                (TicketEvents.eventType    inList listOf(
                    TicketEventType.BUMPED.name,
                    TicketEventType.COMPLETED.name
                ))
            }
            .map { it[TicketEvents.orderId].value }
            .toSet()

        val activeOrderIds = firedOrderIds.filter { it !in closedOrderIds }

        activeOrderIds.mapNotNull { orderId ->
            val firedRow = TicketEvents.selectAll()
                .where {
                    (TicketEvents.orderId   eq orderId) and
                    (TicketEvents.stationId eq stationId) and
                    (TicketEvents.eventType eq TicketEventType.FIRED.name)
                }
                .singleOrNull() ?: return@mapNotNull null

            val firedAt = firedRow[TicketEvents.firedAt]
            val elapsed = java.time.Duration.between(firedAt, now).seconds

            // Fetch order lines routed to this station
            val station = Stations.selectAll()
                .where { Stations.id eq stationId }
                .singleOrNull() ?: return@mapNotNull null

            val stationType = station[Stations.stationType]

            val lines = OrderLines.selectAll()
                .where { OrderLines.orderId eq orderId }
                .filter { row ->
                    @Suppress("UNCHECKED_CAST")
                    (row[OrderLines.stationTags] as List<String>).contains(stationType)
                }
                .map { row ->
                    TicketLine(
                        menuItemName  = row[OrderLines.menuItemName],
                        quantity      = row[OrderLines.quantity],
                        modifiersJson = row[OrderLines.modifiersJson],
                        stationTags   = row[OrderLines.stationTags]
                    )
                }

            Ticket(
                orderId       = orderId,
                stationId     = stationId,
                restaurantId  = restaurantId,
                currentStatus = TicketEventType.FIRED,
                firedAt       = firedAt,
                lastUpdatedAt = firedAt,
                elapsedSeconds= elapsed,
                orderLines    = lines
            )
        }.sortedBy { it.firedAt }
    }

    // ─── Catch-up on reconnect ────────────────────────────────────────────────
    // Called when a KDS client reconnects with its last acknowledged outbox ID.
    // Returns all undelivered pushes since that sequence.

    fun getMissedPushes(restaurantId: UUID, stationId: UUID, sinceId: Long): List<PendingPush> = transaction {
        PendingPushTable.selectAll()
            .where {
                (PendingPushTable.restaurantId eq restaurantId) and
                (PendingPushTable.id greater sinceId) and
                (
                    PendingPushTable.targetStationId.isNull() or
                    (PendingPushTable.targetStationId eq stationId)
                )
            }
            .orderBy(PendingPushTable.id)
            .map {
                PendingPush(
                    id              = it[PendingPushTable.id],
                    restaurantId    = it[PendingPushTable.restaurantId].value,
                    targetStationId = it[PendingPushTable.targetStationId]?.value,
                    eventType       = it[PendingPushTable.eventType],
                    payloadJson     = it[PendingPushTable.payloadJson],
                    createdAt       = it[PendingPushTable.createdAt]
                )
            }
    }

    // ─── Mark delivered ───────────────────────────────────────────────────────

    fun markDelivered(outboxId: Long) = transaction {
        PendingPushTable.update({ PendingPushTable.id eq outboxId }) {
            it[deliveredAt] = Instant.now()
        }
    }

    // ─── Outbox writer ────────────────────────────────────────────────────────

    private fun writeOutbox(
        restaurantId: UUID,
        targetStationId: UUID?,
        eventType: String,
        payloadJson: String
    ) {
        val now = Instant.now()
        PendingPushTable.insert {
            it[PendingPushTable.restaurantId]    = restaurantId
            it[PendingPushTable.targetStationId] = targetStationId
            it[PendingPushTable.eventType]       = eventType
            it[PendingPushTable.payloadJson]     = payloadJson
            it[PendingPushTable.createdAt]       = now
        }
    }

    // ─── Row mappers ──────────────────────────────────────────────────────────

    private fun ResultRow.toStation() = Station(
        id           = this[Stations.id].value,
        restaurantId = this[Stations.restaurantId].value,
        name         = this[Stations.name],
        stationType  = StationType.valueOf(this[Stations.stationType]),
        isActive     = this[Stations.isActive],
        sortOrder    = this[Stations.sortOrder]
    )
}
