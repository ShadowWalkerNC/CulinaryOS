package com.culinaryos.backend.domain.inventory

import com.culinaryos.backend.plugins.restaurantId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.inventoryRoutes(service: InventoryService) {

    authenticate("jwt") {

        // ─── Storage Locations ────────────────────────────────────────────────
        route("/storage-locations") {
            get  { call.respond(service.listStorageLocations(UUID.fromString(call.restaurantId()))) }
            post {
                val rid  = UUID.fromString(call.restaurantId())
                val body = call.receive<Map<String, String>>()
                call.respond(HttpStatusCode.Created, service.createStorageLocation(rid, body["name"] ?: ""))
            }
        }

        // ─── Inventory Items ──────────────────────────────────────────────────
        route("/inventory") {
            get {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(service.listItems(rid))
            }
            post {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<CreateInventoryItemRequest>()
                call.respond(HttpStatusCode.Created, service.createItem(rid, req))
            }
            get("/alerts") {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(service.getItemsBelowPar(rid))
            }
        }

        // ─── Recipe Links ─────────────────────────────────────────────────────
        post("/inventory/ingredients") {
            val rid = UUID.fromString(call.restaurantId())
            val req = call.receive<LinkIngredientRequest>()
            call.respond(HttpStatusCode.Created, service.linkIngredient(rid, req))
        }

        // ─── Manual Adjustments ───────────────────────────────────────────────
        post("/inventory/adjust") {
            val rid = UUID.fromString(call.restaurantId())
            val req = call.receive<ManualAdjustmentRequest>()
            call.respond(service.manualAdjustment(rid, req))
        }

        // ─── Depletion Log ────────────────────────────────────────────────────
        get("/inventory/depletions") {
            val rid    = UUID.fromString(call.restaurantId())
            val itemId = call.request.queryParameters["itemId"]?.let { UUID.fromString(it) }
            call.respond(service.listDepletionEvents(rid, itemId))
        }

        // ─── Reorder Rules ────────────────────────────────────────────────────
        post("/inventory/reorder-rules") {
            val rid = UUID.fromString(call.restaurantId())
            val req = call.receive<SetReorderRuleRequest>()
            call.respond(HttpStatusCode.Created, service.setReorderRule(rid, req))
        }

        // ─── Purchase Orders ──────────────────────────────────────────────────
        route("/purchase-orders") {
            get {
                val rid    = UUID.fromString(call.restaurantId())
                val status = call.request.queryParameters["status"]
                    ?.let { PurchaseOrderStatus.valueOf(it.uppercase()) }
                call.respond(service.listPurchaseOrders(rid, status))
            }
            post {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<CreatePurchaseOrderRequest>()
                call.respond(HttpStatusCode.Created, service.createPurchaseOrder(rid, req))
            }
            post("/{id}/receive") {
                val rid  = UUID.fromString(call.restaurantId())
                val poId = UUID.fromString(call.parameters["id"]!!)
                // Must be SUBMITTED first — set status to SUBMITTED then receive
                call.respond(service.receivePurchaseOrder(poId, rid))
            }
        }
    }
}
