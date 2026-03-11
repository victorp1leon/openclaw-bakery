import type { Order } from "../../schemas/order";
import type { ToolExecutionResult } from "../types";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeDeliveryDateTime } from "./deliveryDateTime";

export type AppendOrderToolConfig = {
  timeoutMs?: number;
  maxRetries?: number;
  dryRunDefault?: boolean;
  retryBackoffMs?: number;
  gwsCommand?: string;
  gwsCommandArgs?: string[];
  gwsSpreadsheetId?: string;
  gwsRange?: string;
  gwsValueInputOption?: "RAW" | "USER_ENTERED";
  timezone?: string;
  now?: () => Date;
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

function toGwsValues(args: {
  operation_id: string;
  chat_id: string;
  payload: Order;
  estado_pedido: string;
  trello_card_id?: string;
  now: Date;
  timezone: string;
}): Array<string | number> {
  const fecha_hora_entrega_iso = normalizeDeliveryDateTime({
    value: args.payload.fecha_hora_entrega,
    timezone: args.timezone,
    now: args.now
  });

  return [
    args.now.toISOString(),
    args.operation_id,
    args.payload.fecha_hora_entrega,
    args.payload.nombre_cliente,
    args.payload.telefono ?? "",
    args.payload.producto,
    args.payload.descripcion_producto ?? "",
    args.payload.cantidad,
    args.payload.sabor_pan ?? "",
    args.payload.sabor_relleno ?? "",
    args.payload.tipo_envio,
    args.payload.direccion ?? "",
    args.payload.estado_pago ?? "",
    args.payload.total ?? "",
    args.payload.moneda,
    args.payload.notas ?? "",
    args.chat_id,
    args.operation_id,
    fecha_hora_entrega_iso ?? "",
    args.estado_pedido,
    args.trello_card_id ?? ""
  ];
}

function lettersToColumnNumber(value: string): number {
  let out = 0;
  for (const ch of value.toUpperCase()) {
    if (ch < "A" || ch > "Z") return 0;
    out = out * 26 + (ch.charCodeAt(0) - 64);
  }
  return out;
}

function normalizeGwsRange(value: string | undefined): string | undefined {
  const range = value?.trim();
  if (!range) return undefined;

  const bang = range.indexOf("!");
  if (bang === -1) return `${range}!A:U`;

  const sheet = range.slice(0, bang).trim();
  const a1 = range.slice(bang + 1).trim();
  if (!sheet) return undefined;
  if (!a1) return `${sheet}!A:U`;
  if (!a1.includes(":")) return `${sheet}!A:U`;

  const [startTokenRaw, endTokenRaw] = a1.split(":");
  const startToken = startTokenRaw?.trim() || "A";
  const endToken = endTokenRaw?.trim() || "U";
  const endMatch = endToken.match(/^([A-Za-z]+)(\d+)?$/);
  if (!endMatch) return `${sheet}!${a1}`;

  const endCol = endMatch[1].toUpperCase();
  const endRow = endMatch[2] ?? "";
  if (lettersToColumnNumber(endCol) >= lettersToColumnNumber("U")) {
    return `${sheet}!${a1}`;
  }

  return `${sheet}!${startToken}:U${endRow}`;
}

export function createAppendOrderTool(config: AppendOrderToolConfig = {}) {
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const dryRunDefault = config.dryRunDefault ?? true;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;
  const gwsCommand = config.gwsCommand?.trim() || "gws";
  const gwsCommandArgs = config.gwsCommandArgs ?? [];
  const gwsSpreadsheetId = config.gwsSpreadsheetId?.trim() || undefined;
  const gwsRange = normalizeGwsRange(config.gwsRange);
  const gwsValueInputOption = config.gwsValueInputOption ?? "USER_ENTERED";
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function appendOrder(args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    trello_card_id?: string;
    estado_pedido?: string;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<Order & {
    chat_id: string;
    trello_card_id?: string;
    estado_pedido?: string;
  }>> {
    const dry_run = args.dryRun ?? dryRunDefault;
    const estado_pedido = args.estado_pedido?.trim() || "activo";
    const payloadWithChat = {
      ...args.payload,
      chat_id: args.chat_id,
      trello_card_id: args.trello_card_id,
      estado_pedido
    };

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: payloadWithChat,
        detail: "append-order dry-run"
      };
    }
    if (!gwsSpreadsheetId) {
      throw new Error("order_connector_gws_spreadsheet_id_missing");
    }
    if (!gwsRange) {
      throw new Error("order_connector_gws_range_missing");
    }

    const params = {
      spreadsheetId: gwsSpreadsheetId,
      range: gwsRange,
      valueInputOption: gwsValueInputOption
    };
    const body = {
      values: [
        toGwsValues({
          ...args,
          estado_pedido,
          now: now(),
          timezone
        })
      ]
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
            detail: `append-order executed (provider=gws, attempt=${attempt})`
          };
        }

        if (retriable && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const token = sanitizeErrorToken((errInfo?.message ?? result.stderr) || `exit_${result.exitCode ?? "unknown"}`);
        throw new Error(`order_connector_gws_${token}`);
      } catch (err) {
        const cls = classifyGwsSpawnError(err);
        if (cls === "network" && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        const code = err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined;
        if (code === "ENOENT") {
          lastError = new Error("order_connector_gws_command_unavailable");
          break;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }

    throw lastError ?? new Error("order_connector_gws_failed");
  };
}

export const appendOrderTool = createAppendOrderTool();
