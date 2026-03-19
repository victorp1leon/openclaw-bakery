import dotenv from "dotenv";

import { loadAppConfig } from "../../../../src/config/appConfig";
import { runGwsCommand } from "../../../../src/tools/googleWorkspace/runGwsCommand";

dotenv.config();

type Mode = "preview" | "apply" | "verify";

type Target = {
  name: "orders" | "expenses";
  command: string;
  commandArgs: string[];
  timeoutMs: number;
  spreadsheetId?: string;
  defaultSheet: string;
  configuredRange?: string;
  minEndCol: string;
  header: string[];
  sampleFields: Array<{ key: string; index: number }>;
};

type ParsedRange = {
  sheet: string;
  startCol: string;
  endCol: string;
  startRow: number;
};

type PreviewResult = {
  target: Target;
  normalizedRange: string;
  clearRange: string;
  headerRange: string;
  totalRows: number;
  headerCurrent: string[];
  headerMatch: boolean;
  sample: Array<Record<string, string | number>>;
};

const ORDER_HEADER = [
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

const EXPENSE_HEADER = [
  "fecha",
  "monto",
  "moneda",
  "concepto",
  "categoria",
  "metodo_pago",
  "proveedor",
  "notas",
  "chat_id",
  "operation_id"
];

function parseMode(argv: string[]): Mode {
  const idx = argv.indexOf("--mode");
  const raw = (idx >= 0 ? argv[idx + 1] : "preview")?.trim().toLowerCase();
  if (raw === "preview" || raw === "apply" || raw === "verify") return raw;
  throw new Error("cleanup_invalid_mode");
}

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

function sheetFromRange(value: string | undefined, fallback: string): string {
  const range = value?.trim() || "";
  const bang = range.indexOf("!");
  if (bang === -1) return range || fallback;
  return range.slice(0, bang).trim() || fallback;
}

function normalizeReadRange(args: {
  configuredRange?: string;
  defaultSheet: string;
  minEndCol: string;
}): string {
  const minEndColNum = lettersToColumnNumber(args.minEndCol);
  const value = args.configuredRange?.trim();
  if (!value) return `${args.defaultSheet}!A:${args.minEndCol}`;

  const bang = value.indexOf("!");
  if (bang === -1) return `${value}!A:${args.minEndCol}`;

  const sheet = value.slice(0, bang).trim() || args.defaultSheet;
  const a1 = value.slice(bang + 1).trim();
  if (!a1) return `${sheet}!A:${args.minEndCol}`;
  if (!a1.includes(":")) return `${sheet}!A:${args.minEndCol}`;

  const [startRaw, endRaw] = a1.split(":");
  const start = startRaw?.trim() || "A";
  const end = endRaw?.trim() || args.minEndCol;
  const endMatch = end.match(/^([A-Za-z]+)(\d+)?$/);
  if (!endMatch) return `${sheet}!${a1}`;

  const endCol = endMatch[1].toUpperCase();
  const endRow = endMatch[2] ?? "";
  if (lettersToColumnNumber(endCol) >= minEndColNum) return `${sheet}!${a1}`;

  return `${sheet}!${start}:${args.minEndCol}${endRow}`;
}

function parseRangeMeta(normalizedRange: string, minEndCol: string): ParsedRange {
  const [sheetRaw, a1Raw = `A:${minEndCol}`] = normalizedRange.split("!");
  const sheet = sheetRaw.trim();
  const [startRaw, endRaw] = a1Raw.trim().split(":");
  const start = startRaw?.trim() || "A";
  const end = endRaw?.trim() || minEndCol;
  const startMatch = start.match(/^([A-Za-z]+)(\d+)?$/);
  const endMatch = end.match(/^([A-Za-z]+)(\d+)?$/);
  const startCol = startMatch?.[1]?.toUpperCase() || "A";
  const endColCandidate = endMatch?.[1]?.toUpperCase() || minEndCol;
  const startColNum = lettersToColumnNumber(startCol);
  const endColNum = Math.max(
    lettersToColumnNumber(endColCandidate),
    lettersToColumnNumber(minEndCol),
    startColNum
  );
  const startRow = Number(startMatch?.[2] ?? "1");
  return {
    sheet,
    startCol,
    endCol: columnNumberToLetters(endColNum),
    startRow: Number.isInteger(startRow) && startRow > 0 ? startRow : 1
  };
}

function parseValuesPayload(value: unknown): string[][] {
  if (!value || typeof value !== "object") return [];
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
  return [];
}

function normalizeHeaderCell(value: string): string {
  return value.trim().toLowerCase();
}

function headerMatches(current: string[], expected: string[]): boolean {
  if (current.length < expected.length) return false;
  for (let idx = 0; idx < expected.length; idx += 1) {
    if (normalizeHeaderCell(current[idx] ?? "") !== normalizeHeaderCell(expected[idx] ?? "")) {
      return false;
    }
  }
  return true;
}

function isHeaderRow(row: string[], expected: string[]): boolean {
  if (row.length === 0) return false;
  if (headerMatches(row, expected)) return true;
  const normalized = row.map(normalizeHeaderCell);
  return normalized.includes(normalizeHeaderCell(expected[0])) && normalized.includes(normalizeHeaderCell(expected[1] ?? ""));
}

async function readRows(target: Target, normalizedRange: string): Promise<string[][]> {
  if (!target.spreadsheetId) {
    throw new Error(`${target.name}_spreadsheet_id_missing`);
  }

  const result = await runGwsCommand({
    command: target.command,
    commandArgs: [
      ...target.commandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "get",
      "--params",
      JSON.stringify({
        spreadsheetId: target.spreadsheetId,
        range: normalizedRange
      })
    ],
    timeoutMs: target.timeoutMs
  });

  if (result.timedOut || result.exitCode !== 0) {
    throw new Error(`${target.name}_gws_read_failed`);
  }

  const payload = result.stdout.trim().length > 0 ? JSON.parse(result.stdout) : undefined;
  return parseValuesPayload(payload);
}

function buildPreview(target: Target, rows: string[][], normalizedRange: string): PreviewResult {
  const meta = parseRangeMeta(normalizedRange, target.minEndCol);
  const hasHeader = rows.length > 0 && isHeaderRow(rows[0] ?? [], target.header);
  const dataStartOffset = hasHeader ? 1 : 0;
  const totalRows = Math.max(rows.length - dataStartOffset, 0);
  const clearStartRow = meta.startRow + dataStartOffset;
  const clearRange = `${meta.sheet}!${meta.startCol}${clearStartRow}:${meta.endCol}`;
  const headerRange = `${meta.sheet}!${meta.startCol}${meta.startRow}:${meta.endCol}${meta.startRow}`;
  const headerCurrent = rows[0] ?? [];
  const sample = rows.slice(dataStartOffset, dataStartOffset + 5).map((row, idx) => {
    const out: Record<string, string | number> = { sheetRow: clearStartRow + idx };
    for (const field of target.sampleFields) {
      out[field.key] = row[field.index] ?? "";
    }
    return out;
  });

  return {
    target,
    normalizedRange,
    clearRange,
    headerRange,
    totalRows,
    headerCurrent,
    headerMatch: headerMatches(headerCurrent, target.header),
    sample
  };
}

async function clearRows(target: Target, clearRange: string): Promise<void> {
  if (!target.spreadsheetId) {
    throw new Error(`${target.name}_spreadsheet_id_missing`);
  }

  const result = await runGwsCommand({
    command: target.command,
    commandArgs: [
      ...target.commandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "clear",
      "--params",
      JSON.stringify({
        spreadsheetId: target.spreadsheetId,
        range: clearRange
      })
    ],
    timeoutMs: target.timeoutMs
  });

  if (result.timedOut || result.exitCode !== 0) {
    throw new Error(`${target.name}_gws_clear_failed`);
  }
}

async function writeHeader(target: Target, headerRange: string): Promise<void> {
  if (!target.spreadsheetId) {
    throw new Error(`${target.name}_spreadsheet_id_missing`);
  }

  const result = await runGwsCommand({
    command: target.command,
    commandArgs: [
      ...target.commandArgs,
      "sheets",
      "spreadsheets",
      "values",
      "update",
      "--params",
      JSON.stringify({
        spreadsheetId: target.spreadsheetId,
        range: headerRange,
        valueInputOption: "USER_ENTERED"
      }),
      "--json",
      JSON.stringify({
        values: [target.header]
      })
    ],
    timeoutMs: target.timeoutMs
  });

  if (result.timedOut || result.exitCode !== 0) {
    throw new Error(`${target.name}_gws_header_update_failed`);
  }
}

function buildTargets(): Target[] {
  const config = loadAppConfig();
  return [
    {
      name: "orders",
      command: config.orderTool.sheets.gws.command,
      commandArgs: config.orderTool.sheets.gws.commandArgs,
      timeoutMs: config.orderTool.sheets.timeoutMs,
      spreadsheetId: config.orderTool.sheets.gws.spreadsheetId || config.expenseTool.gws.spreadsheetId,
      defaultSheet: sheetFromRange(config.orderTool.sheets.gws.range, "Pedidos"),
      configuredRange: config.orderTool.sheets.gws.range,
      minEndCol: "U",
      header: ORDER_HEADER,
      sampleFields: [
        { key: "folio", index: 1 },
        { key: "fecha_hora_entrega", index: 2 },
        { key: "nombre_cliente", index: 3 },
        { key: "producto", index: 5 }
      ]
    },
    {
      name: "expenses",
      command: config.expenseTool.gws.command,
      commandArgs: config.expenseTool.gws.commandArgs,
      timeoutMs: config.expenseTool.timeoutMs,
      spreadsheetId: config.expenseTool.gws.spreadsheetId || config.orderTool.sheets.gws.spreadsheetId,
      defaultSheet: sheetFromRange(config.expenseTool.gws.range, "Gastos"),
      configuredRange: config.expenseTool.gws.range,
      minEndCol: "J",
      header: EXPENSE_HEADER,
      sampleFields: [
        { key: "fecha", index: 0 },
        { key: "monto", index: 1 },
        { key: "concepto", index: 3 },
        { key: "proveedor", index: 6 }
      ]
    }
  ];
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const targets = buildTargets();

  console.log(
    JSON.stringify(
      {
        event: "orders_expenses_cleanup_start",
        mode,
        targets: targets.map((target) => ({
          name: target.name,
          spreadsheetConfigured: Boolean(target.spreadsheetId),
          configuredRange: target.configuredRange || "",
          defaultSheet: target.defaultSheet
        }))
      },
      null,
      2
    )
  );

  const previews: PreviewResult[] = [];
  for (const target of targets) {
    const normalizedRange = normalizeReadRange({
      configuredRange: target.configuredRange,
      defaultSheet: target.defaultSheet,
      minEndCol: target.minEndCol
    });
    const rows = await readRows(target, normalizedRange);
    previews.push(buildPreview(target, rows, normalizedRange));
  }

  if (mode === "preview") {
    console.log(
      JSON.stringify(
        {
          event: "orders_expenses_cleanup_preview",
          mode,
          targets: previews.map((item) => ({
            name: item.target.name,
            normalizedRange: item.normalizedRange,
            totalRows: item.totalRows,
            clearRange: item.clearRange,
            headerRange: item.headerRange,
            headerMatch: item.headerMatch,
            headerCurrent: item.headerCurrent,
            headerExpected: item.target.header,
            sample: item.sample
          })),
          nextCommand:
            "npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode apply"
        },
        null,
        2
      )
    );
    return;
  }

  if (mode === "apply") {
    for (const item of previews) {
      if (item.totalRows > 0) {
        await clearRows(item.target, item.clearRange);
      }
      await writeHeader(item.target, item.headerRange);
    }

    console.log(
      JSON.stringify(
        {
          event: "orders_expenses_cleanup_complete",
          mode,
          targets: previews.map((item) => ({
            name: item.target.name,
            clearedRows: item.totalRows,
            clearRange: item.clearRange,
            headerRange: item.headerRange,
            headerColumns: item.target.header.length
          })),
          nextCommand:
            "npx ts-node --transpile-only .codex/skills/sheets-orders-expenses-cleanup/scripts/orders-expenses-cleanup.ts --mode verify"
        },
        null,
        2
      )
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        event: "orders_expenses_cleanup_verify",
        mode,
        targets: previews.map((item) => ({
          name: item.target.name,
          totalRows: item.totalRows,
          headerMatch: item.headerMatch,
          headerCurrent: item.headerCurrent,
          headerExpected: item.target.header
        }))
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
        event: "orders_expenses_cleanup_failed",
        detail
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
