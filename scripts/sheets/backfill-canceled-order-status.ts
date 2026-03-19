import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { runGwsCommand } from "../../src/tools/googleWorkspace/runGwsCommand";

dotenv.config();

type ParsedRange = {
  sheet: string;
  startCol: string;
  startRow: number;
  width: number;
};

type TargetRow = {
  sheetRow: number;
  row: string[];
  folio: string;
  estadoPedido?: string;
  notesPreview: string;
};

const INDEX = {
  folio: 1,
  notas: 15,
  estado_pedido: 19
} as const;

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
  const sheet = range.slice(0, bang).trim();
  const a1 = range.slice(bang + 1).trim();
  if (!sheet) return "Pedidos!A:U";
  if (!a1) return `${sheet}!A:U`;
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
  const endToken = endTokenRaw?.trim() || startToken;

  const startMatch = startToken.match(/^([A-Za-z]+)(\d+)?$/);
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);
  const startCol = startMatch?.[1]?.toUpperCase() || "A";
  const endCol = endMatch?.[1]?.toUpperCase() || "U";
  const startRow = Number(startMatch?.[2] ?? "1");

  const startColNum = lettersToColumnNumber(startCol);
  const endColNum = lettersToColumnNumber(endCol);
  const width = startColNum > 0 && endColNum >= startColNum ? endColNum - startColNum + 1 : 21;

  return {
    sheet,
    startCol,
    startRow: Number.isInteger(startRow) && startRow > 0 ? startRow : 1,
    width
  };
}

function rowRangeFor(args: { meta: ParsedRange; row: number; width: number }): string {
  const startColNum = lettersToColumnNumber(args.meta.startCol) || 1;
  const endColNum = startColNum + Math.max(1, args.width) - 1;
  const endCol = columnNumberToLetters(endColNum);
  return `${args.meta.sheet}!${args.meta.startCol}${args.row}:${endCol}${args.row}`;
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
  return normalized.includes("folio") && normalized.includes("notas");
}

function toPreview(value: string): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  return singleLine.length > 120 ? `${singleLine.slice(0, 120)}...` : singleLine;
}

async function main() {
  const config = loadAppConfig();
  const apply = process.env.ORDER_CANCEL_STATUS_BACKFILL_APPLY === "1";
  const gwsCommand = process.env.ORDER_CANCEL_STATUS_BACKFILL_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.ORDER_CANCEL_STATUS_BACKFILL_GWS_COMMAND_ARGS
    ? process.env.ORDER_CANCEL_STATUS_BACKFILL_GWS_COMMAND_ARGS.split(",").map((item) => item.trim()).filter(Boolean)
    : config.orderTool.sheets.gws.commandArgs;
  const spreadsheetId = process.env.ORDER_CANCEL_STATUS_BACKFILL_SPREADSHEET_ID?.trim() || config.orderTool.sheets.gws.spreadsheetId;
  const normalizedRange = normalizeReadRange(
    process.env.ORDER_CANCEL_STATUS_BACKFILL_RANGE?.trim() || config.orderTool.sheets.gws.range
  );
  const valueInputOption = config.orderTool.sheets.gws.valueInputOption;
  const timeoutMs = config.orderTool.sheets.timeoutMs;

  console.log(
    JSON.stringify(
      {
        event: "orders_cancel_status_backfill_start",
        mode: apply ? "apply" : "preview",
        spreadsheetId: spreadsheetId ? "configured" : "missing",
        range: normalizedRange
      },
      null,
      2
    )
  );

  if (!spreadsheetId) {
    throw new Error("orders_cancel_status_backfill_spreadsheet_id_missing");
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
    throw new Error("orders_cancel_status_backfill_gws_read_failed");
  }

  const parsed = readResult.stdout.trim().length > 0 ? JSON.parse(readResult.stdout) : undefined;
  const rows = readValuesFromGwsPayload(parsed);
  if (!rows) {
    throw new Error("orders_cancel_status_backfill_gws_invalid_payload");
  }

  const rangeMeta = parseRangeMeta(normalizedRange);
  const hasHeader = rows.length > 0 && isHeaderRow(rows[0]);
  const skip = hasHeader ? 1 : 0;
  const writeWidth = Math.max(rangeMeta.width, INDEX.estado_pedido + 1);

  const targets: TargetRow[] = [];
  for (let idx = 0; idx < rows.length - skip; idx += 1) {
    const sourceRow = rows[idx + skip] ?? [];
    const row = Array.from({ length: writeWidth }, (_, colIdx) => sourceRow[colIdx] ?? "");
    const folio = row[INDEX.folio]?.trim() || "";
    const notes = row[INDEX.notas] ?? "";
    const estadoPedido = row[INDEX.estado_pedido]?.trim();
    const hasCancelMarker = notes.toLowerCase().includes("[cancelado]");
    const isCanceledByStatus = (estadoPedido ?? "").toLowerCase() === "cancelado";

    if (hasCancelMarker && !isCanceledByStatus) {
      targets.push({
        sheetRow: rangeMeta.startRow + skip + idx,
        row,
        folio,
        estadoPedido,
        notesPreview: toPreview(notes)
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        event: "orders_cancel_status_backfill_preview",
        mode: apply ? "apply" : "preview",
        totalRows: rows.length - skip,
        targets: targets.length,
        sample: targets.slice(0, 5).map((item) => ({
          sheetRow: item.sheetRow,
          folio: item.folio,
          estado_pedido_before: item.estadoPedido ?? "",
          notes_preview: item.notesPreview
        })),
        nextCommand: apply ? undefined : "ORDER_CANCEL_STATUS_BACKFILL_APPLY=1 npm run sheets:orders:backfill-canceled-status"
      },
      null,
      2
    )
  );

  if (!apply) {
    return;
  }

  let updated = 0;
  for (const target of targets) {
    target.row[INDEX.estado_pedido] = "cancelado";
    const writeResult = await runGwsCommand({
      command: gwsCommand,
      commandArgs: [
        ...gwsCommandArgs,
        "sheets",
        "spreadsheets",
        "values",
        "update",
        "--params",
        JSON.stringify({
          spreadsheetId,
          range: rowRangeFor({ meta: rangeMeta, row: target.sheetRow, width: writeWidth }),
          valueInputOption
        }),
        "--json",
        JSON.stringify({
          values: [target.row]
        })
      ],
      timeoutMs
    });

    if (writeResult.timedOut || writeResult.exitCode !== 0) {
      throw new Error(`orders_cancel_status_backfill_gws_write_failed_row_${target.sheetRow}`);
    }
    updated += 1;
  }

  console.log(
    JSON.stringify(
      {
        event: "orders_cancel_status_backfill_complete",
        mode: "apply",
        updated
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        event: "orders_cancel_status_backfill_failed",
        detail
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
