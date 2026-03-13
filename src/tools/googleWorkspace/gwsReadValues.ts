import type { GwsCommandRunner } from "./runGwsCommand";

export type ReadGwsValuesResult = {
  rows: string[][];
  attempt: number;
};

export type ReadGwsValuesArgs = {
  command: string;
  commandArgs?: string[];
  spreadsheetId: string;
  range: string;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  runner: GwsCommandRunner;
  errorPrefix: string;
  invalidPayloadError: string;
  commandUnavailableError: string;
  failedError: string;
  retryOnUnknownError?: boolean;
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
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

function classifyGwsSpawnError(err: unknown): "network" | "other" {
  if (!(err instanceof Error)) return "other";
  const code = (err as NodeJS.ErrnoException).code;
  if (!code) return "other";
  if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED"].includes(code)) return "network";
  return "other";
}

function isRetriableGwsFailure(args: { timedOut: boolean; code?: number; stdout: string; stderr: string }): boolean {
  if (args.timedOut) return true;
  if (typeof args.code === "number" && (args.code === 429 || args.code >= 500)) return true;

  const combined = `${args.stdout}\n${args.stderr}`.toLowerCase();
  return /(timeout|timed out|econnreset|enotfound|eai_again|network|temporar|rate limit|429)/.test(combined);
}

function readValuesFromGwsPayload(value: unknown): string[][] | undefined {
  if (!value || typeof value !== "object") return undefined;
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

  return undefined;
}

function isCommandUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  return code === "ENOENT" || /ENOENT/.test(err.message);
}

export function normalizeGwsReadRange(value: string | undefined, fallbackColumns: string): string | undefined {
  const range = value?.trim();
  if (!range) return undefined;

  const bang = range.indexOf("!");
  if (bang === -1) return `${range}!${fallbackColumns}`;
  const sheet = range.slice(0, bang).trim();
  const a1 = range.slice(bang + 1).trim();
  if (!sheet) return undefined;
  if (!a1) return `${sheet}!${fallbackColumns}`;
  if (a1.includes(":")) return `${sheet}!${a1}`;
  return `${sheet}!${fallbackColumns}`;
}

export async function readGwsValuesWithRetries(args: ReadGwsValuesArgs): Promise<ReadGwsValuesResult> {
  const attempts = args.maxRetries + 1;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await args.runner({
        command: args.command,
        commandArgs: [
          ...(args.commandArgs ?? []),
          "sheets",
          "spreadsheets",
          "values",
          "get",
          "--params",
          JSON.stringify({
            spreadsheetId: args.spreadsheetId,
            range: args.range
          })
        ],
        timeoutMs: args.timeoutMs
      });

      const parsedStdout = parseJsonText(result.stdout);
      const parsedStderr = parseJsonText(result.stderr);
      const errInfo = extractGwsError(parsedStdout) ?? extractGwsError(parsedStderr);
      const retriable = isRetriableGwsFailure({
        timedOut: result.timedOut,
        code: errInfo?.code,
        stdout: result.stdout,
        stderr: result.stderr
      });

      if (!result.timedOut && result.exitCode === 0 && !errInfo) {
        const rows = readValuesFromGwsPayload(parsedStdout);
        if (!rows) {
          throw new Error(args.invalidPayloadError);
        }
        return { rows, attempt };
      }

      if (retriable && attempt < attempts) {
        await sleep(args.retryBackoffMs * attempt);
        continue;
      }

      const token = sanitizeErrorToken((errInfo?.message ?? result.stderr) || `exit_${result.exitCode ?? "unknown"}`);
      throw new Error(`${args.errorPrefix}_${token}`);
    } catch (err) {
      const cls = classifyGwsSpawnError(err);
      if (cls === "network" && attempt < attempts) {
        await sleep(args.retryBackoffMs * attempt);
        continue;
      }

      if (isCommandUnavailableError(err)) {
        throw new Error(args.commandUnavailableError);
      }

      lastError = err instanceof Error ? err : new Error(String(err));
      if (args.retryOnUnknownError && attempt < attempts) {
        await sleep(args.retryBackoffMs * attempt);
        continue;
      }
      break;
    }
  }

  throw lastError ?? new Error(args.failedError);
}
