import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import {
  columnLetter,
  createGwsInvoker,
  normalizeValueInputOption,
  parseCsv,
  readSheetTitles,
  readValues,
  toPositiveInt
} from "./_shared/gws-bootstrap-utils";

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
  const valueInputOption = normalizeValueInputOption(
    process.env.PRICING_CATALOG_GWS_VALUE_INPUT_OPTION,
    config.orderTool.sheets.gws.valueInputOption
  );
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

  const invokeGws = createGwsInvoker({
    command: gwsCommand,
    commandArgs: gwsCommandArgs,
    timeoutMs,
    timeoutErrorCode: "pricing_catalog_gws_timeout",
    errorPrefix: "pricing_catalog_gws"
  });

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
