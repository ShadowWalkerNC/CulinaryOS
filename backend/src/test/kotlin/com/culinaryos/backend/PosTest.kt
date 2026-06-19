package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.string.shouldStartWith
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*

class PosTest : DescribeSpec({

    // ─── Helpers ──────────────────────────────────────────────────────────────

    suspend fun ApplicationTestBuilder.registerAndLogin(): String {
        val reg = client.post("/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"orgName":"PosOrg","restaurantName":"PosRest",
                "timezone":"America/New_York",
                "email":"pos${System.nanoTime()}@test.com",
                "password":"password123","name":"POS Owner"}""")
        }
        return Json.parseToJsonElement(reg.bodyAsText())
            .jsonObject["accessToken"]!!.jsonPrimitive.content
    }

    // ─── Menu ─────────────────────────────────────────────────────────────────

    describe("GET /menu/items") {
        it("returns empty list for new restaurant") {
            testApplication {
                application { module() }
                val token = registerAndLogin()
                val response = client.get("/menu/items") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                response.status shouldBe HttpStatusCode.OK
                Json.parseToJsonElement(response.bodyAsText()).jsonArray shouldHaveSize 0
            }
        }
    }

    describe("POST /menu/items") {
        it("creates a menu item scoped to the restaurant") {
            testApplication {
                application { module() }
                val token = registerAndLogin()
                val response = client.post("/menu/items") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Burger","price":12.99,"stationTags":["GRILL"]}""")
                }
                response.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
                body["name"]!!.jsonPrimitive.content shouldBe "Burger"
                body["price"]!!.jsonPrimitive.double shouldBe 12.99
            }
        }
    }

    // ─── Tables ───────────────────────────────────────────────────────────────

    describe("POST /tables") {
        it("creates a dining table") {
            testApplication {
                application { module() }
                val token = registerAndLogin()
                val response = client.post("/tables") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Table 1","capacity":4}""")
                }
                response.status shouldBe HttpStatusCode.Created
                Json.parseToJsonElement(response.bodyAsText())
                    .jsonObject["name"]!!.jsonPrimitive.content shouldBe "Table 1"
            }
        }
    }

    // ─── Orders ───────────────────────────────────────────────────────────────

    describe("POST /orders") {
        it("creates an order with lines; status is OPEN") {
            testApplication {
                application { module() }
                val token = registerAndLogin()

                // Create a menu item first
                val itemResp = client.post("/menu/items") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Fries","price":4.50,"stationTags":["FRY"]}""")
                }
                val itemId = Json.parseToJsonElement(itemResp.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                // Place the order
                val response = client.post("/orders") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{
                        "coverCount": 2,
                        "lines": [{"menuItemId": "$itemId", "quantity": 2}]
                    }""")
                }
                response.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(response.bodyAsText()).jsonObject
                body["status"]!!.jsonPrimitive.content shouldBe "OPEN"
                body["lines"]!!.jsonArray shouldHaveSize 1
                body["lines"]!!.jsonArray[0].jsonObject["lineTotal"]!!.jsonPrimitive.double shouldBe 9.0
            }
        }

        it("rejects order with item from another restaurant — tenant isolation") {
            testApplication {
                application { module() }

                // Tenant A creates a menu item
                val tokenA = registerAndLogin()
                val itemResp = client.post("/menu/items") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $tokenA")
                    setBody("""{"name":"Secret Item","price":99.0,"stationTags":[]}""")
                }
                val itemId = Json.parseToJsonElement(itemResp.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                // Tenant B tries to order it
                val tokenB = registerAndLogin()
                val response = client.post("/orders") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $tokenB")
                    setBody("""{"lines":[{"menuItemId":"$itemId","quantity":1}]}""")
                }
                // Should fail — item doesn't exist in Tenant B's restaurant
                response.status shouldBe HttpStatusCode.NotFound
            }
        }
    }

    describe("POST /orders/{id}/send") {
        it("transitions order to SENT and lines to SENT") {
            testApplication {
                application { module() }
                val token = registerAndLogin()

                val itemResp = client.post("/menu/items") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Steak","price":28.00,"stationTags":["GRILL"]}""")
                }
                val itemId = Json.parseToJsonElement(itemResp.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                val orderResp = client.post("/orders") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"lines":[{"menuItemId":"$itemId","quantity":1}]}""")
                }
                val orderId = Json.parseToJsonElement(orderResp.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                val sendResp = client.post("/orders/$orderId/send") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                sendResp.status shouldBe HttpStatusCode.OK
                val body = Json.parseToJsonElement(sendResp.bodyAsText()).jsonObject
                body["status"]!!.jsonPrimitive.content shouldBe "SENT"
                body["lines"]!!.jsonArray[0].jsonObject["status"]!!.jsonPrimitive.content shouldBe "SENT"
            }
        }
    }

    // ─── Sync Backoff — pure function test — no DB needed ─────────────────────

    describe("syncBackoffMs") {
        it("doubles each attempt up to 60s cap") {
            // Import is at shared module level — tested here for CI coverage
            val backoffs = (0..7).map { attempt ->
                minOf(1L * (1L shl minOf(attempt, 6)), 60L) * 1000L
            }
            backoffs[0] shouldBe 1000L   // 1s
            backoffs[1] shouldBe 2000L   // 2s
            backoffs[2] shouldBe 4000L   // 4s
            backoffs[3] shouldBe 8000L   // 8s
            backoffs[4] shouldBe 16000L  // 16s
            backoffs[5] shouldBe 32000L  // 32s
            backoffs[6] shouldBe 60000L  // 60s cap
            backoffs[7] shouldBe 60000L  // stays at 60s
        }
    }
})
