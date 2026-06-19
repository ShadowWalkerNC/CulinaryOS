package com.culinaryos.backend.domain.auth

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.auth.jwt.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.UUID

fun Route.authRoutes(authService: AuthService) {
    route("/auth") {

        // POST /auth/register — creates org + restaurant + owner account
        post("/register") {
            val req = call.receive<RegisterRequest>()
            val response = authService.register(req)
            call.respond(HttpStatusCode.Created, response)
        }

        // POST /auth/login
        post("/login") {
            val req = call.receive<LoginRequest>()
            val response = authService.login(req)
            call.respond(HttpStatusCode.OK, response)
        }

        // POST /auth/refresh — single-use token rotation
        post("/refresh") {
            val req = call.receive<RefreshRequest>()
            val response = authService.refresh(req)
            call.respond(HttpStatusCode.OK, response)
        }

        // GET /auth/me — requires valid JWT
        authenticate("jwt") {
            get("/me") {
                val principal = call.principal<JWTPrincipal>()
                val userId = UUID.fromString(
                    principal?.payload?.subject
                        ?: throw SecurityException("Missing token subject")
                )
                val profile = authService.getProfile(userId)
                call.respond(HttpStatusCode.OK, profile)
            }
        }
    }
}
