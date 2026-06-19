package com.culinaryos.backend.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(
    val status: String,
    val version: String
)

fun Application.configureRouting() {
    routing {
        // Health check — used by Docker, CI, and load balancers
        // Phase 0 exit gate: this endpoint must return 200
        get("/health") {
            call.respond(HttpStatusCode.OK, HealthResponse(
                status = "ok",
                version = "0.1.0"
            ))
        }

        // Phase 1 routes will be added here: /auth/register, /auth/login, /auth/refresh, /auth/me
        // Phase 2 routes: /orders, /menu-items, /tables
        // Phase 3 routes: /stations, /tickets
        // Phase 4 routes: /menu-snapshots, /customer-orders
        // Phase 5 routes: /inventory-items, /purchase-orders
        // Phase 6 routes: /reports
        // Phase 7 routes: /payments
    }
}
