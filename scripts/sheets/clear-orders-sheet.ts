import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { runGwsCommand } from "../../src/tools/googleWorkspace/runGwsCommand";

dotenv.config();

type ParsedRange = {
  sheet: string;
  startCol: string;
  endCol: string;
  startRow: number;
};

function lettersToColumnNumber(value: string): number {
  let out = 0;
  for (const ch of value.toUpperCase()) {
    if (ch < "A" || ch > "Z") return 0;
    out = out * 26 + (ch.charCodeAt(0) - 64);
  }
  return out;
}

function columnNumberToLetters(value: number): string {
  let n = Math.trunc(value);
  if (n <= 0) return "A";
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.trunc((n - 1) / 26);
  }
  return out;
}

function normalizeReadRange(value: string | undefined): string {
  const range = value?.trim() || "Pedidos!A:U";
  const bang = range.indexOf("!");
  if (bang === -1) return `${range}!A:U`;

  const sheet = range.slice(0, bang).trim() || "Pedidos";
  const a1 = range.slice(bang + 1).trim() || "A:U";
  if (!a1.includes(":")) return `${sheet}!A:U`;

  const [startTokenRaw, endTokenRaw] = a1.split(":");
  const startToken = startTokenRaw?.trim() || "A";
  const endToken = endTokenRaw?.trim() || "U";
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);
  if (!endMatch) return `${sheet}!${a1}`;

  const endCol = endMatch[1].toUpperCase();
  const endRow = endMatch[2] ?? "";
  if (lettersToColumnNumber(endCol) >= lettersToColumnNumber("U")) {
    return `${sheet}!${a1}`;
  }

  return `${sheet}!${startToken}:U${endRow}`;
}

function parseRangeMeta(normalizedRange: string): ParsedRange {
  const [sheetRaw, a1Raw = "A:U"] = normalizedRange.split("!");
  const sheet = sheetRaw.trim() || "Pedidos";
  const a1 = a1Raw.trim() || "A:U";
  const [startTokenRaw, endTokenRaw] = a1.split(":");
  const startToken = startTokenRaw?.trim() || "A";
  const endToken = endTokenRaw?.trim() || "U";

  const startMatch = startToken.match(/^([A-Za-z]+)(\d+)?$/);
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);

  const startCol = startMatch?.[1]?.toUpperCase() || "A";
  const endColCandidate = endMatch?.[1]?.toUpperCase() || "U";
  const startRow = Number(startMatch?.[2] ?? "1");
  const startColNum = lettersToColumnNumber(startCol);
  const endColNum = Math.max(lettersToColumnNumber(endColCandidate), lettersToColumnNumber("U"), startColNum);

  return {
    sheet,
    startCol,
    endCol: columnNumberToLetters(endColNum),
    startRow: Number.isInteger(startRow) && startRow > 0 ? startRow : 1
  };
}

function readValuesFromGwsPayload(value: unknown): string[][] | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;
  const candidates: unknown[] = [
    root.values,
    (root.data as Record<string, unknown> | undefined)?.values,
    (root.result as Record<string, unknown> | undefined)?.values,
    (root.response as Record<string, unknown> | undefined)?.values
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map((row) => {
      if (!Array.isArray(row)) return [];
      return row.map((cell) => (cell == null ? "" : String(cell)));
    });
  }
  return undefined;
}

function isHeaderRow(row: string[]): boolean {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  return normalized.includes("folio") && normalized.includes("fecha_hora_entrega");
}

async function main() {
  const config = loadAppConfig();
  const apply = process.env.ORDER_SHEETS_CLEAR_APPLY === "1";
  const gwsCommand = process.env.ORDER_SHEETS_CLEAR_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.ORDER_SHEETS_CLEAR_GWS_COMMAND_ARGS
    ? process.env.ORDER_SHEETS_CLEAR_GWS_COMMAND_ARGS.split(",").map((item) => item.trim()).filter(Boolean)
    : config.orderTool.sheets.gws.commandArgs;
  const spreadsheetId = process.env.ORDER_SHEETS_CLEAR_SPREADSHEET_ID?.trim() || config.orderTool.sheets.gws.spreadsheetId;
  const normalizedRange = normalizeReadRange(process.env.ORDER_SHEETS_CLEAR_RANGE?.trim() || config.orderTool.sheets.gws.range);
  const timeoutMs = config.orderTool.sheets.timeoutMs;

  console.log(
    JSON.stringify(
      {
        event: "orders_sheet_clear_start",
        mode: apply ? "apply" : "preview",
        spreadsheetId: spreadsheetId ? "configured" : "missing",
        range: normalizedRange
      },
      null,
      2
    )
  );

  if (!spreadsheetId) {
    throw new Error("orders_sheet_clear_spreadsheet_id_missing");
  }

  const readResult = await runGwsCommand({
    command: gwsCommand,
    commandArgs: [
      ...gwsCommandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "get",
      "--params",
      JSON.stringify({
        spreadsheetId,
        range: normalizedRange
      })
    ],
    timeoutMs
  });

  if (readResult.timedOut || readResult.exitCode !== 0) {
    throw new Error("orders_sheet_clear_gws_read_failed");
  }

  const parsed = readResult.stdout.trim().length > 0 ? JSON.parse(readResult.stdout) : undefined;
  const rows = readValuesFromGwsPayload(parsed);
  if (!rows) {
    throw new Error("orders_sheet_clear_gws_invalid_payload");
  }

  const meta = parseRangeMeta(normalizedRange);
  const hasHeader = rows.length > 0 && isHeaderRow(rows[0] ?? []);
  const dataStartOffset = hasHeader ? 1 : 0;
  const totalRows = Math.max(rows.length - dataStartOffset, 0);
  const clearStartRow = meta.startRow + dataStartOffset;
  const clearRange = `${meta.sheet}!${meta.startCol}${clearStartRow}:${meta.endCol}`;

  const sample = rows
    .slice(dataStartOffset, dataStartOffset + 5)
    .map((row, idx) => ({
      sheetRow: clearStartRow + idx,
      folio: row[1] ?? "",
      fecha_hora_entrega: row[2] ?? "",
      nombre_cliente: row[3] ?? "",
      producto: row[5] ?? ""
    }));

  console.log(
    JSON.stringify(
      {
        event: "orders_sheet_clear_preview",
        mode: apply ? "apply" : "preview",
        totalRows,
        clearRange,
        sample,
        nextCommand: apply ? undefined : "ORDER_SHEETS_CLEAR_APPLY=1 npm run sheets:orders:clear"
      },
      null,
      2
    )
  );

  if (!apply || totalRows === 0) {
    return;
  }

  const clearResult = await runGwsCommand({
    command: gwsCommand,
    commandArgs: [
      ...gwsCommandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "clear",
      "--params",
      JSON.stringify({
        spreadsheetId,
        range: clearRange
      })
    ],
    timeoutMs
  });

  if (clearResult.timedOut || clearResult.exitCode !== 0) {
    throw new Error("orders_sheet_clear_gws_clear_failed");
  }

  console.log(
    JSON.stringify(
      {
        event: "orders_sheet_clear_complete",
        mode: "apply",
        clearedRows: totalRows,
        clearRange
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(
    JSON.stringify(
      {
        event: "orders_sheet_clear_failed",
        detail
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
