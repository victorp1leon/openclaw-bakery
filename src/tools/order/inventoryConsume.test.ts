import { describe, expect, it, vi } from "vitest";

import { createInventoryConsumeTool, type InventoryRecipeProfile } from "./inventoryConsume";
import type { GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

const ORDERS_RANGE = "Pedidos!A:U";
const INVENTORY_RANGE = "Inventario!A:G";
const MOVEMENTS_RANGE = "MovimientosInventario!A:J";
const RECIPES_RANGE = "CatalogoRecetas!A:F";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

function timedOutResult() {
  return {
    exitCode: null,
    signal: "SIGKILL" as const,
    stdout: "",
    stderr: "timed out",
    timedOut: true
  };
}

function parseMethod(commandArgs: string[]): "get" | "update" {
  const valuesIdx = commandArgs.indexOf("values");
  const method = valuesIdx >= 0 ? commandArgs[valuesIdx + 1] : "";
  if (method === "get" || method === "update") return method;
  throw new Error(`unexpected_method:${method}`);
}

function parseParams(commandArgs: string[]): Record<string, unknown> {
  const idx = commandArgs.indexOf("--params");
  if (idx < 0 || !commandArgs[idx + 1]) return {};
  return JSON.parse(commandArgs[idx + 1]);
}

function parseJson(commandArgs: string[]): Record<string, unknown> {
  const idx = commandArgs.indexOf("--json");
  if (idx < 0 || !commandArgs[idx + 1]) return {};
  return JSON.parse(commandArgs[idx + 1]);
}

function buildOrdersHeader(): string[] {
  return [
    "fecha_registro",
    "folio",
    "fecha_hora_entrega",
    "nombre_cliente",
    "telefono",
    "producto",
    "descripcion_producto",
    "cantidad",
    "sabor_pan",
    "sabor_relleno",
    "tipo_envio",
    "direccion",
    "estado_pago",
    "total",
    "moneda",
    "notas",
    "chat_id",
    "operation_id",
    "fecha_hora_entrega_iso",
    "estado_pedido",
    "trello_card_id"
  ];
}

function buildOrderRow(overrides: Partial<Record<number, string>> = {}): string[] {
  const row = [
    "2026-03-10T08:00:00.000Z",
    "folio-001",
    "2026-03-12 10:00",
    "Ana",
    "5512345678",
    "pastel",
    "chocolate",
    "1",
    "chocolate",
    "oreo",
    "recoger_en_tienda",
    "",
    "pendiente",
    "900",
    "MXN",
    "nota inicial",
    "chat-1",
    "op-create-1",
    "2026-03-12T10:00:00",
    "activo",
    ""
  ];

  for (const [idx, value] of Object.entries(overrides)) {
    row[Number(idx)] = value as string;
  }

  return row;
}

function buildInventoryHeader(): string[] {
  return ["insumo_id", "insumo", "unidad_base", "stock_actual", "stock_minimo", "activo", "actualizado_en"];
}

function buildInventoryRow(overrides: Partial<Record<number, string | number>> = {}): Array<string | number> {
  const row: Array<string | number> = ["harina", "Harina", "g", 1500, 500, "1", ""];
  for (const [idx, value] of Object.entries(overrides)) {
    row[Number(idx)] = value as string | number;
  }
  return row;
}

function buildMovementsHeader(): string[] {
  return [
    "movimiento_id",
    "operation_id",
    "order_ref",
    "evento",
    "insumo_id",
    "delta_cantidad",
    "stock_antes",
    "stock_despues",
    "unidad",
    "created_at"
  ];
}

function buildMovementRow(overrides: Partial<Record<number, string | number>> = {}): Array<string | number> {
  const row: Array<string | number> = [
    "mov-01",
    "op-other",
    "folio-001",
    "consume",
    "harina",
    -100,
    1000,
    900,
    "g",
    "2026-03-10T10:00:00.000Z"
  ];
  for (const [idx, value] of Object.entries(overrides)) {
    row[Number(idx)] = value as string | number;
  }
  return row;
}

function buildRecipesHeader(): string[] {
  return ["recipe_id", "aliases_csv", "insumo", "unidad", "cantidad_por_unidad", "activo"];
}

function buildRunner(args: {
  valuesByRange: Record<string, string[][]>;
  failOnUpdateCall?: number;
  failUpdateStderr?: string;
  transientTimeoutOnFirstGet?: boolean;
  commandUnavailable?: boolean;
}) {
  const writes: Array<{ range: string; body: Record<string, unknown> }> = [];
  let getCall = 0;
  let updateCall = 0;

  const runner = vi.fn(async ({ commandArgs }: { commandArgs: string[] }) => {
    if (args.commandUnavailable) {
      const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }

    const method = parseMethod(commandArgs);
    const params = parseParams(commandArgs);
    const range = String(params.range ?? "");

    if (method === "get") {
      getCall += 1;
      if (args.transientTimeoutOnFirstGet && getCall === 1) {
        return timedOutResult();
      }
      return okJson({ values: args.valuesByRange[range] ?? [] });
    }

    updateCall += 1;
    if (args.failOnUpdateCall && updateCall === args.failOnUpdateCall) {
      return {
        exitCode: 1,
        signal: null,
        stdout: "",
        stderr: args.failUpdateStderr ?? "rate limit",
        timedOut: false
      };
    }

    const body = parseJson(commandArgs);
    writes.push({ range, body });
    return okJson({ updatedRange: range });
  });

  return { runner: runner as unknown as GwsCommandRunner, writes };
}

function makeTool(args: {
  gwsRunner: GwsCommandRunner;
  recipeProfiles?: InventoryRecipeProfile[];
  recipeSource?: "inline" | "gws";
  allowNegativeStock?: boolean;
}) {
  return createInventoryConsumeTool({
    dryRunDefault: false,
    gwsSpreadsheetId: "sheet-1",
    ordersGwsRange: ORDERS_RANGE,
    inventoryGwsRange: INVENTORY_RANGE,
    movementsGwsRange: MOVEMENTS_RANGE,
    recipesGwsRange: RECIPES_RANGE,
    recipeSource: args.recipeSource ?? "inline",
    recipeProfiles: args.recipeProfiles,
    now: () => new Date("2026-03-11T12:00:00.000Z"),
    allowNegativeStock: args.allowNegativeStock ?? false,
    gwsRunner: args.gwsRunner
  });
}

const SIMPLE_RECIPE: InventoryRecipeProfile[] = [
  {
    id: "pastel",
    aliases: ["pastel"],
    items: [{ item: "harina", unit: "g", perUnit: 250 }]
  }
];

describe("inventory-consume tool", () => {
  it("fails when reference is missing", async () => {
    const tool = createInventoryConsumeTool();

    await expect(
      tool({
        operation_id: "op-consume-1",
        chat_id: "chat-1",
        reference: {}
      })
    ).rejects.toThrow("inventory_consume_reference_missing");
  });

  it("fails when order is not found", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow({ 1: "folio-xyz" })],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow().map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-2",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_not_found");
  });

  it("fails when order reference is ambiguous", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [
          buildOrdersHeader(),
          buildOrderRow({ 1: "folio-001", 17: "op-a" }),
          buildOrderRow({ 1: "folio-001", 17: "op-b" })
        ],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow().map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-3",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_reference_ambiguous");
  });

  it("fails when folio and operation_id_ref conflict", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [
          buildOrdersHeader(),
          buildOrderRow({ 1: "folio-001", 17: "op-a" }),
          buildOrderRow({ 1: "folio-002", 17: "op-b" })
        ],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow().map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-4",
        chat_id: "chat-1",
        reference: { folio: "folio-001", operation_id_ref: "op-b" }
      })
    ).rejects.toThrow("inventory_consume_reference_ambiguous");
  });

  it("rejects consume for canceled order", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow({ 19: "cancelado" })],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow().map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-5",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_order_canceled");
  });

  it("fails when recipe is missing", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow({ 5: "producto-inexistente" })],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow().map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({
      gwsRunner: runner,
      recipeProfiles: [{ id: "cupcake", aliases: ["cupcake"], items: [{ item: "harina", unit: "g", perUnit: 45 }] }]
    });

    await expect(
      tool({
        operation_id: "op-consume-6",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_recipe_not_found");
  });

  it("fails when unit conversion is not supported", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 2: "g" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({
      gwsRunner: runner,
      recipeProfiles: [
        {
          id: "pastel",
          aliases: ["pastel"],
          items: [{ item: "harina", unit: "lb", perUnit: 1 }]
        }
      ]
    });

    await expect(
      tool({
        operation_id: "op-consume-7",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_unit_not_supported");
  });

  it("fails when supply is missing or inactive", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 5: "0" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-8",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_supply_not_found");
  });

  it("fails when stock is insufficient and negative is not allowed", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 2: "kg", 3: "0.2" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({
      gwsRunner: runner,
      recipeProfiles: [{ id: "pastel", aliases: ["pastel"], items: [{ item: "harina", unit: "g", perUnit: 333 }] }]
    });

    await expect(
      tool({
        operation_id: "op-consume-9",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_insufficient_stock");
  });

  it("normalizes grams and kilograms using half-up rounding", async () => {
    const { runner, writes } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 2: "kg", 3: "1" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({
      gwsRunner: runner,
      recipeProfiles: [{ id: "pastel", aliases: ["pastel"], items: [{ item: "harina", unit: "g", perUnit: 333 }] }]
    });

    const result = await tool({
      operation_id: "op-consume-10",
      chat_id: "chat-1",
      reference: { folio: "folio-001" }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.consumed).toHaveLength(1);
    expect(result.payload.consumed[0]).toMatchObject({
      unidad: "kg",
      delta_cantidad: -0.333,
      stock_antes: 1,
      stock_despues: 0.667
    });

    expect(writes).toHaveLength(2);
    expect(writes[0].body.values).toEqual([expect.arrayContaining(["harina", "Harina", "kg", 0.667])]);
    expect(writes[1].body.values).toEqual([expect.arrayContaining(["op-consume-10", "folio-001", "consume", "harina", -0.333])]);
  });

  it("consumes inventory and writes movements", async () => {
    const { runner, writes } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 3: "1500" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    const result = await tool({
      operation_id: "op-consume-11",
      chat_id: "chat-1",
      reference: { folio: "folio-001" }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.idempotent_replay).toBe(false);
    expect(result.payload.movements_written).toBe(1);
    expect(result.payload.consumed[0]).toMatchObject({
      insumo: "Harina",
      unidad: "g",
      delta_cantidad: -250,
      stock_antes: 1500,
      stock_despues: 1250
    });
    expect(writes).toHaveLength(2);
  });

  it("returns idempotent noop when operation was already consumed", async () => {
    const { runner, writes } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow().map(String)],
        [MOVEMENTS_RANGE]: [
          buildMovementsHeader(),
          buildMovementRow({ 1: "op-consume-12", 2: "folio-001", 3: "consume", 4: "harina" }).map(String)
        ]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    const result = await tool({
      operation_id: "op-consume-12",
      chat_id: "chat-1",
      reference: { folio: "folio-001" }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.idempotent_replay).toBe(true);
    expect(result.detail).toContain("Consumo ya aplicado para folio-001");
    expect(writes).toHaveLength(0);
  });

  it("returns reconciliation detail on partial failure", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 3: "1500" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      },
      failOnUpdateCall: 2,
      failUpdateStderr: "invalid_update_payload"
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-13",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow(/inventory_consume_partial_failure:.*"order_ref":"folio-001"/);
  });

  it("retries on transient gws failure then succeeds", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 3: "1500" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()]
      },
      transientTimeoutOnFirstGet: true
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    const result = await tool({
      operation_id: "op-consume-14",
      chat_id: "chat-1",
      reference: { folio: "folio-001" }
    });

    expect(result.ok).toBe(true);
    expect(runner).toHaveBeenCalled();
  });

  it("fails when gws command is unavailable", async () => {
    const { runner } = buildRunner({
      valuesByRange: {},
      commandUnavailable: true
    });

    const tool = makeTool({ gwsRunner: runner, recipeProfiles: SIMPLE_RECIPE });

    await expect(
      tool({
        operation_id: "op-consume-15",
        chat_id: "chat-1",
        reference: { folio: "folio-001" }
      })
    ).rejects.toThrow("inventory_consume_gws_command_unavailable");
  });

  it("loads recipes from gws when recipeSource is gws", async () => {
    const { runner } = buildRunner({
      valuesByRange: {
        [ORDERS_RANGE]: [buildOrdersHeader(), buildOrderRow()],
        [INVENTORY_RANGE]: [buildInventoryHeader(), buildInventoryRow({ 3: "1500" }).map(String)],
        [MOVEMENTS_RANGE]: [buildMovementsHeader()],
        [RECIPES_RANGE]: [buildRecipesHeader(), ["pastel", "pastel", "harina", "g", "250", "1"]]
      }
    });

    const tool = makeTool({ gwsRunner: runner, recipeSource: "gws" });

    const result = await tool({
      operation_id: "op-consume-16",
      chat_id: "chat-1",
      reference: { folio: "folio-001" }
    });

    expect(result.ok).toBe(true);
    expect(result.payload.movements_written).toBe(1);
  });
});
