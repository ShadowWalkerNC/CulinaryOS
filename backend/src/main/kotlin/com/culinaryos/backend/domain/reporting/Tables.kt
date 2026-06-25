package com.culinaryos.backend.domain.reporting

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.kds.Stations
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.javatime.date
import org.jetbrains.exposed.sql.javatime.timestamp

object DailySalesSummary : UUIDTable("daily_sales_summary") {
    val restaurantId      = reference("restaurant_id", Restaurants)
    val reportDate        = date("report_date")
    val orderCount        = integer("order_count").default(0)
    val grossSalesCents   = long("gross_sales_cents").default(0L)
    val voidCents         = long("void_cents").default(0L)
    val compCents         = long("comp_cents").default(0L)
    val netSalesCents     = long("net_sales_cents").default(0L)
    val avgTicketCents    = integer("avg_ticket_cents").default(0)
    val onlineOrderCount  = integer("online_order_count").default(0)
    val computedAt        = timestamp("computed_at")
}

object StationOpsSummary : UUIDTable("station_ops_summary") {
    val restaurantId             = reference("restaurant_id", Restaurants)
    val stationId                = reference("station_id", Stations)
    val reportDate               = date("report_date")
    val ticketsFired             = integer("tickets_fired").default(0)
    val ticketsBumped            = integer("tickets_bumped").default(0)
    val avgFireToBumpSeconds     = integer("avg_fire_to_bump_seconds").default(0)
    val computedAt               = timestamp("computed_at")
}
