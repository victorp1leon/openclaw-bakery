import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { normalizeValueInputOption, parseCsv, toPositiveInt } from "./_shared/gws-bootstrap-utils";
import { runTabsBootstrapFromSchema } from "./_shared/bootstrap-tabs-from-schema";

dotenv.config();

async function main() {
  const config = loadAppConfig();
  const apply = process.env.RECIPES_CATALOG_APPLY === "1";
  const overwrite = process.env.RECIPES_CATALOG_OVERWRITE === "1";
  const tabName = process.env.RECIPES_CATALOG_TAB_NAME?.trim();

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

  await runTabsBootstrapFromSchema({
    schemaPath: path.resolve(__dirname, "schemas/recipes-catalog.tabs.json"),
    apply,
    overwrite,
    spreadsheetId,
    gwsCommand,
    gwsCommandArgs,
    timeoutMs,
    valueInputOption,
    tabNameOverrides: {
      recipes_catalog: tabName
    },
    previewSampleRows: 6,
    nextCommand: "RECIPES_CATALOG_APPLY=1 npm run sheets:recipes:init",
    missingSpreadsheetErrorCode: "recipes_catalog_spreadsheet_id_missing",
    timeoutErrorCode: "recipes_catalog_gws_timeout",
    errorPrefix: "recipes_catalog_gws",
    events: {
      start: "recipes_catalog_init_start",
      preview: "recipes_catalog_init_preview",
      complete: "recipes_catalog_init_complete"
    }
  });
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
