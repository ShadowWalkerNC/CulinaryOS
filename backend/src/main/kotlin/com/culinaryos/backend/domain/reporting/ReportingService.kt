package com.culinaryos.backend.domain.reporting

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.inventory.DepletionEvents
import com.culinaryos.backend.domain.inventory.InventoryItems
import com.culinaryos.backend.domain.kds.Stations
import com.culinaryos.backend.domain.kds.TicketEvents
import com.culinaryos.backend.domain.pos.OrderAdjustments
import com.culinaryos.backend.domain.pos.OrderLines
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.*
import java.util.UUID

class ReportingService {

    // ─── Sales Report ──────────────────────────────────────────────────────────
    // Computed server-side from order_lines + order_adjustments.
    // The restaurant timezone is used to bucket orders into local calendar days.
    // groupBy: DAY (default) | WEEK | MONTH

    fun salesReport(
        restaurantId: UUID,
        from: LocalDate,
        to: LocalDate,
        groupBy: String = "DAY"
    ): SalesReport = transaction {

        val tz = getRestaurantTimezone(restaurantId)
        val fromInstant = from.atStartOfDay(tz).toInstant()
        val toInstant   = to.plusDays(1).atStartOfDay(tz).toInstant()

        // All completed/sent orders in window
        val orders = Orders.selectAll()
            .where {
                (Orders.restaurantId eq restaurantId) and
                (Orders.createdAt greaterEq fromInstant) and
                (Orders.createdAt less toInstant) and
                (Orders.status inList listOf("SENT", "CLOSED"))
            }
            .toList()

        val orderIds = orders.map { it[Orders.id].value }.toSet()

        // Sum gross sales from order lines
        val lineRows = if (orderIds.isEmpty()) emptyList() else
            OrderLines.selectAll()
                .where { OrderLines.orderId inList orderIds }
                .toList()

        // Sum voids and comps from adjustments
        val adjRows = if (orderIds.isEmpty()) emptyList() else
            OrderAdjustments.selectAll()
                .where { OrderAdjustments.orderId inList orderIds }
                .toList()

        val grossCents = lineRows.sumOf { it[OrderLines.lineTotal].toLong() }
        val voidCents  = adjRows.filter { it[OrderAdjustments.adjustmentType] == "VOID" }
            .sumOf { it[OrderAdjustments.amountCents].toLong() }
        val compCents  = adjRows.filter { it[OrderAdjustments.adjustmentType] == "COMP" }
            .sumOf { it[OrderAdjustments.amountCents].toLong() }
        val netCents   = grossCents - voidCents - compCents
        val orderCount = orders.size
        val avgTicket  = if (orderCount > 0) (netCents / orderCount).toInt() else 0

        val onlineCount = orders.count { it[Orders.source] == "ONLINE" }

        // Build period rows
        val rows = buildPeriodRows(orders, lineRows, adjRows, groupBy, tz)

        SalesReport(
            restaurantId    = restaurantId.toString(),
            from            = from.toString(),
            to              = to.toString(),
            groupBy         = groupBy,
            totalOrderCount = orderCount,
            grossSalesCents = grossCents,
            voidCents       = voidCents,
            compCents       = compCents,
            netSalesCents   = netCents,
            avgTicketCents  = avgTicket,
            onlineOrderCount= onlineCount,
            rows            = rows
        )
    }

    // ─── Depletion Report ───────────────────────────────────────────────────────

    fun depletionReport(
        restaurantId: UUID,
        from: LocalDate,
        to: LocalDate
    ): DepletionReport = transaction {
        val tz          = getRestaurantTimezone(restaurantId)
        val fromInstant = from.atStartOfDay(tz).toInstant()
        val toInstant   = to.plusDays(1).atStartOfDay(tz).toInstant()

        // Join depletion_events with inventory_items for names
        val rows = (DepletionEvents innerJoin InventoryItems)
            .selectAll()
            .where {
                (DepletionEvents.restaurantId eq restaurantId) and
                (DepletionEvents.occurredAt greaterEq fromInstant) and
                (DepletionEvents.occurredAt less toInstant)
            }
            .groupBy { it[DepletionEvents.inventoryItemId].value }
            .map { (invItemId, eventRows) ->
                val itemName = eventRows.first()[InventoryItems.name]
                val unit     = eventRows.first()[InventoryItems.unit]

                val saleQty     = eventRows.filter { it[DepletionEvents.source] == "SALE" }
                    .sumOf { it[DepletionEvents.quantityDelta].toDouble().let { d -> if (d < 0) -d else 0.0 } }
                val wasteQty    = eventRows.filter { it[DepletionEvents.source] == "WASTE" }
                    .sumOf { it[DepletionEvents.quantityDelta].toDouble().let { d -> if (d < 0) -d else 0.0 } }
                val received    = eventRows.filter { it[DepletionEvents.source] == "PURCHASE_RECEIVED" }
                    .sumOf { it[DepletionEvents.quantityDelta].toDouble().coerceAtLeast(0.0) }

                DepletionReportRow(
                    inventoryItemId   = invItemId.toString(),
                    inventoryItemName = itemName,
                    unit              = unit,
                    totalDepleted     = saleQty + wasteQty,
                    totalReceived     = received,
                    wasteQty          = wasteQty,
                    saleQty           = saleQty
                )
            }

        DepletionReport(
            restaurantId = restaurantId.toString(),
            from         = from.toString(),
            to           = to.toString(),
            rows         = rows
        )
    }

