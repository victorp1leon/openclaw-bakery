import fs from "node:fs";
import path from "node:path";

import {
  columnLetter,
  createGwsInvoker,
  readSheetTitles,
  readValues,
  type SheetsValueInputOption
} from "./gws-bootstrap-utils";

type RawCell = string | number | boolean | null;
type Cell = string | number;

type TabSchema = {
  key: string;
  defaultTabName: string;
  headers: string[];
  rows?: RawCell[][];
};

type TabsSchema = {
  name: string;
  tabs: TabSchema[];
};

type RunBootstrapArgs = {
  schemaPath: string;
  apply: boolean;
  overwrite: boolean;
  spreadsheetId?: string;
  gwsCommand: string;
  gwsCommandArgs: string[];
  timeoutMs: number;
  valueInputOption: SheetsValueInputOption;
  tabNameOverrides?: Record<string, string | undefined>;
  dynamicContext?: Record<string, string>;
  previewSampleRows?: number;
  nextCommand: string;
  missingSpreadsheetErrorCode: string;
  timeoutErrorCode: string;
  errorPrefix: string;
  events: {
    start: string;
    preview: string;
    complete: string;
  };
};

type ResolvedTabPlan = {
  key: string;
  tabName: string;
  headers: string[];
  rows: Cell[][];
  readRange: string;
  writeRange: string;
};

function normalizeCell(value: RawCell, dynamicContext: Record<string, string>): Cell {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value == null) return "";
  let out = String(value);
  for (const [token, replacement] of Object.entries(dynamicContext)) {
    out = out.split(`{{${token}}}`).join(replacement);
  }
  return out;
}

function loadSchema(schemaPath: string): TabsSchema {
  const absolute = path.isAbsolute(schemaPath) ? schemaPath : path.resolve(process.cwd(), schemaPath);
  const text = fs.readFileSync(absolute, "utf8");
  const parsed = JSON.parse(text) as TabsSchema;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.tabs)) {
    throw new Error("tabs_schema_invalid");
  }
  return parsed;
}

function buildTabPlan(args: {
  schema: TabSchema;
  tabNameOverride?: string;
  dynamicContext: Record<string, string>;
}): ResolvedTabPlan {
  const tabName = args.tabNameOverride?.trim() || args.schema.defaultTabName;
  const rows = (args.schema.rows ?? []).map((row) => row.map((cell) => normalizeCell(cell, args.dynamicContext)));
  const lastColumn = columnLetter(args.schema.headers.length);
  const readRange = rows.length > 0 ? `${tabName}!A1:${lastColumn}` : `${tabName}!A1:${lastColumn}1`;
  const writeRange = `${tabName}!A1:${lastColumn}${rows.length + 1}`;

  return {
    key: args.schema.key,
    tabName,
    headers: args.schema.headers,
    rows,
    readRange,
    writeRange
  };
}

export async function runTabsBootstrapFromSchema(args: RunBootstrapArgs): Promise<void> {
  const schema = loadSchema(args.schemaPath);
  const dynamicContext = args.dynamicContext ?? {};
  const previewSampleRows = Math.max(1, args.previewSampleRows ?? 4);

  const tabPlans = schema.tabs.map((tab) =>
    buildTabPlan({
      schema: tab,
      tabNameOverride: args.tabNameOverrides?.[tab.key],
      dynamicContext
    })
  );

  console.log(
    JSON.stringify(
      {
        event: args.events.start,
        mode: args.apply ? "apply" : "preview",
        overwrite: args.overwrite,
        schema: schema.name,
        spreadsheetConfigured: Boolean(args.spreadsheetId),
        tabs: tabPlans.map((tab) => ({
          key: tab.key,
          tabName: tab.tabName,
          writeRange: tab.writeRange,
          rows: tab.rows.length
        }))
      },
      null,
      2
    )
  );

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          event: args.events.preview,
          schema: schema.name,
          tabs: tabPlans.map((tab) => ({
            tabName: tab.tabName,
            headers: tab.headers,
            sampleRows: tab.rows.slice(0, previewSampleRows)
          })),
          nextCommand: args.nextCommand
        },
        null,
        2
      )
    );
    return;
  }

  if (!args.spreadsheetId) {
    throw new Error(args.missingSpreadsheetErrorCode);
  }

  const invokeGws = createGwsInvoker({
    command: args.gwsCommand,
    commandArgs: args.gwsCommandArgs,
    timeoutMs: args.timeoutMs,
    timeoutErrorCode: args.timeoutErrorCode,
    errorPrefix: args.errorPrefix
  });

  const metadata = await invokeGws({
    subcommand: ["get"],
    params: {
      spreadsheetId: args.spreadsheetId,
      fields: "sheets.properties.title"
    }
  });
  const sheetTitles = readSheetTitles(metadata);

  const requests: Array<Record<string, unknown>> = [];
  const createdByTab: Record<string, boolean> = {};
  for (const tab of tabPlans) {
    const exists = sheetTitles.some((title) => title === tab.tabName);
    createdByTab[tab.tabName] = !exists;
    if (!exists) {
      requests.push({ addSheet: { properties: { title: tab.tabName } } });
    }
  }

  if (requests.length > 0) {
    await invokeGws({
      subcommand: ["batchUpdate"],
      params: { spreadsheetId: args.spreadsheetId },
      body: { requests }
    });
  }

  const results: Array<{
    tabName: string;
    readRange: string;
    writeRange: string;
    existingRows: number;
    written: boolean;
    rowsWritten: number;
  }> = [];

  for (const tab of tabPlans) {
    const existingRaw = await invokeGws({
      subcommand: ["values", "get"],
      params: {
        spreadsheetId: args.spreadsheetId,
        range: tab.readRange
      }
    });
    const existingRows = readValues(existingRaw);
    if (existingRows.length > 0 && !args.overwrite) {
      results.push({
        tabName: tab.tabName,
        readRange: tab.readRange,
        writeRange: tab.writeRange,
        existingRows: existingRows.length,
        written: false,
        rowsWritten: 0
      });
      continue;
    }

    const values: Cell[][] = [tab.headers, ...tab.rows];
    await invokeGws({
      subcommand: ["values", "update"],
      params: {
        spreadsheetId: args.spreadsheetId,
        range: tab.writeRange,
        valueInputOption: args.valueInputOption
      },
      body: { values }
    });

    results.push({
      tabName: tab.tabName,
      readRange: tab.readRange,
      writeRange: tab.writeRange,
      existingRows: existingRows.length,
      written: true,
      rowsWritten: values.length
    });
  }

  console.log(
    JSON.stringify(
      {
        event: args.events.complete,
        schema: schema.name,
        sheetCreated: createdByTab,
        tabs: results
      },
      null,
      2
    )
  );
}
