package com.culinaryos.backend.domain.reporting

import com.culinaryos.backend.plugins.restaurantId
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.time.LocalDate
import java.util.UUID

fun Route.reportingRoutes(service: ReportingService) {

    authenticate("jwt") {

        route("/reports") {

            // ─── Sales Report ────────────────────────────────────────────────────
            // GET /reports/sales?from=2026-12-01&to=2026-12-07&groupBy=DAY
            get("/sales") {
                val rid     = UUID.fromString(call.restaurantId())
                val from    = call.request.queryParameters["from"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now().minusDays(6)
                val to      = call.request.queryParameters["to"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now()
                val groupBy = call.request.queryParameters["groupBy"] ?: "DAY"
                call.respond(service.salesReport(rid, from, to, groupBy))
            }

            // ─── Depletion Report ───────────────────────────────────────────────
            // GET /reports/depletion?from=2026-12-01&to=2026-12-07
            get("/depletion") {
                val rid  = UUID.fromString(call.restaurantId())
                val from = call.request.queryParameters["from"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now().minusDays(6)
                val to   = call.request.queryParameters["to"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now()
                call.respond(service.depletionReport(rid, from, to))
            }

            // ─── Void & Comp Report ──────────────────────────────────────────────
            // GET /reports/void-comp?from=2026-12-01&to=2026-12-07
            get("/void-comp") {
                val rid  = UUID.fromString(call.restaurantId())
                val from = call.request.queryParameters["from"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now().minusDays(6)
                val to   = call.request.queryParameters["to"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now()
                call.respond(service.voidCompReport(rid, from, to))
            }

            // ─── Ops Metrics ─────────────────────────────────────────────────────
            // GET /reports/ops?from=2026-12-01&to=2026-12-07
            get("/ops") {
                val rid  = UUID.fromString(call.restaurantId())
                val from = call.request.queryParameters["from"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now().minusDays(6)
                val to   = call.request.queryParameters["to"]
                    ?.let { LocalDate.parse(it) } ?: LocalDate.now()
                call.respond(service.opsMetrics(rid, from, to))
            }
        }
    }
}
