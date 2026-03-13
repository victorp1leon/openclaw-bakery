import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { normalizeValueInputOption, parseCsv, toPositiveInt } from "./_shared/gws-bootstrap-utils";
import { runTabsBootstrapFromSchema } from "./_shared/bootstrap-tabs-from-schema";

dotenv.config();

async function main() {
  const config = loadAppConfig();
  const apply = process.env.INVENTORY_TABS_APPLY === "1";
  const overwrite = process.env.INVENTORY_TABS_OVERWRITE === "1";
  const inventoryTabName = process.env.INVENTORY_TAB_NAME?.trim();
  const movementsTabName = process.env.INVENTORY_MOVEMENTS_TAB_NAME?.trim();

  const gwsCommand = process.env.INVENTORY_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.INVENTORY_GWS_COMMAND_ARGS
    ? parseCsv(process.env.INVENTORY_GWS_COMMAND_ARGS)
    : config.orderTool.sheets.gws.commandArgs;
  const spreadsheetId = process.env.INVENTORY_GWS_SPREADSHEET_ID?.trim()
    || config.orderTool.sheets.gws.spreadsheetId
    || config.expenseTool.gws.spreadsheetId;
  const valueInputOption = normalizeValueInputOption(
    process.env.INVENTORY_GWS_VALUE_INPUT_OPTION,
    config.orderTool.sheets.gws.valueInputOption
  );
  const timeoutMs = toPositiveInt(process.env.INVENTORY_TIMEOUT_MS, config.orderTool.sheets.timeoutMs);

  await runTabsBootstrapFromSchema({
    schemaPath: path.resolve(__dirname, "schemas/inventory-tabs.tabs.json"),
    apply,
    overwrite,
    spreadsheetId,
    gwsCommand,
    gwsCommandArgs,
    timeoutMs,
    valueInputOption,
    tabNameOverrides: {
      inventory_tab: inventoryTabName,
      inventory_movements_tab: movementsTabName
    },
    previewSampleRows: 1,
    nextCommand: "INVENTORY_TABS_APPLY=1 npm run sheets:inventory:init",
    missingSpreadsheetErrorCode: "inventory_tabs_spreadsheet_id_missing",
    timeoutErrorCode: "inventory_tabs_gws_timeout",
    errorPrefix: "inventory_tabs_gws",
    events: {
      start: "inventory_tabs_init_start",
      preview: "inventory_tabs_init_preview",
      complete: "inventory_tabs_init_complete"
    }
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        event: "inventory_tabs_init_failed",
        error: message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
