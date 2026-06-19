package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*

class HealthCheckTest : DescribeSpec({
    describe("GET /health") {
        it("returns 200 with status ok and version") {
            testApplication {
                application {
                    com.culinaryos.backend.plugins.configureSerialization()
                    com.culinaryos.backend.plugins.configureStatusPages()
                    com.culinaryos.backend.plugins.configureRouting()
                }
                val response = client.get("/health")
                response.status shouldBe HttpStatusCode.OK
                response.bodyAsText() shouldContain "\"status\":\"ok\""
                response.bodyAsText() shouldContain "\"version\":\"0.1.0\""
            }
        }
    }
})
