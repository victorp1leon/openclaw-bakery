import type { Order } from "../../schemas/order";
import type { ToolExecutionResult } from "../types";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
}>;

export type CreateCardToolConfig = {
  fetchFn?: FetchLike;
  apiKey?: string;
  token?: string;
  listId?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  dryRunDefault?: boolean;
  retryBackoffMs?: number;
};

type TrelloCard = {
  id?: string;
  shortUrl?: string;
  url?: string;
  desc?: string;
};

const TRELLO_BASE_URL_DEFAULT = "https://api.trello.com";

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

function normalizeBaseUrl(url?: string): string {
  const value = (url?.trim() || TRELLO_BASE_URL_DEFAULT).replace(/\/+$/, "");
  return value.length > 0 ? value : TRELLO_BASE_URL_DEFAULT;
}

function operationMarker(operationId: string): string {
  return `[operation_id:${operationId}]`;
}

function buildCardName(args: { operation_id: string; payload: Order }): string {
  return `Pedido ${args.payload.producto} - ${args.payload.nombre_cliente} (${args.operation_id})`;
}

function buildCardDescription(args: { operation_id: string; chat_id: string; payload: Order }): string {
  const marker = operationMarker(args.operation_id);
  const lines = [
    marker,
    `operation_id: ${args.operation_id}`,
    `chat_id: ${args.chat_id}`,
    `nombre_cliente: ${args.payload.nombre_cliente}`,
    `producto: ${args.payload.producto}`,
    `cantidad: ${args.payload.cantidad}`,
    `tipo_envio: ${args.payload.tipo_envio}`,
    `fecha_hora_entrega: ${args.payload.fecha_hora_entrega}`,
    `direccion: ${args.payload.direccion ?? ""}`,
    `telefono: ${args.payload.telefono ?? ""}`,
    `descripcion_producto: ${args.payload.descripcion_producto ?? ""}`,
    `sabor_pan: ${args.payload.sabor_pan ?? ""}`,
    `sabor_relleno: ${args.payload.sabor_relleno ?? ""}`,
    `estado_pago: ${args.payload.estado_pago ?? ""}`,
    `total: ${args.payload.total ?? ""}`,
    `moneda: ${args.payload.moneda}`,
    `notas: ${args.payload.notas ?? ""}`
  ];
  return lines.join("\n");
}

function buildDue(value: string): string | undefined {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

async function fetchJsonWithTimeout(args: {
  fetchFn: FetchLike;
  url: string;
  timeoutMs: number;
  method?: "GET" | "POST";
}): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);

  try {
    const response = await args.fetchFn(args.url, {
      method: args.method ?? "GET",
      signal: controller.signal
    });

    let data: unknown = undefined;
    if (response.text) {
      const raw = await response.text();
      if (raw.length > 0) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      }
    } else if (response.json) {
      try {
        data = await response.json();
      } catch {
        data = undefined;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } finally {
    clearTimeout(timer);
  }
}

function withOrderPayload(args: {
  payload: Order;
  chat_id: string;
  card?: TrelloCard;
}): Order & { chat_id: string; trello_card_id?: string; trello_card_url?: string } {
  return {
    ...args.payload,
    chat_id: args.chat_id,
    trello_card_id: args.card?.id,
    trello_card_url: args.card?.url ?? args.card?.shortUrl
  };
}

