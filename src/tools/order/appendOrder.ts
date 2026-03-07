import type { Order } from "../../schemas/order";
import type { ToolExecutionResult } from "../types";
import { runGwsCommand, type GwsCommandRunner } from "../googleWorkspace/runGwsCommand";
import { normalizeDeliveryDateTime } from "./deliveryDateTime";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type AppendOrderToolConfig = {
  fetchFn?: FetchLike;
  provider?: "apps_script" | "gws";
  webhookUrl?: string;
  apiKey?: string;
  apiKeyHeader?: string;
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

type AppendOrderWebhookPayload = {
  operation_id: string;
  chat_id: string;
  intent: "pedido";
  order: Order;
  row: {
    fecha_registro: string;
    folio: string;
    fecha_hora_entrega: string;
    fecha_hora_entrega_iso?: string;
    nombre_cliente: string;
    telefono?: string;
    producto: string;
    descripcion_producto?: string;
    cantidad: number;
    sabor_pan?: "vainilla" | "chocolate" | "red_velvet" | "otro";
    sabor_relleno?: "cajeta" | "mermelada_fresa" | "oreo";
    tipo_envio: "envio_domicilio" | "recoger_en_tienda";
    direccion?: string;
    estado_pago?: "pagado" | "pendiente" | "parcial";
    total?: number;
    moneda: string;
    notas?: string;
    chat_id: string;
    operation_id: string;
  };
};

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyTransportError(err: unknown): "timeout" | "network" | "other" {
  if (err instanceof Error && err.name === "AbortError") return "timeout";
  if (err instanceof TypeError) return "network";
  return "other";
}

function isRetriableHttpStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sanitizeErrorToken(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "unknown";
}

function isHtmlText(value: string): boolean {
  const t = value.trim().toLowerCase();
  return t.startsWith("<!doctype html") || t.startsWith("<html");
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

function toWebhookPayload(args: {
  operation_id: string;
  chat_id: string;
  payload: Order;
  now: Date;
  timezone: string;
}): AppendOrderWebhookPayload {
  const fecha_hora_entrega_iso = normalizeDeliveryDateTime({
    value: args.payload.fecha_hora_entrega,
    timezone: args.timezone,
    now: args.now
  });

  return {
    operation_id: args.operation_id,
    chat_id: args.chat_id,
    intent: "pedido",
    order: args.payload,
    row: {
      fecha_registro: args.now.toISOString(),
      folio: args.operation_id,
      fecha_hora_entrega: args.payload.fecha_hora_entrega,
      fecha_hora_entrega_iso,
      nombre_cliente: args.payload.nombre_cliente,
      telefono: args.payload.telefono,
      producto: args.payload.producto,
      descripcion_producto: args.payload.descripcion_producto,
      cantidad: args.payload.cantidad,
      sabor_pan: args.payload.sabor_pan,
      sabor_relleno: args.payload.sabor_relleno,
      tipo_envio: args.payload.tipo_envio,
      direccion: args.payload.direccion,
      estado_pago: args.payload.estado_pago,
      total: args.payload.total,
      moneda: args.payload.moneda,
      notas: args.payload.notas,
      chat_id: args.chat_id,
      operation_id: args.operation_id
    }
  };
}

function toGwsValues(args: {
  operation_id: string;
  chat_id: string;
  payload: Order;
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
    fecha_hora_entrega_iso ?? ""
  ];
}

async function postJsonWithTimeout(args: {
  fetchFn: FetchLike;
  url: string;
  body: unknown;
  timeoutMs: number;
  apiKeyHeader: string;
  apiKey: string;
}) {
  const bodyObject =
    args.body && typeof args.body === "object" && !Array.isArray(args.body)
      ? ({ ...(args.body as Record<string, unknown>), api_key: args.apiKey } as Record<string, unknown>)
      : args.body;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    return await args.fetchFn(args.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [args.apiKeyHeader]: args.apiKey
      },
      body: JSON.stringify(bodyObject),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseBody(response: Awaited<ReturnType<FetchLike>>): Promise<{ json?: unknown; text?: string }> {
  if (response.text) {
    const text = await response.text();
    if (!text) return {};
    try {
      return { json: JSON.parse(text), text };
    } catch {
      return { text };
    }
  }

  if (response.json) {
    try {
      return { json: await response.json() };
    } catch {
      return {};
    }
  }

  return {};
}

export function createAppendOrderTool(config: AppendOrderToolConfig = {}) {
  const fetchFn = config.fetchFn ?? ((globalThis.fetch as unknown) as FetchLike | undefined);
  const provider = config.provider ?? "apps_script";
  const webhookUrl = config.webhookUrl?.trim() || undefined;
  const apiKey = config.apiKey?.trim() || undefined;
  const apiKeyHeader = config.apiKeyHeader?.trim() || "x-api-key";
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
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
  const timezone = config.timezone?.trim() || "America/Mexico_City";
  const now = config.now ?? (() => new Date());
  const gwsRunner = config.gwsRunner ?? runGwsCommand;

  return async function appendOrder(args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<Order & { chat_id: string }>> {
    const dry_run = args.dryRun ?? dryRunDefault;
    const payloadWithChat = { ...args.payload, chat_id: args.chat_id };

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: payloadWithChat,
        detail: "append-order dry-run"
      };
    }

    if (provider === "apps_script") {
      if (!fetchFn) {
        throw new Error("order_connector_fetch_unavailable");
      }
      if (!webhookUrl) {
        throw new Error("order_connector_url_missing");
      }
      if (!apiKey) {
        throw new Error("order_connector_api_key_missing");
      }

      const webhookPayload = toWebhookPayload({
        ...args,
        now: now(),
        timezone
      });
      const attempts = maxRetries + 1;
      let lastError: Error | undefined;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const response = await postJsonWithTimeout({
            fetchFn,
            url: webhookUrl,
            body: webhookPayload,
            timeoutMs,
            apiKey,
            apiKeyHeader
          });

          if (response.ok) {
            const responseBody = await readResponseBody(response);
            const jsonObj =
              responseBody.json && typeof responseBody.json === "object"
                ? (responseBody.json as Record<string, unknown>)
                : undefined;

            if (jsonObj && jsonObj.ok === false) {
              throw new Error(`order_connector_remote_${sanitizeErrorToken(jsonObj.error)}`);
            }

            if (!jsonObj && responseBody.text && isHtmlText(responseBody.text)) {
              throw new Error("order_connector_response_invalid");
            }

            return {
              ok: true,
              dry_run,
              operation_id: args.operation_id,
              payload: payloadWithChat,
              detail: `append-order executed (provider=apps_script, attempt=${attempt})`
            };
          }

          if (isRetriableHttpStatus(response.status) && attempt < attempts) {
            await sleep(retryBackoffMs * attempt);
            continue;
          }

          throw new Error(`order_connector_http_${response.status}`);
        } catch (err) {
          const cls = classifyTransportError(err);
          if ((cls === "timeout" || cls === "network") && attempt < attempts) {
            await sleep(retryBackoffMs * attempt);
            continue;
          }
          lastError = err instanceof Error ? err : new Error(String(err));
          break;
        }
      }

      throw lastError ?? new Error("order_connector_failed");
    }

    if (provider !== "gws") {
      throw new Error("order_connector_provider_invalid");
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
