package com.culinaryos.backend

import com.culinaryos.backend.domain.payments.ReceiptEngine
import com.culinaryos.backend.domain.payments.ReceiptData
import com.culinaryos.backend.domain.payments.ReceiptLine
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.shouldNotBe
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*
import java.time.Instant

class PaymentTest : DescribeSpec({

    // ─── ReceiptEngine unit tests (pure — no DB) ─────────────────────────────

    val sampleData = ReceiptData(
        restaurantName    = "The Test Bistro",
        restaurantAddress = "123 Main St",
        receiptNumber     = "RCP-2026-0001",
        processedAt       = Instant.parse("2026-12-01T20:00:00Z"),
        lines = listOf(
            ReceiptLine("Ribeye",    1, 3500, 3500, ""),
            ReceiptLine("House Wine",2, 1200, 2400, "Red")
        ),
        subtotalCents    = 5900,
        tipCents         = 885,
        totalCents       = 6785,
        amountPaidCents  = 8000,
        changeCents      = 1215,
        paymentMethod    = "CASH",
        serverName       = "Jane"
    )

    describe("ReceiptEngine.renderHtml") {
        it("includes restaurant name, receipt number, and total") {
            val html = ReceiptEngine.renderHtml(sampleData)
            html shouldContain "The Test Bistro"
            html shouldContain "RCP-2026-0001"
            html shouldContain "\$67.85"  // totalCents = 6785
            html shouldContain "\$12.15"  // changeCents = 1215
        }

        it("includes all line items") {
            val html = ReceiptEngine.renderHtml(sampleData)
            html shouldContain "Ribeye"
            html shouldContain "House Wine"
            html shouldContain "Red"  // modifier
        }
    }

    describe("ReceiptEngine.renderEscPos") {
        it("produces non-empty byte array starting with ESC @") {
            val bytes = ReceiptEngine.renderEscPos(sampleData)
            bytes.isNotEmpty() shouldBe true
            bytes[0] shouldBe 0x1B.toByte()  // ESC
            bytes[1] shouldBe 0x40.toByte()  // @
        }

        it("ends with ESC i (full cut)") {
            val bytes = ReceiptEngine.renderEscPos(sampleData)
            // ESC i is the last two bytes before the end
            val last2 = bytes.takeLast(2)
            last2[0] shouldBe 0x1B.toByte()
            last2[1] shouldBe 0x69.toByte()
        }
    }

    describe("ReceiptEngine.formatCents") {
        it("formats cents correctly") {
            ReceiptEngine.formatCents(0)     shouldBe "\$0.00"
            ReceiptEngine.formatCents(100)   shouldBe "\$1.00"
            ReceiptEngine.formatCents(1299)  shouldBe "\$12.99"
            ReceiptEngine.formatCents(6785)  shouldBe "\$67.85"
        }
    }

    // ─── Cash change calculator ─────────────────────────────────────────────

    describe("POST /payments/change") {
        it("calculates correct change for cash tender") {
            testApplication {
                application { module() }
                val res = client.post("/payments/change") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"amountCents":4275,"tenderAmountCents":5000}""")
                }
                res.status shouldBe HttpStatusCode.OK
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["changeCents"]!!.jsonPrimitive.int      shouldBe 725
                body["changeFormatted"]!!.jsonPrimitive.content shouldBe "\$7.25"
            }
        }

        it("returns zero change for exact tender") {
            testApplication {
                application { module() }
                val res = client.post("/payments/change") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"amountCents":3000,"tenderAmountCents":3000}""")
                }
                val body = Json.parseToJsonElement(res.bodyAsText()).jsonObject
                body["changeCents"]!!.jsonPrimitive.int shouldBe 0
            }
        }
    }

    // ─── Full payment flow ───────────────────────────────────────────────────

    describe("POST /payments/record") {
        it("records cash payment, closes order, generates receipt") {
            testApplication {
                application { module() }

                // Setup: register, create item, place order, send to kitchen
                val regRes = client.post("/auth/register") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"orgName":"PayOrg","restaurantName":"PayRest",
                        "timezone":"America/New_York",
                        "email":"pay${System.nanoTime()}@test.com",
                        "password":"password123","name":"Pay Owner"}""")
                }
                val token = Json.parseToJsonElement(regRes.bodyAsText())
                    .jsonObject["accessToken"]!!.jsonPrimitive.content

                val itemId = Json.parseToJsonElement(
                    client.post("/menu/items") {
                        contentType(ContentType.Application.Json)
                        header(HttpHeaders.Authorization, "Bearer $token")
                        setBody("""{"name":"Burger","priceCents":1400}""")
                    }.bodyAsText()
                ).jsonObject["id"]!!.jsonPrimitive.content

                val orderRes = client.post("/orders") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""{"lines":[{"menuItemId":"$itemId","quantity":2}]}""")
                }
                val orderId = Json.parseToJsonElement(orderRes.bodyAsText())
                    .jsonObject["id"]!!.jsonPrimitive.content

                client.post("/orders/$orderId/send") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }

                // Assign receipt number
                client.post("/orders/$orderId/receipt-number") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }

                // Record cash payment: 2 × $14.00 = $28.00, tender $30.00
                val payRes = client.post("/payments/record") {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    setBody("""
                        {
                          "orderId": "$orderId",
                          "method": "CASH",
                          "amountCents": 2800,
                          "tenderAmountCents": 3000,
                          "deliveryMethod": "PRINT"
                        }
                    """)
                }
                payRes.status shouldBe HttpStatusCode.Created
                val payBody = Json.parseToJsonElement(payRes.bodyAsText()).jsonObject
                payBody["totalCents"]!!.jsonPrimitive.int   shouldBe 2800
                payBody["changeCents"]!!.jsonPrimitive.int  shouldBe 200   // $2.00 change
                payBody["status"]!!.jsonPrimitive.content   shouldBe "COMPLETED"
                val receiptId = payBody["receiptId"]!!.jsonPrimitive.content
                receiptId shouldNotBe ""

                // Fetch receipt HTML
                val htmlRes = client.get("/payments/receipt/$receiptId") {
                    header(HttpHeaders.Authorization, "Bearer $token")
                }
                htmlRes.status shouldBe HttpStatusCode.OK
                htmlRes.bodyAsText() shouldContain "RCP-"
                htmlRes.bodyAsText() shouldContain "\$28.00"
            }
        }
    }
})
