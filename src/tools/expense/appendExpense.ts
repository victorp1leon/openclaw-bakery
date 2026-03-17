import type { Expense } from "../../schemas/expense";
import type { ToolExecutionResult } from "../types";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";

export type AppendExpenseToolConfig = {
  timeoutMs?: number;
  maxRetries?: number;
  dryRunDefault?: boolean;
  retryBackoffMs?: number;
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  gwsValueInputOption?: "RAW" | "USER_ENTERED";
  gwsRunner?: GwsCommandRunner;
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

function toGwsValues(args: { operation_id: string; chat_id: string; payload: Expense }): Array<string | number> {
  return [
    args.payload.fecha ?? "",
    args.payload.monto,
    args.payload.moneda,
    args.payload.concepto,
    args.payload.categoria ?? "",
    args.payload.metodo_pago ?? "",
    args.payload.proveedor ?? "",
    args.payload.notas ?? "",
    args.chat_id,
    args.operation_id
  ];
}

export function createAppendExpenseTool(config: AppendExpenseToolConfig = {}) {
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 30000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const dryRunDefault = config.dryRunDefault ?? true;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const gwsRange = config.gwsRange?.trim() || undefined;
  const gwsValueInputOption = config.gwsValueInputOption ?? "USER_ENTERED";
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function appendExpenseTool(args: {
    operation_id: string;
    chat_id: string;
    payload: Expense;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<Expense & { chat_id: string }>> {
    const dry_run = args.dryRun ?? dryRunDefault;
    const payloadWithChat = { ...args.payload, chat_id: args.chat_id };

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: payloadWithChat,
        detail: "append-expense dry-run"
      };
    }
    if (!gwsSpreadsheetId) {
      throw new Error("expense_connector_gws_spreadsheet_id_missing");
    }
    if (!gwsRange) {
      throw new Error("expense_connector_gws_range_missing");
    }

    const params = {
      spreadsheetId: gwsSpreadsheetId,
      range: gwsRange,
      valueInputOption: gwsValueInputOption
    };
    const body = {
      values: [toGwsValues(args)]
    };

    const attempts = maxRetries + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const result = await gwsRunner({
          command: gwsCommand,
          commandArgs: [
            ...gwsCommandArgs,
            "sheets",
            "spreadsheets",
            "values",
            "append",
            "--params",
            JSON.stringify(params),
            "--json",
            JSON.stringify(body)
          ],
          timeoutMs
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
          return {
            ok: true,
            dry_run,
            operation_id: args.operation_id,
            payload: payloadWithChat,
            detail: `append-expense executed (provider=gws, attempt=${attempt})`
          };
        }

        if (retriable && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const token = sanitizeErrorToken((errInfo?.message ?? result.stderr) || `exit_${result.exitCode ?? "unknown"}`);
        throw new Error(`expense_connector_gws_${token}`);
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "ENOENT") {
          lastError = new Error("expense_connector_gws_command_unavailable");
          break;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("expense_connector_gws_failed");
  };
}

export const appendExpenseTool = createAppendExpenseTool();
