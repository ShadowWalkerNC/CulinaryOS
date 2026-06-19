package com.culinaryos.backend.domain.pos

import com.culinaryos.backend.plugins.restaurantId
import com.culinaryos.backend.plugins.userId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.posRoutes(orderService: OrderService, menuRepo: MenuRepository, tableRepo: TableRepository) {

    authenticate("jwt") {

        // ─── Menu ─────────────────────────────────────────────────────────────

        route("/menu") {
            get("/categories") {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(menuRepo.listCategories(rid))
            }
            get("/items") {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(menuRepo.listMenuItems(rid))
            }
            post("/items") {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<CreateMenuItemRequest>()
                val item = menuRepo.createMenuItem(rid, req)
                call.respond(HttpStatusCode.Created, item)
            }
        }

        // ─── Tables ───────────────────────────────────────────────────────────

        route("/tables") {
            get {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(tableRepo.listTables(rid))
            }
            post {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<CreateTableRequest>()
                call.respond(HttpStatusCode.Created, tableRepo.createTable(rid, req))
            }
        }

        route("/sections") {
            get {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(tableRepo.listSections(rid))
            }
            post {
                val rid = UUID.fromString(call.restaurantId())
                val req = call.receive<CreateSectionRequest>()
                call.respond(HttpStatusCode.Created, tableRepo.createSection(rid, req))
            }
        }

        // ─── Orders ───────────────────────────────────────────────────────────

        route("/orders") {
            get {
                val rid = UUID.fromString(call.restaurantId())
                call.respond(orderService.listOpenOrders(rid))
            }
            post {
                val rid = UUID.fromString(call.restaurantId())
                val uid = UUID.fromString(call.userId())
                val req = call.receive<CreateOrderRequest>()
                val order = orderService.createOrder(rid, uid, req)
                call.respond(HttpStatusCode.Created, order)
            }
            get("/{id}") {
                val rid = UUID.fromString(call.restaurantId())
                val oid = UUID.fromString(call.parameters["id"]!!)
                call.respond(orderService.getOrder(oid, rid))
            }
            post("/{id}/send") {
                val rid = UUID.fromString(call.restaurantId())
                val oid = UUID.fromString(call.parameters["id"]!!)
                call.respond(orderService.sendToKitchen(oid, rid))
            }
            post("/{id}/adjustments") {
                val rid = UUID.fromString(call.restaurantId())
                val oid = UUID.fromString(call.parameters["id"]!!)
                val uid = UUID.fromString(call.userId())
                val req = call.receive<AddAdjustmentRequest>()
                call.respond(HttpStatusCode.Created, orderService.addAdjustment(oid, rid, uid, req))
            }
            post("/{id}/lines/{lineId}/void") {
                val rid    = UUID.fromString(call.restaurantId())
                val oid    = UUID.fromString(call.parameters["id"]!!)
                val lineId = UUID.fromString(call.parameters["lineId"]!!)
                val uid    = UUID.fromString(call.userId())
                val req    = call.receive<VoidLineRequest>()
                call.respond(orderService.voidLine(lineId, oid, rid, uid, req.reason))
            }
        }
    }
}
