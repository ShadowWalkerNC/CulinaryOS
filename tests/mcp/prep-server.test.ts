import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildShiftPrep, type PrepItem, type ShiftPrepPlan } from "@culinaryos/prep-engine";
import { createPrepServer } from "../../mcp/src/prep-server.js";

const INITIAL_PREP_ITEMS: PrepItem[] = [
  { ingredient: "Diced Onions", currentStock: 2, parLevel: 5, unit: "kg" },
  { ingredient: "Demi-Glace", currentStock: 4, parLevel: 4, unit: "L" },
  { ingredient: "Chopped Parsley", currentStock: 0.5, parLevel: 2, unit: "kg" },
];

async function connect(deps: Parameters<typeof createPrepServer>[0] = {}) {
  const server = createPrepServer(deps);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "prep-test-client", version: "1.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  const first = result.content[0];
  assert.ok(first && first.type === "text" && typeof first.text === "string");
  return first.text;
}

describe("prep-server build_shift_prep MCP protocol integration", () => {
  it("lists build_shift_prep requiring shift + prepItems with 9-value shift enum", async () => {
    const { client } = await connect();
    const tools = await client.listTools();
    const tool = tools.tools.find((t) => t.name === "build_shift_prep");
    assert.ok(tool, "build_shift_prep tool listed");
    const schema = tool.inputSchema as unknown as {
      required?: string[];
      properties?: Record<string, { enum?: string[] }>;
    };
    assert.deepEqual([...(schema.required ?? [])].sort(), ["prepItems", "shift"]);
    assert.deepEqual(schema.properties?.["shift"]?.enum, [
      "morning",
      "afternoon",
      "evening",
      "AM",
      "PM",
      "Brunch",
      "Dinner",
      "Overnight",
      "Custom",
    ]);
  });

  it("calls the shared @culinaryos/prep-engine buildShiftPrep and returns the calculated shortfall plan over MCP protocol", async () => {
    const calls: Array<{ prepItems: PrepItem[]; shift: string; date: string }> = [];
    const { client: instrumentedClient } = await connect({
      buildShiftPrep: (prepItems, shift, date) => {
        calls.push({ prepItems, shift, date });
        return buildShiftPrep(prepItems, shift, date);
      },
    });

    const instrumentedRes = (await instrumentedClient.callTool({
      name: "build_shift_prep",
      arguments: {
        shift: "Dinner",
        prepItems: INITIAL_PREP_ITEMS,
        date: "2026-10-21",
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };

    assert.equal(instrumentedRes.isError, undefined);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      prepItems: INITIAL_PREP_ITEMS,
      shift: "Dinner",
      date: "2026-10-21",
    });

    // Also verify default createPrepServer() (no injected override) produces the identical engine output
    const { client: defaultClient } = await connect();
    const defaultRes = (await defaultClient.callTool({
      name: "build_shift_prep",
      arguments: {
        shift: "Dinner",
        prepItems: INITIAL_PREP_ITEMS,
        date: "2026-10-21",
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };

    assert.equal(defaultRes.isError, undefined);
    const plan = JSON.parse(textOf(defaultRes)) as ShiftPrepPlan;
    assert.deepEqual(plan, {
      shift: "Dinner",
      date: "2026-10-21",
      items: [
        { ingredient: "Diced Onions", prepAmount: 3, unit: "kg" },
        { ingredient: "Chopped Parsley", prepAmount: 1.5, unit: "kg" },
      ],
    });
  });

  it("changes the calculated result appropriately when valid inputs change", async () => {
    const { client } = await connect();

    const updatedItems: PrepItem[] = [
      { ingredient: "Diced Onions", currentStock: 5, parLevel: 5, unit: "kg" },
      { ingredient: "Demi-Glace", currentStock: 1.25, parLevel: 4, unit: "L" },
      { ingredient: "Chopped Parsley", currentStock: 2.5, parLevel: 2, unit: "kg" },
      { ingredient: "Brioche Dough", currentStock: 3, parLevel: 10, unit: "kg" },
    ];

    const resA = (await client.callTool({
      name: "build_shift_prep",
      arguments: {
        shift: "morning",
        prepItems: updatedItems,
        date: "2026-10-22",
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };

    assert.equal(resA.isError, undefined);
    const planA = JSON.parse(textOf(resA)) as ShiftPrepPlan;
    assert.deepEqual(planA, {
      shift: "morning",
      date: "2026-10-22",
      items: [
        { ingredient: "Demi-Glace", prepAmount: 2.75, unit: "L" },
        { ingredient: "Brioche Dough", prepAmount: 7, unit: "kg" },
      ],
    });

    // When all valid items are at or above par, calculated items list is empty (0 shortfalls)
    const allAtPar: PrepItem[] = [
      { ingredient: "Diced Onions", currentStock: 5, parLevel: 5, unit: "kg" },
      { ingredient: "Demi-Glace", currentStock: 6, parLevel: 4, unit: "L" },
    ];
    const resB = (await client.callTool({
      name: "build_shift_prep",
      arguments: {
        shift: "AM",
        prepItems: allAtPar,
        date: "2026-10-23",
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };

    assert.equal(resB.isError, undefined);
    const planB = JSON.parse(textOf(resB)) as ShiftPrepPlan;
    assert.deepEqual(planB, {
      shift: "AM",
      date: "2026-10-23",
      items: [],
    });
  });

  it("returns an explicit error (isError: true) on invalid inputs without calling the engine", async () => {
    let engineCalls = 0;
    const { client } = await connect({
      buildShiftPrep: ((prepItems, shift, date) => {
        engineCalls += 1;
        return buildShiftPrep(prepItems, shift, date);
      }) as typeof buildShiftPrep,
    });

    const invalidPayloads: Array<Record<string, unknown>> = [
      { shift: "midnight", prepItems: INITIAL_PREP_ITEMS },
      { shift: "morning", prepItems: INITIAL_PREP_ITEMS, date: "not-a-date" },
      { shift: "morning", prepItems: INITIAL_PREP_ITEMS, date: "2026-02-30" },
      {
        shift: "morning",
        prepItems: [{ ingredient: "Onions", currentStock: -1, parLevel: 5, unit: "kg" }],
      },
      {
        shift: "morning",
        prepItems: [{ ingredient: "Onions", currentStock: 1, parLevel: 0, unit: "kg" }],
      },
      {
        shift: "morning",
        prepItems: [{ ingredient: "   ", currentStock: 1, parLevel: 5, unit: "kg" }],
      },
      {
        shift: "morning",
        prepItems: [{ ingredient: "Onions", currentStock: 1, parLevel: 5, unit: "" }],
      },
    ];

    for (const badArgs of invalidPayloads) {
      const result = (await client.callTool({
        name: "build_shift_prep",
        arguments: badArgs,
      })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
      assert.equal(result.isError, true, `Expected isError=true for ${JSON.stringify(badArgs)}`);
      assert.match(textOf(result), /^Error executing tool:/);
    }

    assert.equal(engineCalls, 0);
  });

  it("never fabricates success or falls back to MOCK_STATION_PREP when required data is missing or engine dependency is unavailable", async () => {
    const { client } = await connect();

    // Legacy mock payload without prepItems must fail closed, never returning Caramelized Onions
    const missingItemsRes = (await client.callTool({
      name: "build_shift_prep",
      arguments: { shift: "morning", expectedCovers: 150 },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(missingItemsRes.isError, true);
    assert.ok(!textOf(missingItemsRes).includes("Caramelized Onions"));

    // Empty prepItems array must also fail closed
    const emptyItemsRes = (await client.callTool({
      name: "build_shift_prep",
      arguments: { shift: "morning", prepItems: [] },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(emptyItemsRes.isError, true);
    assert.ok(!textOf(emptyItemsRes).includes("Caramelized Onions"));

    // Unavailable (null) engine dependency fails closed
    const { client: nullEngineClient } = await connect({ buildShiftPrep: null });
    const nullEngineRes = (await nullEngineClient.callTool({
      name: "build_shift_prep",
      arguments: { shift: "AM", prepItems: INITIAL_PREP_ITEMS },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(nullEngineRes.isError, true);
    assert.match(textOf(nullEngineRes), /unavailable/i);

    // Throwing engine dependency fails closed
    const { client: throwingEngineClient } = await connect({
      buildShiftPrep: () => {
        throw new Error("engine calculation failure");
      },
    });
    const throwingRes = (await throwingEngineClient.callTool({
      name: "build_shift_prep",
      arguments: { shift: "AM", prepItems: INITIAL_PREP_ITEMS },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(throwingRes.isError, true);
    assert.match(textOf(throwingRes), /engine calculation failure/);
  });
});

describe("prep-server preserved workflows outside build_shift_prep", () => {
  it("preserves get_mise_en_place station lookup and default fallback behavior", async () => {
    const { client } = await connect();

    const coldRes = (await client.callTool({
      name: "get_mise_en_place",
      arguments: { stationId: "cold" },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(coldRes.isError, undefined);
    const coldBody = JSON.parse(textOf(coldRes)) as {
      stationId: string;
      miseEnPlaceList: Array<{ item: string }>;
    };
    assert.equal(coldBody.stationId, "cold");
    assert.equal(coldBody.miseEnPlaceList.length, 3);
    assert.equal(coldBody.miseEnPlaceList[0]?.item, "Washed Arugula & Greens");

    const fallbackRes = (await client.callTool({
      name: "get_mise_en_place",
      arguments: { stationId: "unknown_station" },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(fallbackRes.isError, undefined);
    const fallbackBody = JSON.parse(textOf(fallbackRes)) as {
      stationId: string;
      miseEnPlaceList: Array<{ item: string }>;
    };
    assert.equal(fallbackBody.stationId, "unknown_station");
    assert.equal(fallbackBody.miseEnPlaceList.length, 3);
    assert.equal(fallbackBody.miseEnPlaceList[0]?.item, "Caramelized Onions");
  });

  it("supports project_batch_size, complete_prep_item, save_prep_plan, and update_stock tools", async () => {
    const { client } = await connect();

    // 1. project_batch_size
    const batchRes = (await client.callTool({
      name: "project_batch_size",
      arguments: { portionWeight: 180, covers: 100, wasteFactor: 1.1, unit: "g" },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(batchRes.isError, undefined);
    const batchBody = JSON.parse(textOf(batchRes)) as { projectedBatchWeight: number; unit: string };
    assert.equal(batchBody.projectedBatchWeight, 19800);
    assert.equal(batchBody.unit, "g");

    // 2. complete_prep_item
    const completeRes = (await client.callTool({
      name: "complete_prep_item",
      arguments: {
        taskId: "prep-task-01",
        tenantId: "00000000-0000-0000-0000-000000000001",
        decrements: [{ ingredient: "Diced Onions", quantity: 3, unit: "kg" }],
        completedBy: "Chef Marco",
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(completeRes.isError, undefined);
    const completeBody = JSON.parse(textOf(completeRes)) as {
      eventType: string;
      payload: { taskId: string; decrements: Array<{ ingredient: string; quantity: number }> };
    };
    assert.equal(completeBody.eventType, "prep.task.completed");
    assert.equal(completeBody.payload.taskId, "prep-task-01");
    assert.equal(completeBody.payload.decrements[0]?.quantity, 3);

    // 3. save_prep_plan
    const saveRes = (await client.callTool({
      name: "save_prep_plan",
      arguments: {
        tenantId: "00000000-0000-0000-0000-000000000001",
        shift: "Dinner",
        date: "2026-10-28",
        items: [{ ingredient: "Diced Onions", prepAmount: 3, unit: "kg" }],
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(saveRes.isError, undefined);
    const saveBody = JSON.parse(textOf(saveRes)) as { saved: boolean; itemCount: number };
    assert.equal(saveBody.saved, true);
    assert.equal(saveBody.itemCount, 1);

    // 4. update_stock
    const stockRes = (await client.callTool({
      name: "update_stock",
      arguments: {
        ingredient: "Diced Onions",
        currentStock: 2,
        delta: 1.5,
        parLevel: 5,
        unit: "kg",
      },
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(stockRes.isError, undefined);
    const stockBody = JSON.parse(textOf(stockRes)) as {
      updatedStock: number;
      shortfall: number;
      needsPrep: boolean;
    };
    assert.equal(stockBody.updatedStock, 3.5);
    assert.equal(stockBody.shortfall, 1.5);
    assert.equal(stockBody.needsPrep, true);
  });

  it("returns isError for unknown tools", async () => {
    const { client } = await connect();
    const result = (await client.callTool({
      name: "does_not_exist",
      arguments: {},
    })) as unknown as { content: Array<{ type: string; text?: string }>; isError?: boolean };
    assert.equal(result.isError, true);
    assert.match(textOf(result), /Tool not found: does_not_exist/);
  });
});
