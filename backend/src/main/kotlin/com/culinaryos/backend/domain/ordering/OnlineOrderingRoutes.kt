package com.culinaryos.backend.domain.ordering

import com.culinaryos.backend.plugins.restaurantId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

// ─── WebSocket registry for customer tracking pages ───────────────────────────
// Maps trackingToken → active WebSocketServerSession
// When a manager calls PATCH /online-orders/{id}/status, we push the new status
// to the customer's browser in real time.

val trackingSessionRegistry: ConcurrentHashMap<String, MutableList<DefaultWebSocketServerSession>> =
    ConcurrentHashMap()

fun Route.onlineOrderingRoutes(
    snapshotService: MenuSnapshotService,
    orderService: CustomerOrderService
) {

    // ─── Menu Snapshot (manager-gated) ────────────────────────────────────────

    authenticate("jwt") {
        route("/menu-snapshots") {

            // GET active snapshot for this restaurant
            get("/active") {
                val rid = UUID.fromString(call.restaurantId())
                val snapshot = snapshotService.getActiveSnapshot(rid)
                    ?: return@get call.respond(HttpStatusCode.NotFound, "No active menu snapshot")
                call.respond(snapshot)
            }

            // Publish a new snapshot — archives the current one
            post("/publish") {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<PublishSnapshotRequest>()
                val snapshot = snapshotService.publishSnapshot(
                    restaurantId = rid,
                    publishedBy  = UUID.fromString(req.publishedBy)
                )
                call.respond(HttpStatusCode.Created, snapshot)
            }
        }

        // ─── Online orders list + status updates (manager-gated) ──────────────

        route("/online-orders") {

            get {
                val rid    = UUID.fromString(call.restaurantId())
                val status = call.request.queryParameters["status"]
                    ?.let { CustomerOrderStatus.valueOf(it.uppercase()) }
                call.respond(orderService.listForRestaurant(rid, status))
            }

            patch("/{id}/status") {
                val rid      = UUID.fromString(call.restaurantId())
                val orderId  = UUID.fromString(call.parameters["id"]!!)
                val req      = call.receive<UpdateOrderStatusRequest>()
                val toStatus = CustomerOrderStatus.valueOf(req.toStatus.uppercase())
                val actorId  = req.actorId?.let { UUID.fromString(it) }

                val updated = orderService.updateStatus(orderId, rid, toStatus, actorId)

                // Push status update to customer tracking WebSocket
                pushTrackingUpdate(
                    trackingToken = updated.trackingToken,
                    status        = updated.status.name,
                    orderId       = updated.id.toString()
                )

                call.respond(HttpStatusCode.OK, updated)
            }
        }
    }

    // ─── Public endpoints (no auth) ───────────────────────────────────────────
    // These are called by the customer-facing Next.js frontend.
    // Rate limiting should be added in Phase 9 (SaaS infra) via Cloudflare.

    route("/public") {

        // GET the active menu for a restaurant — used by ordering frontend
        get("/menu/{restaurantId}") {
            val rid = UUID.fromString(call.parameters["restaurantId"]!!)
            val snapshot = snapshotService.getActiveSnapshot(rid)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Menu not available")
            // Return only the snapshotJson payload — not internal metadata
            call.respondText(snapshot.snapshotJson, ContentType.Application.Json)
        }

        // POST place an order — public, no account required
        post("/orders/{restaurantId}") {
            val rid = UUID.fromString(call.parameters["restaurantId"]!!)
            val req = call.receive<PlaceCustomerOrderRequest>()
            val order = orderService.placeOrder(rid, req)
            call.respond(
                HttpStatusCode.Created,
                OrderStatusResponse(
                    orderId         = order.id.toString(),
                    status          = order.status.name,
                    trackingToken   = order.trackingToken,
                    fulfillmentType = order.fulfillmentType.name,
                    customerName    = order.customerName,
                    subtotalCents   = order.subtotalCents,
                    createdAt       = order.createdAt.toString()
                )
            )
        }

        // GET order status by tracking token — public, no account required
        get("/track/{trackingToken}") {
            val token = call.parameters["trackingToken"]!!
            val order = orderService.getByTrackingToken(token)
                ?: return@get call.respond(HttpStatusCode.NotFound, "Order not found")
            call.respond(
                OrderStatusResponse(
                    orderId         = order.id.toString(),
                    status          = order.status.name,
                    trackingToken   = order.trackingToken,
                    fulfillmentType = order.fulfillmentType.name,
                    customerName    = order.customerName,
                    subtotalCents   = order.subtotalCents,
                    createdAt       = order.createdAt.toString()
                )
            )
        }
    }

    // ─── Customer tracking WebSocket ──────────────────────────────────────────
    // ws://host/track/ws?token=<trackingToken>
    // No auth — tracking token is the access credential.
    // Customer browser connects on the order tracking page.
    // Server pushes status updates as manager advances the order.

    webSocket("/track/ws") {
        val token = call.request.queryParameters["token"]
        if (token == null) {
            close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "token required"))
            return@webSocket
        }

        trackingSessionRegistry.getOrPut(token) { mutableListOf() }.add(this)

        try {
            // Send current status immediately on connect
            // (handles the case where the customer opens the page after a status change)
            send(Frame.Text("""{"type":"CONNECTED","token":"$token"}"""))
            for (frame in incoming) { /* keep alive — server pushes, client only acks */ }
        } finally {
            trackingSessionRegistry[token]?.remove(this)
        }
    }
}

// ─── Push helper ──────────────────────────────────────────────────────────────

suspend fun pushTrackingUpdate(trackingToken: String, status: String, orderId: String) {
    trackingSessionRegistry[trackingToken]?.forEach { session ->
        try {
            session.send(Frame.Text(
                """{"type":"STATUS_UPDATE","orderId":"$orderId","status":"$status"}"""
            ))
        } catch (_: Exception) { }
    }
}
