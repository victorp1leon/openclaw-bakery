import { describe, expect, it, vi } from "vitest";

import { createOrderStatusTool } from "./orderStatus";

function okJson(result: unknown) {
  return {
    exitCode: 0,
    signal: null,
    stdout: JSON.stringify(result),
    stderr: "",
    timedOut: false
  };
}

describe("order-status tool", () => {
  it("fails when spreadsheet id is missing", async () => {
    const tool = createOrderStatusTool({
      gwsRange: "Pedidos!A:U"
    });

    await expect(
      tool({ chat_id: "chat-1", query: "ana" })
    ).rejects.toThrow("order_status_gws_spreadsheet_id_missing");
  });

  it("returns status for exact folio match", async () => {
    const rows = [
      ["2026-03-07", "op-abc-1", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "order-1", "2026-03-07T14:00:00"],
      ["2026-03-08", "op-def-2", "2026-03-08 10:00", "Luis", "", "pastel", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "order-2", "2026-03-08T10:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      timezone: "America/Mexico_City",
      now: () => new Date("2026-03-07T12:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "op-abc-1" });
    expect(result.total).toBe(1);
    expect(result.orders[0]?.folio).toBe("op-abc-1");
    expect(result.orders[0]?.estado_operativo).toBe("hoy");
    expect(result.trace_ref).toBe("order-status:op-abc-1:a1");
  });

  it("returns status for customer query", async () => {
    const rows = [
      ["2026-03-07", "op-1", "2026-03-07 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "order-1", "2026-03-07T14:00:00"],
      ["2026-03-08", "op-2", "2026-03-08 10:00", "Luis", "", "pastel", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "order-2", "2026-03-08T10:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      timezone: "America/Mexico_City",
      now: () => new Date("2026-03-09T12:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "ana" });
    expect(result.total).toBe(1);
    expect(result.orders[0]?.nombre_cliente).toBe("Ana");
  });

  it("derives cancelado when cancellation marker exists", async () => {
    const rows = [
      ["2026-03-10", "op-cancel", "2026-03-10 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pendiente", "480", "MXN", "[CANCELADO] 2026-03-09 op:abc", "chat-1", "order-1", "2026-03-10T14:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      now: () => new Date("2026-03-09T12:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "op-cancel" });
    expect(result.orders[0]?.estado_operativo).toBe("cancelado");
  });

  it("derives atrasado when delivery is in the past", async () => {
    const rows = [
      ["2026-03-05", "op-old", "2026-03-05 14:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pendiente", "480", "MXN", "", "chat-1", "order-1", "2026-03-05T14:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      now: () => new Date("2026-03-09T12:00:00.000Z"),
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "op-old" });
    expect(result.orders[0]?.estado_operativo).toBe("atrasado");
  });

  it("returns empty when no match", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [] }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "inexistente" });
    expect(result.total).toBe(0);
    expect(result.orders).toEqual([]);
  });

  it("retries on transient gws timeout and then succeeds", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: null,
        signal: "SIGKILL",
        stdout: "",
        stderr: "timed out",
        timedOut: true
      })
      .mockResolvedValueOnce(okJson({ values: [] }));

    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "ana" });
    expect(result.total).toBe(0);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "ana" })
    ).rejects.toThrow("order_status_gws_command_unavailable");
  });

  it("prioritizes exact id matches before recency", async () => {
    const rows = [
      ["2026-03-12", "op-new", "2026-03-12 10:00", "Ana", "", "cupcakes", "", "12", "", "", "recoger_en_tienda", "", "pagado", "480", "MXN", "", "chat-1", "operation-1", "2026-03-12T10:00:00"],
      ["2026-03-01", "op-target", "2026-03-01 10:00", "Ana", "", "pastel", "", "1", "", "", "envio_domicilio", "", "pendiente", "900", "MXN", "", "chat-1", "operation-2", "2026-03-01T10:00:00"]
    ];

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "op-target" });
    expect(result.total).toBe(1);
    expect(result.orders[0]?.folio).toBe("op-target");
  });

  it("keeps full total before truncating by default limit", async () => {
    const rows: string[][] = [];
    for (let i = 0; i < 12; i += 1) {
      const day = String(i + 1).padStart(2, "0");
      rows.push([
        `2026-03-${day}`,
        `op-ana-${i}`,
        `2026-03-${day} 10:00`,
        "Ana",
        "",
        "cupcakes",
        "",
        "12",
        "",
        "",
        "recoger_en_tienda",
        "",
        "pagado",
        "480",
        "MXN",
        "",
        "chat-1",
        `operation-${i}`,
        `2026-03-${day}T10:00:00`
      ]);
    }

    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: rows }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    const result = await tool({ chat_id: "chat-1", query: "ana" });
    expect(result.total).toBe(12);
    expect(result.orders).toHaveLength(10);
    expect(result.orders[0]?.folio).toBe("op-ana-11");
  });

  it("fails for ambiguous stopword-only query", async () => {
    const gwsRunner = vi.fn().mockResolvedValue(okJson({ values: [] }));
    const tool = createOrderStatusTool({
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Pedidos!A:U",
      gwsRunner
    });

    await expect(
      tool({ chat_id: "chat-1", query: "estado del pedido" })
    ).rejects.toThrow("order_status_query_invalid");
  });
});
