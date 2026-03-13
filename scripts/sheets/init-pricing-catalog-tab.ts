import path from "node:path";

import dotenv from "dotenv";

import { loadAppConfig } from "../../src/config/appConfig";
import { normalizeValueInputOption, parseCsv, toPositiveInt } from "./_shared/gws-bootstrap-utils";
import { runTabsBootstrapFromSchema } from "./_shared/bootstrap-tabs-from-schema";

dotenv.config();

async function main() {
  const config = loadAppConfig();
  const apply = process.env.PRICING_CATALOG_APPLY === "1";
  const overwrite = process.env.PRICING_CATALOG_OVERWRITE === "1";
  const tabName = process.env.PRICING_CATALOG_TAB_NAME?.trim();
  const nowIso = new Date().toISOString();

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

  await runTabsBootstrapFromSchema({
    schemaPath: path.resolve(__dirname, "schemas/pricing-catalog.tabs.json"),
    apply,
    overwrite,
    spreadsheetId,
    gwsCommand,
    gwsCommandArgs,
    timeoutMs,
    valueInputOption,
    tabNameOverrides: {
      pricing_catalog: tabName
    },
    dynamicContext: {
      NOW_ISO: nowIso
    },
    previewSampleRows: 4,
    nextCommand: "PRICING_CATALOG_APPLY=1 npm run sheets:pricing:init",
    missingSpreadsheetErrorCode: "pricing_catalog_spreadsheet_id_missing",
    timeoutErrorCode: "pricing_catalog_gws_timeout",
    errorPrefix: "pricing_catalog_gws",
    events: {
      start: "pricing_catalog_init_start",
      preview: "pricing_catalog_init_preview",
      complete: "pricing_catalog_init_done"
    }
  });
}

void main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error(JSON.stringify({ event: "pricing_catalog_init_failed", detail }, null, 2));
  process.exitCode = 1;
});
