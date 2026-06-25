package com.culinaryos.backend.domain.kds

import com.culinaryos.backend.domain.auth.Restaurants
import com.culinaryos.backend.domain.auth.Users
import com.culinaryos.backend.domain.pos.Orders
import org.jetbrains.exposed.dao.id.UUIDTable
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp

object Stations : UUIDTable("stations") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val name         = text("name")
    val stationType  = text("station_type").default("CUSTOM")
    val isActive     = bool("is_active").default(true)
    val sortOrder    = integer("sort_order").default(0)
    val createdAt    = timestamp("created_at")
}

object TicketEvents : UUIDTable("ticket_events") {
    val restaurantId = reference("restaurant_id", Restaurants)
    val orderId      = reference("order_id", Orders)
    val stationId    = reference("station_id", Stations)
    val eventType    = text("event_type")
    val firedAt      = timestamp("fired_at")
    val occurredAt   = timestamp("occurred_at")
    val actorId      = reference("actor_id", Users).nullable()
    val payloadJson  = text("payload_json").default("{}")
}

object PendingPushTable : Table("pending_push") {
    val id              = long("id").autoIncrement()
    val restaurantId    = reference("restaurant_id", Restaurants)
    val targetStationId = reference("target_station_id", Stations).nullable()
    val eventType       = text("event_type")
    val payloadJson     = text("payload_json")
    val createdAt       = timestamp("created_at")
    val deliveredAt     = timestamp("delivered_at").nullable()
    override val primaryKey = PrimaryKey(id)
}
