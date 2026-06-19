package com.culinaryos.backend

import com.culinaryos.backend.db.DatabaseFactory
import com.culinaryos.backend.domain.auth.AuthRepository
import com.culinaryos.backend.domain.auth.AuthService
import com.culinaryos.backend.domain.auth.authRoutes
import com.culinaryos.backend.plugins.configureAuth
import com.culinaryos.backend.plugins.configureSerialization
import com.culinaryos.backend.plugins.configureStatusPages
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

fun main() {
    embeddedServer(
        Netty,
        port = System.getenv("PORT")?.toInt() ?: 8080,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

fun Application.module() {
    DatabaseFactory.init()
    configureSerialization()
    configureAuth()
    configureStatusPages()
    configureRouting()
}

@Serializable
private data class HealthResponse(val status: String, val version: String)

fun Application.configureRouting() {
    val authService = AuthService(
        repo        = AuthRepository(),
        jwtSecret   = System.getenv("JWT_SECRET")   ?: error("JWT_SECRET required"),
        jwtIssuer   = System.getenv("JWT_ISSUER")   ?: "culinaryos",
        jwtAudience = System.getenv("JWT_AUDIENCE") ?: "culinaryos-clients"
    )

    routing {
        // ── Phase 0: Health check ─────────────────────────────────────────────
        get("/health") {
            call.respond(HttpStatusCode.OK, HealthResponse("ok", "0.1.0"))
        }

        // ── Phase 1: Auth & Tenant ────────────────────────────────────────────
        authRoutes(authService)

        // ── Phase 2: POS Core (coming next) ───────────────────────────────────
        // orderRoutes(orderService)
        // menuRoutes(menuService)
        // tableRoutes(tableService)

        // ── Phase 3: KDS ──────────────────────────────────────────────────────
        // stationRoutes(stationService)
        // ticketRoutes(ticketService)

        // ── Phase 4: Online Ordering ──────────────────────────────────────────
        // customerOrderRoutes(customerOrderService)
        // menuSnapshotRoutes(menuSnapshotService)

        // ── Phase 5: Inventory ────────────────────────────────────────────────
        // inventoryRoutes(inventoryService)

        // ── Phase 6: Reporting ────────────────────────────────────────────────
        // reportRoutes(reportService)

        // ── Phase 7: Payments ─────────────────────────────────────────────────
        // paymentRoutes(paymentService)
    }
}
