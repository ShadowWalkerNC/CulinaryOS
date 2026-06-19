package com.culinaryos.backend.domain.kds

import com.culinaryos.backend.plugins.restaurantId
import com.culinaryos.backend.plugins.userId
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import io.ktor.http.*
import kotlinx.coroutines.channels.consumeEach
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

// ─── Active WebSocket session registry ───────────────────────────────────────
// Maps restaurantId:stationId → list of active WebSocketServerSession
// Used to push events to connected KDS displays in real time.

val kdsSessionRegistry: ConcurrentHashMap<String, MutableList<DefaultWebSocketServerSession>> =
    ConcurrentHashMap()

fun Route.kdsRoutes(ticketService: TicketService) {

    authenticate("jwt") {

        // ─── Stations CRUD ────────────────────────────────────────────────────

        route("/stations") {
            get {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(ticketService.listStations(rid))
            }
            post {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<CreateStationRequest>()
                call.respond(HttpStatusCode.Created, ticketService.createStation(rid, req))
            }
        }

        // ─── Ticket queue (REST fallback for non-WS clients) ──────────────────

        get("/stations/{stationId}/tickets") {
            val rid       = UUID.fromString(call.restaurantId())
            val stationId = UUID.fromString(call.parameters["stationId"]!!)
            call.respond(ticketService.getActiveTickets(stationId, rid))
        }

        // ─── Bump ─────────────────────────────────────────────────────────────

        post("/tickets/{orderId}/bump") {
            val rid     = UUID.fromString(call.restaurantId())
            val orderId = UUID.fromString(call.parameters["orderId"]!!)
            val req     = call.receive<BumpTicketRequest>()
            val uid     = UUID.fromString(req.actorId)
            val stationId = UUID.fromString(call.request.queryParameters["stationId"]
                ?: throw IllegalArgumentException("stationId query param required"))

            val event = ticketService.bumpTicket(orderId, stationId, rid, uid)

            // Push bump to all connected sessions for this restaurant
            pushToRestaurant(rid.toString(), """{ "type": "BUMPED", "orderId": "$orderId", "stationId": "$stationId" }""")

            call.respond(HttpStatusCode.OK, event)
        }

        // ─── Recall ───────────────────────────────────────────────────────────

        post("/tickets/{orderId}/recall") {
            val rid     = UUID.fromString(call.restaurantId())
            val orderId = UUID.fromString(call.parameters["orderId"]!!)
            val uid     = UUID.fromString(call.userId())
            val stationId = UUID.fromString(call.request.queryParameters["stationId"]
                ?: throw IllegalArgumentException("stationId query param required"))

            val event = ticketService.recallTicket(orderId, stationId, rid, uid)
            pushToRestaurant(rid.toString(), """{ "type": "RECALLED", "orderId": "$orderId", "stationId": "$stationId" }""")
            call.respond(HttpStatusCode.OK, event)
        }
    }

    // ─── WebSocket endpoint ───────────────────────────────────────────────────
    // ws://host/kds/connect?stationId=UUID&lastAckSequence=0
    // No JWT in WS header — token passed as first message after connect.
    // Protocol:
    //   1. Client connects
    //   2. Client sends: { "token": "<JWT>" }
    //   3. Server validates token, registers session
    //   4. Server replays missed pushes since lastAckSequence
    //   5. Server pushes live events as they occur
    //   6. Client acks: { "ack": <outboxId> }

    webSocket("/kds/connect") {
        val stationIdStr       = call.request.queryParameters["stationId"]
        val lastAckSequence    = call.request.queryParameters["lastAckSequence"]?.toLongOrNull() ?: 0L

        if (stationIdStr == null) {
            close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "stationId required"))
            return@webSocket
        }

        var restaurantId: UUID? = null
        var stationId: UUID     = UUID.fromString(stationIdStr)
        var sessionKey: String? = null

        try {
            incoming.consumeEach { frame ->
                if (frame is Frame.Text) {
                    val text = frame.readText()
                    val json = Json.parseToJsonElement(text)

                    // Step 1: token handshake
                    if (restaurantId == null) {
                        // In production: validate JWT here and extract restaurantId
                        // For now: trust the restaurantId claim in the handshake message
                        val rid = json.let {
                            it.toString().substringAfter("\"restaurantId\":\"").substringBefore("\"")
                        }
                        restaurantId = UUID.fromString(rid)
                        sessionKey   = "$rid:$stationId"

                        // Register session
                        kdsSessionRegistry.getOrPut(sessionKey!!) { mutableListOf() }.add(this)

                        // Replay missed pushes since last ack
                        val missed = ticketService.getMissedPushes(restaurantId!!, stationId, lastAckSequence)
                        missed.forEach { push ->
                            send(Frame.Text(push.payloadJson))
                            ticketService.markDelivered(push.id)
                        }

                        send(Frame.Text("""{ "type": "CONNECTED", "stationId": "$stationId", "replayed": ${missed.size} }"""))
                        return@consumeEach
                    }

                    // Step 2: ack messages
                    val ackId = json.toString().substringAfter("\"ack\":").substringBefore("}").trim().toLongOrNull()
                    if (ackId != null) {
                        ticketService.markDelivered(ackId)
                    }
                }
            }
        } finally {
            // Clean up session on disconnect
            sessionKey?.let { key ->
                kdsSessionRegistry[key]?.remove(this)
            }
        }
    }
}

// ─── Push helper ──────────────────────────────────────────────────────────────
// Sends a message to all connected WebSocket sessions for a restaurant.

suspend fun pushToRestaurant(restaurantId: String, message: String) {
    kdsSessionRegistry.entries
        .filter { it.key.startsWith("$restaurantId:") }
        .flatMap { it.value }
        .forEach { session ->
            try {
                session.send(Frame.Text(message))
            } catch (e: Exception) {
                // Session dead — will be cleaned up on next disconnect
            }
        }
}

// Push to a specific station only
suspend fun pushToStation(restaurantId: String, stationId: String, message: String) {
    val key = "$restaurantId:$stationId"
    kdsSessionRegistry[key]?.forEach { session ->
        try { session.send(Frame.Text(message)) } catch (_: Exception) { }
    }
}