export function createCreateCardTool(config: CreateCardToolConfig = {}) {
  const fetchFn = config.fetchFn ?? ((globalThis.fetch as unknown) as FetchLike | undefined);
  const apiKey = config.apiKey?.trim() || undefined;
  const token = config.token?.trim() || undefined;
  const listId = config.listId?.trim() || undefined;
  const apiBaseUrl = normalizeBaseUrl(config.apiBaseUrl);
  const timeoutMs = Number.isFinite(config.timeoutMs) && (config.timeoutMs ?? 0) > 0 ? Math.trunc(config.timeoutMs!) : 5000;
  const maxRetries = Number.isFinite(config.maxRetries) && (config.maxRetries ?? -1) >= 0 ? Math.trunc(config.maxRetries!) : 2;
  const dryRunDefault = config.dryRunDefault ?? true;
  const retryBackoffMs = Number.isFinite(config.retryBackoffMs) && (config.retryBackoffMs ?? -1) >= 0
    ? Math.trunc(config.retryBackoffMs!)
    : 150;

  return async function createCard(args: {
    operation_id: string;
    chat_id: string;
    payload: Order;
    dryRun?: boolean;
  }): Promise<ToolExecutionResult<Order & { chat_id: string; trello_card_id?: string; trello_card_url?: string }>> {
    const dry_run = args.dryRun ?? dryRunDefault;

    if (dry_run) {
      return {
        ok: true,
        dry_run,
        operation_id: args.operation_id,
        payload: withOrderPayload({ payload: args.payload, chat_id: args.chat_id }),
        detail: "create-card dry-run"
      };
    }

    if (!fetchFn) {
      throw new Error("order_trello_fetch_unavailable");
    }
    if (!apiKey) {
      throw new Error("order_trello_api_key_missing");
    }
    if (!token) {
      throw new Error("order_trello_token_missing");
    }
    if (!listId) {
      throw new Error("order_trello_list_id_missing");
    }

    const attempts = maxRetries + 1;
    let lastError: Error | undefined;
    const marker = operationMarker(args.operation_id);

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const searchParams = new URLSearchParams({
          fields: "id,url,shortUrl,desc",
          limit: "1000",
          key: apiKey,
          token
        });
        const searchUrl = `${apiBaseUrl}/1/lists/${encodeURIComponent(listId)}/cards?${searchParams.toString()}`;
        const searchResponse = await fetchJsonWithTimeout({
          fetchFn,
          url: searchUrl,
          timeoutMs,
          method: "GET"
        });

        if (!searchResponse.ok) {
          if (isRetriableHttpStatus(searchResponse.status) && attempt < attempts) {
            await sleep(retryBackoffMs * attempt);
            continue;
          }
          throw new Error(`order_trello_http_${searchResponse.status}`);
        }

        const cards = Array.isArray(searchResponse.data) ? (searchResponse.data as TrelloCard[]) : [];
        const existing = cards.find((card) => typeof card.desc === "string" && card.desc.includes(marker));
        if (existing) {
          return {
            ok: true,
            dry_run,
            operation_id: args.operation_id,
            payload: withOrderPayload({ payload: args.payload, chat_id: args.chat_id, card: existing }),
            detail: `create-card deduped existing (attempt=${attempt})`
          };
        }

        const createParams = new URLSearchParams({
          key: apiKey,
          token,
          idList: listId,
          name: buildCardName({ operation_id: args.operation_id, payload: args.payload }),
          desc: buildCardDescription({
            operation_id: args.operation_id,
            chat_id: args.chat_id,
            payload: args.payload
          })
        });
        const due = buildDue(args.payload.fecha_hora_entrega);
        if (due) createParams.set("due", due);

        const createResponse = await fetchJsonWithTimeout({
          fetchFn,
          url: `${apiBaseUrl}/1/cards?${createParams.toString()}`,
          timeoutMs,
          method: "POST"
        });

        if (createResponse.ok) {
          const card = (createResponse.data ?? {}) as TrelloCard;
          return {
            ok: true,
            dry_run,
            operation_id: args.operation_id,
            payload: withOrderPayload({ payload: args.payload, chat_id: args.chat_id, card }),
            detail: `create-card executed (attempt=${attempt})`
          };
        }

        if (isRetriableHttpStatus(createResponse.status) && attempt < attempts) {
          await sleep(retryBackoffMs * attempt);
          continue;
        }

        throw new Error(`order_trello_http_${createResponse.status}`);
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

    throw lastError ?? new Error("order_trello_failed");
  };
}

export const createCardTool = createCreateCardTool();
