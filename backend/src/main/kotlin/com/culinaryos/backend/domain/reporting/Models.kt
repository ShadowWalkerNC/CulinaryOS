package com.culinaryos.backend.domain.reporting

import kotlinx.serialization.Serializable
import java.time.LocalDate
import java.util.UUID

// ─── Report Models ────────────────────────────────────────────────────────────

@Serializable
data class SalesReport(
    val restaurantId: String,
    val from: String,
    val to: String,
    val groupBy: String,            // DAY | WEEK | MONTH
    val totalOrderCount: Int,
    val grossSalesCents: Long,
    val voidCents: Long,
    val compCents: Long,
    val netSalesCents: Long,
    val avgTicketCents: Int,
    val onlineOrderCount: Int,
    val rows: List<SalesReportRow>
)

@Serializable
data class SalesReportRow(
    val period: String,             // "2026-12-01" for DAY, "2026-W49" for WEEK
    val orderCount: Int,
    val grossSalesCents: Long,
    val voidCents: Long,
    val compCents: Long,
    val netSalesCents: Long,
    val avgTicketCents: Int
)

@Serializable
data class DepletionReport(
    val restaurantId: String,
    val from: String,
    val to: String,
    val rows: List<DepletionReportRow>
)

@Serializable
data class DepletionReportRow(
    val inventoryItemId: String,
    val inventoryItemName: String,
    val unit: String,
    val totalDepleted: Double,      // sum of negative deltas (as positive number)
    val totalReceived: Double,      // sum of positive deltas from PURCHASE_RECEIVED
    val wasteQty: Double,
    val saleQty: Double
)

@Serializable
data class VoidCompReport(
    val restaurantId: String,
    val from: String,
    val to: String,
    val totalVoidCents: Long,
    val totalCompCents: Long,
    val rows: List<VoidCompRow>
)

@Serializable
data class VoidCompRow(
    val orderId: String,
    val adjustmentType: String,     // VOID | COMP
    val amountCents: Int,
    val reason: String?,
    val authorizedBy: String?,
    val occurredAt: String
)

@Serializable
data class OpsMetricsReport(
    val restaurantId: String,
    val from: String,
    val to: String,
    val ordersPerHour: List<OrdersPerHourRow>,
    val stationMetrics: List<StationMetricsRow>,
    val topItems: List<TopItemRow>
)

@Serializable
data class OrdersPerHourRow(
    val hour: Int,                  // 0-23
    val orderCount: Int
)

@Serializable
data class StationMetricsRow(
    val stationId: String,
    val stationName: String,
    val ticketsFired: Int,
    val ticketsBumped: Int,
    val avgFireToBumpSeconds: Int
)

@Serializable
data class TopItemRow(
    val menuItemId: String,
    val menuItemName: String,
    val quantitySold: Int,
    val grossSalesCents: Long
)
