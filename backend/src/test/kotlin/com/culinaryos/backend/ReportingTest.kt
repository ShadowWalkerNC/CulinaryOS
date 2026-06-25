package com.culinaryos.backend

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldHaveSize
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*
import java.time.LocalDate

class ReportingTest : DescribeSpec({

    // ─── Helpers ─────────────────────────────────────────────────────────────

    suspend fun ApplicationTestBuilder.registerAndToken(tag: String = ""): Triple<String, String, String> {
        val res = client.post("/auth/register") {
            contentType(ContentType.Application.Json)
            setBody("""{"orgName":"RepOrg$tag","restaurantName":"RepRest$tag",
                "timezone":"America/New_York",
                "email":"rep${tag}${System.nanoTime()}@test.com",
                "password":"password123","name":"Rep Owner"}""")
        }
        val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
        val token = body["accessToken"]!!.jsonPrimitive.content
        val rid   = body["restaurantId"]!!.jsonPrimitive.content
        val uid   = Json.parseToJsonElement(
            client.get("/auth/me") { header(HttpHeaders.Authorization, "Bearer $token") }.bodyAsText()
        ).jsonObject["id"]!!.jsonPrimitive.content
        return Triple(token, rid, uid)
    }

    suspend fun ApplicationTestBuilder.placeAndSendOrder(
        token: String,
        itemId: String,
        qty: Int = 1,
        unitPriceCents: Int = 1500
    ): String {
        val orderRes = client.post("/orders") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Authorization, "Bearer $token")
            setBody("""{"lines":[{"menuItemId":"$itemId","quantity":$qty}]}""")
        }
        val orderId = Json.parseToJsonElement(orderRes.bodyAsText()).jsonObject["id"]!!.jsonPrimitive.content
        client.post("/orders/$orderId/send") { header(HttpHeaders.Authorization, "Bearer $token") }
        return orderId
    }

    // ─── Sales Report ──────────────────────────────────────────────────────────

    describe("GET /reports/sales") {
        it("returns empty report with zero totals when no orders") {
            testApplication {
                application { module() }
                val (token, _, _) = registerAndToken("sales0")
                val today = LocalDate.now().toString()
                val res = client.get("/reports/sales?from=$today&to=$today") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                res.status shouldBe HttpStatusCode.OK
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["totalOrderCount"]!!.jsonPrimitive.int  shouldBe 0
                body["grossSalesCents"]!!.jsonPrimitive.long shouldBe 0L
                body["netSalesCents"]!!.jsonPrimitive.long   shouldBe 0L
            }
        }

        it("sales report totals match sum of order line prices") {
            testApplication {
                application { module() }
                val (token, _, _) = registerAndToken("sales1")

                // Create menu item (price stored in priceCents)
                val itemId = Json.parseToJsonElement(
                    client.post("/menu/items") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Steak","priceCents":2500}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                // Place and send 3 orders of 1 Steak each
                repeat(3) { placeAndSendOrder(token, itemId, qty = 1) }

                val today = LocalDate.now().toString()
                val res = client.get("/reports/sales?from=$today&to=$today") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["totalOrderCount"]!!.jsonPrimitive.int  shouldBe 3
                // 3 orders × 2500¢ = 7500¢
                body["grossSalesCents"]!!.jsonPrimitive.long shouldBe 7500L
                body["netSalesCents"]!!.jsonPrimitive.long   shouldBe 7500L
            }
        }

        it("void reduces net sales correctly") {
            testApplication {
                application { module() }
                val (token, _, uid) = registerAndToken("sales2")

                val itemId = Json.parseToJsonElement(
                    client.post("/menu/items") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Pasta","priceCents":1800}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val orderId = placeAndSendOrder(token, itemId)

                // Apply a VOID adjustment of 1800¢
                client.post("/orders/$orderId/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"adjustmentType":"VOID","amountCents":1800,
                        "reason":"customer complaint","authorizedBy":"$uid"}""")
                }

                val today = LocalDate.now().toString()
                val res = client.get("/reports/sales?from=$today&to=$today") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["grossSalesCents"]!!.jsonPrimitive.long shouldBe 1800L
                body["voidCents"]!!.jsonPrimitive.long       shouldBe 1800L
                body["netSalesCents"]!!.jsonPrimitive.long   shouldBe 0L
            }
        }
    }

    // ─── Void & Comp Report ───────────────────────────────────────────────────

    describe("GET /reports/void-comp") {
        it("lists all void and comp adjustments with authorizedBy") {
            testApplication {
                application { module() }
                val (token, _, uid) = registerAndToken("vc1")

                val itemId = Json.parseToJsonElement(
                    client.post("/menu/items") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Wine","priceCents":1200}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val orderId = placeAndSendOrder(token, itemId)

                client.post("/orders/$orderId/adjust") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"adjustmentType":"COMP","amountCents":1200,
                        "reason":"VIP guest","authorizedBy":"$uid"}""")
                }

                val today = LocalDate.now().toString()
                val res = client.get("/reports/void-comp?from=$today&to=$today") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                res.status shouldBe HttpStatusCode.OK
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["totalCompCents"]!!.jsonPrimitive.long shouldBe 1200L
                body["rows"]!!.jsonArray shouldHaveSize 1
                body["rows"]!!.jsonArray[0].jsonObject["adjustmentType"]!!.jsonPrimitive.content shouldBe "COMP"
            }
        }
    }

    // ─── Ops Metrics ──────────────────────────────────────────────────────────

    describe("GET /reports/ops") {
        it("returns 24 hours in ordersPerHour and top items") {
            testApplication {
                application { module() }
                val (token, _, _) = registerAndToken("ops1")

                val itemId = Json.parseToJsonElement(
                    client.post("/menu/items") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Burger","priceCents":1400}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                placeAndSendOrder(token, itemId, qty = 2)

                val today = LocalDate.now().toString()
                val res = client.get("/reports/ops?from=$today&to=$today") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                res.status shouldBe HttpStatusCode.OK
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject

                // Always 24 hour buckets
                body["ordersPerHour"]!!.jsonArray shouldHaveSize 24

                // Top items should include Burger
                val topItems = body["topItems"]!!.jsonArray
                topItems.any {
                    it.jsonObject["menuItemName"]!!.jsonPrimitive.content == "Burger"
                } shouldBe true
            }
        }
    }
})
