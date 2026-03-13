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

const RECIPES_HEADERS: string[] = [
  "recipe_id",
  "aliases_csv",
  "insumo",
  "unidad",
  "cantidad_por_unidad",
  "activo"
];

function buildSeedRows(): Cell[][] {
  return [
    ["cupcake", "cupcake,cupcakes", "harina", "g", 45, "1"],
    ["cupcake", "cupcake,cupcakes", "azucar", "g", 35, "1"],
    ["cupcake", "cupcake,cupcakes", "mantequilla", "g", 28, "1"],
    ["cupcake", "cupcake,cupcakes", "huevo", "pza", 0.8, "1"],
    ["cupcake", "cupcake,cupcakes", "betun", "g", 25, "1"],
    ["pastel", "pastel,cake", "harina", "g", 220, "1"],
    ["pastel", "pastel,cake", "azucar", "g", 160, "1"],
    ["pastel", "pastel,cake", "mantequilla", "g", 140, "1"],
    ["pastel", "pastel,cake", "huevo", "pza", 4, "1"],
    ["pastel", "pastel,cake", "betun", "g", 180, "1"],
    ["galleta", "galleta,galletas,cookie,cookies", "harina", "g", 30, "1"],
    ["galleta", "galleta,galletas,cookie,cookies", "azucar", "g", 18, "1"],
    ["galleta", "galleta,galletas,cookie,cookies", "mantequilla", "g", 14, "1"],
    ["brownie", "brownie,brownies", "harina", "g", 32, "1"],
    ["brownie", "brownie,brownies", "azucar", "g", 24, "1"],
    ["brownie", "brownie,brownies", "mantequilla", "g", 20, "1"],
    ["brownie", "brownie,brownies", "chocolate", "g", 28, "1"],
    ["brownie", "brownie,brownies", "huevo", "pza", 0.5, "1"],
    ["dona", "dona,donas,donut,donuts", "harina", "g", 38, "1"],
    ["dona", "dona,donas,donut,donuts", "azucar", "g", 18, "1"],
    ["dona", "dona,donas,donut,donuts", "huevo", "pza", 0.4, "1"],
    ["dona", "dona,donas,donut,donuts", "aceite", "ml", 14, "1"]
  ];
}

async function main() {
  const config = loadAppConfig();
  const apply = process.env.RECIPES_CATALOG_APPLY === "1";
  const overwrite = process.env.RECIPES_CATALOG_OVERWRITE === "1";
  const tabName = process.env.RECIPES_CATALOG_TAB_NAME?.trim() || "CatalogoRecetas";
  const rows = buildSeedRows();
  const values: Cell[][] = [RECIPES_HEADERS, ...rows];
  const lastColumn = columnLetter(RECIPES_HEADERS.length);
  const tabRange = `${tabName}!A1:${lastColumn}`;
  const writeRange = `${tabName}!A1:${lastColumn}${values.length}`;

  const gwsCommand = process.env.RECIPES_CATALOG_GWS_COMMAND?.trim() || config.orderTool.recipes.gws.command;
  const gwsCommandArgs = process.env.RECIPES_CATALOG_GWS_COMMAND_ARGS
    ? parseCsv(process.env.RECIPES_CATALOG_GWS_COMMAND_ARGS)
    : config.orderTool.recipes.gws.commandArgs;
  const spreadsheetId = process.env.RECIPES_CATALOG_GWS_SPREADSHEET_ID?.trim()
    || config.orderTool.recipes.gws.spreadsheetId
    || config.orderTool.sheets.gws.spreadsheetId
    || config.expenseTool.gws.spreadsheetId;
  const valueInputOption = normalizeValueInputOption(process.env.RECIPES_CATALOG_GWS_VALUE_INPUT_OPTION);
  const timeoutMs = toPositiveInt(process.env.RECIPES_CATALOG_TIMEOUT_MS, config.orderTool.recipes.timeoutMs);

  console.log(
    JSON.stringify(
      {
        event: "recipes_catalog_init_start",
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
          event: "recipes_catalog_init_preview",
          headers: RECIPES_HEADERS,
          sampleRows: rows.slice(0, 6),
          nextCommand: "RECIPES_CATALOG_APPLY=1 npm run sheets:recipes:init"
        },
        null,
        2
      )
    );
    return;
  }

  if (!spreadsheetId) {
    throw new Error("recipes_catalog_spreadsheet_id_missing");
  }

  const invokeGws = createGwsInvoker({
    command: gwsCommand,
    commandArgs: gwsCommandArgs,
    timeoutMs,
    timeoutErrorCode: "recipes_catalog_gws_timeout",
    errorPrefix: "recipes_catalog_gws"
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
          event: "recipes_catalog_init_skipped_existing_data",
          tabName,
          existingRows: existingRows.length,
          hint: "set RECIPES_CATALOG_OVERWRITE=1 to replace existing rows"
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
        event: "recipes_catalog_init_complete",
        tabName,
        rowsWritten: values.length,
        overwritten: existingRows.length > 0
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        event: "recipes_catalog_init_failed",
        error: message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