    // ─── Void & Comp Report ────────────────────────────────────────────────────

    fun voidCompReport(
        restaurantId: UUID,
        from: LocalDate,
        to: LocalDate
    ): VoidCompReport = transaction {
        val tz          = getRestaurantTimezone(restaurantId)
        val fromInstant = from.atStartOfDay(tz).toInstant()
        val toInstant   = to.plusDays(1).atStartOfDay(tz).toInstant()

        val adjRows = OrderAdjustments.selectAll()
            .where {
                (OrderAdjustments.restaurantId eq restaurantId) and
                (OrderAdjustments.createdAt greaterEq fromInstant) and
                (OrderAdjustments.createdAt less toInstant) and
                (OrderAdjustments.adjustmentType inList listOf("VOID", "COMP"))
            }
            .orderBy(OrderAdjustments.createdAt, SortOrder.DESC)
            .toList()

        val totalVoid = adjRows.filter { it[OrderAdjustments.adjustmentType] == "VOID" }
            .sumOf { it[OrderAdjustments.amountCents].toLong() }
        val totalComp = adjRows.filter { it[OrderAdjustments.adjustmentType] == "COMP" }
            .sumOf { it[OrderAdjustments.amountCents].toLong() }

        VoidCompReport(
            restaurantId   = restaurantId.toString(),
            from           = from.toString(),
            to             = to.toString(),
            totalVoidCents = totalVoid,
            totalCompCents = totalComp,
            rows = adjRows.map {
                VoidCompRow(
                    orderId        = it[OrderAdjustments.orderId].value.toString(),
                    adjustmentType = it[OrderAdjustments.adjustmentType],
                    amountCents    = it[OrderAdjustments.amountCents],
                    reason         = it[OrderAdjustments.reason],
                    authorizedBy   = it[OrderAdjustments.authorizedBy]?.value?.toString(),
                    occurredAt     = it[OrderAdjustments.createdAt].toString()
                )
            }
        )
    }

    // ─── Ops Metrics Report ─────────────────────────────────────────────────────
    // orders-per-hour heatmap, station fire-to-bump averages, top 10 items

