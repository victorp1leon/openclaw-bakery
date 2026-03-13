import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { normalizeValueInputOption, parseCsv, toPositiveInt } from "./_shared/gws-bootstrap-utils";
import { runTabsBootstrapFromSchema } from "./_shared/bootstrap-tabs-from-schema";

dotenv.config();

async function main() {
  const config = loadAppConfig();

  const schemaPath = process.env.SHEETS_SCHEMA_PATH?.trim();
  if (!schemaPath) {
    throw new Error("sheets_schema_path_missing");
  }

  const apply = process.env.SHEETS_SCHEMA_APPLY === "1";
  const overwrite = process.env.SHEETS_SCHEMA_OVERWRITE === "1";
  const gwsCommand = process.env.SHEETS_SCHEMA_GWS_COMMAND?.trim() || config.orderTool.sheets.gws.command;
  const gwsCommandArgs = process.env.SHEETS_SCHEMA_GWS_COMMAND_ARGS
    ? parseCsv(process.env.SHEETS_SCHEMA_GWS_COMMAND_ARGS)
    : config.orderTool.sheets.gws.commandArgs;
  const spreadsheetId = process.env.SHEETS_SCHEMA_GWS_SPREADSHEET_ID?.trim()
    || config.orderTool.sheets.gws.spreadsheetId
    || config.expenseTool.gws.spreadsheetId;
  const valueInputOption = normalizeValueInputOption(
    process.env.SHEETS_SCHEMA_GWS_VALUE_INPUT_OPTION,
    config.orderTool.sheets.gws.valueInputOption
  );
  const timeoutMs = toPositiveInt(process.env.SHEETS_SCHEMA_TIMEOUT_MS, config.orderTool.sheets.timeoutMs);

  await runTabsBootstrapFromSchema({
    schemaPath: path.resolve(schemaPath),
    apply,
    overwrite,
    spreadsheetId,
    gwsCommand,
    gwsCommandArgs,
    timeoutMs,
    valueInputOption,
    nextCommand: "SHEETS_SCHEMA_APPLY=1 SHEETS_SCHEMA_PATH=<path> npm run sheets:tabs:init:schema",
    missingSpreadsheetErrorCode: "sheets_schema_spreadsheet_id_missing",
    timeoutErrorCode: "sheets_schema_gws_timeout",
    errorPrefix: "sheets_schema_gws",
    events: {
      start: "sheets_schema_init_start",
      preview: "sheets_schema_init_preview",
      complete: "sheets_schema_init_complete"
    }
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      {
        event: "sheets_schema_init_failed",
        error: message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
