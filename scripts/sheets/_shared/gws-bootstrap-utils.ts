import { runGwsCommand } from "../../../src/tools/googleWorkspace/runGwsCommand";

export type SheetsValueInputOption = "RAW" | "USER_ENTERED";

export function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function toPositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

export function normalizeValueInputOption(
  raw: string | undefined,
  fallback: SheetsValueInputOption = "USER_ENTERED"
): SheetsValueInputOption {
  const value = raw?.trim().toUpperCase();
  if (value === "RAW") return "RAW";
  if (value === "USER_ENTERED") return "USER_ENTERED";
  return fallback;
}

export function columnLetter(columnIndex: number): string {
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

export function readValues(value: unknown): string[][] {
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

export function readSheetTitles(value: unknown): string[] {
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

type InvokeArgs = {
  subcommand: string[];
  params: Record<string, unknown>;
  body?: Record<string, unknown>;
};

type GwsInvokerConfig = {
  command: string;
  commandArgs: string[];
  timeoutMs: number;
  timeoutErrorCode: string;
  errorPrefix: string;
};

export function createGwsInvoker(config: GwsInvokerConfig) {
  return async (args: InvokeArgs): Promise<unknown> => {
    const commandArgs = [
      ...config.commandArgs,
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
      command: config.command,
      commandArgs,
      timeoutMs: config.timeoutMs
    });

    const parsedStdout = parseJsonText(result.stdout);
    const parsedStderr = parseJsonText(result.stderr);
    const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);

    if (!result.timedOut && result.exitCode === 0 && !errInfo) {
      return parsedStdout;
    }

    if (result.timedOut) {
      throw new Error(config.timeoutErrorCode);
    }

    const detail = errInfo?.message ?? result.stderr ?? `exit_${result.exitCode ?? "unknown"}`;
    throw new Error(`${config.errorPrefix}_${sanitizeToken(detail)}`);
  };
}