    fun opsMetrics(
        restaurantId: UUID,
        from: LocalDate,
        to: LocalDate
    ): OpsMetricsReport = transaction {
        val tz          = getRestaurantTimezone(restaurantId)
        val fromInstant = from.atStartOfDay(tz).toInstant()
        val toInstant   = to.plusDays(1).atStartOfDay(tz).toInstant()

        // Orders per hour (0–23) in restaurant local time
        val orderRows = Orders.selectAll()
            .where {
                (Orders.restaurantId eq restaurantId) and
                (Orders.createdAt greaterEq fromInstant) and
                (Orders.createdAt less toInstant)
            }.toList()

        val ordersPerHour = (0..23).map { hour ->
            val count = orderRows.count { row ->
                val localHour = row[Orders.createdAt]
                    .atZone(tz).hour
                localHour == hour
            }
            OrdersPerHourRow(hour = hour, orderCount = count)
        }

        // Station fire-to-bump averages
        val stations = Stations.selectAll()
            .where { (Stations.restaurantId eq restaurantId) and (Stations.isActive eq true) }
            .toList()

        val stationMetrics = stations.map { station ->
            val sid = station[Stations.id].value

            val fired = TicketEvents.selectAll()
                .where {
                    (TicketEvents.stationId    eq sid) and
                    (TicketEvents.restaurantId eq restaurantId) and
                    (TicketEvents.eventType    eq "FIRED") and
                    (TicketEvents.firedAt greaterEq fromInstant) and
                    (TicketEvents.firedAt less toInstant)
                }.count().toInt()

            val bumpedRows = TicketEvents.selectAll()
                .where {
                    (TicketEvents.stationId    eq sid) and
                    (TicketEvents.restaurantId eq restaurantId) and
                    (TicketEvents.eventType    eq "BUMPED") and
                    (TicketEvents.occurredAt greaterEq fromInstant) and
                    (TicketEvents.occurredAt less toInstant)
                }.toList()

            val bumped = bumpedRows.size

            // avg fire-to-bump in seconds
            val avgSecs = if (bumpedRows.isEmpty()) 0 else {
                bumpedRows.mapNotNull { row ->
                    val fired2 = row[TicketEvents.firedAt]
                    val bumped2 = row[TicketEvents.occurredAt]
                    Duration.between(fired2, bumped2).seconds
                }.average().toInt()
            }

            StationMetricsRow(
                stationId            = sid.toString(),
                stationName          = station[Stations.name],
                ticketsFired         = fired,
                ticketsBumped        = bumped,
                avgFireToBumpSeconds = avgSecs
            )
        }

        // Top 10 items by quantity sold
        val lineRows = if (orderRows.isEmpty()) emptyList() else
            OrderLines.selectAll()
                .where { OrderLines.orderId inList orderRows.map { it[Orders.id].value } }
                .toList()

        val topItems = lineRows
            .groupBy { it[OrderLines.menuItemId].value }
            .map { (itemId, lines) ->
                val name  = lines.first()[OrderLines.menuItemName]
                val qty   = lines.sumOf { it[OrderLines.quantity] }
                val gross = lines.sumOf { it[OrderLines.lineTotal].toLong() }
                TopItemRow(
                    menuItemId     = itemId.toString(),
                    menuItemName   = name,
                    quantitySold   = qty,
                    grossSalesCents= gross
                )
            }
            .sortedByDescending { it.quantitySold }
            .take(10)

        OpsMetricsReport(
            restaurantId   = restaurantId.toString(),
            from           = from.toString(),
            to             = to.toString(),
            ordersPerHour  = ordersPerHour,
            stationMetrics = stationMetrics,
            topItems       = topItems
        )
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun getRestaurantTimezone(restaurantId: UUID): ZoneId = transaction {
        val tz = Restaurants.selectAll()
            .where { Restaurants.id eq restaurantId }
            .singleOrNull()
            ?.get(Restaurants.timezone)
            ?: "UTC"
        ZoneId.of(tz)
    }

    private fun buildPeriodRows(
        orders: List<ResultRow>,
        lineRows: List<ResultRow>,
        adjRows: List<ResultRow>,
        groupBy: String,
        tz: ZoneId
    ): List<SalesReportRow> {
        // Group orders by period key
        val ordersByPeriod = orders.groupBy { row ->
            val zdt = row[Orders.createdAt].atZone(tz)
            when (groupBy.uppercase()) {
                "WEEK"  -> "${zdt.year}-W${zdt.dayOfYear / 7 + 1}"
                "MONTH" -> "${zdt.year}-${zdt.monthValue.toString().padStart(2, '0')}"
                else    -> zdt.toLocalDate().toString()   // DAY
            }
        }

        return ordersByPeriod.map { (period, periodOrders) ->
            val pOrderIds = periodOrders.map { it[Orders.id].value }.toSet()
            val pLines = lineRows.filter { it[OrderLines.orderId].value in pOrderIds }
            val pAdj   = adjRows.filter  { it[OrderAdjustments.orderId].value in pOrderIds }

            val gross = pLines.sumOf { it[OrderLines.lineTotal].toLong() }
            val voids = pAdj.filter { it[OrderAdjustments.adjustmentType] == "VOID" }
                .sumOf { it[OrderAdjustments.amountCents].toLong() }
            val comps = pAdj.filter { it[OrderAdjustments.adjustmentType] == "COMP" }
                .sumOf { it[OrderAdjustments.amountCents].toLong() }
            val net   = gross - voids - comps
            val cnt   = periodOrders.size

            SalesReportRow(
                period         = period,
                orderCount     = cnt,
                grossSalesCents= gross,
                voidCents      = voids,
                compCents      = comps,
                netSalesCents  = net,
                avgTicketCents = if (cnt > 0) (net / cnt).toInt() else 0
            )
        }.sortedBy { it.period }
    }
}
