package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*

class KdsTest : DescribeSpec({

    // ─── Helpers ──────────────────────────────────────────────────────────────

    suspend fun ApplicationTestBuilder.registerAndToken(): String {
        val res = client.post("/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"orgName":"KdsOrg","restaurantName":"KdsRest",
                "timezone":"America/New_York",
                "email":"kds${System.nanoTime()}@test.com",
                "password":"password123","name":"KDS Owner"}""")
        }
        return Json.parseToJsonElement(res.bodyAsText())
            .jsonObject["accessToken"]!!.jsonPrimitive.content
    }

    // ─── Stations ─────────────────────────────────────────────────────────────

    describe("POST /stations") {
        it("creates a GRILL station scoped to restaurant") {
            testApplication {
                application { module() }
                val token = registerAndToken()
                val res = client.post("/stations") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Grill","stationType":"GRILL","sortOrder":1}""")
                }
                res.status shouldBe HttpStatusCode.Created
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["name"]!!.jsonPrimitive.content        shouldBe "Grill"
                body["stationType"]!!.jsonPrimitive.content shouldBe "GRILL"
            }
        }
    }

    describe("GET /stations") {
        it("lists only stations for this restaurant") {
            testApplication {
                application { module() }
                val tokenA = registerAndToken()
                val tokenB = registerAndToken()

                // Tenant A creates 2 stations
                listOf("GRILL", "FRY").forEach { type ->
                    client.post("/stations") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $tokenA")
                        setBody("""{"name":"$type","stationType":"$type"}""")
                    }
                }

                // Tenant B creates 1 station
                client.post("/stations") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $tokenB")
                    setBody("""{"name":"Saute","stationType":"SAUTE"}""")
                }

                // Tenant A should see only their 2 stations
                val res = client.get("/stations") {
                    header(HttpHeaders.Authorization, "Bearer $tokenA")
                }
                res.status shouldBe HttpStatusCode.OK
                Json.parseToJsonElement(res.bodyAsText()).jsonArray shouldHaveSize 2
            }
        }
    }

    // ─── Ticket Fire + Bump ───────────────────────────────────────────────────

    describe("FIRED ticket flow") {
        it("firing an order creates FIRED ticket events in outbox") {
            testApplication {
                application { module() }
                val token = registerAndToken()

                // Create a GRILL station
                val stationRes = client.post("/stations") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Grill","stationType":"GRILL"}""")
                }
                val stationId = Json.parseToJsonElement(stationRes.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                // Create a menu item tagged GRILL
                val itemRes = client.post("/menu/items") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"name":"Ribeye","price":35.00,"stationTags":["GRILL"]}""")
                }
                val itemId = Json.parseToJsonElement(itemRes.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                // Place an order
                val orderRes = client.post("/orders") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"lines":[{"menuItemId":"$itemId","quantity":1}]}""")
                }
                val orderId = Json.parseToJsonElement(orderRes.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                // Send to kitchen — triggers fireTicketsForOrder
                val sendRes = client.post("/orders/$orderId/send") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                sendRes.status shouldBe HttpStatusCode.OK

                // Active ticket queue at GRILL station should have 1 ticket
                val ticketRes = client.get("/stations/$stationId/tickets") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                ticketRes.status shouldBe HttpStatusCode.OK
                Json.parseToJsonElement(ticketRes.bodyAsText()).jsonArray shouldHaveSize 1
            }
        }

        it("bumping a ticket removes it from the active queue") {
            testApplication {
                application { module() }
                val token = registerAndToken()
                val userId = Json.parseToJsonElement(
                    client.get("/auth/me") {
                        header(HttpHeaders.Authorization, "Bearer $token")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                // Setup: station + item + order + send
                val stationId = Json.parseToJsonElement(
                    client.post("/stations") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Fry","stationType":"FRY"}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val itemId = Json.parseToJsonElement(
                    client.post("/menu/items") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Fries","price":4.50,"stationTags":["FRY"]}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val orderId = Json.parseToJsonElement(
                    client.post("/orders") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"lines":[{"menuItemId":"$itemId","quantity":1}]}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                client.post("/orders/$orderId/send") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }

                // Bump
                val bumpRes = client.post("/tickets/$orderId/bump?stationId=$stationId") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"actorId":"$userId"}""")
                }
                bumpRes.status shouldBe HttpStatusCode.OK
                bumpRes.bodyAsText() shouldContain "BUMPED"

                // Active queue should now be empty
                val ticketsAfter = client.get("/stations/$stationId/tickets") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                Json.parseToJsonElement(ticketsAfter.bodyAsText()).jsonArray shouldHaveSize 0
            }
        }
    }
})
