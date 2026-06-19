package com.culinaryos.backend.plugins

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.response.*
import kotlinx.serialization.Serializable

@Serializable
data class UnauthorizedResponse(val error: String, val message: String)

fun Application.configureAuth() {
    val jwtSecret   = System.getenv("JWT_SECRET")   ?: error("JWT_SECRET env var required")
    val jwtIssuer   = System.getenv("JWT_ISSUER")   ?: "culinaryos"
    val jwtAudience = System.getenv("JWT_AUDIENCE") ?: "culinaryos-clients"

    install(Authentication) {
        jwt("jwt") {
            realm = "CulinaryOS"
            verifier(
                JWT.require(Algorithm.HMAC256(jwtSecret))
                    .withIssuer(jwtIssuer)
                    .withAudience(jwtAudience)
                    .build()
            )
            validate { credential ->
                val subject      = credential.payload.subject
                val restaurantId = credential.payload.getClaim("restaurantId").asString()
                val role         = credential.payload.getClaim("role").asString()
                if (subject != null && restaurantId != null && role != null) {
                    JWTPrincipal(credential.payload)
                } else null
            }
            challenge { _, _ ->
                call.respond(
                    HttpStatusCode.Unauthorized,
                    UnauthorizedResponse("UNAUTHORIZED", "Invalid or expired token")
                )
            }
        }
    }
}

/**
 * Extracts restaurantId from the JWT principal on any authenticated route.
 * This is the tenant isolation key — EVERY data query must use it.
 * Usage: val restaurantId = call.restaurantId()
 */
fun ApplicationCall.restaurantId(): String =
    principal<JWTPrincipal>()
        ?.payload?.getClaim("restaurantId")?.asString()
        ?: throw SecurityException("restaurantId missing from token")

fun ApplicationCall.userId(): String =
    principal<JWTPrincipal>()
        ?.payload?.subject
        ?: throw SecurityException("userId missing from token")

fun ApplicationCall.userRole(): String =
    principal<JWTPrincipal>()
        ?.payload?.getClaim("role")?.asString()
        ?: throw SecurityException("role missing from token")
