import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { runGwsCommand } from "../../src/tools/googleWorkspace/runGwsCommand";

dotenv.config();

type Cell = string | number;

const PRICING_HEADERS: string[] = [
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
];

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
  if (code !== undefined || message !== undefined) {
    return { code, message };
  }

  return undefined;
}

function sanitizeToken(value: string): string {
  const out = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return out || "unknown";
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

function readSheetTitles(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;

  const candidates: unknown[] = [
    root.sheets,
    (root.data as Record<string, unknown> | undefined)?.sheets,
    (root.result as Record<string, unknown> | undefined)?.sheets,
    (root.response as Record<string, unknown> | undefined)?.sheets
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const titles = candidate
      .map((item) => {
        if (!item || typeof item !== "object") return undefined;
        const properties = (item as Record<string, unknown>).properties;
        if (!properties || typeof properties !== "object") return undefined;
        const title = (properties as Record<string, unknown>).title;
        return typeof title === "string" ? title.trim() : undefined;
      })
      .filter((title): title is string => Boolean(title && title.length > 0));

    if (titles.length > 0) return titles;
  }

  return [];
}

function columnLetter(columnIndex: number): string {
  if (columnIndex <= 0) return "A";
  let index = columnIndex;
  let out = "";
  while (index > 0) {
    const rem = (index - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    index = Math.floor((index - 1) / 26);
  }
  return out;
}

function buildSeedRows(nowIso: string): Cell[][] {
  return [
    ["PRODUCTO", "cupcake_pieza", "Cupcake clasico", 45, "fijo", "todo", "", "", "", "", "1", "precio por pieza", nowIso],
    ["PRODUCTO", "caja_6_cupcakes", "Caja 6 cupcakes", 250, "fijo", "todo", "", "", "", "", "1", "precio por caja", nowIso],
    ["PRODUCTO", "caja_12_cupcakes", "Caja 12 cupcakes", 480, "fijo", "todo", "", "", "", "", "1", "precio por caja", nowIso],
    ["PRODUCTO", "pastel_mediano", "Pastel mediano", 650, "fijo", "todo", "", "", "", "", "1", "8-12 porciones base", nowIso],
    ["EXTRA", "relleno_premium", "Relleno premium", 60, "fijo", "pedido", "", "", "", "", "1", "cargo por relleno premium", nowIso],
    [
      "EXTRA",
      "decoracion_personalizada",
      "Decoracion personalizada",
      120,
      "fijo",
      "pedido",
      "",
      "",
      "",
      "",
      "1",
      "cargo por decoracion especial",
      nowIso
    ],
    ["EXTRA", "topper_personalizado", "Topper personalizado", 80, "fijo", "pedido", "", "", "", "", "1", "cargo opcional", nowIso],
    ["ENVIO", "zona_colima_centro", "Envio Colima Centro", 50, "fijo", "envio_domicilio", "", "", "", "Colima Centro", "1", "", nowIso],
    [
      "ENVIO",
      "zona_villa_alvarez",
      "Envio Villa de Alvarez",
      70,
      "fijo",
      "envio_domicilio",
      "",
      "",
      "",
      "Villa de Alvarez",
      "1",
      "",
      nowIso
    ],
    ["URGENCIA", "urgencia_24h", "Recargo urgencia <24h", 35, "porcentaje", "pedido", "", "", 24, "", "1", "porcentaje", nowIso],
    ["URGENCIA", "urgencia_48h", "Recargo urgencia <48h", 20, "porcentaje", "pedido", "", "", 48, "", "1", "porcentaje", nowIso],
    ["POLITICA", "anticipo_default", "Anticipo sugerido", 50, "porcentaje", "pedido", "", "", "", "", "1", "porcentaje de anticipo", nowIso],
    ["POLITICA", "vigencia_cotizacion_horas", "Vigencia cotizacion", 72, "horas", "cotizacion", "", "", "", "", "1", "horas", nowIso]
  ];
}

async function main() {
  const config = loadAppConfig();
  const apply = process.env.PRICING_CATALOG_APPLY === "1";
  const overwrite = process.env.PRICING_CATALOG_OVERWRITE === "1";
  const tabName = process.env.PRICING_CATALOG_TAB_NAME?.trim() || "CatalogoPrecios";
  const nowIso = new Date().toISOString();
  const rows = buildSeedRows(nowIso);
  const values: Cell[][] = [PRICING_HEADERS, ...rows];
  const lastColumn = columnLetter(PRICING_HEADERS.length);
  const tabRange = `${tabName}!A1:${lastColumn}`;
  const writeRange = `${tabName}!A1:${lastColumn}${values.length}`;

  const gwsCommand = process.env.PRICING_CATALOG_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.PRICING_CATALOG_GWS_COMMAND_ARGS
    ? parseCsv(process.env.PRICING_CATALOG_GWS_COMMAND_ARGS)
    : config.orderTool.sheets.gws.commandArgs;
  const spreadsheetId = process.env.PRICING_CATALOG_GWS_SPREADSHEET_ID?.trim()
    || config.orderTool.sheets.gws.spreadsheetId
    || config.expenseTool.gws.spreadsheetId;
  const valueInputOption = process.env.PRICING_CATALOG_GWS_VALUE_INPUT_OPTION?.trim().toUpperCase() === "RAW"
    ? "RAW"
    : process.env.PRICING_CATALOG_GWS_VALUE_INPUT_OPTION?.trim().toUpperCase() === "USER_ENTERED"
      ? "USER_ENTERED"
      : config.orderTool.sheets.gws.valueInputOption;
  const timeoutMs = toPositiveInt(process.env.PRICING_CATALOG_TIMEOUT_MS, config.orderTool.sheets.timeoutMs);

  console.log(
    JSON.stringify(
      {
        event: "pricing_catalog_init_start",
        mode: apply ? "apply" : "preview",
        overwrite,
        tabName,
        writeRange,
        rows: rows.length,
        spreadsheetConfigured: Boolean(spreadsheetId)
      },
      null,
      2
    )
  );

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          event: "pricing_catalog_init_preview",
          headers: PRICING_HEADERS,
          sampleRows: rows.slice(0, 4),
          nextCommand: "PRICING_CATALOG_APPLY=1 npm run sheets:pricing:init"
        },
        null,
        2
      )
    );
    return;
  }

  if (!spreadsheetId) {
    throw new Error("pricing_catalog_spreadsheet_id_missing");
  }

  async function invokeGws(args: {
    subcommand: string[];
    params: Record<string, unknown>;
    body?: Record<string, unknown>;
  }): Promise<unknown> {
    const commandArgs = [
      ...gwsCommandArgs,
      "sheets",
      "spreadsheets",
      ...args.subcommand,
      "--params",
      JSON.stringify(args.params)
    ];
    if (args.body) {
      commandArgs.push("--json", JSON.stringify(args.body));
    }

    const result = await runGwsCommand({
      command: gwsCommand,
      commandArgs,
      timeoutMs
    });

    const parsedStdout = parseJsonText(result.stdout);
    const parsedStderr = parseJsonText(result.stderr);
    const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);

    if (!result.timedOut && result.exitCode === 0 && !errInfo) {
      return parsedStdout;
    }

    if (result.timedOut) {
      throw new Error("pricing_catalog_gws_timeout");
    }

    const detail = errInfo?.message ?? result.stderr ?? `exit_${result.exitCode ?? "unknown"}`;
    throw new Error(`pricing_catalog_gws_${sanitizeToken(detail)}`);
  }

  const metadata = await invokeGws({
    subcommand: ["get"],
    params: {
      spreadsheetId,
      fields: "sheets.properties.title"
    }
  });
  const sheetTitles = readSheetTitles(metadata);
  const sheetExists = sheetTitles.some((title) => title === tabName);

  if (!sheetExists) {
    await invokeGws({
      subcommand: ["batchUpdate"],
      params: { spreadsheetId },
      body: {
        requests: [
          {
            addSheet: {
              properties: {
                title: tabName
              }
            }
          }
        ]
      }
    });
  }

  const existingRaw = await invokeGws({
    subcommand: ["values", "get"],
    params: {
      spreadsheetId,
      range: tabRange
    }
  });
  const existingRows = readValues(existingRaw);
  if (existingRows.length > 0 && !overwrite) {
    console.log(
      JSON.stringify(
        {
          event: "pricing_catalog_init_skipped",
          reason: "tab_has_data",
          tabName,
          existingRows: existingRows.length,
          overwriteHint: "PRICING_CATALOG_OVERWRITE=1"
        },
        null,
        2
      )
    );
    return;
  }

  await invokeGws({
    subcommand: ["values", "update"],
    params: {
      spreadsheetId,
      range: writeRange,
      valueInputOption
    },
    body: { values }
  });

  console.log(
    JSON.stringify(
      {
        event: "pricing_catalog_init_done",
        tabName,
        writeRange,
        writtenRows: values.length,
        valueInputOption,
        sheetCreated: !sheetExists
      },
      null,
      2
    )
  );
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "pricing_catalog_init_failed", detail }, null, 2));
  process.exitCode = 1;
});
