package com.culinaryos.backend.domain.pos

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID

class OrderService(
    private val menuRepo: MenuRepository,
    private val tableRepo: TableRepository
) {

    // ─── Create Order ─────────────────────────────────────────────────────────

    fun createOrder(restaurantId: UUID, openedBy: UUID, req: CreateOrderRequest): Order = transaction {
        val tableId = req.tableId?.let { UUID.fromString(it) }

        // Validate table belongs to this restaurant
        if (tableId != null) {
            val table = tableRepo.findTableById(tableId, restaurantId)
                ?: throw NoSuchElementException("Table not found")
            require(table.status == TableStatus.AVAILABLE || table.status == TableStatus.OCCUPIED) {
                "Table is not available"
            }
        }

        // Validate all menu items exist in this restaurant
        val menuItems = req.lines.map { lineReq ->
            val itemId = UUID.fromString(lineReq.menuItemId)
            menuRepo.findMenuItemById(itemId, restaurantId)
                ?: throw NoSuchElementException("Menu item ${lineReq.menuItemId} not found")
        }

        val now = Instant.now()

        // Insert order
        val orderId = Orders.insertAndGetId {
            it[Orders.restaurantId] = restaurantId
            it[Orders.tableId]      = tableId
            it[Orders.openedBy]     = openedBy
            it[Orders.status]       = OrderStatus.OPEN.name
            it[Orders.source]       = OrderSource.POS.name
            it[Orders.coverCount]   = req.coverCount
            it[Orders.notes]        = req.notes
            it[Orders.createdAt]    = now
            it[Orders.updatedAt]    = now
        }.value

        // Insert order lines
        val lines = req.lines.mapIndexed { index, lineReq ->
            val item       = menuItems[index]
            val modJson    = buildModifiersJson(lineReq.modifiers)
            val modsDelta  = lineReq.modifiers.sumOf { it.priceDelta }
            val unitPrice  = item.price.add(BigDecimal.valueOf(modsDelta))
            val lineTotal  = unitPrice.multiply(BigDecimal.valueOf(lineReq.quantity.toLong()))

            val lineId = OrderLines.insertAndGetId {
                it[OrderLines.orderId]      = orderId
                it[OrderLines.restaurantId] = restaurantId
                it[OrderLines.menuItemId]   = item.id
                it[OrderLines.menuItemName] = item.name
                it[OrderLines.unitPrice]    = unitPrice
                it[OrderLines.quantity]     = lineReq.quantity
                it[OrderLines.stationTags]  = item.stationTags
                it[OrderLines.modifiersJson]= modJson
                it[OrderLines.lineTotal]    = lineTotal
                it[OrderLines.status]       = LineStatus.PENDING.name
                it[OrderLines.createdAt]    = now
            }.value

            OrderLine(
                id           = lineId,
                orderId      = orderId,
                restaurantId = restaurantId,
                menuItemId   = item.id,
                menuItemName = item.name,
                unitPrice    = unitPrice,
                quantity     = lineReq.quantity,
                stationTags  = item.stationTags,
                modifiersJson= modJson,
                lineTotal    = lineTotal,
                status       = LineStatus.PENDING,
                voidReason   = null,
                voidedBy     = null,
                voidedAt     = null,
                createdAt    = now
            )
        }

        // Mark table occupied if bound to one
        if (tableId != null) {
            DiningTables.update({ (DiningTables.id eq tableId) and (DiningTables.restaurantId eq restaurantId) }) {
                it[status]    = TableStatus.OCCUPIED.name
                it[updatedAt] = now
            }
        }

        Order(
            id            = orderId,
            restaurantId  = restaurantId,
            tableId       = tableId,
            openedBy      = openedBy,
            status        = OrderStatus.OPEN,
            source        = OrderSource.POS,
            receiptNumber = null,
            coverCount    = req.coverCount,
            notes         = req.notes,
            lines         = lines,
            adjustments   = emptyList(),
            createdAt     = now
        )
    }

    // ─── Send to Kitchen ──────────────────────────────────────────────────────

    fun sendToKitchen(orderId: UUID, restaurantId: UUID): Order = transaction {
        val order = findOrderOrThrow(orderId, restaurantId)
        require(order.status == OrderStatus.OPEN) { "Order is not in OPEN status" }

        val now = Instant.now()
        Orders.update({ (Orders.id eq orderId) and (Orders.restaurantId eq restaurantId) }) {
            it[status]    = OrderStatus.SENT.name
            it[updatedAt] = now
        }
        OrderLines.update({ (OrderLines.orderId eq orderId) and (OrderLines.status eq LineStatus.PENDING.name) }) {
            it[status] = LineStatus.SENT.name
        }

        findOrderOrThrow(orderId, restaurantId)
    }

    // ─── Void Line ────────────────────────────────────────────────────────────

    fun voidLine(lineId: UUID, orderId: UUID, restaurantId: UUID, voidedBy: UUID, reason: String): OrderLine = transaction {
        val now = Instant.now()
        val updated = OrderLines.update({
            (OrderLines.id eq lineId) and
            (OrderLines.orderId eq orderId) and
            (OrderLines.restaurantId eq restaurantId) and
            (OrderLines.status neq LineStatus.VOIDED.name)
        }) {
            it[status]     = LineStatus.VOIDED.name
            it[voidReason] = reason
            it[OrderLines.voidedBy] = voidedBy
            it[voidedAt]   = now
        }
        require(updated > 0) { "Line not found or already voided" }
        findLineOrThrow(lineId, restaurantId)
    }

    // ─── Add Adjustment ───────────────────────────────────────────────────────

    fun addAdjustment(orderId: UUID, restaurantId: UUID, authorizedBy: UUID, req: AddAdjustmentRequest): OrderAdjustment = transaction {
        findOrderOrThrow(orderId, restaurantId) // validates scope
        val now = Instant.now()
        val adjId = OrderAdjustments.insertAndGetId {
            it[OrderAdjustments.orderId]      = orderId
            it[OrderAdjustments.restaurantId] = restaurantId
            it[OrderAdjustments.type]         = req.type.uppercase()
            it[OrderAdjustments.amount]       = BigDecimal.valueOf(req.amount)
            it[OrderAdjustments.reason]       = req.reason
            it[OrderAdjustments.authorizedBy] = authorizedBy
            it[OrderAdjustments.createdAt]    = now
        }.value
        OrderAdjustment(
            id           = adjId,
            orderId      = orderId,
            restaurantId = restaurantId,
            type         = AdjustmentType.valueOf(req.type.uppercase()),
            amount       = BigDecimal.valueOf(req.amount),
            reason       = req.reason,
            authorizedBy = authorizedBy,
            createdAt    = now
        )
    }

    // ─── Get Order ────────────────────────────────────────────────────────────

    fun getOrder(orderId: UUID, restaurantId: UUID): Order =
        transaction { findOrderOrThrow(orderId, restaurantId) }

    fun listOpenOrders(restaurantId: UUID): List<Order> = transaction {
        Orders.selectAll()
            .where { (Orders.restaurantId eq restaurantId) and (Orders.status eq OrderStatus.OPEN.name) }
            .map { it.toOrder(emptyList(), emptyList()) }
    }

    // ─── Receipt Number ───────────────────────────────────────────────────────

    fun assignReceiptNumber(orderId: UUID, restaurantId: UUID, timezone: String): String = transaction {
        val today = LocalDate.now(ZoneId.of(timezone))
        val upserted = ReceiptSequences.upsert(
            keys          = arrayOf(ReceiptSequences.restaurantId, ReceiptSequences.seqDate),
            onUpdate      = listOf(ReceiptSequences.lastSeq to (ReceiptSequences.lastSeq + 1))
        ) {
            it[ReceiptSequences.restaurantId] = restaurantId
            it[ReceiptSequences.seqDate]      = today
            it[ReceiptSequences.lastSeq]      = 1
        }
        val seq = ReceiptSequences
            .selectAll()
            .where { (ReceiptSequences.restaurantId eq restaurantId) and (ReceiptSequences.seqDate eq today) }
            .single()[ReceiptSequences.lastSeq]

        val receiptNumber = "RCP-${today.year}-${seq.toString().padStart(4, '0')}"
        Orders.update({ (Orders.id eq orderId) and (Orders.restaurantId eq restaurantId) }) {
            it[Orders.receiptNumber] = receiptNumber
        }
        receiptNumber
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun findOrderOrThrow(orderId: UUID, restaurantId: UUID): Order {
        val orderRow = Orders.selectAll()
            .where { (Orders.id eq orderId) and (Orders.restaurantId eq restaurantId) }
            .singleOrNull() ?: throw NoSuchElementException("Order not found")

        val lines = OrderLines.selectAll()
            .where { OrderLines.orderId eq orderId }
            .map { it.toOrderLine() }

        val adjustments = OrderAdjustments.selectAll()
            .where { OrderAdjustments.orderId eq orderId }
            .map { it.toAdjustment() }

        return orderRow.toOrder(lines, adjustments)
    }

    private fun findLineOrThrow(lineId: UUID, restaurantId: UUID): OrderLine =
        OrderLines.selectAll()
            .where { (OrderLines.id eq lineId) and (OrderLines.restaurantId eq restaurantId) }
            .singleOrNull()?.toOrderLine()
            ?: throw NoSuchElementException("Order line not found")

    private fun buildModifiersJson(mods: List<ModifierRequest>): String {
        if (mods.isEmpty()) return "[]"
        return mods.joinToString(",", "[", "]") {
            """{"name":"${it.name}","priceDelta":${it.priceDelta}}"""
        }
    }

    private fun ResultRow.toOrder(lines: List<OrderLine>, adjustments: List<OrderAdjustment>) = Order(
        id            = this[Orders.id].value,
        restaurantId  = this[Orders.restaurantId].value,
        tableId       = this[Orders.tableId]?.value,
        openedBy      = this[Orders.openedBy].value,
        status        = OrderStatus.valueOf(this[Orders.status]),
        source        = OrderSource.valueOf(this[Orders.source]),
        receiptNumber = this[Orders.receiptNumber],
        coverCount    = this[Orders.coverCount],
        notes         = this[Orders.notes],
        lines         = lines,
        adjustments   = adjustments,
        createdAt     = this[Orders.createdAt]
    )

    private fun ResultRow.toOrderLine() = OrderLine(
        id            = this[OrderLines.id].value,
        orderId       = this[OrderLines.orderId].value,
        restaurantId  = this[OrderLines.restaurantId].value,
        menuItemId    = this[OrderLines.menuItemId].value,
        menuItemName  = this[OrderLines.menuItemName],
        unitPrice     = this[OrderLines.unitPrice],
        quantity      = this[OrderLines.quantity],
        stationTags   = this[OrderLines.stationTags],
        modifiersJson = this[OrderLines.modifiersJson],
        lineTotal     = this[OrderLines.lineTotal],
        status        = LineStatus.valueOf(this[OrderLines.status]),
        voidReason    = this[OrderLines.voidReason],
        voidedBy      = this[OrderLines.voidedBy]?.value,
        voidedAt      = this[OrderLines.voidedAt],
        createdAt     = this[OrderLines.createdAt]
    )

    private fun ResultRow.toAdjustment() = OrderAdjustment(
        id           = this[OrderAdjustments.id].value,
        orderId      = this[OrderAdjustments.orderId].value,
        restaurantId = this[OrderAdjustments.restaurantId].value,
        type         = AdjustmentType.valueOf(this[OrderAdjustments.type]),
        amount       = this[OrderAdjustments.amount],
        reason       = this[OrderAdjustments.reason],
        authorizedBy = this[OrderAdjustments.authorizedBy].value,
        createdAt    = this[OrderAdjustments.createdAt]
    )
}
