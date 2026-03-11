import { describe, expect, it, vi } from "vitest";

import type { Expense } from "../../schemas/expense";
import { createAppendExpenseTool } from "./appendExpense";

function buildExpense(): Expense {
  return {
    monto: 380,
    concepto: "harina",
    moneda: "MXN",
    categoria: "insumos",
    metodo_pago: "transferencia",
    proveedor: "costco",
    fecha: "2026-03-03",
    notas: "fase2"
  };
}

describe("appendExpenseTool", () => {
  it("returns dry-run by default", async () => {
    const tool = createAppendExpenseTool();

    const result = await tool({
      operation_id: "op-1",
      chat_id: "chat-1",
      payload: buildExpense()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(true);
    expect(result.detail).toContain("dry-run");
  });

  it("fails when gws live is missing spreadsheet id", async () => {
    const tool = createAppendExpenseTool({
      dryRunDefault: false,
      gwsRange: "Gastos!A1"
    });

    await expect(
      tool({
        operation_id: "op-gws-1",
        chat_id: "chat-gws-1",
        payload: buildExpense()
      })
    ).rejects.toThrow("expense_connector_gws_spreadsheet_id_missing");
  });

  it("fails when gws live is missing range", async () => {
    const tool = createAppendExpenseTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1"
    });

    await expect(
      tool({
        operation_id: "op-gws-1b",
        chat_id: "chat-gws-1b",
        payload: buildExpense()
      })
    ).rejects.toThrow("expense_connector_gws_range_missing");
  });

  it("executes append via gws when configured", async () => {
    const gwsRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: JSON.stringify({ ok: true }),
      stderr: "",
      timedOut: false
    });

    const tool = createAppendExpenseTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Gastos!A1",
      gwsValueInputOption: "RAW",
      gwsRunner,
      maxRetries: 0
    });

    const result = await tool({
      operation_id: "op-gws-2",
      chat_id: "chat-gws-2",
      payload: buildExpense()
    });

    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(false);
    expect(gwsRunner).toHaveBeenCalledTimes(1);
    const call = gwsRunner.mock.calls[0]?.[0] as { commandArgs: string[] };
    expect(call.commandArgs).toContain("spreadsheets");
    expect(call.commandArgs).toContain("append");
  });

  it("retries gws call on timeout and then succeeds", async () => {
    const gwsRunner = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: null,
        signal: "SIGKILL",
        stdout: "",
        stderr: "request timeout",
        timedOut: true
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({ ok: true }),
        stderr: "",
        timedOut: false
      });

    const tool = createAppendExpenseTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Gastos!A1",
      gwsRunner,
      maxRetries: 2,
      retryBackoffMs: 0
    });

    const result = await tool({
      operation_id: "op-gws-3",
      chat_id: "chat-gws-3",
      payload: buildExpense()
    });

    expect(result.ok).toBe(true);
    expect(gwsRunner).toHaveBeenCalledTimes(2);
  });

  it("fails when gws command is unavailable", async () => {
    const err = new Error("spawn gws ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    const gwsRunner = vi.fn().mockRejectedValue(err);

    const tool = createAppendExpenseTool({
      dryRunDefault: false,
      gwsSpreadsheetId: "sheet-1",
      gwsRange: "Gastos!A1",
      gwsRunner
    });

    await expect(
      tool({
        operation_id: "op-gws-4",
        chat_id: "chat-gws-4",
        payload: buildExpense()
      })
    ).rejects.toThrow("expense_connector_gws_command_unavailable");
  });
});
