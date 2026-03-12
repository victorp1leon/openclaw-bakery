import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { runGwsCommand } from "../../src/tools/googleWorkspace/runGwsCommand";

dotenv.config();

type TabCheck = {
  tab: string;
  ok: boolean;
  detail: string;
  expectedHeader?: string[];
  actualHeader?: string[];
  duplicateKeys?: string[];
  rows?: number;
};

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

function parseJsonText(text: string): unknown {
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function extractGwsError(value: unknown): { code?: number; message?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const root = value as Record<string, unknown>;

  if (root.error && typeof root.error === "object") {
    const errObj = root.error as Record<string, unknown>;
    const code = typeof errObj.code === "number" ? errObj.code : undefined;
    const message = typeof errObj.message === "string" ? errObj.message : undefined;
    return { code, message };
  }

  const code = typeof root.code === "number" ? root.code : undefined;
  const message = typeof root.message === "string" ? root.message : undefined;
  if (code !== undefined || message !== undefined) return { code, message };
  return undefined;
}

function sanitizeToken(value: string): string {
  const out = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return out || "unknown";
}

function normalizeHeaderCell(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readValues(value: unknown): string[][] {
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

function findDuplicateKeys(rows: string[][], keyIndex: number): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = (row[keyIndex] ?? "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

async function main() {
  const config = loadAppConfig();
  const spreadsheetId = process.env.PRICING_CATALOG_GWS_SPREADSHEET_ID?.trim()
    || config.orderTool.sheets.gws.spreadsheetId
    || config.expenseTool.gws.spreadsheetId;
  const gwsCommand = process.env.PRICING_CATALOG_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.PRICING_CATALOG_GWS_COMMAND_ARGS
    ? parseCsv(process.env.PRICING_CATALOG_GWS_COMMAND_ARGS)
    : config.orderTool.sheets.gws.commandArgs;
  const timeoutMs = toPositiveInt(process.env.PRICING_CATALOG_TIMEOUT_MS, config.orderTool.sheets.timeoutMs);

  const preciosTab = process.env.PRICING_VALIDATE_PRECIOS_TAB?.trim() || "CatalogoPrecios";
  const opcionesTab = process.env.PRICING_VALIDATE_OPCIONES_TAB?.trim() || "CatalogoOpciones";
  const referenciasTab = process.env.PRICING_VALIDATE_REFERENCIAS_TAB?.trim() || "CatalogoReferencias";

  if (!spreadsheetId) {
    throw new Error("pricing_catalog_validate_spreadsheet_id_missing");
  }

  const expected = {
    [preciosTab]: [
      "tipo",
      "clave",
      "nombre",
      "monto_mxn",
      "modo_calculo",
      "aplica_a",
      "cantidad_min",
      "cantidad_max",
      "horas_max_anticipacion",
      "zona",
      "activo",
      "notas",
      "actualizado_en"
    ],
    [opcionesTab]: [
      "categoria",
      "clave",
      "nombre",
      "precio_extra_mxn",
      "modo_calculo",
      "aplica_a",
      "activo",
      "notas"
    ],
    [referenciasTab]: [
      "fuente",
      "ciudad",
      "item",
      "precio_mxn",
      "porciones/tamano",
      "url",
      "fecha_consulta"
    ]
  };

  async function readTab(tab: string): Promise<string[][]> {
    const params = {
      spreadsheetId,
      range: `${tab}!A1:Z500`
    };

    const result = await runGwsCommand({
      command: gwsCommand,
      commandArgs: [
        ...gwsCommandArgs,
        "sheets",
        "spreadsheets",
        "values",
        "get",
        "--params",
        JSON.stringify(params)
      ],
      timeoutMs
    });

    const parsedStdout = parseJsonText(result.stdout);
    const parsedStderr = parseJsonText(result.stderr);
    const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);

    if (result.timedOut) throw new Error(`pricing_catalog_validate_timeout_${sanitizeToken(tab)}`);
    if (result.exitCode !== 0 || errInfo) {
      const detail = errInfo?.message ?? result.stderr ?? `exit_${result.exitCode ?? "unknown"}`;
      throw new Error(`pricing_catalog_validate_gws_${sanitizeToken(detail)}`);
    }

    return readValues(parsedStdout);
  }

  const checks: TabCheck[] = [];

  for (const tab of [preciosTab, opcionesTab, referenciasTab]) {
    const rows = await readTab(tab);
    if (rows.length === 0) {
      checks.push({ tab, ok: false, detail: "tab_sin_datos" });
      continue;
    }

    const header = rows[0] ?? [];
    const expectedHeader = expected[tab];
    const normalizedHeader = header.slice(0, expectedHeader.length).map(normalizeHeaderCell);
    const normalizedExpected = expectedHeader.map(normalizeHeaderCell);
    const headerOk = normalizedHeader.length === normalizedExpected.length
      && normalizedHeader.every((value, idx) => value === normalizedExpected[idx]);

    if (!headerOk) {
      checks.push({
        tab,
        ok: false,
        detail: "header_invalido",
        expectedHeader,
        actualHeader: header
      });
      continue;
    }

    const keyIndex = normalizedExpected.findIndex((value) => value === "clave");
    const bodyRows = rows.slice(1).filter((row) => row.some((cell) => (cell ?? "").trim().length > 0));
    const duplicateKeys = keyIndex >= 0 ? findDuplicateKeys(bodyRows, keyIndex) : [];

    checks.push({
      tab,
      ok: duplicateKeys.length === 0,
      detail: duplicateKeys.length === 0 ? "ok" : "claves_duplicadas",
      rows: bodyRows.length,
      duplicateKeys
    });
  }

  const ok = checks.every((check) => check.ok);
  console.log(
    JSON.stringify(
      {
        event: "pricing_catalog_validate_result",
        ok,
        checks
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "pricing_catalog_validate_failed", detail }, null, 2));
  process.exitCode = 1;
});
